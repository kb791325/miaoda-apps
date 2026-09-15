import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, Trash2, X } from 'lucide-react';

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

import type { Customer } from '@shared/customer';
import type {
  Order,
  OrderListParams,
  OrderStatus,
} from '@shared/order';
import { ORDER_STATUS_OPTIONS } from '@shared/order';
import type { Product } from '@shared/product';

import {
  batchDeleteOrders,
  cancelOrder,
  deleteOrder,
  fetchOrders,
} from '@client/src/api/order';
import { fetchCustomers } from '@client/src/api/customer';
import { fetchProducts } from '@client/src/api/product';

import { useAuth } from '@client/src/hooks/use-auth';

import OrderCancelDialog from './OrderCancelDialog';
import OrderDetailSheet from './OrderDetailSheet';
import OrderFormDialog from './OrderFormDialog';
import OrdersFilterBar from './OrdersFilterBar';
import OrdersPagination from './OrdersPagination';
import OrdersTable from './OrdersTable';
import { exportOrdersFile, fetchAllOrdersForExport } from './order-export';
import {
  EMPTY_ORDERS_FILTERS,
  extractErrorMessage,
  type OrdersFilters,
  type OrderWithAddress,
} from './order-utils';

const DEFAULT_PAGE_SIZE = 20;

interface OrderDialogState {
  open: boolean;
  order: OrderWithAddress | null;
}

interface OrderDetailState {
  open: boolean;
  orderId: string | null;
}

const buildListParams = (
  filters: OrdersFilters,
  page: number,
  pageSize: number,
): OrderListParams => {
  const params: OrderListParams = { page, pageSize };
  if (filters.keyword) params.keyword = filters.keyword;
  const status: OrderStatus | undefined = ORDER_STATUS_OPTIONS.find(
    (option: OrderStatus) => option === filters.status,
  );
  if (status) params.status = status;
  if (filters.customerId) params.customerId = filters.customerId;
  if (filters.dateStart) params.dateStart = filters.dateStart;
  if (filters.dateEnd) params.dateEnd = filters.dateEnd;
  return params;
};

const OrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPerm } = useAuth();

  const [filters, setFilters] = React.useState<OrdersFilters>(() => ({
    ...EMPTY_ORDERS_FILTERS,
    keyword: searchParams.get('keyword') ?? '',
    status: searchParams.get('status') ?? '',
    customerId: searchParams.get('customerId') ?? '',
    dateStart: searchParams.get('dateStart') ?? '',
    dateEnd: searchParams.get('dateEnd') ?? '',
  }));

  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(DEFAULT_PAGE_SIZE);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [exporting, setExporting] = React.useState<boolean>(false);

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);

  const [dialogState, setDialogState] = React.useState<OrderDialogState>({
    open: false,
    order: null,
  });
  const [detailState, setDetailState] = React.useState<OrderDetailState>({
    open: false,
    orderId: null,
  });
  const [highlightId, setHighlightId] = React.useState<string | null>(null);

  // 新建/编辑保存成功后闪烁高亮对应行（row-highlight 动画 3 秒）
  React.useEffect(() => {
    if (!highlightId) return;
    const rows: NodeListOf<HTMLElement> = document.querySelectorAll(
      `[data-row-key="${highlightId}"]`,
    );
    rows.forEach((row: HTMLElement) => row.classList.add('row-highlight'));
    const timer: number = window.setTimeout(() => setHighlightId(null), 3000);
    return () => {
      window.clearTimeout(timer);
      rows.forEach((row: HTMLElement) =>
        row.classList.remove('row-highlight'),
      );
    };
  }, [highlightId, orders]);

  // 筛选变化时同步到 URL（支持仪表盘/客户画像跳转预筛选）
  React.useEffect(() => {
    const next = new URLSearchParams();
    if (filters.keyword) next.set('keyword', filters.keyword);
    if (filters.status) next.set('status', filters.status);
    if (filters.customerId) next.set('customerId', filters.customerId);
    if (filters.dateStart) next.set('dateStart', filters.dateStart);
    if (filters.dateEnd) next.set('dateEnd', filters.dateEnd);
    setSearchParams(next, { replace: true });
  }, [filters, setSearchParams]);

  // 筛选变化回到第 1 页
  const handleFiltersChange = (next: OrdersFilters): void => {
    setFilters(next);
    setPage(1);
  };

  const loadOrders = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetchOrders(buildListParams(filters, page, pageSize));
      setOrders(res.items);
      setTotal(res.total);
      setSelectedIds((prev: string[]) =>
        prev.filter((id: string) =>
          res.items.some((item: Order) => item.id === id),
        ),
      );
      const totalPages = Math.max(1, Math.ceil(res.total / pageSize));
      if (res.total > 0 && page > totalPages) setPage(totalPages);
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  React.useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  // 客户与商品下拉数据（页面加载一次）
  React.useEffect(() => {
    fetchCustomers()
      .then((res) => setCustomers(Array.isArray(res.items) ? res.items : []))
      .catch((error: unknown) => toast.error(extractErrorMessage(error)));
    fetchProducts()
      .then((res) => setProducts(res.items))
      .catch((error: unknown) => toast.error(extractErrorMessage(error)));
  }, []);

  // 快捷入口 ?create=1 / ?new=1：自动打开新增订单弹窗并清除该参数
  React.useEffect(() => {
    const shouldOpenCreate: boolean =
      searchParams.get('create') === '1' || searchParams.get('new') === '1';
    if (!shouldOpenCreate) return;
    setDialogState({ open: true, order: null });
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    next.delete('new');
    setSearchParams(next, { replace: true });
    // 仅首次挂载消费一次，避免弹窗被意外重开
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [cancelTarget, setCancelTarget] = React.useState<Order | null>(null);

  const handleCancel = async (
    order: Order,
    cancelReason: string,
  ): Promise<void> => {
    try {
      await cancelOrder(order.id, cancelReason);
      toast.success('订单已取消，已出库库存已自动回补');
      void loadOrders();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
      throw error;
    }
  };

  const handleDelete = async (order: Order): Promise<void> => {
    try {
      await deleteOrder(order.id);
      toast.success(`已删除订单「${order.orderNo}」`);
      void loadOrders();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    }
  };

  const handleBatchDelete = async (): Promise<void> => {
    try {
      const res = await batchDeleteOrders({ ids: selectedIds });
      toast.success(`成功删除 ${res.successCount} 条订单`);
      if (res.failedIds.length > 0) {
        toast.warning(`${res.failedIds.length} 条订单删除失败`);
      }
      setSelectedIds([]);
      void loadOrders();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    }
  };

  const handleExport = async (selectedOnly: boolean): Promise<void> => {
    if (selectedOnly) {
      const rows = orders.filter((order: Order) =>
        selectedIds.includes(order.id),
      );
      if (rows.length === 0) {
        toast.error('请先选择要导出的订单');
        return;
      }
      exportOrdersFile(rows);
      return;
    }
    setExporting(true);
    try {
      const all = await fetchAllOrdersForExport(filters);
      if (all.length === 0) {
        toast.error('当前筛选条件下没有可导出的订单');
        return;
      }
      exportOrdersFile(all);
      toast.success(`已导出 ${all.length} 条订单`);
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const handleView = (order: Order): void => {
    setDetailState({ open: true, orderId: order.id });
  };

  const handleEdit = (order: Order): void => {
    setDialogState({ open: true, order });
  };

  const handleCreate = (): void => {
    setDialogState({ open: true, order: null });
  };

  const handleCloseDialog = (): void => {
    setDialogState({ open: false, order: null });
  };

  const handleSaved = (savedOrderId: string): void => {
    setDialogState({ open: false, order: null });
    setHighlightId(savedOrderId);
    void loadOrders();
  };

  return (
    <div className="flex flex-col gap-6" data-ai-section-type="card-list">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">订单管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          订单管理：筛选、取消、编辑与删除
        </p>
      </div>

      <OrdersFilterBar
        filters={filters}
        customers={customers}
        exporting={exporting}
        onFiltersChange={handleFiltersChange}
        onCreate={handleCreate}
        onExport={() => {
          void handleExport(false);
        }}
      />

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 shadow-sm">
          <span className="text-sm font-medium">
            已选 {selectedIds.length} 项
          </span>
          {hasPerm('order:delete') ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="size-4" />
                批量删除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  确认批量删除 {selectedIds.length} 条订单？
                </AlertDialogTitle>
                <AlertDialogDescription>
                  删除后订单将永久移除且无法恢复；存在进行中配送单的订单无法删除。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    void handleBatchDelete();
                  }}
                >
                  确认删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void handleExport(true);
            }}
          >
            <Download className="size-4" />
            批量导出
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setSelectedIds([])}
          >
            <X className="size-4" />
            清除选择
          </Button>
        </div>
      )}

      <OrdersTable
        orders={orders}
        customers={customers}
        loading={loading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onView={handleView}
        onEdit={handleEdit}
        onCancel={(order: Order) => {
          setCancelTarget(order);
        }}
        onDelete={(order: Order) => {
          void handleDelete(order);
        }}
      />

      <OrdersPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(size: number) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      <OrderCancelDialog
        order={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
      />

      <OrderFormDialog
        open={dialogState.open}
        order={dialogState.order}
        customers={customers}
        products={products}
        onClose={handleCloseDialog}
        onSaved={handleSaved}
      />

      <OrderDetailSheet
        open={detailState.open}
        orderId={detailState.orderId}
        onClose={() => setDetailState({ open: false, orderId: null })}
      />
    </div>
  );
};

export default OrdersPage;
