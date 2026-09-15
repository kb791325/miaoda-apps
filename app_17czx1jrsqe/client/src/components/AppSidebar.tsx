import { useState, useMemo, memo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { MENU_LIST, type MenuItem } from '@/config/menu';
import { filterMenuByRole } from '@/config/permissions';
import { useRoleMenuConfig } from '@/hooks/useRoleMenuConfig';
import { ChevronDown, ChevronRight, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { t, useLang } from '@/lib/i18n';

function isActivePath(itemPath: string | undefined, currentPath: string): boolean {
  if (!itemPath) return false;
  if (itemPath === '/') return currentPath === '/';
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

function hasActiveChildInChildren(children: MenuItem[], pathname: string): boolean {
  for (const c of children) {
    if (isActivePath(c.path, pathname)) return true;
    if (c.children2) {
      for (const cc of c.children2) {
        if (isActivePath(cc.path, pathname)) return true;
      }
    }
  }
  return false;
}

function ThirdLevelMenuItem({ items }: { items: MenuItem[] }) {
  const { pathname } = useLocation();
  useLang();
  return (
    <div className="ml-4 space-y-0.5 border-l border-sidebar-border/60 pl-2">
      {items.map((cc) => {
        const isActive = isActivePath(cc.path, pathname);
        return (
          <SidebarMenuItem key={cc.id}>
            <SidebarMenuButton asChild isActive={isActive} className="h-8 text-xs">
              <NavLink to={cc.path || '#'} end>
                <span className="truncate">{t(cc.title)}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </div>
  );
}

function SecondLevelMenuItem({ item }: { item: MenuItem }) {
  const { pathname } = useLocation();
  useLang();
  const hasChildren = !!item.children2 && item.children2.length > 0;
  const hasActive =
    (item.children2 && hasActiveChildInChildren(item.children2, pathname)) ||
    isActivePath(item.path, pathname);
  const [open, setOpen] = useState<boolean>(hasActive);
  const isActive = isActivePath(item.path, pathname);

  if (hasChildren) {
    return (
      <div>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setOpen((v) => !v)}
            isActive={hasActive}
            className="h-9"
          >
            <span className="flex-1 truncate text-sm">{t(item.title)}</span>
            {open ? (
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
        {open && <ThirdLevelMenuItem items={item.children2!} />}
      </div>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} className="h-9">
        <NavLink to={item.path || '#'} end>
          <span className="truncate text-sm">{t(item.title)}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function TopLevelMenuItem({ item }: { item: MenuItem }) {
  const { pathname } = useLocation();
  useLang();
  const hasChildren = !!item.children && item.children.length > 0;
  const hasActive =
    (item.children && hasActiveChildInChildren(item.children, pathname)) ||
    isActivePath(item.path, pathname);
  const [open, setOpen] = useState<boolean>(!hasChildren || hasActive);
  const isActive = isActivePath(item.path, pathname);
  const Icon = item.icon;

  if (!hasChildren && item.path) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive} tooltip={t(item.title)}>
          <NavLink to={item.path} end={item.path === '/'} className="flex items-center gap-2">
            {Icon && <Icon className="size-4 shrink-0" />}
            <span className="group-data-[state=collapsed]:hidden truncate">
              {t(item.title)}
            </span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <div>
      <SidebarMenuItem>
        <SidebarMenuButton
            onClick={() => setOpen((v) => !v)}
            isActive={hasActive}
            tooltip={t(item.title)}
          >
            {Icon && <Icon className="size-4 shrink-0" />}
            <span className="flex-1 truncate group-data-[state=collapsed]:hidden">
              {t(item.title)}
            </span>
          <span className="group-data-[state=collapsed]:hidden">
            {open ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {open && hasChildren && (
        <div className="space-y-0.5 group-data-[state=collapsed]:hidden">
          {item.children!.map((child) => (
            <SecondLevelMenuItem key={child.id} item={child} />
          ))}
        </div>
      )}
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  admin: '管理员',
  manager: '部门经理',
  sales: '商务',
  finance: '财务',
  hr: '人事',
};

const DATA_SCOPE_LABEL: Record<string, string> = {
  all: '全部数据',
  department: '本部门',
  'department_and_sub': '本部门及下级',
  self: '仅本人',
};

function SidebarUserCard() {
  const { user } = useApp();
  useLang();
  if (!user) return null;
  const roleLabel = ROLE_LABEL[user.role] || user.role;
  const scopeLabel = DATA_SCOPE_LABEL[user.dataScope] || user.dataScope;
  const initial = user.name?.charAt(0) || 'U';

  return (
    <div className="flex items-center gap-2 group-data-[state=collapsed]:justify-center">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#0E42D2] text-primary-foreground text-sm font-semibold">
        {initial}
      </div>
      <div className="flex-1 min-w-0 group-data-[state=collapsed]:hidden">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{user.name}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
            {t(roleLabel)}
          </Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Shield className="size-3 shrink-0" />
          <span className="truncate">{t('数据范围')}：{t(scopeLabel)}</span>
        </div>
      </div>
    </div>
  );
}

function AppSidebar() {
  useLang();
  const { user } = useApp();
  const roleConfig = useRoleMenuConfig(user?.role);
  const menuList = useMemo(
    () => filterMenuByRole(MENU_LIST, user?.role || 'sales', roleConfig),
    [user?.role, roleConfig],
  );
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
        <div className="flex items-center gap-2 group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#1677FF] to-[#0E42D2] text-primary-foreground text-xs font-bold">
            {t('牧唐')}
          </div>
          <div className="flex-1 min-w-0 group-data-[state=collapsed]:hidden">
            <div className="text-sm font-semibold truncate">{t('牧唐数智一体化')}</div>
            <div className="text-xs text-muted-foreground truncate">{t('ERP 管理系统')}</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="p-2">
          <SidebarMenu>
            {menuList.map((item) => (
              <TopLevelMenuItem key={item.id} item={item} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-3 py-3">
        <div className="space-y-3">
          <SidebarUserCard />
          <div className="flex items-center gap-2 group-data-[state=collapsed]:justify-center">
            <div className="size-2 shrink-0 rounded-full bg-emerald-500" />
            <div className="flex-1 min-w-0 group-data-[state=collapsed]:hidden">
              <div className="text-xs text-muted-foreground">{t('系统运行正常')}</div>
              <div className="text-[10px] text-muted-foreground/70">v1.0.0</div>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default memo(AppSidebar);
