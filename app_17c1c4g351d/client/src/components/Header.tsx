import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, User, AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { getDashboardData } from '@/api/dashboard';
import type { Alert } from '@shared/api.interface';

const ALERT_ROUTE_MAP: Record<string, string> = {
  aftersale: '/aftersale',
  inventory: '/inventory',
  product: '/products',
  traffic: '/traffic',
};

export default function Header() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshAlerts = useCallback(() => {
    getDashboardData()
      .then((data) => setAlerts(data.alerts))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshAlerts();
    timerRef.current = setInterval(refreshAlerts, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshAlerts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshAlerts]);

  useEffect(() => {
    if (popoverOpen) refreshAlerts();
  }, [popoverOpen, refreshAlerts]);

  const handleAlertClick = (alertItem: Alert) => {
    const route = ALERT_ROUTE_MAP[alertItem.category] || '/';
    setPopoverOpen(false);
    navigate(route);
  };

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-background/80 backdrop-blur-md border-b border-border/40 flex items-center px-4 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <SidebarTrigger />
      </div>

      <div className="flex-1 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 ml-auto">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="relative">
                <Bell className="size-5 text-muted-foreground" />
                {alerts.length > 0 && (
                  <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="px-4 py-3 border-b border-border">
                <div className="text-sm font-medium text-foreground">
                  异常提醒
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {alerts.length} 条待处理
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    暂无异常提醒
                  </div>
                ) : (
                  alerts.map((alertItem) => (
                    <button
                      key={alertItem.id}
                      type="button"
                      onClick={() => handleAlertClick(alertItem)}
                      className="w-full px-4 py-3 border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-start gap-2">
                        {alertItem.level === 'danger' ? (
                          <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {alertItem.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {alertItem.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                <User className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <div className="text-sm font-medium text-foreground leading-tight">
                张浩然
              </div>
              <div className="text-xs text-muted-foreground leading-tight">
                运营主管
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
