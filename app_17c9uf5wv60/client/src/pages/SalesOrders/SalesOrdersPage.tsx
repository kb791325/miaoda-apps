import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { salesOrders, products as productsApi } from '@client/src/api';
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
import { FileText, Plus, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { formatBeijingTime } from '@client/src/utils/date';
import type {
  SalesOrder,
  SalesOrderStatus,
  SalesOrderListParams,
  ProductWithInventory,
} from '@shared/api.interface';
import { OrderEditDialog } from './OrderEditDialog';
import { OrderDetailDialog } from './OrderDetailDialog';
import { SalesOrdersTable, SALES_STATUS_STYLES } from './SalesOrdersTable';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: 'all' | SalesOrderStatus; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待确认' },
  { value: 'confirmed', label: '已确认' },
  { value: 'picking', label: '备货中' },
  { value: 'shipped', label: '已出库' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const WAREHOUSES = ['上海仓', '北京仓', '广州仓', '成都仓'];

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/u.test(value)) {
    return `"${value.replace(/"/gu, '""')}"`;
  }
  return value;
}

function getExportDateStamp(): string {
  const now: Date = new Date();
  const month: string = String(now.getMonth() + 1).padStart(2, '0');
  const day: string = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}${month}${day}`;
}

function downloadCsvBlob(blob: Blob, filename: string): void {
  const url: string = URL.createObjectURL(blob);
  const link: HTMLAnchorElement = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SalesOrdersPage() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<SalesOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState<string>(
    searchParams.get('keyword') ?? '',
  );
  const [statusFilter, setStatusFilter] = useState<'all' | SalesOrderStatus>(
    'all',
  );
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [productOptions, setProductOptions] = useState<ProductWithInventory[]>(
    [],
  );

  const [editOpen, setEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        pageSize: PAGE_SIZE,
      };
      if (keyword.trim()) params.keyword = keyword.trim();
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (warehouseFilter && warehouseFilter !== 'all')
        params.warehouse = warehouseFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await salesOrders.getOrders(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error('获取销售订单列表失败:', String(err));
      toast.error('获取销售订单列表失败');
    } finally {
      setIsLoading(false);
    }
  }, [page, keyword, statusFilter, warehouseFilter, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const paramKeyword: string = searchParams.get('keyword') ?? '';
    if (paramKeyword) {
      setKeyword(paramKeyword);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const all = await productsApi.getAllProducts();
        setProductOptions(Array.isArray(all) ? all : []);
      } catch (err: unknown) {
        logger.error('获取商品列表失败:', String(err));
      }
    };
    loadProducts();
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleViewDetail = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const handleEdit = (order: SalesOrder) => {
    setEditingOrder(order);
    setEditOpen(true);
  };

  const handleCreate = () => {
    setEditingOrder(null);
    setEditOpen(true);
  };

  const handleNextAction = async (order: SalesOrder) => {
    if (actionLoadingId) return;
    const action = order.status;
    setActionLoadingId(order.id);
    try {
      switch (action) {
        case 'pending':
          await salesOrders.confirmOrder(order.id);
          toast.success('订单已确认');
          break;
        case 'confirmed':
          await salesOrders.startPicking(order.id);
          toast.success('已开始备货');
          break;
        case 'picking':
          await salesOrders.shipOrder(order.id);
          toast.success('订单已出库');
          break;
        case 'shipped':
          await salesOrders.completeOrder(order.id);
          toast.success('订单已完成');
          break;
        default:
          break;
      }
      fetchData();
    } catch (err: unknown) {
      logger.error('订单状态操作失败:', String(err));
      toast.error('操作失败，请重试');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (order: SalesOrder) => {
    if (actionLoadingId) return;
    setActionLoadingId(order.id);
    try {
      await salesOrders.cancelOrder(order.id);
      toast.success('订单已取消');
      fetchData();
    } catch (err: unknown) {
      logger.error('取消订单失败:', String(err));
      toast.error('取消失败，请重试');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const params: Omit<SalesOrderListParams, 'page' | 'pageSize'> = {};
      if (keyword.trim()) params.keyword = keyword.trim();
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (warehouseFilter && warehouseFilter !== 'all')
        params.warehouse = warehouseFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data: SalesOrder[] = await salesOrders.exportOrders(params);
      const header: string[] = [
        '订单号', '客户名称', '仓库', '总金额', '状态', '预计发货日期', '创建时间',
      ];
      const rows: string[][] = data.map((item: SalesOrder) => [
        item.orderNo,
        item.customerName,
        item.warehouse,
        item.totalAmount.toFixed(2),
        SALES_STATUS_STYLES[item.status]?.label ?? item.status,
        item.expectedShipDate ? item.expectedShipDate.slice(0, 10) : '',
        formatBeijingTime(item.createdAt),
      ]);
      const csv: string = [header, ...rows]
        .map((row: string[]) => row.map(escapeCsvCell).join(','))
        .join('\n');
      const blob: Blob = new Blob([`\uFEFF${csv}`], {
        type: 'text/csv;charset=utf-8;',
      });
      downloadCsvBlob(blob, `sales_orders_${getExportDateStamp()}.csv`);
      toast.success('导出成功');
    } catch (err: unknown) {
      logger.error('导出销售订单失败:', String(err));
      toast.error('导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 rounded-sm bg-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">销售订单</h1>
            <p className="text-sm text-muted-foreground">
              管理客户订单的确认、备货、出库与完成全流程
            </p>
          </div>
        </div>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="size-4" />
          新增订单
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
                  placeholder="订单号 / 客户名称"
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
                  setStatusFilter(val as 'all' | SalesOrderStatus);
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
              <Select
                value={warehouseFilter}
                onValueChange={(val: string) => {
                  setWarehouseFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="全部仓库" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部仓库</SelectItem>
                  {WAREHOUSES.map((wh) => (
                    <SelectItem key={wh} value={wh}>
                      {wh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-[140px] text-xs"
                />
                <span className="text-xs text-muted-foreground px-1">至</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-[140px] text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className="size-4" />
                {isExporting ? '导出中...' : '导出'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SalesOrdersTable
            items={items}
            total={total}
            page={page}
            totalPages={totalPages}
            isLoading={isLoading}
            actionLoadingId={actionLoadingId}
            onViewDetail={handleViewDetail}
            onEdit={handleEdit}
            onNextAction={handleNextAction}
            onCancel={handleCancel}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <OrderEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        order={editingOrder}
        productOptions={productOptions}
        onSaved={() => {
          fetchData();
        }}
      />

      <OrderDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        orderId={selectedId}
        onStatusChanged={() => {
          fetchData();
        }}
      />
    </div>
  );
}
