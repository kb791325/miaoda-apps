import { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { logger } from '@lark-apaas/client-toolkit/logger';
import { initPerformanceMonitoring } from '@client/src/utils/performance';
import {
  LayoutDashboard,
  ClipboardCheck,
  Receipt,
  Package,
  FileCheck2,
  Tags,
  BarChart3,
  Settings,
  PanelLeft,
  Wallet,
  ScrollText,
  Bell,
  Sun,
  Moon,
  LineChart,
  Boxes,
  Shield,
  ClipboardList,
  Paperclip,
  Truck,
  Wrench,
  Key,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import {
  useAppInfo,
} from "@lark-apaas/client-toolkit/hooks/useAppInfo";
import { Toaster } from "@/components/ui/sonner";
import * as notificationsApi from "@client/src/api/notifications";
import { useTheme } from "@client/src/hooks/useTheme";

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navGroups: NavGroup[] = [
  {
    label: "数据看板",
    items: [
      { path: "/dashboard", label: "综合数据看板", icon: LayoutDashboard },
      { path: "/inventory-dashboard", label: "资产盘点看板", icon: BarChart3 },
    ],
  },
  {
    label: "资产管理",
    items: [
      { path: "/expenses", label: "行政支出管理", icon: Receipt },
      { path: "/fixed-assets", label: "固定资产管理", icon: Package },
      { path: "/inventory-checks", label: "资产盘点执行", icon: FileCheck2 },
      { path: "/asset-reservations", label: "资产预约", icon: ClipboardList },
    ],
  },
  {
    label: "基础配置",
    items: [
      { path: "/budget", label: "预算管理", icon: Wallet },
      { path: "/categories", label: "类目管理", icon: Tags },
    ],
  },
  {
    label: "报表与审计",
    items: [
      { path: "/reports", label: "数据统计与报表", icon: LineChart },
      { path: "/audit-logs", label: "操作审计日志", icon: ScrollText },
    ],
  },
  {
    label: "IT 运维",
    items: [
      { path: "/suppliers", label: "供应商管理", icon: Truck },
      { path: "/work-orders", label: "IT 报修工单", icon: Wrench },
      { path: "/licenses", label: "许可证管理", icon: Key },
    ],
  },
  {
    label: "系统管理",
    items: [
      { path: "/settings", label: "系统设置", icon: Settings },
      { path: "/attachments", label: "附件管理", icon: Paperclip },
    ],
  },
];

const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

const LayoutContent = () => {
  const { pathname } = useLocation();
  const { appName } = useAppInfo();
  const { theme, toggleTheme } = useTheme();
  const activeItem = allNavItems.find((item) => pathname === item.path);
  const activeTitle = activeItem?.label || "综合数据看板";
  const [unreadCount, setUnreadCount] = useState(0);

  const isFetchingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    initPerformanceMonitoring();
  }, []);

  useEffect(() => {
    const fetchUnread = () => {
      if (isFetchingRef.current) return;
      if (document.visibilityState === 'hidden') return;
      isFetchingRef.current = true;
      notificationsApi
        .getUnreadCount()
        .then((data) => {
          setUnreadCount(data.count ?? 0);
        })
        .catch((err: unknown) => {
          logger.error('获取未读通知数量失败', err);
        })
        .finally(() => {
          isFetchingRef.current = false;
        });
    };

    fetchUnread();
    timerRef.current = window.setInterval(fetchUnread, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnread();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarHeader className="border-b border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
                <Link to="/dashboard">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-sm shadow">
                    牧
                  </div>
                  <div className="flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
                    <span className="text-base font-bold leading-none text-foreground">
                      {appName || "牧唐行政看板"}
                    </span>
                    <span className="text-xs text-sidebar-foreground/60 leading-none">
                      Admin Platform
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="gap-0">
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="relative text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-primary/10 data-[active=true]:text-white transition-all"
                        >
                          <Link to={item.path} className="flex items-center gap-3 py-2.5">
                            <div className="relative flex-shrink-0">
                              <Icon className="size-[18px]" />
                              {isActive && (
                                <span className="absolute -left-[14px] top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-sidebar-primary" />
                              )}
                            </div>
                            <span className="flex-1 truncate text-sm font-medium">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="px-3 py-3 text-xs text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden text-center">
            v1.0.0
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="flex items-center gap-3 px-6 py-3 bg-card border-b border-border">
          <SidebarTrigger className="hover:bg-accent rounded-md">
            <PanelLeft className="size-5 text-muted-foreground" />
          </SidebarTrigger>
          <div className="h-6 w-px bg-border" />
          <Breadcrumb className="self-center">
            <BreadcrumbList>
              <BreadcrumbItem className="text-foreground font-semibold text-base">
                {activeTitle}
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            >
              {theme === 'dark' ? (
                <Sun className="size-4.5" />
              ) : (
                <Moon className="size-4.5" />
              )}
            </button>
            <Link
              to="/notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              title="通知中心"
            >
              <Bell className="size-4.5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground leading-none ring-2 ring-card">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
        <Toaster richColors closeButton />
      </main>
    </>
  );
};

const Layout = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default Layout;
