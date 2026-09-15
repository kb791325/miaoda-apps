import { Inject, Injectable } from '@nestjs/common';
import { CacheService } from '@server/common/cache/cache.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase, AuthNPaasService } from '@lark-apaas/fullstack-nestjs-core';
import { eq, inArray, and, asc, count, sql } from 'drizzle-orm';
import { roles, userRoles } from '@server/database/schema';
import type {
  MenuPermissions,
  DataPermissions,
  OperationPermissions,
  UserPermissions,
  DataScope,
  RoleUserItem,
  RoleWithUserCount,
  UserListResponse,
} from '@shared/api.interface';

type RoleSelect = typeof roles.$inferSelect;
type RoleInsert = typeof roles.$inferInsert;

const DATA_SCOPE_RANK: Record<DataScope, number> = {
  personal: 1,
  department: 2,
  all: 3,
};

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5分钟

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly authNPaasService: AuthNPaasService,
    private readonly cache: CacheService,
  ) {}

  private toRoleDto(row: RoleSelect): {
    id: string;
    roleCode: string;
    roleName: string;
    roleDescription?: string;
    isSystem: boolean;
    isActive: boolean;
    menuPermissions: MenuPermissions;
    dataPermissions: DataPermissions;
    operationPermissions: OperationPermissions;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: row.id,
      roleCode: row.roleCode,
      roleName: row.roleName,
      roleDescription: row.roleDescription ?? undefined,
      isSystem: row.isSystem ?? false,
      isActive: row.isActive ?? true,
      menuPermissions: (row.menuPermissions ?? {}) as MenuPermissions,
      dataPermissions: (row.dataPermissions ?? {}) as DataPermissions,
      operationPermissions: (row.operationPermissions ?? {}) as OperationPermissions,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async findAll(): Promise<ReturnType<typeof this.toRoleDto>[]> {
    const rows = await this.db
      .select({
        id: roles.id,
        roleCode: roles.roleCode,
        roleName: roles.roleName,
        roleDescription: roles.roleDescription,
        isSystem: roles.isSystem,
        isActive: roles.isActive,
        menuPermissions: roles.menuPermissions,
        dataPermissions: roles.dataPermissions,
        operationPermissions: roles.operationPermissions,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
      })
      .from(roles)
      .orderBy(asc(roles.createdAt));
    return rows.map((row: typeof rows[number]) => this.toRoleDto(row as unknown as RoleSelect));
  }

  async findAllWithUserCount(): Promise<RoleWithUserCount[]> {
    const result = await this.db
      .select({
        id: roles.id,
        roleCode: roles.roleCode,
        roleName: roles.roleName,
        roleDescription: roles.roleDescription,
        isSystem: roles.isSystem,
        isActive: roles.isActive,
        menuPermissions: roles.menuPermissions,
        dataPermissions: roles.dataPermissions,
        operationPermissions: roles.operationPermissions,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
        userCount: count(userRoles.id),
      })
      .from(roles)
      .leftJoin(userRoles, and(eq(roles.id, userRoles.roleId), eq(userRoles.isActive, true)))
      .groupBy(roles.id)
      .orderBy(asc(roles.createdAt));

    return result.map((row) => ({
      id: row.id,
      roleCode: row.roleCode,
      roleName: row.roleName,
      roleDescription: row.roleDescription ?? undefined,
      isSystem: row.isSystem ?? false,
      isActive: row.isActive ?? true,
      menuPermissions: (row.menuPermissions ?? {}) as MenuPermissions,
      dataPermissions: (row.dataPermissions ?? {}) as DataPermissions,
      operationPermissions: (row.operationPermissions ?? {}) as OperationPermissions,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      userCount: Number(row.userCount),
    }));
  }

  async findOne(id: string): Promise<ReturnType<typeof this.toRoleDto>> {
    const rows = await this.db
      .select({
        id: roles.id,
        roleCode: roles.roleCode,
        roleName: roles.roleName,
        roleDescription: roles.roleDescription,
        isSystem: roles.isSystem,
        isActive: roles.isActive,
        menuPermissions: roles.menuPermissions,
        dataPermissions: roles.dataPermissions,
        operationPermissions: roles.operationPermissions,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
      })
      .from(roles)
      .where(eq(roles.id, id));
    if (rows.length === 0) {
      throw new NotFoundException('角色不存在');
    }
    return this.toRoleDto(rows[0] as unknown as RoleSelect);
  }

  async create(data: {
    roleCode: string;
    roleName: string;
    roleDescription?: string;
    menuPermissions?: MenuPermissions;
    dataPermissions?: DataPermissions;
    operationPermissions?: OperationPermissions;
  }): Promise<{ id: string }> {
    if (!data.roleCode || !data.roleName) {
      throw new BadRequestException('角色编码和角色名称不能为空');
    }
    const existing = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.roleCode, data.roleCode));
    if (existing.length > 0) {
      throw new ConflictException('角色编码已存在');
    }
    const insertData: RoleInsert = {
      roleCode: data.roleCode,
      roleName: data.roleName,
      roleDescription: data.roleDescription ?? null,
      menuPermissions: JSON.stringify(data.menuPermissions ?? {}),
      dataPermissions: JSON.stringify(data.dataPermissions ?? {}),
      operationPermissions: JSON.stringify(data.operationPermissions ?? {}),
    };
    const result: { id: string }[] = await this.db
      .insert(roles)
      .values(insertData)
      .returning({ id: roles.id });
    return { id: result[0].id };
  }

  async update(
    id: string,
    data: {
      roleCode?: string;
      roleName?: string;
      roleDescription?: string;
      menuPermissions?: MenuPermissions;
      dataPermissions?: DataPermissions;
      operationPermissions?: OperationPermissions;
    },
  ): Promise<ReturnType<typeof this.toRoleDto>> {
    const existing = await this.db
      .select({
        id: roles.id,
        roleCode: roles.roleCode,
        roleName: roles.roleName,
        roleDescription: roles.roleDescription,
        isSystem: roles.isSystem,
        isActive: roles.isActive,
        menuPermissions: roles.menuPermissions,
        dataPermissions: roles.dataPermissions,
        operationPermissions: roles.operationPermissions,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
      })
      .from(roles)
      .where(eq(roles.id, id));
    if (existing.length === 0) {
      throw new NotFoundException('角色不存在');
    }
    const role = existing[0] as unknown as RoleSelect;

    if (role.isSystem && data.roleCode && data.roleCode !== role.roleCode) {
      throw new ForbiddenException('系统角色不允许修改角色编码');
    }

    if (data.roleCode && data.roleCode !== role.roleCode) {
      const dup = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.roleCode, data.roleCode));
      if (dup.length > 0) {
        throw new ConflictException('角色编码已存在');
      }
    }

    const patch: Partial<RoleInsert> = {};
    if (data.roleCode !== undefined) patch.roleCode = data.roleCode;
    if (data.roleName !== undefined) patch.roleName = data.roleName;
    if (data.roleDescription !== undefined) patch.roleDescription = data.roleDescription;
    if (data.menuPermissions !== undefined) {
      patch.menuPermissions = JSON.stringify(data.menuPermissions);
    }
    if (data.dataPermissions !== undefined) {
      patch.dataPermissions = JSON.stringify(data.dataPermissions);
    }
    if (data.operationPermissions !== undefined) {
      patch.operationPermissions = JSON.stringify(data.operationPermissions);
    }

    if (Object.keys(patch).length === 0) {
      return this.toRoleDto(role);
    }

    const updated: { id: string }[] = await this.db
      .update(roles)
      .set(patch)
      .where(eq(roles.id, id))
      .returning({ id: roles.id });
    if (updated.length === 0) {
      throw new NotFoundException('角色不存在');
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.db
      .select({ id: roles.id, isSystem: roles.isSystem })
      .from(roles)
      .where(eq(roles.id, id));
    if (existing.length === 0) {
      throw new NotFoundException('角色不存在');
    }
    if (existing[0].isSystem) {
      throw new ForbiddenException('系统角色不允许删除');
    }
    const deleted: { id: string }[] = await this.db
      .delete(roles)
      .where(eq(roles.id, id))
      .returning({ id: roles.id });
    if (deleted.length === 0) {
      throw new NotFoundException('角色不存在');
    }
  }

  async copy(id: string): Promise<{ id: string }> {
    const source = await this.db
      .select({
        id: roles.id,
        roleCode: roles.roleCode,
        roleName: roles.roleName,
        roleDescription: roles.roleDescription,
        isSystem: roles.isSystem,
        isActive: roles.isActive,
        menuPermissions: roles.menuPermissions,
        dataPermissions: roles.dataPermissions,
        operationPermissions: roles.operationPermissions,
      })
      .from(roles)
      .where(eq(roles.id, id));
    if (source.length === 0) {
      throw new NotFoundException('角色不存在');
    }
    const src = source[0] as unknown as RoleSelect;

    const MAX_COPY_RETRIES = 10;
    let newCode = `${src.roleCode}_copy`;
    let counter = 1;
    // 避免 code 重复
    while (counter <= MAX_COPY_RETRIES) {
      const dup = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.roleCode, newCode));
      if (dup.length === 0) break;
      counter += 1;
      newCode = `${src.roleCode}_copy${counter}`;
    }
    if (counter > MAX_COPY_RETRIES) {
      throw new ConflictException('已达到最大复制次数限制');
    }

    const insertData: RoleInsert = {
      roleCode: newCode,
      roleName: `${src.roleName} 副本`,
      roleDescription: src.roleDescription,
      isSystem: false,
      isActive: src.isActive,
      menuPermissions: src.menuPermissions,
      dataPermissions: src.dataPermissions,
      operationPermissions: src.operationPermissions,
    };
    const result: { id: string }[] = await this.db
      .insert(roles)
      .values(insertData)
      .returning({ id: roles.id });
    return { id: result[0].id };
  }

  // ============== 用户角色 ==============

  async getUserRoles(userId: string) {
    const rows = await this.db
      .select({
        id: userRoles.id,
        userId: userRoles.userId,
        roleId: userRoles.roleId,
        isActive: userRoles.isActive,
      })
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.isActive, true)));
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      roleId: row.roleId,
      isActive: row.isActive ?? true,
    }));
  }

  async assignUserRoles(userId: string, roleIds: string[]): Promise<{ success: boolean }> {
    if (!Array.isArray(roleIds)) {
      throw new BadRequestException('roleIds 必须是数组');
    }
    await this.db.transaction(async (tx) => {
      // 先全部软删（或硬删）—— 这里用全量替换策略：先删除再插入
      await tx.delete(userRoles).where(eq(userRoles.userId, userId));

      if (roleIds.length > 0) {
        // 校验角色存在
        const validRoles = await tx
          .select({ id: roles.id })
          .from(roles)
          .where(inArray(roles.id, roleIds));
        if (validRoles.length !== roleIds.length) {
          throw new BadRequestException('部分角色不存在');
        }
        const values = roleIds.map((rid: string) => ({
          userId,
          roleId: rid,
          isActive: true,
        }));
        await tx.insert(userRoles).values(values);
      }
    });
    return { success: true };
  }

  async removeUserRole(userId: string, roleId: string): Promise<void> {
    const deleted: { id: string }[] = await this.db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)))
      .returning({ id: userRoles.id });
    if (deleted.length === 0) {
      throw new NotFoundException('用户角色关系不存在');
    }
  }

  async getRoleUsers(roleId: string): Promise<RoleUserItem[]> {
    const rows = await this.db
      .select({
        id: userRoles.id,
        userId: userRoles.userId,
        isActive: userRoles.isActive,
        createdAt: userRoles.createdAt,
      })
      .from(userRoles)
      .where(and(eq(userRoles.roleId, roleId), eq(userRoles.isActive, true)))
      .orderBy(asc(userRoles.createdAt));

    const userIds = rows.map((row) => row.userId);
    const userInfoMap = await this._loadUsersInfo(userIds);

    return rows.map((row) => {
      const info = userInfoMap.get(row.userId) ?? { userName: '', department: '', email: '' };
      return {
        id: row.id,
        userId: row.userId,
        userName: info.userName,
        department: info.department,
        email: info.email,
        roleIds: [roleId],
        isActive: row.isActive ?? true,
        createdAt: row.createdAt.toISOString(),
      };
    });
  }

  async getUserList(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    roleId?: string;
  }): Promise<UserListResponse> {
    const { page, pageSize, roleId } = params;
    const offset = (page - 1) * pageSize;

    // 获取所有唯一用户ID
    const baseConditions = [eq(userRoles.isActive, true)];
    if (roleId) {
      baseConditions.push(eq(userRoles.roleId, roleId));
    }

    // 统计总数 — 使用 SQL COUNT(DISTINCT) 避免全量加载
    const totalResult = await this.db
      .select({ count: sql<number>`count(distinct ${userRoles.userId})` })
      .from(userRoles)
      .where(and(...baseConditions));
    const total = Number(totalResult[0]?.count ?? 0);

    // 分页获取用户（用聚合min createdAt保持每页稳定排序）
    const userRows = await this.db
      .select({
        userId: userRoles.userId,
        createdAt: sql<Date>`min(${userRoles.createdAt})`,
      })
      .from(userRoles)
      .where(and(...baseConditions))
      .groupBy(userRoles.userId)
      .orderBy(sql`min(${userRoles.createdAt})`)
      .limit(pageSize)
      .offset(offset);

    const userIds = userRows.map((u) => u.userId);

    // 加载所有用户对应的角色
    const allUserRoles = userIds.length > 0
      ? await this.db.select({
          userId: userRoles.userId,
          roleId: userRoles.roleId,
        }).from(userRoles).where(
          and(inArray(userRoles.userId, userIds), eq(userRoles.isActive, true))
        )
      : [];

    const roleMap = new Map<string, string[]>();
    for (const ur of allUserRoles) {
      const arr = roleMap.get(ur.userId) ?? [];
      arr.push(ur.roleId);
      roleMap.set(ur.userId, arr);
    }

    const userInfoMap = await this._loadUsersInfo(userIds);

    const items: RoleUserItem[] = userRows.map((row) => {
      const info = userInfoMap.get(row.userId) ?? { userName: '', department: '', email: '' };
      return {
        id: row.userId,
        userId: row.userId,
        userName: info.userName,
        department: info.department,
        email: info.email,
        roleIds: roleMap.get(row.userId) ?? [],
        isActive: true,
        createdAt: typeof row.createdAt === 'string' ? row.createdAt : row.createdAt.toISOString(),
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 批量加载用户信息（带 TTL 内存缓存，避免重复查询）
   * 返回 Map<userId, { userName, department, email }>
   */
  private async _loadUsersInfo(
    userIds: string[],
  ): Promise<Map<string, { userName: string; department: string; email: string }>> {
    const result = new Map<string, { userName: string; department: string; email: string }>();
    if (userIds.length === 0) return result;

    const missingIds: string[] = [];

    // 先从缓存取
    for (const uid of userIds) {
      const cached = await this.cache.get<{
        userName: string;
        department: string;
        email: string;
      }>(`roles:userinfo:${uid}`);
      if (cached) {
        result.set(uid, cached);
      } else {
        missingIds.push(uid);
      }
    }

    if (missingIds.length === 0) return result;

    try {
      // 分批，每批 100 个
      const batchSize = 100;
      for (let i = 0; i < missingIds.length; i += batchSize) {
        const batch = missingIds.slice(i, i + batchSize);
        const users = await this.authNPaasService.listUsersByIds(batch);
        for (let j = 0; j < batch.length; j++) {
          const uid = batch[j];
          const user = users[j];
          if (!user) {
            result.set(uid, { userName: '', department: '', email: '' });
            continue;
          }
          // name 可能是多语对象
          const nameObj = user.name as
            | { zh_cn?: string; en_us?: string }
            | string
            | undefined;
          let userName = '';
          if (typeof nameObj === 'string') {
            userName = nameObj;
          } else if (nameObj && typeof nameObj === 'object') {
            userName = nameObj.zh_cn || nameObj.en_us || '';
          }

          // 部门名（取主部门 / 第一个部门）
          let department = '';
          const deptVal = (user as unknown as Record<string, unknown>).department;
          if (typeof deptVal === 'string') {
            department = deptVal;
          } else if (
            Array.isArray(deptVal) &&
            deptVal.length > 0 &&
            typeof deptVal[0] === 'string'
          ) {
            department = deptVal[0];
          }

          // 邮箱
          const emailVal = (user as unknown as Record<string, unknown>).email;
          const email = typeof emailVal === 'string' ? emailVal : '';

          const info = { userName, department, email };
          result.set(uid, info);
          // 写入缓存
          await this.cache.set(
            `roles:userinfo:${uid}`,
            info,
            this.CACHE_TTL_MS,
          );
        }
      }
    } catch (err: unknown) {
      this.logger.error(
        `_loadUsersInfo failed: ${JSON.stringify(err)}`,
      );
      // 失败时对缺失的 ID 回填空值，避免重复请求
      for (const uid of missingIds) {
        if (!result.has(uid)) {
          result.set(uid, { userName: '', department: '', email: '' });
        }
      }
    }

    return result;
  }

  /**
   * 获取用户信息（带缓存），供其他模块查询用户部门等信息
   */
  async getUserInfo(userId: string): Promise<{
    userName: string;
    department: string;
    email: string;
  }> {
    const map = await this._loadUsersInfo([userId]);
    return map.get(userId) ?? { userName: '', department: '', email: '' };
  }

  /**
   * 获取用户指定模块的数据权限范围
   * 合并用户所有角色的数据权限，取最高级别
   * 系统角色（isSystem=true）默认 all 权限
   */
  async getUserDataScope(
    userId: string,
    module: 'expenses' | 'fixedAssets' | 'inventory',
  ): Promise<DataScope> {
    // 获取用户所有活跃角色
    type Joined = RoleSelect;
    const joined: Joined[] = await this.db
      .select({
        id: roles.id,
        roleCode: roles.roleCode,
        roleName: roles.roleName,
        roleDescription: roles.roleDescription,
        isSystem: roles.isSystem,
        isActive: roles.isActive,
        menuPermissions: roles.menuPermissions,
        dataPermissions: roles.dataPermissions,
        operationPermissions: roles.operationPermissions,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
        createdBy: roles.createdBy,
        updatedBy: roles.updatedBy,
      })
      .from(roles)
      .innerJoin(userRoles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.isActive, true),
          eq(roles.isActive, true),
        ),
      );

    // 如果没有任何角色，尝试分配默认角色
    if (joined.length === 0) {
      const defaultRole = await this.db
        .select({ id: roles.id, dataPermissions: roles.dataPermissions })
        .from(roles)
        .where(eq(roles.roleCode, 'employee'));
      if (defaultRole.length > 0) {
        try {
          await this.db.insert(userRoles).values({
            userId,
            roleId: defaultRole[0].id,
            isActive: true,
          });
          const dp = (defaultRole[0].dataPermissions ?? {}) as DataPermissions;
          return dp[module] ?? 'personal';
        } catch (err: unknown) {
          this.logger.warn(
            `自动分配默认角色失败: ${userId}, ${JSON.stringify(err)}`,
          );
          return 'personal';
        }
      }
      return 'personal';
    }

    let highestScope: DataScope = 'personal';
    let highestRank = 0;

    for (const role of joined) {
      // 系统角色默认 all
      if (role.isSystem) {
        return 'all';
      }
      const dp = (role.dataPermissions ?? {}) as DataPermissions;
      const scope = dp[module];
      if (scope) {
        const rank = DATA_SCOPE_RANK[scope];
        if (rank > highestRank) {
          highestRank = rank;
          highestScope = scope;
        }
      }
    }

    return highestScope;
  }

  // ============== 权限合并 ==============

  async getMyPermissions(userId: string): Promise<UserPermissions> {
    type Joined = RoleSelect & { userRoleId: string | null };
    let joined: Joined[] = await this.db
      .select({
        id: roles.id,
        roleCode: roles.roleCode,
        roleName: roles.roleName,
        roleDescription: roles.roleDescription,
        isSystem: roles.isSystem,
        isActive: roles.isActive,
        menuPermissions: roles.menuPermissions,
        dataPermissions: roles.dataPermissions,
        operationPermissions: roles.operationPermissions,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
        createdBy: roles.createdBy,
        updatedBy: roles.updatedBy,
        userRoleId: userRoles.id,
      })
      .from(roles)
      .innerJoin(userRoles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.isActive, true),
          eq(roles.isActive, true),
        ),
      );

    if (joined.length === 0) {
      const defaultRole = await this.db
        .select({
          id: roles.id,
          roleCode: roles.roleCode,
          roleName: roles.roleName,
          roleDescription: roles.roleDescription,
          isSystem: roles.isSystem,
          isActive: roles.isActive,
          menuPermissions: roles.menuPermissions,
          dataPermissions: roles.dataPermissions,
          operationPermissions: roles.operationPermissions,
          createdAt: roles.createdAt,
          updatedAt: roles.updatedAt,
          createdBy: sql<string>`(${roles.createdBy}).user_id`,
          updatedBy: sql<string>`(${roles.updatedBy}).user_id`,
        })
        .from(roles)
        .where(eq(roles.roleCode, 'employee'));
      if (defaultRole.length > 0) {
        try {
          await this.db.insert(userRoles).values({
            userId,
            roleId: defaultRole[0].id,
            isActive: true,
          });
          joined = [
            { ...defaultRole[0], userRoleId: '' as unknown as string },
          ];
        } catch (err: unknown) {
          this.logger.warn(
            `自动分配默认角色失败: ${userId}, ${JSON.stringify(err)}`,
          );
        }
      }
    }

    const mergedMenu: MenuPermissions = {};
    const mergedData: Record<string, DataScope> = {};
    const mergedOperation: Record<string, Record<string, boolean>> = {};

    for (const role of joined) {
      // 菜单权限 OR
      const mp = (role.menuPermissions ?? {}) as MenuPermissions;
      for (const key of Object.keys(mp) as Array<keyof MenuPermissions>) {
        if (mp[key]) {
          mergedMenu[key] = true;
        }
      }

      // 数据权限：取最高级别
      const dp = (role.dataPermissions ?? {}) as DataPermissions;
      for (const key of Object.keys(dp) as Array<keyof DataPermissions>) {
        const scope = dp[key];
        if (scope) {
          const current = mergedData[key as string];
          if (!current || DATA_SCOPE_RANK[scope] > DATA_SCOPE_RANK[current]) {
            mergedData[key as string] = scope;
          }
        }
      }

      // 操作权限 OR
      const op = (role.operationPermissions ?? {}) as OperationPermissions;
      for (const domain of Object.keys(op) as Array<keyof OperationPermissions>) {
        const perms = op[domain];
        if (!perms) continue;
        if (!mergedOperation[domain as string]) {
          mergedOperation[domain as string] = {};
        }
        for (const action of Object.keys(perms)) {
          if ((perms as Record<string, boolean>)[action]) {
            mergedOperation[domain as string][action] = true;
          }
        }
      }
    }

    return {
      menuPermissions: mergedMenu,
      dataPermissions: mergedData as DataPermissions,
      operationPermissions: mergedOperation as unknown as OperationPermissions,
    };
  }
}
