import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Truck,
  Package,
  ArrowLeftRight,
  Users,
  ClipboardList,
  LogOut,
  ShieldCheck,
  UserCog,
  Zap,
  Wallet,
  FileSpreadsheet,
  House,
} from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import GlobalSearch from './GlobalSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppInfo } from '@lark-apaas/client-toolkit/hooks/useAppInfo';
import { Outlet } from 'react-router-dom';
import { Image } from '@client/src/components/ui/image';
import { useAuth } from '@client/src/hooks/use-auth';

interface NavItem {
  path: string;
  label: string;
  icon: typeof House;
  /** 不填则登录后始终可见 */
  perm?: string;
  group: 'business' | 'system';
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: '工作台', icon: House, group: 'business' },
  { path: '/orders', label: '订单管理', icon: ShoppingCart, perm: 'order:view', group: 'business' },
  { path: '/shipments', label: '配送安装管理', icon: Truck, perm: 'shipment:view', group: 'business' },
  { path: '/inventory', label: '库存管理', icon: Package, perm: 'product:view', group: 'business' },
  { path: '/stock-flows', label: '库存流水', icon: ArrowLeftRight, perm: 'stockflow:view', group: 'business' },
  { path: '/customers', label: '客户管理', icon: Users, perm: 'customer:view', group: 'business' },
  { path: '/follow-ups', label: '跟进记录', icon: ClipboardList, perm: 'followup:view', group: 'business' },
  { path: '/finance', label: '财务仪表盘', icon: Wallet, perm: 'report:finance', group: 'business' },
  { path: '/profit-report', label: '利润报表', icon: FileSpreadsheet, perm: 'report:finance', group: 'business' },
  { path: '/users', label: '用户管理', icon: UserCog, perm: 'user:manage', group: 'system' },
  { path: '/roles', label: '角色权限', icon: ShieldCheck, perm: 'role:manage', group: 'system' },
];

const LayoutContent = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { appName, appLogo } = useAppInfo();
  const { user, hasPerm, logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.perm || hasPerm(item.perm),
  );
  const businessItems = visibleItems.filter((item) => item.group === 'business');
  const systemItems = visibleItems.filter((item) => item.group === 'system');

  const activeItem =
    NAV_ITEMS.find(
      (item) => item.path !== '/' && pathname.startsWith(item.path),
    ) ?? NAV_ITEMS[0];

  const displayName = user?.name ?? '未登录';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    {appLogo ? (
                      <Image
                        src={appLogo}
                        alt={appName}
                        className="size-5 rounded"
                      />
                    ) : (
                      <Zap className="size-5" />
                    )}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">
                      {appName || '家速达电器订单管理'}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      电器电商运营后台
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>功能模块</SidebarGroupLabel>
            <SidebarMenu>
              {businessItems.map((item) => {
                const isActive =
                  item.path === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      asChild
                      className="h-12 gap-3 text-base data-[active=true]:bg-accent data-[active=true]:font-semibold data-[active=true]:text-primary data-[active=true]:shadow-sm"
                    >
                      <Link to={item.path}>
                        <span
                          className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted/60 text-muted-foreground'
                          }`}
                        >
                          <item.icon className="size-5" />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
          {systemItems.length > 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel>系统管理</SidebarGroupLabel>
              <SidebarMenu>
                {systemItems.map((item) => {
                  const isActive =
                    item.path === '/'
                      ? pathname === '/'
                      : pathname.startsWith(item.path);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        asChild
                        className="h-11 gap-3 data-[active=true]:bg-accent data-[active=true]:font-semibold data-[active=true]:text-primary data-[active=true]:shadow-sm"
                      >
                        <Link to={item.path}>
                          <span
                            className={`flex size-7 items-center justify-center rounded-md transition-colors ${
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted/60 text-muted-foreground'
                            }`}
                          >
                            <item.icon className="size-4" />
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ) : null}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {displayName.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-medium">{displayName}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user?.roleName ?? ''}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-40">
                  <DropdownMenuItem onClick={() => setLogoutOpen(true)}>
                    <LogOut className="mr-2 size-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-6 transition-[width,height]">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="!h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link to="/">首页</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold">
                  {activeItem.label}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <GlobalSearch />
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <div className="w-full">
            <Outlet />
          </div>
        </div>
      </main>
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出登录？</AlertDialogTitle>
            <AlertDialogDescription>
              退出后需要重新登录才能继续管理订单与库存。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              退出登录
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const Layout = () => (
  <SidebarProvider>
    <LayoutContent />
  </SidebarProvider>
);

export default Layout;
