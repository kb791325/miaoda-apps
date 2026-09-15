import { Link, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  ChefHat,
  LayoutDashboard,
  LogIn,
  LogOut,
  Megaphone,
  MessagesSquare,
  ShieldCheck,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAppInfo } from "@lark-apaas/client-toolkit/hooks/useAppInfo";
import { useCurrentUserProfile } from "@lark-apaas/client-toolkit/hooks/useCurrentUserProfile";
import { authClient, CanRole } from "@lark-apaas/client-toolkit/auth";
import { useLoginState } from "@client/src/hooks/use-login-state";
import { Button } from "@client/src/components/ui/button";
import { ALL_ROLES, PAGE_ROLE_MAP } from "@shared/roles";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@client/src/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@client/src/components/ui/breadcrumb";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@client/src/components/ui/avatar";
import { Image } from '@client/src/components/ui/image';

interface NavItem {
  path: string;
  label: string;
  title: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "工作台", title: "工作台", icon: LayoutDashboard },
  {
    path: "/reports",
    label: "经营报表",
    title: "经营报表",
    icon: BarChart3,
  },
  {
    path: "/content-center",
    label: "招生内容中心",
    title: "招生内容中心",
    icon: Megaphone,
  },
  {
    path: "/leads",
    label: "招生线索",
    title: "招生线索",
    icon: Target,
  },
  {
    path: "/consultation",
    label: "智能咨询",
    title: "智能咨询",
    icon: MessagesSquare,
  },
  {
    path: "/courses",
    label: "课程列表",
    title: "课程列表",
    icon: ChefHat,
  },
  { path: "/students", label: "学员管理", title: "学员管理", icon: Users },
  {
    path: "/schedules",
    label: "课程排期",
    title: "课程排期",
    icon: CalendarDays,
  },
  {
    path: "/permissions",
    label: "权限管理",
    title: "权限管理",
    icon: ShieldCheck,
  },
];

const TruncatedTitle = ({ title }: { title: string }) => (
  <span className="max-w-[240px] truncate" title={title}>
    {title}
  </span>
);

const LayoutContent = () => {
  const { pathname } = useLocation();
  const { appName, appLogo } = useAppInfo();
  const userInfo = useCurrentUserProfile();
  const loginState = useLoginState();

  const handleLogin = (): void => {
    authClient.session.redirectToLogin();
  };

  const handleSignOut = (): void => {
    authClient.session.signOut().then((result) => {
      if (!result.error) {
        authClient.session.redirectToLogin();
      }
    });
  };

  const activeItem = NAV_ITEMS.find(
    (item) =>
      pathname === item.path ||
      (item.path !== "/" && pathname.startsWith(`${item.path}/`)),
  );
  const activeTitle = activeItem?.title ?? "工作台";

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground overflow-hidden">
                    {appLogo ? (
                      <Image
                        src={appLogo}
                        alt={appName}
                        className="size-8 object-cover"
                      />
                    ) : (
                      <ChefHat className="size-4" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="font-bold">{appName}</span>
                    <span className="text-xs text-muted-foreground">
                      餐饮培训一体化管理
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => {
                  const itemRoles = PAGE_ROLE_MAP[item.path] ?? ALL_ROLES;
                  const menuItem = (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.path}
                      >
                        <Link to={item.path}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                  return (
                    <CanRole key={item.path} roles={itemRoles} fallback={null}>
                      {menuItem}
                    </CanRole>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              {loginState === "anonymous" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleLogin}
                >
                  <LogIn className="size-4" />
                  登录
                </Button>
              ) : (
                <SidebarMenuButton asChild>
                  <div className="flex w-full items-center gap-2">
                    <Avatar className="size-7">
                      {userInfo.user_id ? (
                        <AvatarImage
                          src={userInfo.avatar}
                          alt={userInfo.name}
                        />
                      ) : null}
                      <AvatarFallback>
                        {(userInfo.name ?? "游客").slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm">
                      {userInfo.user_id ? userInfo.name : "游客"}
                    </span>
                    {loginState === "logged" ? (
                      <button
                        type="button"
                        title="退出登录"
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={handleSignOut}
                      >
                        <LogOut className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <main className="flex-1 flex flex-col overflow-hidden p-6">
        <header className="flex items-center gap-2 mb-6">
          <SidebarTrigger />
          <Breadcrumb className="self-center">
            <BreadcrumbList>
              <BreadcrumbItem className="text-foreground font-medium">
                <TruncatedTitle title={activeTitle} />
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
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
