import type { FC } from 'react';
import { Trash2 } from 'lucide-react';
import { Table, TableProps } from '@lark-apaas/client-toolkit/antd-table';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import { Button } from '@client/src/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@client/src/components/ui/tooltip';
import type { MarketingContentListItem } from '@shared/content';
import { APP_ROLES } from '@shared/roles';
import { CourseSyncBadge } from '../courses/CourseSyncBadge';
import { CONTENT_TYPE_LABELS } from './content.constants';
import { StatusBadge } from './StatusBadge';

interface ContentTableProps {
  items: MarketingContentListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  busyId: string | null;
  syncingIds: string[];
  onPageChange: (page: number) => void;
  onApprove: (item: MarketingContentListItem) => void;
  onOpenReject: (item: MarketingContentListItem) => void;
  onMarkUsed: (item: MarketingContentListItem) => void;
  onOpenEffect: (item: MarketingContentListItem) => void;
  onViewDetail: (item: MarketingContentListItem) => void;
  onRetrySync: (recordId: string) => void;
  onDelete: (item: MarketingContentListItem) => void;
}

export const ContentTable: FC<ContentTableProps> = ({
  items,
  total,
  page,
  pageSize,
  loading,
  busyId,
  syncingIds,
  onPageChange,
  onApprove,
  onOpenReject,
  onMarkUsed,
  onOpenEffect,
  onViewDetail,
  onRetrySync,
  onDelete,
}) => {
  const columns: TableProps<MarketingContentListItem>['columns'] = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      fixed: 'left',
      width: 220,
      ellipsis: true,
      render: (title: string) => (
        <span className="font-medium">{title}</span>
      ),
    },
    {
      title: '关联课程',
      dataIndex: 'courseName',
      key: 'courseName',
      width: 160,
      ellipsis: true,
      render: (courseName: string | null) => courseName || '-',
    },
    {
      title: '内容类型',
      dataIndex: 'contentType',
      key: 'contentType',
      width: 120,
      render: (type: MarketingContentListItem['contentType']) =>
        CONTENT_TYPE_LABELS[type] ?? type,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: MarketingContentListItem['status']) => (
        <StatusBadge status={status} />
      ),
    },
    {
      title: '同步状态',
      key: 'syncStatus',
      width: 160,
      render: (_: unknown, record: MarketingContentListItem) => {
        const isSyncing: boolean = syncingIds.includes(record.id);
        return (
          <CourseSyncBadge
            syncStatus={record.syncStatus}
            isSyncing={isSyncing}
            onRetry={() => onRetrySync(record.id)}
          />
        );
      },
    },
    {
      title: '计划发布日期',
      dataIndex: 'scheduleDate',
      key: 'scheduleDate',
      width: 130,
      render: (scheduleDate: string | null) => scheduleDate || '-',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 340,
      render: (_: unknown, record: MarketingContentListItem) => {
        const busy: boolean = busyId === record.id;
        return (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewDetail(record)}
            >
              查看详情
            </Button>
            {record.status === 'pending_review' && (
              <CanRole roles={[APP_ROLES.principal]} fallback={null}>
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onApprove(record)}
                  >
                    审核通过
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={busy}
                    onClick={() => onOpenReject(record)}
                  >
                    驳回
                  </Button>
                </>
              </CanRole>
            )}
            {record.status === 'available' && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onMarkUsed(record)}
              >
                标记已使用
              </Button>
            )}
            {record.status === 'rejected' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex max-w-[180px] cursor-help items-center truncate text-xs text-muted-foreground">
                    驳回原因：{record.rejectReason || '-'}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{record.rejectReason || '无'}</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onOpenEffect(record)}
            >
              录入效果
            </Button>
            <CanRole roles={[APP_ROLES.principal]} fallback={null}>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                className="h-7 w-7 p-0 text-[hsl(5_75%_55%)] hover:bg-[hsl(5_75%_55%/0.08)] hover:text-[hsl(5_75%_40%)]"
                title="删除内容"
                onClick={() => onDelete(record)}
              >
                <Trash2 className="size-4" />
              </Button>
            </CanRole>
          </div>
        );
      },
    },
  ];

  return (
    <Table<MarketingContentListItem>
      columns={columns}
      dataSource={items}
      rowKey="id"
      loading={loading}
      scroll={{ x: 1000, y: 500 }}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: false,
        onChange: (nextPage: number) => onPageChange(nextPage),
      }}
    />
  );
};
