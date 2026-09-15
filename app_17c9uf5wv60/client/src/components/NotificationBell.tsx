import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Package,
  Info,
  CheckCheck,
  Settings,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Popover, PopoverContent, PopoverTrigger } from '@client/src/components/ui/popover';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { toast } from 'sonner';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@client/src/api/notifications';
import NotificationSettingsDialog from './NotificationSettingsDialog';
import type {
  Notification,
  NotificationType,
} from '@shared/api.interface';

const NOTIFICATION_ICONS: Record<NotificationType, React.FC<{ className?: string }>> = {
  low_stock: AlertTriangle,
  anomaly: AlertCircle,
  operation: Package,
  system: Info,
};

const NOTIFICATION_ICON_COLORS: Record<NotificationType, string> = {
  low_stock: 'text-warning',
  anomaly: 'text-destructive',
  operation: 'text-primary',
  system: 'text-muted-foreground',
};

const RELATED_TYPE_ROUTES: Record<string, string> = {
  product: '/products',
  stock_record: '/records',
  transfer: '/operations',
  stock_check: '/records',
  ai_replenishment: '/ai-tools',
  supplier: '/suppliers',
  purchase_order: '/purchase-orders',
  sales_order: '/sales-orders',
  sync: '/sync-settings',
};

function formatTime(dateStr: string): string {
  const date: Date = new Date(dateStr);
  const now: Date = new Date();
  const diffMs: number = now.getTime() - date.getTime();
  const diffMin: number = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHour: number = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;
  const diffDay: number = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} 天前`;
  return date.toLocaleDateString('zh-CN');
}

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await getUnreadCount();
      setUnreadCount(result.unreadCount);
    } catch (err: unknown) {
      logger.error(
        '[notifications] getUnreadCount error',
        err instanceof Error ? err.message : String(err),
      );
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getNotifications({ page: 1, pageSize: 10 });
      setNotifications(result.items);
      setUnreadCount(result.unreadCount);
    } catch (err: unknown) {
      logger.error(
        '[notifications] getNotifications error',
        err instanceof Error ? err.message : String(err),
      );
      toast.error('获取通知列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications((prev: Notification[]) =>
        prev.map((n: Notification) =>
          n.id === id ? { ...n, isRead: true } : n,
        ),
      );
      setUnreadCount((prev: number) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      logger.error(
        '[notifications] markAsRead error',
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev: Notification[]) =>
        prev.map((n: Notification) => ({ ...n, isRead: true })),
      );
      setUnreadCount(0);
      toast.success('已全部标记为已读');
    } catch (err: unknown) {
      logger.error(
        '[notifications] markAllAsRead error',
        err instanceof Error ? err.message : String(err),
      );
      toast.error('操作失败');
    }
  };

  const handleClickNotification = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    setOpen(false);
    const route: string =
      (notification.relatedType &&
        RELATED_TYPE_ROUTES[notification.relatedType]) ||
      '/dashboard';
    navigate(route);
  };

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-sm text-foreground hover:bg-accent"
            aria-label="通知中心"
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-96 rounded-md border border-border bg-popover p-0 shadow-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">通知中心</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-sm px-2 text-xs text-muted-foreground hover:text-primary"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0 || loading}
            >
              <CheckCheck className="mr-1 size-3.5" />
              全部已读
            </Button>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="space-y-0 p-2">
                {Array.from({ length: 5 }).map((_, i: number) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-sm p-3"
                  >
                    <Skeleton className="size-5 shrink-0 rounded-sm" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-3/4 rounded-sm" />
                      <Skeleton className="h-3 w-full rounded-sm" />
                      <Skeleton className="h-2.5 w-16 rounded-sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Inbox className="mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">暂无通知</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((notification: Notification) => {
                  const Icon = NOTIFICATION_ICONS[notification.type];
                  const iconColor = NOTIFICATION_ICON_COLORS[notification.type];
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                        onClick={() => handleClickNotification(notification)}
                      >
                        <div className="relative mt-0.5 shrink-0">
                          <Icon className={`size-5 ${iconColor}`} />
                          {!notification.isRead && (
                            <span className="absolute -right-1 -top-0.5 size-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm ${
                                notification.isRead
                                  ? 'text-muted-foreground'
                                  : 'font-medium text-foreground'
                              }`}
                            >
                              {notification.title}
                            </p>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                          {notification.content && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {notification.content}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-sm px-2 text-xs text-muted-foreground hover:text-primary"
            >
              查看全部
              <ChevronRight className="ml-1 size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-sm px-2 text-xs text-muted-foreground hover:text-primary"
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
            >
              <Settings className="mr-1 size-3.5" />
              通知设置
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <NotificationSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  );
};

export default NotificationBell;
