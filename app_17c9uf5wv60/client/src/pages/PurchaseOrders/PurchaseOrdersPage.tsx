import { useCallback, useEffect, useState } from 'react';
import { purchaseOrders } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { FileText, Plus, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
} from '@shared/api.interface';
import { PAGE_SIZE, STATUS_OPTIONS, extractErrorMessage } from './constants';
import { PurchaseOrderTable } from './PurchaseOrderTable';
import { PurchaseOrderCreateDialog } from './PurchaseOrderCreateDialog';
import { PurchaseOrderDetailDialog } from './PurchaseOrderDetailDialog';

type ConfirmActionType = 'approve' | 'receive' | 'cancel';

interface PendingAction {
  type: ConfirmActionType;
  order: PurchaseOrder;
}

const CONFIRM_TEXT: Record<
  ConfirmActionType,
  { title: string; confirmLabel: string; successText: string }
> = {
  approve: { title: '审批采购订单', confirmLabel: '确认审批', successText: '订单已审批' },
  receive: { title: '确认入库', confirmLabel: '确认入库', successText: '订单已入库' },
  cancel: { title: '取消采购订单', confirmLabel: '确认取消', successText: '订单已取消' },
};

function buildConfirmDescription(action: PendingAction): string {
  if (action.type === 'receive') {
    return '确认入库后将为每个商品生成入库单并更新库存。';
  }
  if (action.type === 'cancel') {
    return `确定取消采购订单 ${action.order.orderNo} 吗？取消后不可恢复。`;
  }
  return `确定审批通过采购订单 ${action.order.orderNo} 吗？`;
}

export default function PurchaseOrdersPage() {
  const [items, setItems] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseOrderStatus>(
    'all',
  );
  const [isLoading, setIsLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await purchaseOrders.getOrders({
        page,
        pageSize,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        keyword: keyword.trim() || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error('获取采购订单列表失败:', String(err));
      toast.error(extractErrorMessage(err, '获取采购订单列表失败'));
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, keyword, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetail = (order: PurchaseOrder): void => {
    setDetailOrderId(order.id);
    setDetailOpen(true);
  };

  const requestAction = (type: ConfirmActionType) => (order: PurchaseOrder) => {
    setPendingAction({ type, order });
  };

  const handleConfirmAction = async (): Promise<void> => {
    if (!pendingAction || actionLoading) return;
    const { type, order } = pendingAction;
    setActionLoading(true);
    try {
      if (type === 'approve') {
        await purchaseOrders.approveOrder(order.id);
      } else if (type === 'receive') {
        await purchaseOrders.receiveOrder(order.id);
      } else {
        await purchaseOrders.cancelOrder(order.id);
      }
      toast.success(CONFIRM_TEXT[type].successText);
      setPendingAction(null);
      fetchData();
    } catch (err: unknown) {
      logger.error('采购订单操作失败:', String(err));
      toast.error(extractErrorMessage(err, '操作失败，请重试'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-sm bg-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">采购订单</h1>
            <p className="text-sm text-muted-foreground">
              跟踪采购订单的审批、入库与取消全流程
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          新建采购订单
        </Button>
      </div>

      <Card className="rounded-sm shadow-none border border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              订单列表
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-56">
                <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="订单号 / 供应商"
                  value={keyword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setKeyword(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(val: string) => {
                  setStatusFilter(val as 'all' | PurchaseOrderStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PurchaseOrderTable
            items={items}
            total={total}
            page={page}
            pageSize={pageSize}
            isLoading={isLoading}
            actionLoadingId={actionLoading ? pendingAction?.order.id ?? null : null}
            onPageChange={(p: number, ps: number) => {
              setPage(p);
              setPageSize(ps);
            }}
            onApprove={requestAction('approve')}
            onReceive={requestAction('receive')}
            onCancel={requestAction('cancel')}
            onViewDetail={handleViewDetail}
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(open: boolean) => {
          if (!open && !actionLoading) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction ? CONFIRM_TEXT[pendingAction.type].title : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction ? buildConfirmDescription(pendingAction) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              返回
            </AlertDialogCancel>
            <Button onClick={handleConfirmAction} disabled={actionLoading}>
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              {pendingAction
                ? CONFIRM_TEXT[pendingAction.type].confirmLabel
                : '确认'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PurchaseOrderCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setPage(1);
          fetchData();
        }}
      />

      <PurchaseOrderDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        orderId={detailOrderId}
      />
    </div>
  );
}
