import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import { AuthNPaasService } from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, asc, count, eq, inArray, or } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import {
  appPermission,
  appRole,
  appUser,
} from '@server/database/schema';
import {
  ALL_PERMISSION_CODES,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  JWT_SECRET,
  PERMISSION_DEFS,
  ROLE_DEFS,
  ROLES_SYNC_PERMISSIONS,
  SYSTEM_ROLE_CODES,
  TOKEN_EXPIRES_IN,
} from './auth.constants';
import type { AppUserContext } from './auth.types';
import {
  APP_USER_STATUS_ENABLED,
  type AppRole,
  type AppUserWithRole,
  type CreateRoleRequest,
  type CreateUserRequest,
  type LoginRequest,
  type LoginResponse,
  type SessionResponse,
  type UpdateRoleRequest,
  type UpdateUserRequest,
  type UserOption,
} from '@shared/auth';
import { extractPostgresErrorCode } from './postgres-error-code';

type AppUserRow = typeof appUser.$inferSelect;
type AppRoleRow = typeof appRole.$inferSelect;
type UserWithRoleRow = { user: AppUserRow; role: AppRoleRow | null };

const PHONE_PATTERN = /^1\d{10}$/;
const DEFAULT_FEISHU_ROLE_CODE = 'sales';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly jwtService: JwtService,
    private readonly authNPaasService: AuthNPaasService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedPermissions();
    await this.seedRoles();
    await this.seedAdmin();
  }

  private async seedPermissions(): Promise<void> {
    for (const def of PERMISSION_DEFS) {
      await this.db
        .insert(appPermission)
        .values({ code: def.code, name: def.name, module: def.module })
        .onConflictDoUpdate({
          target: [appPermission.code],
          set: { name: def.name, module: def.module },
        });
    }
  }

  private async seedRoles(): Promise<void> {
    for (const def of ROLE_DEFS) {
      await this.db
        .insert(appRole)
        .values({
          code: def.code,
          name: def.name,
          permissions: def.permissions,
          isSystem: true,
        })
        .onConflictDoUpdate({
          target: [appRole.code],
          set: { name: def.name },
        });
      if (ROLES_SYNC_PERMISSIONS.includes(def.code)) {
        await this.db
          .update(appRole)
          .set({ permissions: def.permissions })
          .where(eq(appRole.code, def.code));
      }
    }
  }

  private async seedAdmin(): Promise<void> {
    const existing: Array<{ id: string }> = await this.db
      .select({ id: appUser.id })
      .from(appUser)
      .where(eq(appUser.username, DEFAULT_ADMIN_USERNAME))
      .limit(1);
    if (existing.length > 0) {
      return;
    }
    const roles: AppRoleRow[] = await this.db
      .select()
      .from(appRole)
      .where(eq(appRole.code, 'admin'))
      .limit(1);
    if (roles.length === 0) {
      throw new InternalServerErrorException('管理员角色不存在');
    }
    const passwordHash: string = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await this.db.insert(appUser).values({
      username: DEFAULT_ADMIN_USERNAME,
      password: passwordHash,
      name: '系统管理员',
      roleId: roles[0].id,
      authType: 'password',
    });
  }

  private async issueSession(
    user: AppUserRow,
    role: AppRoleRow | null,
  ): Promise<LoginResponse> {
    const permissions: string[] = role?.permissions ?? [];
    const token: string = this.jwtService.sign(
      {
        sub: user.id,
        username: user.username,
        roleId: user.roleId,
        roleCode: role?.code ?? '',
      },
      { secret: JWT_SECRET, expiresIn: TOKEN_EXPIRES_IN },
    );
    return {
      token,
      user: this.toUserWithRole(user, role),
      permissions,
    };
  }

  private resolveRolePermissions(role: AppRoleRow | null): string[] {
    if (!role) {
      return [];
    }
    return role.permissions ?? [];
  }

  async login(dto: LoginRequest): Promise<LoginResponse> {
    const identifier: string = dto.username.trim();
    if (!identifier || !dto.password) {
      throw new BadRequestException('请输入账号和密码');
    }
    const rows: UserWithRoleRow[] = await this.db
      .select({ user: appUser, role: appRole })
      .from(appUser)
      .leftJoin(appRole, eq(appUser.roleId, appRole.id))
      .where(
        or(
          eq(appUser.username, identifier),
          eq(appUser.phone, identifier),
        ),
      )
      .limit(1);
    const row: UserWithRoleRow | undefined = rows[0];
    if (!row) {
      throw new UnauthorizedException('账号或密码错误');
    }
    if (row.user.status !== APP_USER_STATUS_ENABLED) {
      throw new UnauthorizedException('账号已被禁用，请联系管理员');
    }
    const passwordValid: boolean = await bcrypt.compare(
      dto.password,
      row.user.password,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('账号或密码错误');
    }
    return this.issueSession(row.user, row.role);
  }

  async feishuLogin(platformUserId: string, platformUserName: string): Promise<LoginResponse> {
    if (!platformUserId) {
      throw new UnauthorizedException('当前环境未识别到飞书身份，请使用账号密码登录');
    }

    const rows: UserWithRoleRow[] = await this.db
      .select({ user: appUser, role: appRole })
      .from(appUser)
      .leftJoin(appRole, eq(appUser.roleId, appRole.id))
      .where(eq(appUser.feishuUserId, platformUserId))
      .limit(1);
    const row: UserWithRoleRow | undefined = rows[0];
    if (row) {
      if (row.user.status !== APP_USER_STATUS_ENABLED) {
        throw new UnauthorizedException('账号已被禁用，请联系管理员');
      }
      return this.issueSession(row.user, row.role);
    }

    const feishuName: string = platformUserName || `飞书用户${platformUserId}`;
    const salesRoles: AppRoleRow[] = await this.db
      .select()
      .from(appRole)
      .where(eq(appRole.code, DEFAULT_FEISHU_ROLE_CODE))
      .limit(1);
    if (salesRoles.length === 0) {
      throw new InternalServerErrorException('销售角色不存在，无法创建飞书账号');
    }
    const defaultRole: AppRoleRow = salesRoles[0];
    const passwordHash: string = await bcrypt.hash(`feishu-${platformUserId}`, 10);
    const username: string = `feishu_${platformUserId}`;

    let inserted: AppUserRow[] = [];
    try {
      inserted = await this.db
        .insert(appUser)
        .values({
          username,
          password: passwordHash,
          name: feishuName,
          roleId: defaultRole.id,
          authType: 'feishu',
          feishuUserId: platformUserId,
        })
        .returning();
    } catch (error: unknown) {
      if (extractPostgresErrorCode(error) === '23505') {
        const existing: UserWithRoleRow[] = await this.db
          .select({ user: appUser, role: appRole })
          .from(appUser)
          .leftJoin(appRole, eq(appUser.roleId, appRole.id))
          .where(eq(appUser.feishuUserId, platformUserId))
          .limit(1);
        if (existing.length > 0 && existing[0].user.status === APP_USER_STATUS_ENABLED) {
          return this.issueSession(existing[0].user, existing[0].role);
        }
      }
      throw error;
    }

    const newUser: AppUserRow | undefined = inserted[0];
    if (!newUser) {
      throw new InternalServerErrorException('创建飞书账号失败');
    }
    return this.issueSession(newUser, defaultRole);
  }

  async verifySession(token: string): Promise<AppUserContext> {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('登录已失效，请重新登录');
    }
    const rows: UserWithRoleRow[] = await this.db
      .select({ user: appUser, role: appRole })
      .from(appUser)
      .leftJoin(appRole, eq(appUser.roleId, appRole.id))
      .where(eq(appUser.id, payload.sub))
      .limit(1);
    const row: UserWithRoleRow | undefined = rows[0];
    if (!row || row.user.status !== APP_USER_STATUS_ENABLED) {
      throw new UnauthorizedException('登录已失效，请重新登录');
    }
    return this.toUserContext(row.user, row.role);
  }

  async getSession(userId: string): Promise<SessionResponse> {
    const rows: UserWithRoleRow[] = await this.db
      .select({ user: appUser, role: appRole })
      .from(appUser)
      .leftJoin(appRole, eq(appUser.roleId, appRole.id))
      .where(eq(appUser.id, userId))
      .limit(1);
    const row: UserWithRoleRow | undefined = rows[0];
    if (!row || row.user.status !== APP_USER_STATUS_ENABLED) {
      throw new UnauthorizedException('登录已失效，请重新登录');
    }
    const rolePerms: string[] =
      row.role?.code === 'admin'
        ? [...ALL_PERMISSION_CODES]
        : this.resolveRolePermissions(row.role);
    return {
      user: this.toUserWithRole(row.user, row.role),
      permissions: rolePerms,
    };
  }

  async buildUserContext(user: AppUserRow): Promise<AppUserContext> {
    const rows: AppRoleRow[] = await this.db
      .select()
      .from(appRole)
      .where(eq(appRole.id, user.roleId))
      .limit(1);
    const role: AppRoleRow | undefined = rows[0];
    return this.toUserContext(user, role ?? null);
  }

  async resolveFeishuIdentity(platformUserId: string): Promise<AppUserRow | undefined> {
    if (!platformUserId) {
      return undefined;
    }
    const rows: AppUserRow[] = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.feishuUserId, platformUserId))
      .limit(1);
    return rows[0];
  }

  async listUsers(): Promise<AppUserWithRole[]> {
    const rows: UserWithRoleRow[] = await this.db
      .select({ user: appUser, role: appRole })
      .from(appUser)
      .leftJoin(appRole, eq(appUser.roleId, appRole.id))
      .orderBy(asc(appUser.createdAt));
    return rows.map((row: UserWithRoleRow): AppUserWithRole =>
      this.toUserWithRole(row.user, row.role),
    );
  }

  async createUser(dto: CreateUserRequest): Promise<AppUserWithRole> {
    const username: string = dto.username.trim();
    if (!username) {
      throw new BadRequestException('用户名不能为空');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('密码长度不能少于 6 位');
    }
    if (dto.phone !== undefined && dto.phone !== '') {
      if (!PHONE_PATTERN.test(dto.phone)) {
        throw new BadRequestException('手机号格式不正确');
      }
    }
    const role: AppRoleRow = await this.findRoleOrThrow(dto.roleId);
    const passwordHash: string = await bcrypt.hash(dto.password, 10);
    let inserted: AppUserRow[] = [];
    try {
      inserted = await this.db
        .insert(appUser)
        .values({
          username,
          password: passwordHash,
          name: dto.name.trim(),
          roleId: role.id,
          phone: dto.phone || null,
          authType: 'password',
        })
        .returning();
    } catch (error: unknown) {
      if (extractPostgresErrorCode(error) === '23505') {
        throw new ConflictException('用户名或手机号已存在');
      }
      throw error;
    }
    return this.toUserWithRole(inserted[0], role);
  }

  async updateUser(id: string, dto: UpdateUserRequest): Promise<AppUserWithRole> {
    const rows: AppUserRow[] = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.id, id))
      .limit(1);
    const user: AppUserRow | undefined = rows[0];
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (dto.phone !== undefined && dto.phone !== '') {
      if (!PHONE_PATTERN.test(dto.phone)) {
        throw new BadRequestException('手机号格式不正确');
      }
    }
    if (dto.roleId) {
      await this.findRoleOrThrow(dto.roleId);
    }
    const patch: Partial<typeof appUser.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.roleId !== undefined) patch.roleId = dto.roleId;
    if (dto.phone !== undefined) patch.phone = dto.phone || null;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.password !== undefined && dto.password !== '') {
      if (dto.password.length < 6) {
        throw new BadRequestException('密码长度不能少于 6 位');
      }
      patch.password = await bcrypt.hash(dto.password, 10);
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    let updated: AppUserRow[] = [];
    try {
      updated = await this.db
        .update(appUser)
        .set(patch)
        .where(eq(appUser.id, id))
        .returning();
    } catch (error: unknown) {
      if (extractPostgresErrorCode(error) === '23505') {
        throw new ConflictException('用户名或手机号已存在');
      }
      throw error;
    }
    if (updated.length === 0) {
      throw new NotFoundException('用户不存在');
    }
    const role: AppRoleRow | null = await this.findRole(updated[0].roleId);
    return this.toUserWithRole(updated[0], role);
  }

  async deleteUser(id: string, currentUserId: string): Promise<void> {
    const rows: AppUserRow[] = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.id, id))
      .limit(1);
    const user: AppUserRow | undefined = rows[0];
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (user.username === DEFAULT_ADMIN_USERNAME) {
      throw new BadRequestException('不能删除内置管理员账号');
    }
    if (currentUserId && user.id === currentUserId) {
      throw new BadRequestException('不能删除当前登录账号');
    }
    await this.db.delete(appUser).where(eq(appUser.id, id));
  }

  async listRoles(): Promise<AppRole[]> {
    const rows: AppRoleRow[] = await this.db
      .select()
      .from(appRole)
      .orderBy(asc(appRole.createdAt));
    return rows.map((row: AppRoleRow): AppRole => this.toRole(row));
  }

  async listPermissionDefs() {
    return PERMISSION_DEFS;
  }

  async listEnabledUserOptions(): Promise<UserOption[]> {
    const rows: UserWithRoleRow[] = await this.db
      .select({ user: appUser, role: appRole })
      .from(appUser)
      .leftJoin(appRole, eq(appUser.roleId, appRole.id))
      .where(eq(appUser.status, APP_USER_STATUS_ENABLED))
      .orderBy(asc(appUser.createdAt));
    return rows.map(
      (row: UserWithRoleRow): UserOption => ({
        id: row.user.id,
        name: row.user.name,
        roleCode: row.role?.code ?? '',
      }),
    );
  }

  async createRole(dto: CreateRoleRequest): Promise<AppRole> {
    const name: string = dto.name.trim();
    const code: string = dto.code.trim();
    if (!name || !code) {
      throw new BadRequestException('角色名称和编码不能为空');
    }
    if (SYSTEM_ROLE_CODES.includes(code)) {
      throw new ConflictException('角色编码与系统角色冲突');
    }
    const permissions: string[] = this.validatePermissions(dto.permissions);
    let inserted: AppRoleRow[] = [];
    try {
      inserted = await this.db
        .insert(appRole)
        .values({ name, code, permissions, isSystem: false })
        .returning();
    } catch (error: unknown) {
      if (extractPostgresErrorCode(error) === '23505') {
        throw new ConflictException('角色编码已存在');
      }
      throw error;
    }
    return this.toRole(inserted[0]);
  }

  async updateRole(id: string, dto: UpdateRoleRequest): Promise<AppRole> {
    const rows: AppRoleRow[] = await this.db
      .select()
      .from(appRole)
      .where(eq(appRole.id, id))
      .limit(1);
    const role: AppRoleRow | undefined = rows[0];
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    const patch: Partial<typeof appRole.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.permissions !== undefined) {
      patch.permissions = this.validatePermissions(dto.permissions);
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    const updated: AppRoleRow[] = await this.db
      .update(appRole)
      .set(patch)
      .where(eq(appRole.id, id))
      .returning();
    if (updated.length === 0) {
      throw new NotFoundException('角色不存在');
    }
    return this.toRole(updated[0]);
  }

  async deleteRole(id: string): Promise<void> {
    const rows: AppRoleRow[] = await this.db
      .select()
      .from(appRole)
      .where(eq(appRole.id, id))
      .limit(1);
    const role: AppRoleRow | undefined = rows[0];
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    if (role.isSystem) {
      throw new BadRequestException('系统内置角色不可删除');
    }
    const users: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(appUser)
      .where(eq(appUser.roleId, id));
    if (users[0].count > 0) {
      throw new ConflictException('该角色下还有用户，不能删除');
    }
    await this.db.delete(appRole).where(eq(appRole.id, id));
  }

  private async findRole(roleId: string): Promise<AppRoleRow | null> {
    const rows: AppRoleRow[] = await this.db
      .select()
      .from(appRole)
      .where(eq(appRole.id, roleId))
      .limit(1);
    return rows[0] ?? null;
  }

  private async findRoleOrThrow(roleId: string): Promise<AppRoleRow> {
    const role: AppRoleRow | null = await this.findRole(roleId);
    if (!role) {
      throw new BadRequestException('角色不存在');
    }
    return role;
  }

  private validatePermissions(codes: string[]): string[] {
    const valid: Set<string> = new Set(ALL_PERMISSION_CODES);
    for (const code of codes) {
      if (!valid.has(code)) {
        throw new BadRequestException(`无效权限点: ${code}`);
      }
    }
    return codes;
  }

  private toUserContext(
    user: AppUserRow,
    role: AppRoleRow | null,
  ): AppUserContext {
    const perms: string[] =
      role?.code === 'admin'
        ? [...ALL_PERMISSION_CODES]
        : this.resolveRolePermissions(role);
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      roleId: user.roleId,
      roleCode: role?.code ?? '',
      roleName: role?.name ?? '',
      status: user.status,
      permissions: perms,
      authType: (user.authType as 'password' | 'feishu') ?? 'password',
    };
  }

  private toUserWithRole(
    user: AppUserRow,
    role: AppRoleRow | null,
  ): AppUserWithRole {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      roleId: user.roleId,
      phone: user.phone ?? '',
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      authType: (user.authType as 'password' | 'feishu') ?? 'password',
      roleCode: role?.code ?? '',
      roleName: role?.name ?? '',
    };
  }

  private toRole(row: AppRoleRow): AppRole {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      isSystem: row.isSystem,
      permissions: this.resolveRolePermissions(row),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
