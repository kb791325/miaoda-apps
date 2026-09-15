import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { findBreadcrumb } from '@/config/menu';
import { canAccessPath } from '@/config/permissions';
import NoPermissionPage from '@/pages/NoPermissionPage/NoPermissionPage';
import { Loader2 } from 'lucide-react';
import { t } from '@/lib/i18n';

const SITE_NAME = '牧唐数智一体化';

export function Layout() {
  const { isLoggedIn, user, isLoading } = useApp();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/login') {
      document.title = `登录 - ${SITE_NAME}`;
      return;
    }
    const crumbs = findBreadcrumb(location.pathname);
    const pageTitle = crumbs.length > 0 ? crumbs[crumbs.length - 1].title : '';
    if (pageTitle) {
      document.title = `${pageTitle} - ${SITE_NAME}`;
    } else {
      document.title = SITE_NAME;
    }
  }, [location.pathname]);

  // 正在加载平台身份（useCurrentUserProfile 异步解析中）
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm">{t('正在验证登录状态...')}</p>
        </div>
      </div>
    );
  }

  // 未登录 → 跳转到登录页，附带回跳路径
  if (!isLoggedIn) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // 角色路由守卫：无权限路径展示无权限页
  const accessible = !user || canAccessPath(location.pathname, user.role);

  return (
    <>
      <div className="fixed inset-0 -z-10 overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      >
        <source src="/spark/app/app_17czx1jrsqe/runtime/api/v1/storage/object/bucket_aadkseifnp2fu/1875741398407227.mp4" type="video/mp4" />
      </video>
    </div>
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex min-h-screen flex-col min-w-0 overflow-x-hidden bg-transparent">
        <Header />
        <main className="flex-1 w-full overflow-y-auto p-4 md:p-6">
          <div className="backdrop-blur-sm bg-white/60 rounded-xl min-h-full p-6">
            {accessible ? <Outlet /> : <NoPermissionPage />}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
    </>
  );
}
