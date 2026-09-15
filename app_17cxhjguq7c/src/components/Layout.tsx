import { Outlet } from 'react-router-dom';

import AppSidebar from '@/components/AppSidebar';
import Header from '@/components/Header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';

export const Layout = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex min-w-0 flex-col overflow-x-hidden bg-[#F4F7F9]">
        <Header />
        <main className="w-full flex-1 overflow-y-auto px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </SidebarInset>
      <Toaster position="top-center" richColors />
    </SidebarProvider>
  );
};
