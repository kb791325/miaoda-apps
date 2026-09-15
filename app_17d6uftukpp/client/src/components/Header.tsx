import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { avatarImages, useCurrentUserProfile } from '@lark-apaas/client-toolkit';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MODULE_NAV_ITEMS } from '@/config/modules';

export default function Header() {
  const { pathname } = useLocation();
  const profile = useCurrentUserProfile();
  const userName = profile?.name ?? '牧唐成员';

  const title = useMemo(() => {
    if (pathname === '/') return '工作台';
    const matched = MODULE_NAV_ITEMS.find(
      (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
    );
    return matched?.label ?? '牧唐数智一体化';
  }, [pathname]);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="!h-4" />
      <h1 className="truncate text-sm font-semibold">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="通知" className="relative">
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
        </Button>
        <div className="flex items-center gap-2 pl-1">
          <Avatar className="size-7 border">
            {profile?.avatar ? <AvatarImage src={profile.avatar} alt={userName} /> : null}
            <AvatarImage src={avatarImages.avatarImg1} alt={userName} />
            <AvatarFallback className="text-xs">{userName.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium md:inline">{userName}</span>
        </div>
      </div>
    </header>
  );
}
