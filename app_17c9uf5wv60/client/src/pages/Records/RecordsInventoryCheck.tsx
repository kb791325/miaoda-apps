import { useState, useEffect, useCallback } from 'react';
import { formatBeijingTime } from '@client/src/utils/date';
import { records, sync as syncApi } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
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
import { Badge } from '@client/src/components/ui/badge';
import {
  ClipboardCheck,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  InventoryCheck,
  InventoryCheckItem,
} from '@shared/api.interface';
import { DocumentPrinter } from '@client/src/components/DocumentPrinter';
import {
  RecordsInventoryCheckDetail,
  CHECK_STATUS_MAP,
  type EditableItem,
} from './RecordsInventoryCheckDetail';

const WAREHOUSES = [
  { value: 'all', label: '全部仓库' },
  { value: '上海仓', label: '上海仓' },
  { value: '北京仓', label: '北京仓' },
  { value: '广州仓', label: '广州仓' },
  { value: '成都仓', label: '成都仓' },
];

const CHECK_PAGE_SIZE = 10;

export function RecordsInventoryCheck() {
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [checks, setChecks] = useState<(InventoryCheck & { itemCount: number })[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [createWarehouse, setCreateWarehouse] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [viewingCheckId, setViewingCheckId] = useState<string | null>(null);
  const [viewingCheckNo, setViewingCheckNo] = useState('');
  const [viewingCheckStatus, setViewingCheckStatus] = useState<string>('');
  const [viewingCheckWarehouse, setViewingCheckWarehouse] = useState('');
  const [viewItems, setViewItems] = useState<EditableItem[]>([]);
  const [isViewing, setIsViewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncApi.pushSync('inventory_checks');
      toast.success('盘点数据已同步到飞书');
    } catch (err: unknown) {
      logger.error('同步到飞书失败:', String(err));
      toast.error('同步到飞书失败');
    } finally {
      setSyncing(false);
    }
  };

  const fetchChecks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: { page: number; pageSize: number; warehouse?: string } = {
        page,
        pageSize: CHECK_PAGE_SIZE,
      };
      if (warehouseFilter && warehouseFilter !== 'all') {
        params.warehouse = warehouseFilter;
      }
      const res = await records.getInventoryChecks(params);
      setChecks(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error('获取盘点记录失败:', String(err));
      toast.error('获取盘点记录失败');
    } finally {
      setIsLoading(false);
    }
  }, [page, warehouseFilter]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  const totalPages = Math.max(1, Math.ceil(total / CHECK_PAGE_SIZE));

  const handleCreate = async () => {
    if (!createWarehouse) {
      toast.error('请选择仓库');
      return;
    }
    setIsCreating(true);
    try {
      const res = await records.createInventoryCheck({ warehouse: createWarehouse });
      toast.success('盘点单已创建');
      setCreateWarehouse('');
      setPage(1);
      setViewingCheckId(res.check.id);
      setViewingCheckNo(res.check.checkNo);
      setViewingCheckStatus(res.check.status);
      setViewingCheckWarehouse(res.check.warehouse);
      setViewItems(
        res.items.map((item: InventoryCheckItem) => ({
          ...item,
          actualQuantityInput: String(item.actualQuantity ?? 0),
          remarkInput: item.remark ?? '',
        })),
      );
      await fetchChecks();
    } catch (err: unknown) {
      logger.error('创建盘点失败:', String(err));
      toast.error('创建盘点失败');
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewCheck = async (checkId: string) => {
    setViewingCheckId(checkId);
    setIsViewing(true);
    try {
      const res = await records.getInventoryCheck(checkId);
      setViewingCheckStatus(res.check.status);
      setViewingCheckWarehouse(res.check.warehouse);
      setViewingCheckNo(res.check.checkNo);
      setViewItems(
        res.items.map((item: InventoryCheckItem) => ({
          ...item,
          actualQuantityInput: String(item.actualQuantity ?? 0),
          remarkInput: item.remark ?? '',
        })),
      );
    } catch (err: unknown) {
      logger.error('获取盘点详情失败:', String(err));
      toast.error('获取盘点详情失败');
      setViewingCheckId(null);
    } finally {
      setIsViewing(false);
    }
  };

  const handleClose = () => {
    setViewingCheckId(null);
    setViewingCheckNo('');
    setViewItems([]);
    setViewingCheckStatus('');
    setViewingCheckWarehouse('');
  };

  const handleActualChange = (id: string, value: string) => {
    setViewItems((prev: EditableItem[]) =>
      prev.map((item: EditableItem) =>
        item.id === id
          ? {
              ...item,
              actualQuantityInput: value,
            }
          : item,
      ),
    );
  };

  const handleRemarkChange = (id: string, value: string) => {
    setViewItems((prev: EditableItem[]) =>
      prev.map((item: EditableItem) =>
        item.id === id
          ? {
              ...item,
              remarkInput: value,
            }
          : item,
      ),
    );
  };

  const handleSubmit = async () => {
    if (!viewingCheckId) return;
    setIsSubmitting(true);
    try {
      const items = viewItems.map((item: EditableItem) => ({
        id: item.id,
        actualQuantity: Number(item.actualQuantityInput) || 0,
        remark: item.remarkInput,
      }));
      await records.submitInventoryCheck(viewingCheckId, { items });
      toast.success('盘点已提交');
      setViewingCheckStatus('completed');
      await fetchChecks();
    } catch (err: unknown) {
      logger.error('提交盘点失败:', String(err));
      toast.error('提交盘点失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const printData = viewingCheckId && viewItems.length > 0
    ? {
        id: viewingCheckId,
        checkNo: viewingCheckNo,
        warehouse: viewingCheckWarehouse,
        status: viewingCheckStatus,
        checkDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        items: viewItems.map((item: EditableItem) => ({
          id: item.id,
          checkId: item.checkId,
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          location: item.location ?? '',
          systemQuantity: item.systemQuantity,
          actualQuantity: Number(item.actualQuantityInput) || 0,
          difference:
            (Number(item.actualQuantityInput) || 0) - item.systemQuantity,
          remark: item.remark ?? '',
        })),
      }
    : null;

  const handlePrint = () => {
    if (!printData) {
      toast.error('暂无盘点明细可打印');
      return;
    }
    setPrintOpen(true);
  };

  return (
    <>
    <Card className="rounded-sm shadow-none border border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ClipboardCheck className="size-4 text-primary" />
            库存盘点
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select
              value={createWarehouse}
              onValueChange={setCreateWarehouse}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="选择仓库" />
              </SelectTrigger>
              <SelectContent>
                {WAREHOUSES.filter((w) => w.value !== 'all').map((w) => (
                  <SelectItem key={w.value} value={w.value}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={isCreating || !createWarehouse}
            >
              <Plus className="size-4" />
              {isCreating ? '创建中...' : '创建盘点'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
              同步到飞书
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!viewingCheckId && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                加载中...
              </div>
            ) : checks.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                暂无盘点记录
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                       <tr className="border-b border-border bg-muted/50">
                         <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-[254px]">
                          盘点单号
                        </th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-[206px]">
                          仓库
                        </th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-[206px]">
                          状态
                        </th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-[206px]">
                          商品数
                        </th>
                        <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-[254px]">
                          盘点时间
                        </th>
                        <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {checks.map((check, index) => {
                         const statusInfo = CHECK_STATUS_MAP[check.status] ?? {
                          label: check.status,
                          className: '',
                        };
                        return (
                           <tr
                            key={check.id}
                            className="border-b border-border/50 hover:bg-accent/50"
                          >
                            <td className="px-3 py-2.5 font-mono text-xs">
                              {check.checkNo}
                            </td>
                            <td className="px-3 py-2.5">{check.warehouse}</td>
                            <td className="px-3 py-2.5">
                              <Badge
                                variant="secondary"
                                className={statusInfo.className}
                              >
                                {statusInfo.label}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-left font-mono">
                              {check.itemCount}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">
                              {formatBeijingTime(check.checkDate)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewCheck(check.id)}
                                className="h-7 px-2"
                              >
                                <Eye className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    共 {total} 条记录
                  </span>
                  <div className="flex items-center gap-2">
                    <Select
                      value={warehouseFilter}
                      onValueChange={(val: string) => {
                        setWarehouseFilter(val);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WAREHOUSES.map((w) => (
                          <SelectItem key={w.value} value={w.value}>
                            {w.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() =>
                        setPage((p: number) => Math.max(1, p - 1))
                      }
                    >
                      <ChevronLeft className="size-4" />
                      上一页
                    </Button>
                    <span className="text-sm font-mono px-2">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((p: number) =>
                          Math.min(totalPages, p + 1),
                        )
                      }
                    >
                      下一页
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {viewingCheckId && (
          <RecordsInventoryCheckDetail
            checkId={viewingCheckId}
            status={viewingCheckStatus}
            warehouse={viewingCheckWarehouse}
            items={viewItems}
            isViewing={isViewing}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onClose={handleClose}
            onActualChange={handleActualChange}
            onRemarkChange={handleRemarkChange}
            onPrint={handlePrint}
          />
        )}
      </CardContent>
     </Card>

     <DocumentPrinter
       type="inventory-check"
       data={printData}
       open={printOpen}
       onOpenChange={setPrintOpen}
     />
    </>
   );
}
