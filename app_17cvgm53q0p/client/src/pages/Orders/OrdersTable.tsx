import React from 'react';

import { Table, TableColumnsType, TableProps } from '@lark-apaas/client-toolkit/antd-table';
import { Eye, Pencil } from 'lucide-react';

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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';

import { useAuth } from '@client/src/hooks/use-auth';

import type { Customer } from '@shared/customer';
import type { Order, OrderStatus } from '@shared/order';

import {
  ORDER_STATUS_PILL_CLASS,
  formatAmount,
  formatDateTime,
} from './order-utils';

export interface OrdersTableProps {
  orders: Order[];
  customers: Customer[];
  loading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onCancel: (order: Order) => void;
  onDelete: (order: Order) => void;
}

interface StatusPillProps {
  status: OrderStatus;
}

const StatusPill: React.FC<StatusPillProps> = ({ status }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
      ORDER_STATUS_PILL_CLASS[status],
    )}
  >
    {status}
  </span>
);

const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  customers,
  loading,
  selectedIds,
  onSelectionChange,
  onView,
  onEdit,
  onCancel,
  onDelete,
}) => {
  const { hasPerm } = useAuth();

  const customerNameMap = React.useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    customers.forEach((customer: Customer) => {
      map.set(customer.id, customer.customerName);
    });
    return map;
  }, [customers]);

  const rowSelection: TableProps<Order>['rowSelection'] = {
    selectedRowKeys: selectedIds,
    onChange: (keys: React.Key[]) => {
      onSelectionChange(keys.map((key: React.Key) => String(key)));
    },
  };

  const columns: TableColumnsType<Order> = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      width: 150,
      render: (value: string) => (
        <span className="font-medium">{value || '-'}</span>
      ),
    },
    {
      title: '客户',
      dataIndex: 'customerName',
      width: 130,
      render: (value: string, record: Order) =>
        value || customerNameMap.get(record.customerId) || '-',
    },
    {
      title: '商品名称',
      dataIndex: 'productName',
      width: 160,
      render: (value: string) => value || '-',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 80,
      render: (value: number) => value ?? '-',
    },
    {
      title: '商品金额',
      dataIndex: 'amount',
      width: 120,
      render: (value: number) => formatAmount(value),
    },
    {
      title: '订单总金额',
      dataIndex: 'totalFee',
      width: 130,
      render: (value: number, record: Order) =>
        formatAmount((record.amount ?? 0) + (record.totalFee ?? 0)),
    },
    {
      title: '下单时间',
      dataIndex: 'orderTime',
      width: 150,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: OrderStatus) => <StatusPill status={value} />,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 240,
      render: (_value: unknown, record: Order) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(record)}
          >
            <Eye className="size-3.5" />
            详情
          </Button>
          {hasPerm('order:update') ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(record)}
          >
            <Pencil className="size-3.5" />
            编辑
          </Button>
          ) : null}
          {record.status !== '已完成' && record.status !== '已取消' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => onCancel(record)}
            >
              取消
            </Button>
          )}
          {hasPerm('order:delete') ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
              >
                删除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除该订单？</AlertDialogTitle>
                <AlertDialogDescription>
                  删除后订单「{record.orderNo}」将永久移除，无法恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(record)}>
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          ) : null}
        </div>
      ),
    },
  ];

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-2 rounded-lg border bg-card p-4 shadow-sm">
        {[1, 2, 3, 4, 5].map((n: number) => (
          <Skeleton key={n} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table
        columns={columns}
        dataSource={orders}
        loading={loading}
        rowKey="id"
        rowSelection={rowSelection}
        scroll={{ x: 1200, y: 500 }}
        pagination={false}
        onRow={() => ({ className: 'h-12' })}
        locale={{
          emptyText: (
            <Empty className="bg-transparent">
              <EmptyHeader>
                <EmptyTitle>暂无订单</EmptyTitle>
                <EmptyDescription>
                  调整筛选条件，或点击右上角「新增订单」创建第一笔订单
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ),
        }}
      />
    </div>
  );
};

export default OrdersTable;
