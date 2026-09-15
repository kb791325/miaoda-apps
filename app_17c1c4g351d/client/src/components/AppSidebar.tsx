import { NavLink, useLocation } from 'react-router-dom';
import { useAuth, ROLE_SUBJECT } from '@lark-apaas/client-toolkit/auth';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  BarChart3,
  Package,
  TrendingUp,
  Users,
  Headphones,
  Warehouse,
  Sparkles,
  Settings,
} from 'lucide-react';
import { ROUTE_ROLES } from '@shared/roles';

const NAV_ITEMS = [
  { path: '/', label: '经营总览', icon: BarChart3 },
  { path: '/products', label: '商品分析', icon: Package },
  { path: '/traffic', label: '流量与投放', icon: TrendingUp },
  { path: '/customers', label: '客户分析', icon: Users },
  { path: '/aftersale', label: '售后管理', icon: Headphones },
  { path: '/inventory', label: '库存管理', icon: Warehouse },
  { path: '/ai-review', label: 'AI 智能复盘助手', icon: Sparkles },
  { path: '/settings', label: '系统设置', icon: Settings },
];

export default function AppSidebar() {
  const { pathname } = useLocation();
  const { ability, isLoading } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (isLoading) return true;
    const roles = ROUTE_ROLES[item.path];
    if (!roles) return true;
    return roles.some((role) => ability.can(role, ROLE_SUBJECT));
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3 group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:justify-center">
          <div className="size-8 shrink-0 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">
            数
          </div>
          <div className="flex-1 min-w-0 group-data-[state=collapsed]:hidden">
            <div className="text-sm font-semibold text-sidebar-foreground truncate">
              电商数据复盘
            </div>
            <div className="text-xs text-sidebar-foreground/60 truncate">
              智能经营分析平台
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="p-2">
          <SidebarMenu>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/'
                  ? pathname === '/'
                  : pathname === item.path || pathname.startsWith(`${item.path}/`);
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={item.label} isActive={isActive}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      className="flex items-center gap-2"
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="group-data-[state=collapsed]:hidden">
                        {item.label}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
