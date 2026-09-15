import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
  AuthNPaasService,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, or, desc, count, inArray, sql, ilike } from 'drizzle-orm';
import { roles, userRoles, auditLogs } from '@server/database/schema';
import type {
  Role,
  RoleListResponse,
  PermissionsMap,
  UserWithRoles,
  UserListParams,
  UserListResponse,
} from '@shared/api.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

interface UserRoleRecord {
  userId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
}

const DEFAULT_ROLE_CODES = [
  'boss',
  'supervisor',
  'warehouse_admin',
  'purchaser',
  'sales',
  'finance',
];

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly auditLogsService: AuditLogsService,
    private readonly authnPaasService: AuthNPaasService,
  ) {}

  // ====== Roles ======

  async getRoleList(): Promise<RoleListResponse> {
    const roleRows = await this.db.select().from(roles).orderBy(roles.createdAt);

    const userCountRows = await this.db
      .select({ roleId: userRoles.roleId, count: count(userRoles.id) })
      .from(userRoles)
      .groupBy(userRoles.roleId);

    const countMap = new Map<string, number>();
    for (const row of userCountRows) {
      countMap.set(row.roleId, Number(row.count));
    }

    const items: Role[] = roleRows.map((row) => ({
      id: row.id,
      roleCode: row.roleCode,
      roleName: row.roleName,
      description: row.description ?? undefined,
      permissions: (row.permissions ?? {}) as PermissionsMap,
      userCount: countMap.get(row.id) ?? 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    return { items, total: items.length };
  }

  async getRoleById(id: string): Promise<Role> {
    const rows = await this.db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (rows.length === 0) throw new NotFoundException('角色不存在');
    const row = rows[0];

    const [countRow] = await this.db
      .select({ value: count() })
      .from(userRoles)
      .where(eq(userRoles.roleId, id));

    return {
      id: row.id,
      roleCode: row.roleCode,
      roleName: row.roleName,
      description: row.description ?? undefined,
      permissions: (row.permissions ?? {}) as PermissionsMap,
      userCount: Number(countRow.value),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateRolePermissions(
    roleId: string,
    permissions: PermissionsMap,
    operatorUserId: string,
  ): Promise<Role> {
    const existing = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    if (existing.length === 0) throw new NotFoundException('角色不存在');

    const [updated] = await this.db
      .update(roles)
      .set({
        permissions: permissions as unknown as typeof roles.$inferInsert['permissions'],
        updatedAt: new Date(),
      })
      .where(eq(roles.id, roleId))
      .returning();

    void this.auditLogsService.createLog({
      actionType: 'update',
      targetType: 'role_permissions',
      targetId: roleId,
      operatorUserId,
      detail: {
        before: { permissions: existing[0].permissions },
        after: { permissions },
      },
    });

    return {
      id: updated.id,
      roleCode: updated.roleCode,
      roleName: updated.roleName,
      description: updated.description ?? undefined,
      permissions: (updated.permissions ?? {}) as PermissionsMap,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // ====== Role Users ======

  async getRoleUsers(roleId: string): Promise<UserWithRoles[]> {
    const roleRows = await this.db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId))
      .orderBy(desc(userRoles.createdAt));

    const userIds = roleRows.map((r) => r.userId);
    const usersWithRoles = await this.loadUsersWithRoles(userIds);
    return usersWithRoles;
  }

  async addRoleUser(
    roleId: string,
    userId: string,
    userName: string,
    operatorUserId: string,
  ): Promise<void> {
    const roleRows = await this.db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
    if (roleRows.length === 0) throw new NotFoundException('角色不存在');

    const existing = await this.db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
      .limit(1);
    if (existing.length > 0) {
      throw new BadRequestException('该用户已拥有此角色');
    }

    await this.db.insert(userRoles).values({ userId, roleId });

    void this.auditLogsService.createLog({
      actionType: 'create',
      targetType: 'role_user',
      targetId: roleId,
      operatorUserId,
      detail: {
        after: { userId, userName, roleCode: roleRows[0].roleCode },
      },
    });
  }

  async removeRoleUser(
    roleId: string,
    userId: string,
    operatorUserId: string,
  ): Promise<void> {
    const roleRows = await this.db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
    if (roleRows.length === 0) throw new NotFoundException('角色不存在');

    const deleted = await this.db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
      .returning({ id: userRoles.id });
    if (deleted.length === 0) throw new NotFoundException('该用户不在此角色中');

    void this.auditLogsService.createLog({
      actionType: 'delete',
      targetType: 'role_user',
      targetId: roleId,
      operatorUserId,
      detail: {
        before: { userId, roleCode: roleRows[0].roleCode },
      },
    });
  }

  // ====== Users ======

  async getUserList(
    params: UserListParams,
    requesterUserId?: string,
  ): Promise<UserListResponse> {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);

    // 候选用户 = 已分配角色的用户 ∪ 实际使用过系统的用户（审计日志操作人）∪ 当前访问者
    const assignedRows = await this.db
      .selectDistinct({ userId: userRoles.userId })
      .from(userRoles);
    const operatorRows = await this.db
      .selectDistinct({ userId: auditLogs.operator })
      .from(auditLogs);

    const idSet = new Set<string>();
    for (const r of assignedRows) {
      if (r.userId) idSet.add(r.userId);
    }
    for (const r of operatorRows) {
      if (r.userId) idSet.add(r.userId);
    }
    if (requesterUserId) idSet.add(requesterUserId);

    let candidateIds = Array.from(idSet);

    // 角色筛选：前端传角色 ID，兼容 roleCode
    if (params.role) {
      const roleRows = await this.db
        .select()
        .from(roles)
        .where(or(eq(roles.id, params.role), eq(roles.roleCode, params.role)))
        .limit(1);
      if (roleRows.length === 0) {
        return { items: [], total: 0, page, pageSize };
      }
      const roleId = roleRows[0].id;
      const roleUserRows = await this.db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.roleId, roleId));
      const roleUserSet = new Set(roleUserRows.map((r) => r.userId));
      candidateIds = candidateIds.filter((id) => roleUserSet.has(id));
    }

    const users = await this.loadUsersWithRoles(candidateIds);

    let filtered = users;
    if (params.keyword?.trim()) {
      const kw = params.keyword.trim().toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(kw) ||
          u.userId.toLowerCase().includes(kw),
      );
    }
    if (params.status && params.status !== 'all') {
      filtered = filtered.filter(
        (u) => (u.status || 'active') === params.status,
      );
    }

    const total = filtered.length;
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);

    return { items, total, page, pageSize };
  }

  async getUserDetail(userId: string): Promise<UserWithRoles> {
    const all = await this.loadUsersWithRoles([userId]);
    if (all.length === 0) {
      throw new NotFoundException('用户不存在或未分配角色');
    }
    return all[0];
  }

  async assignUserRoles(
    userId: string,
    roleIds: string[],
    operatorUserId: string,
  ): Promise<UserWithRoles> {
    const roleRows = roleIds.length > 0
      ? await this.db.select().from(roles).where(inArray(roles.id, roleIds))
      : [];

    if (roleIds.length > 0 && roleRows.length !== roleIds.length) {
      throw new BadRequestException('存在无效的角色ID');
    }

    await this.db.transaction(async (tx) => {
      await tx.delete(userRoles).where(eq(userRoles.userId, userId));
      if (roleIds.length > 0) {
        const values = roleIds.map((rid) => ({ userId, roleId: rid }));
        await tx.insert(userRoles).values(values);
      }
    });

    void this.auditLogsService.createLog({
      actionType: 'update',
      targetType: 'user_roles',
      targetId: userId,
      operatorUserId,
      detail: {
        after: {
          roleIds,
          roleCodes: roleRows.map((r) => r.roleCode),
        },
      },
    });

    const result = await this.loadUsersWithRoles([userId]);
    return result[0] ?? { userId, name: '', roles: roleRows.map((r) => r.roleCode) };
  }

  async searchUsers(keyword: string): Promise<Array<{ userId: string; name: string; avatar?: string }>> {
    const assignedRows = await this.db
      .selectDistinct({ userId: userRoles.userId })
      .from(userRoles);
    const operatorRows = await this.db
      .selectDistinct({ userId: auditLogs.operator })
      .from(auditLogs);

    const idSet = new Set<string>();
    for (const r of assignedRows) {
      if (r.userId) idSet.add(r.userId);
    }
    for (const r of operatorRows) {
      if (r.userId) idSet.add(r.userId);
    }
    const candidates = Array.from(idSet);
    if (candidates.length === 0) return [];

    const platformMap = await this.resolvePlatformUsers(candidates);
    const kw = (keyword || '').toLowerCase();
    const results: Array<{ userId: string; name: string; avatar?: string }> = [];
    for (const uid of candidates) {
      const info = platformMap.get(uid);
      const name = info?.name || uid;
      if (!kw || uid.toLowerCase().includes(kw) || name.toLowerCase().includes(kw)) {
        results.push({ userId: uid, name, avatar: info?.avatarUrl });
      }
    }

    return results.slice(0, 20);
  }

  // ====== Helpers ======

  private async loadUsersWithRoles(userIds: string[]): Promise<UserWithRoles[]> {
    if (userIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(userIds));

    const roleAssignments = await this.db
      .select({
        userId: userRoles.userId,
        roleId: userRoles.roleId,
      })
      .from(userRoles)
      .where(inArray(userRoles.userId, uniqueIds));

    const rolesByUser = new Map<string, string[]>();
    for (const ra of roleAssignments) {
      const arr = rolesByUser.get(ra.userId) ?? [];
      arr.push(ra.roleId);
      rolesByUser.set(ra.userId, arr);
    }

    const platformMap = await this.resolvePlatformUsers(uniqueIds);

    const result: UserWithRoles[] = [];
    for (const uid of uniqueIds) {
      const platform = platformMap.get(uid);
      result.push({
        userId: uid,
        name: platform?.name || uid,
        email: '',
        department: '',
        avatarUrl: platform?.avatarUrl,
        status: 'active',
        roles: rolesByUser.get(uid) ?? [],
      });
    }

    return result;
  }

  private async resolvePlatformUsers(
    userIds: string[],
  ): Promise<Map<string, { name: string; avatarUrl: string }>> {
    const map = new Map<string, { name: string; avatarUrl: string }>();
    if (userIds.length === 0) return map;
    try {
      const infos = await this.authnPaasService.listUsersByIds(userIds);
      for (const info of infos) {
        if (!info) continue;
        const nameI18n = info.name as Record<string, string> | undefined;
        let name = info.miaodaUserID;
        if (nameI18n) {
          name =
            nameI18n.zh_cn ||
            nameI18n.en_us ||
            nameI18n.ja_jp ||
            Object.values(nameI18n)[0] ||
            name;
        }
        const avatarUrl = info.avatar?.image?.large ?? '';
        map.set(info.miaodaUserID, { name, avatarUrl });
      }
    } catch (err) {
      this.logger.error(`获取平台用户信息失败: ${String(err)}`);
    }
    return map;
  }
}
