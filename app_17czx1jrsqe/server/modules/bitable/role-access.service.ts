import { Injectable, Logger } from '@nestjs/common';
import { BitableEntityService } from './bitable.entity.service';
import { getEntityFieldNames } from '../data/entity-tables';

export type DataScope = 'all' | 'dept' | 'self';

interface RoleConfigRow {
  roleKey: string;
  menuIds: string[];
  dataScope: string;
}

interface UserContextLike {
  userId?: string;
  userName?: string;
  roles?: string[];
}

const ROLE_TABLE = '系统-角色';
const USER_TABLE = '系统-用户';
const ROLE_CACHE_TTL = 60_000;

/** 实体表前缀 → 侧边栏菜单模块 ID（角色 menu_ids 驱动写权限用） */
const MODULE_PREFIX_TO_MENU: Record<string, string> = {
  '客户': 'customer',
  '广告': 'advertising',
  '视频': 'video',
  '合同': 'contract',
  '财务': 'finance',
  '人资': 'hr',
  '行政': 'admin',
  '任务': 'task',
  '系统': 'system',
};

/** 「本人」数据范围候选列（按优先级取表中第一个存在的列） */
const OWNER_COLUMN_CANDIDATES = [
  '负责人', '负责商务', '申请人', '报备人', '转户人', '创建人', '操作人', '商务姓名', '销售姓名',
];

/** 「本部门」数据范围候选列 */
const DEPT_COLUMN_CANDIDATES = ['所属部门', '申请部门', '部门'];

function parseMenuIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  const s = String(raw ?? '').trim();
  if (!s) return [];
  try {
    const arr: unknown = JSON.parse(s);
    return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
  } catch {
    return s.split(/[,，;；\s]+/).filter(Boolean);
  }
}

function normalizeDataScope(raw: unknown): DataScope | '' {
  const s = String(raw ?? '').trim().toLowerCase();
  if (['all', '全部'].includes(s)) return 'all';
  if (['dept', 'department', 'deptandsub', '本部门', '本部门及下级'].includes(s)) return 'dept';
  if (['self', '本人', '仅本人'].includes(s)) return 'self';
  return '';
}

@Injectable()
export class RoleAccessService {
  private readonly logger = new Logger(RoleAccessService.name);
  private roleCache: { at: number; rows: RoleConfigRow[] } | null = null;
  private deptCache: { at: number; byName: Map<string, string> } | null = null;

  constructor(private readonly entity: BitableEntityService) {}

  invalidate(): void {
    this.roleCache = null;
    this.deptCache = null;
  }

  private async getRoleConfigs(): Promise<RoleConfigRow[]> {
    if (this.roleCache && Date.now() - this.roleCache.at < ROLE_CACHE_TTL) return this.roleCache.rows;
    try {
      const r = await this.entity.list(ROLE_TABLE, { page: 1, pageSize: 200 });
      const rows: RoleConfigRow[] = ((r?.items || []) as Array<Record<string, unknown>>).map((x) => ({
        roleKey: String(x['角色标识'] ?? x['role_key'] ?? '').trim().toLowerCase(),
        menuIds: parseMenuIds(x['菜单权限'] ?? x['menu_ids']),
        dataScope: String(x['数据范围'] ?? x['data_scope'] ?? ''),
      }));
      this.roleCache = { at: Date.now(), rows };
      return rows;
    } catch (err) {
      this.logger.warn(`读取角色配置失败，回退默认权限链路: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  /**
   * 菜单权限驱动的写权限判定。
   * 返回 true/false 表示角色表已有可判定配置；null 表示无配置（调用方回退 TABLE_WRITE_ROLES + 平台 roles）。
   * admin 与未配置角色始终走原有链路，保证现有角色不被改挂。
   */
  async checkModuleWriteAccess(tableKey: string, userRoles: string[]): Promise<boolean | null> {
    const roles = (userRoles || []).map((r: string) => String(r).toLowerCase());
    if (roles.length === 0 || roles.includes('admin')) return null;
    const configs = await this.getRoleConfigs();
    const mine = configs.filter((c) => c.roleKey && roles.includes(c.roleKey) && c.menuIds.length > 0);
    if (mine.length === 0) return null;
    const prefix = tableKey.split('-')[0];
    const moduleId = MODULE_PREFIX_TO_MENU[prefix];
    if (!moduleId) return null;
    return mine.some((c) => c.menuIds.some((id) => id === moduleId || id.startsWith(`${moduleId}-`)));
  }

  /** 数据范围：角色表配置优先，未配置回退 admin=all / manager=本部门 / sales=本人 / 其他=all */
  async resolveDataScope(userRoles: string[]): Promise<DataScope> {
    const roles = (userRoles || []).map((r: string) => String(r).toLowerCase());
    if (roles.length === 0 || roles.includes('admin')) return 'all';
    const configs = await this.getRoleConfigs();
    for (const c of configs) {
      if (!c.roleKey || !roles.includes(c.roleKey)) continue;
      const scope = normalizeDataScope(c.dataScope);
      if (scope) return scope;
    }
    if (roles.includes('manager')) return 'dept';
    if (roles.includes('sales')) return 'self';
    return 'all';
  }

  /** 把数据范围转成列表精确筛选；无法确定列或部门时返回空对象（fail-open，不阻断查询） */
  async buildScopeFilter(tableKey: string, scope: DataScope, user: UserContextLike): Promise<Record<string, string>> {
    if (scope === 'all') return {};
    const cols = getEntityFieldNames(tableKey);
    const userName = String(user?.userName || '');
    if (scope === 'self') {
      const col = OWNER_COLUMN_CANDIDATES.find((c) => cols.has(c));
      if (!col || !userName) return {};
      return { [col]: userName };
    }
    const deptCol = DEPT_COLUMN_CANDIDATES.find((c) => cols.has(c));
    if (!deptCol || !userName) return {};
    const dept = await this.resolveUserDepartment(userName);
    if (!dept) return {};
    return { [deptCol]: dept };
  }

  /** 按姓名在「系统-用户」查所属部门（缓存 60s） */
  private async resolveUserDepartment(userName: string): Promise<string> {
    if (this.deptCache && Date.now() - this.deptCache.at < ROLE_CACHE_TTL) {
      return this.deptCache.byName.get(userName) || '';
    }
    try {
      const r = await this.entity.list(USER_TABLE, { page: 1, pageSize: 200 });
      const byName = new Map<string, string>();
      for (const x of (r?.items || []) as Array<Record<string, unknown>>) {
        const name = String(x['姓名'] ?? x['name'] ?? '').trim();
        const dept = String(x['所属部门'] ?? x['department'] ?? '').trim();
        if (name && dept) byName.set(name, dept);
      }
      this.deptCache = { at: Date.now(), byName };
      return byName.get(userName) || '';
    } catch (err) {
      this.logger.warn(`读取用户部门失败: ${err instanceof Error ? err.message : err}`);
      return '';
    }
  }
}
