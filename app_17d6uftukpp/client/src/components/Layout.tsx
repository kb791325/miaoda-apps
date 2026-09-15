import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import Header from '@/components/Header';
import { recordLoginEvent } from '@/lib/login-log';

/** 商务蓝深色侧边栏主题 (覆盖默认 CSS 变量, 命名空间 token 自动生效) */
const SIDEBAR_THEME = {
  '--sidebar': 'hsl(221 45% 12%)',
  '--sidebar-foreground': 'hsl(214 30% 86%)',
  '--sidebar-primary': 'hsl(221 83% 53%)',
  '--sidebar-primary-foreground': 'hsl(0 0% 100%)',
  '--sidebar-accent': 'hsl(220 38% 20%)',
  '--sidebar-accent-foreground': 'hsl(210 50% 96%)',
  '--sidebar-border': 'hsl(220 32% 22%)',
  '--sidebar-ring': 'hsl(221 83% 53%)',
} as CSSProperties;

export const Layout = () => {
  useEffect(() => {
    recordLoginEvent({ status: '成功' });
  }, []);

  return (
    <div style={SIDEBAR_THEME} className="min-h-screen bg-background">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-col overflow-x-hidden">
          <Header />
          <main className="w-full flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
};