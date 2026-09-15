import { NavLink, useLocation } from 'react-router-dom';
import { Clapperboard, Cpu, FileText, LayoutDashboard, PlayCircle, Sparkles } from 'lucide-react';

import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

const NAV_ITEMS = [
  { path: '/', label: '工作台', icon: LayoutDashboard },
  { path: '/materials', label: '爆款素材', icon: Clapperboard },
  { path: '/scripts', label: '分镜脚本', icon: FileText },
  { path: '/tasks', label: '生成任务', icon: Cpu },
  { path: '/videos', label: '视频成品', icon: PlayCircle },
  { path: '/prompts', label: '提示词模板', icon: Sparkles },
];

export default function AppSidebar() {
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="group-data-[state=collapsed]:justify-center flex items-center gap-2 px-2 py-3 group-data-[state=collapsed]:px-0">
          <div className="flex size-8 shrink-0 items-center justify-center bg-[#0033A0] text-sm font-bold text-primary-foreground rounded-none">
            AI
          </div>
          <div className="min-w-0 flex-1 group-data-[state=collapsed]:hidden">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">AI视频创作工坊</div>
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">Video Workshop</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="p-2">
          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(`${item.path}/`);
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild tooltip={item.label} isActive={isActive}>
                    <NavLink to={item.path} end={item.path === '/'} className="flex items-center gap-2">
                      <Icon className="size-4 shrink-0" />
                      <span className="group-data-[state=collapsed]:hidden">{item.label}</span>
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
