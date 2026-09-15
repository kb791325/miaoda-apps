import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
  Package,
  ClipboardCheck,
  Settings,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

import { Button } from '@client/src/components/ui/button';
import { Card } from '@client/src/components/ui/card';
import { Badge } from '@client/src/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@client/src/components/ui/empty';

import * as notificationsApi from '@client/src/api/notifications';
import type {
  Notification,
  NotificationType,
} from '@shared/api.interface';

const typeOptions: Array<{ value: string; label: string }> = [
  { value: 'all', label: '全部类型' },
  { value: 'budget', label: '预算通知' },
  { value: 'asset', label: '资产通知' },
  { value: 'inventory', label: '盘点通知' },
  { value: 'system', label: '系统通知' },
];

const statusTabs = [
  { value: 'all', label: '全部' },
  { value: 'unread', label: '未读' },
  { value: 'read', label: '已读' },
];

const typeIconMap: Record<NotificationType, typeof FileText> = {
  budget: AlertCircle,
  asset: Package,
  inventory: ClipboardCheck,
  system: Settings,
};

const typeLabelMap: Record<NotificationType, string> = {
  budget: '预算',
  asset: '资产',
  inventory: '盘点',
  system: '系统',
};

const typeColorMap: Record<NotificationType, string> = {
  budget: 'bg-warning/15 text-warning border-warning/30',
  asset: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  inventory: 'bg-violet-500/15 text-violet-700 border-violet-200',
  system: 'bg-muted text-muted-foreground border-border',
};

const priorityColorMap: Record<string, string> = {
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  normal: 'bg-primary/10 text-primary border-primary/20',
  low: 'bg-muted text-muted-foreground border-border',
};

const priorityLabelMap: Record<string, string> = {
  high: '高优先级',
  normal: '普通',
  low: '低优先级',
};

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
};

const NotificationsPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);

  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchList = useCallback(() => {
    setLoading(true);
    notificationsApi
      .getNotificationList({
        page,
        pageSize,
        type: typeFilter === 'all' ? undefined : (typeFilter as NotificationType),
        isRead:
          statusFilter === 'all'
            ? undefined
            : statusFilter === 'read',
      })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setUnreadCount(data.unreadCount);
      })
      .catch((err: unknown) => {
        logger.error('获取通知列表失败', err);
        toast.error('获取通知列表失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, pageSize, typeFilter, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const refreshUnread = useCallback(() => {
    notificationsApi
      .getUnreadCount()
      .then((data) => setUnreadCount(data.count))
      .catch((err: unknown) => {
        logger.error('获取未读数量失败', err);
      });
  }, []);

  const handleExpand = (item: Notification) => {
    const nextId = expandedId === item.id ? null : item.id;
    setExpandedId(nextId);
    if (nextId && !item.isRead) {
      notificationsApi
        .markAsRead(item.id)
        .then(() => {
          setItems((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
          );
          setUnreadCount((c) => Math.max(0, c - 1));
        })
         .catch((err: unknown) => {
           logger.error('标记已读失败', err);
           toast.error('标记已读失败');
         });
    }
  };

  const handleMarkAllRead = () => {
    notificationsApi
      .markAllAsRead()
      .then(() => {
        toast.success('已全部标记为已读');
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      })
      .catch((err: unknown) => {
        logger.error('全部标记已读失败', err);
        toast.error('操作失败');
      });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    notificationsApi
      .deleteNotification(deleteTarget.id)
      .then(() => {
        toast.success('已删除');
        setItems((prev) => prev.filter((n) => n.id !== deleteTarget.id));
        if (!deleteTarget.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        setDeleteTarget(null);
        // 如果当前页删空且不是第一页，回退一页
        if (items.length === 1 && page > 1) {
          setPage((p) => p - 1);
        }
      })
      .catch((err: unknown) => {
        logger.error('删除通知失败', err);
        toast.error('删除失败');
      });
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="size-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground mb-6">通知中心</h1>
          <Badge
            variant="outline"
            className="border-border bg-muted/50 font-mono"
          >
            {unreadCount} 条未读
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="类型筛选" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="h-9"
          >
            <CheckCheck className="size-4 mr-1.5" />
            全部标为已读
          </Button>
        </div>
      </div>

      {/* 状态筛选 Tab */}
      <div className="flex items-center gap-1 border-b border-border pb-0">
        {statusTabs.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => handleStatusChange(tab.value)}
              className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-sm" />
              )}
            </button>
          );
        })}
      </div>

      {/* 通知列表 */}
      <div className="flex flex-col gap-2">
        {loading && (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-9 rounded-sm" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              </Card>
            ))}
          </>
        )}

        {!loading && items.length === 0 && (
          <Empty className="py-16">
            <EmptyMedia variant="icon">
              <BellOff className="size-5" />
            </EmptyMedia>
            <EmptyTitle>暂无通知</EmptyTitle>
            <EmptyDescription>你目前没有收到任何通知</EmptyDescription>
          </Empty>
        )}

        {!loading &&
          items.map((item) => {
            const Icon = typeIconMap[item.notificationType] ?? Bell;
            const isExpanded = expandedId === item.id;
            return (
              <Card
                key={item.id}
                className={`relative overflow-hidden transition-colors cursor-pointer hover:bg-accent/30 ${
                  !item.isRead ? 'bg-card' : 'bg-card/60'
                }`}
                onClick={() => handleExpand(item)}
              >
                {/* 左侧未读竖条 */}
                {!item.isRead && (
                  <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
                )}
                <div className="flex items-start gap-3 p-4">
                  {/* 类型图标 + 未读红点 */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`flex size-9 items-center justify-center rounded-sm border ${
                        typeColorMap[item.notificationType]
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    {!item.isRead && (
                      <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-card" />
                    )}
                  </div>

                  {/* 主内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3
                          className={`text-sm truncate ${
                            !item.isRead
                              ? 'font-semibold text-foreground'
                              : 'font-medium text-foreground/80'
                          }`}
                        >
                          {item.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`flex-shrink-0 text-[10px] px-1.5 h-4 font-normal ${
                            priorityColorMap[item.priority]
                          }`}
                        >
                          {priorityLabelMap[item.priority]}
                        </Badge>
                      </div>
                      <span className="flex-shrink-0 text-xs text-muted-foreground font-mono">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                      {item.content || '暂无详情'}
                    </p>

                    {/* 展开详情 */}
                    {isExpanded && item.content && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {item.content}
                        </p>
                        {item.relatedType && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              关联类型：
                            </span>
                            <Badge variant="outline" className="font-normal">
                              {item.relatedType}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 底部操作 */}
                    <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Badge
                        variant="outline"
                        className="text-xs font-normal border-border bg-muted/30"
                      >
                        {typeLabelMap[item.notificationType]}
                      </Badge>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(item);
                        }}
                      >
                        <Trash2 className="size-3.5 mr-1" />
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>

      {/* 底部分页 */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
          <span className="text-xs text-muted-foreground font-mono">
            共 {total} 条，第 {page} / {totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              className="h-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-3 text-sm font-mono text-foreground">
              {page}
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="h-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条通知吗？删除后无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NotificationsPage;
