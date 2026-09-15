// EXPORTS: Role, ROLE_LABELS, ROLE_DESCRIPTIONS, filterMenuByRole, canAccessPath
import { MENU_LIST, type MenuItem } from '@/config/menu';

export type Role = 'admin' | 'manager' | 'sales' | 'finance' | 'hr';

/** 角色配置（从 Bitable 读取），包含菜单 ID 列表 */
export interface RoleConfig {
  menu_ids: string[];
}

export const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  manager: '部门经理',
  sales: '商务',
  finance: '财务',
  hr: '人事',
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: '全模块管理权限，可查看与操作所有业务数据',
  manager: '部门业务管理权限，负责团队客户、业务审批与绩效',
  sales: '商务工作台，负责客户跟进、广告业务与合同签订',
  finance: '财务模块权限，负责收付款、发票、账户与结算管理',
  hr: '人资行政权限，负责招聘、考勤、薪酬与行政采购',
};

function itemAllowed(item: MenuItem, role: string): boolean {
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.includes(role);
}

/** 按角色过滤菜单树：保留角色可见的模块/菜单项，空分组自动剔除。
 *  当传入 roleConfig（从 Bitable 读取的 menu_ids）时，按菜单 ID 匹配；
 *  否则使用硬编码角色过滤。 */
export function filterMenuByRole(items: MenuItem[], role: string, roleConfig?: RoleConfig): MenuItem[] {
  // 传入 Bitable 角色配置时，按菜单 ID 精确匹配
  if (roleConfig) {
    const allowedIds = new Set(roleConfig.menu_ids);
    const result: MenuItem[] = [];
    for (const item of items) {
      if (!allowedIds.has(item.id)) continue;
      const copy: MenuItem = { ...item };
      if (copy.children) copy.children = filterMenuByRole(copy.children, role, roleConfig);
      if (copy.children2) copy.children2 = filterMenuByRole(copy.children2, role, roleConfig);
      const hasChildren = (copy.children && copy.children.length > 0) || (copy.children2 && copy.children2.length > 0);
      if (!copy.path && !hasChildren) continue;
      result.push(copy);
    }
    return result;
  }
  if (role === 'admin') return items;
  const result: MenuItem[] = [];
  for (const item of items) {
    if (!itemAllowed(item, role)) continue;
    const copy: MenuItem = { ...item };
    if (copy.children) copy.children = filterMenuByRole(copy.children, role);
    if (copy.children2) copy.children2 = filterMenuByRole(copy.children2, role);
    const hasChildren = (copy.children && copy.children.length > 0) || (copy.children2 && copy.children2.length > 0);
    // 既无跳转路径又无可见子项的分组直接剔除
    if (!copy.path && !hasChildren) continue;
    result.push(copy);
  }
  return result;
}

/** 所有角色均可访问的路由（不在菜单配置中） */
const PUBLIC_PATHS = ['/system/personal', '/login'];

/** 判断当前路径是否允许指定角色访问（详情页按最长前缀匹配菜单项，roles 沿父级继承）。
 *  当传入 roleConfig（从 Bitable 读取的 menu_ids）时，按菜单 ID 匹配；
 *  否则使用硬编码角色过滤。 */
export function canAccessPath(pathname: string, role: string, roleConfig?: RoleConfig): boolean {
  // 传入 Bitable 角色配置时，按菜单 ID 精确匹配
  if (roleConfig) {
    const allowedIds = new Set(roleConfig.menu_ids);
    let best: { path: string; id: string } | null = null;
    const visit = (items: MenuItem[]) => {
      for (const item of items) {
        if (item.path && (pathname === item.path || pathname.startsWith(`${item.path}/`))) {
          if (!best || item.path.length > best.path.length) {
            best = { path: item.path, id: item.id };
          }
        }
        if (item.children) visit(item.children);
        if (item.children2) visit(item.children2);
      }
    };
    visit(MENU_LIST);
    if (!best) return true;
    return allowedIds.has(best.id);
  }
  if (role === 'admin') return true;
  if (PUBLIC_PATHS.includes(pathname)) return true;

  let best: { path: string; roles?: string[] } | null = null;
  const visit = (items: MenuItem[], inherited?: string[]) => {
    for (const item of items) {
      const roles = item.roles ?? inherited;
      if (item.path && (pathname === item.path || pathname.startsWith(`${item.path}/`))) {
        if (!best || item.path.length > best.path.length) {
          best = { path: item.path, roles };
        }
      }
      if (item.children) visit(item.children, roles);
      if (item.children2) visit(item.children2, roles);
    }
  };
  visit(MENU_LIST);

  // 不在菜单体系内的路由默认放行（如根路径重定向）
  if (!best) return true;
  const matched = best as { path: string; roles?: string[] };
  if (!matched.roles || matched.roles.length === 0) return true;
  return matched.roles.includes(role);
}
