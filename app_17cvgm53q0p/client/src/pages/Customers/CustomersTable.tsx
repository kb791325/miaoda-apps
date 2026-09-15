import type { FC } from 'react';
import dayjs from 'dayjs';
import { Table, TableColumnsType } from '@lark-apaas/client-toolkit/antd-table';
import { BellRing, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { UserDisplay } from '@/components/business-ui/user-display';
import type { Customer } from '@shared/customer';
import type { LatestReminderItem } from '@shared/reminder';
import { useAuth } from '@client/src/hooks/use-auth';
import {
  formatAmount,
  formatDate,
  isFollowUpDue,
} from './customer-utils';
import CustomerLevelBadge from './CustomerLevelBadge';
import SalesStageBadge from './SalesStageBadge';

interface CustomersTableProps {
  items: Customer[];
  loading: boolean;
  onEdit: (customer: Customer) => void;
  onViewProfile: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onRemind?: (customer: Customer) => void;
  reminderMap?: Record<string, LatestReminderItem>;
  highlightId?: string | null;
}

const CustomersTable: FC<CustomersTableProps> = ({
  items,
  loading,
  onEdit,
  onViewProfile,
  onDelete,
  onRemind,
  reminderMap,
  highlightId,
}) => {
  const { hasPerm } = useAuth();
  const columns: TableColumnsType<Customer> = [
    {
      title: '客户名称',
      dataIndex: 'customerName',
      fixed: 'left',
      width: 140,
      render: (name: string) => (
        <span className="font-medium text-foreground">{name}</span>
      ),
    },
    {
      title: '等级',
      key: 'grade',
      width: 110,
      render: (_: unknown, record: Customer) => (
        <CustomerLevelBadge
          level={record.crm.grade || record.customerLevel}
        />
      ),
    },
    {
      title: '销售阶段',
      key: 'salesStage',
      width: 120,
      render: (_: unknown, record: Customer) => (
        <SalesStageBadge stage={record.crm.salesStage} />
      ),
    },
    {
      title: '负责销售',
      key: 'owner',
      width: 150,
      render: (_: unknown, record: Customer) =>
        record.crm.ownerName ? (
          <span className="text-foreground">{record.crm.ownerName}</span>
        ) : record.crm.ownerId ? (
          <UserDisplay value={[record.crm.ownerId]} size="small" />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      title: '最近跟进',
      key: 'lastFollowUpAt',
      width: 120,
      render: (_: unknown, record: Customer) => (
        <span className="tabular-nums text-muted-foreground">
          {formatDate(record.crm.lastFollowUpAt)}
        </span>
      ),
    },
    {
      title: '下次跟进',
      key: 'nextFollowUpAt',
      width: 120,
      render: (_: unknown, record: Customer) => {
        const value = record.crm.nextFollowUpAt;
        if (!value) return <span className="text-muted-foreground">-</span>;
        const overdue =
          isFollowUpDue(value) &&
          dayjs(value).isBefore(dayjs(), 'day');
        return (
          <span
            className={
              overdue
                ? 'font-medium tabular-nums text-destructive'
                : 'tabular-nums text-muted-foreground'
            }
          >
            {formatDate(value)}
          </span>
        );
      },
    },
    {
      title: '累计消费金额',
      dataIndex: 'totalAmount',
      width: 140,
      align: 'right',
      render: (amount: number) => (
        <span className="font-semibold tabular-nums text-primary">
          {formatAmount(amount)}
        </span>
      ),
    },
  ];

  if (reminderMap) {
    columns.push({
      title: '提醒状态',
      key: 'reminderStatus',
      width: 150,
      render: (_: unknown, record: Customer) => {
        const item: LatestReminderItem | undefined =
          reminderMap[record.id];
        if (!item) return <span className="text-muted-foreground">-</span>;
        return (
          <span className="inline-flex items-center rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
            已提醒 {dayjs(item.sentAt).format('MM-DD HH:mm')}
          </span>
        );
      },
    });
  }

  columns.push({
    title: '操作',
    key: 'action',
    fixed: 'right',
    width: onRemind ? 250 : 170,
    render: (_: unknown, record: Customer) => (
      <div className="flex items-center">
        {onRemind ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onRemind(record);
            }}
          >
            <BellRing className="mr-1 h-3.5 w-3.5" />
            提醒跟进
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onViewProfile(record);
          }}
        >
          <Eye className="mr-1 h-3.5 w-3.5" />
          查看详情
        </Button>
        {hasPerm('customer:manage') ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onEdit(record);
            }}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            编辑
          </Button>
        ) : null}
        {hasPerm('customer:manage') ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                删除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              className="max-w-lg"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除该客户？</AlertDialogTitle>
                <AlertDialogDescription>
                  删除后客户「{record.customerName}」将永久移除，无法恢复。若该客户存在订单或跟进记录，将无法删除。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>再想想</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(record)}>
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    ),
  });

  return (
    <Table
      columns={columns}
      dataSource={items}
      loading={loading}
      rowKey="id"
      scroll={{ x: onRemind ? 1330 : 1180, y: 500 }}
      pagination={{ pageSize: 50, showSizeChanger: false }}
      onRow={(record: Customer) => ({
        onClick: () => onViewProfile(record),
        className: `cursor-pointer ${
          highlightId === record.id ? 'row-highlight' : ''
        }`,
      })}
    />
  );
};

export default CustomersTable;
