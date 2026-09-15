import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, FileBarChart2, LayoutDashboard, PieChart, Star } from 'lucide-react';
import { avatarImages, useCurrentUserProfile } from '@lark-apaas/client-toolkit';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MODULES, MODULE_ORDER, SUB_NAV } from '@/config/modules';
import { ANALYTICS_NAV } from '@/config/analytics-nav';
import { SPECIAL_NAV } from '@/config/special-nav';
import { cn } from '@/lib/utils';

/** 判断路径是否落在某一级模块(主页或其子表)内 */
function pathInGroup(groupKey: string, pathname: string): boolean {
  const main = MODULES[groupKey];
  if (main && (pathname === main.route || pathname.startsWith(`${main.route}/`))) return true;
  if ((ANALYTICS_NAV[groupKey] ?? []).some((a) => pathname === a.path)) return true;
  if ((SPECIAL_NAV[groupKey] ?? []).some((a) => pathname === a.path)) return true;
  return (SUB_NAV[groupKey] ?? []).some((s) => pathname === `/sub/${s.key}` || pathname.startsWith(`/sub/${s.key}/`));
}

export default function AppSidebar() {
  const { pathname } = useLocation();
  const profile = useCurrentUserProfile();
  const userName = profile?.name ?? '牧唐成员';
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const k of MODULE_ORDER) init[k] = pathInGroup(k, window.location.pathname);
    init.report = window.location.pathname.startsWith('/report');
    return init;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3 group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:justify-center">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            牧
          </div>
          <div className="min-w-0 flex-1 group-data-[state=collapsed]:hidden">
            <div className="truncate text-sm font-semibold">牧唐数智一体化</div>
            <div className="truncate text-xs text-sidebar-foreground/60">广告代理管理系统</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="p-2">
          <SidebarMenu>
            {/* 工作台 */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="工作台" isActive={pathname === '/'}>
                <NavLink to="/" end className="flex items-center gap-2">
                  <LayoutDashboard className="size-4 shrink-0" />
                  <span>工作台</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* 10 个一级模块(可展开子页面) */}
            {MODULE_ORDER.map((groupKey) => {
              const config = MODULES[groupKey];
              const Icon = config.icon;
              const subs = SUB_NAV[groupKey] ?? [];
              const analytics = ANALYTICS_NAV[groupKey] ?? [];
              const special = SPECIAL_NAV[groupKey] ?? [];
              const groupActive = pathInGroup(groupKey, pathname);
              const open = openMap[groupKey] ?? false;
              return (
                <Collapsible
                  key={groupKey}
                  asChild
                  open={open}
                  onOpenChange={(v) => setOpenMap((prev) => ({ ...prev, [groupKey]: v }))}
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={config.label} isActive={groupActive}>
                        <Icon className="size-4 shrink-0" />
                        <span>{config.label}</span>
                        <ChevronRight
                          className={cn('ml-auto size-3.5 transition-transform group-data-[state=collapsed]:hidden', open && 'rotate-90')}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {/* 模块主表/概览 */}
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild isActive={pathname === config.route || pathname.startsWith(`${config.route}/`)}>
                            <NavLink to={config.route}>
                              <span>{config.noun}总览</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {/* 分析/仪表盘型子页面 */}
                        {analytics.map((a) => (
                          <SidebarMenuSubItem key={a.path}>
                            <SidebarMenuSubButton asChild isActive={pathname === a.path}>
                              <NavLink to={a.path}>
                                <PieChart className="size-3.5 shrink-0 text-primary" />
                                <span className="truncate">{a.label}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                        {/* 特殊形态子页面 */}
                        {special.map((a) => (
                          <SidebarMenuSubItem key={a.path}>
                            <SidebarMenuSubButton asChild isActive={pathname === a.path}>
                              <NavLink to={a.path}>
                                <Star className="size-3.5 shrink-0 text-primary" />
                                <span className="truncate">{a.label}</span>
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                        {/* 子表/子功能 */}
                        {subs.map((s) => {
                          const to = `/sub/${s.key}`;
                          const active = pathname === to || pathname.startsWith(`${to}/`);
                          return (
                            <SidebarMenuSubItem key={s.key}>
                              <SidebarMenuSubButton asChild isActive={active}>
                                <NavLink to={to}>
                                  <span className="truncate">{s.label.replace(/表$/, '')}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}

            {/* 报表中心(跨模块) */}
            <Collapsible
              asChild
              open={openMap.report ?? false}
              onOpenChange={(v) => setOpenMap((prev) => ({ ...prev, report: v }))}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="报表中心" isActive={pathname.startsWith('/report')}>
                    <FileBarChart2 className="size-4 shrink-0" />
                    <span>报表中心</span>
                    <ChevronRight
                      className={cn('ml-auto size-3.5 transition-transform group-data-[state=collapsed]:hidden', openMap.report && 'rotate-90')}
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {[
                      { to: '/report/custom', label: '自定义报表' },
                      { to: '/report/templates', label: '报表模板' },
                      { to: '/report/push', label: '定时推送' },
                      { to: '/report/drill', label: '数据下钻' },
                    ].map((r) => (
                      <SidebarMenuSubItem key={r.to}>
                        <SidebarMenuSubButton asChild isActive={pathname === r.to}>
                          <NavLink to={r.to}>
                            <span className="truncate">{r.label}</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-2 group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:justify-center">
          <Avatar className="size-7 shrink-0 border border-sidebar-border">
            {profile?.avatar ? <AvatarImage src={profile.avatar} alt={userName} /> : null}
            <AvatarImage src={avatarImages.avatarImg1} alt={userName} />
            <AvatarFallback className="text-xs">{userName.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[state=collapsed]:hidden">
            <div className="truncate text-xs font-medium">{userName}</div>
            <div className="truncate text-[11px] text-sidebar-foreground/60">在线</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
