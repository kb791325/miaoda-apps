import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Search, Edit2, Check, X } from 'lucide-react';
import PaginationFooter from '@client/src/components/ui/pagination-footer';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { updateInventoryCheck } from '@client/src/api/inventory';
import { assetTypeLabel } from './InventoryTaskCard';
import type { InventoryCheckItem } from '@shared/api.interface';

interface CheckExecutionTableProps {
  checks: InventoryCheckItem[];
  loading?: boolean;
  taskCompleted?: boolean;
  onUpdated: (item: InventoryCheckItem) => void;
}

export function CheckExecutionTable({
  checks,
  loading,
  taskCompleted,
  onUpdated,
}: CheckExecutionTableProps) {
  const items = checks;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [editing, setEditing] = useState<InventoryCheckItem | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = items.filter(
    (item: InventoryCheckItem) =>
      item.assetName.toLowerCase().includes(search.toLowerCase()) ||
      item.assetId.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const openEdit = (item: InventoryCheckItem) => {
    setEditing(item);
    setEditQty(
      item.actualQuantity !== null && item.actualQuantity !== undefined
        ? String(item.actualQuantity)
        : String(item.bookQuantity)
    );
    setEditRemark(item.remark || '');
  };

  const handleSave = async () => {
    if (!editing) return;
    const qty = Number(editQty);
    if (isNaN(qty) || qty < 0) return;
    setSaving(true);
    try {
      const res = await updateInventoryCheck(editing.id, {
        actualQuantity: qty,
        remark: editRemark,
      });
      const diff =
        res.difference !== undefined && res.difference !== null
          ? res.difference
          : qty - editing.bookQuantity;
      const updated: InventoryCheckItem = {
        ...editing,
        actualQuantity: res.actualQuantity ?? qty,
        remark: res.remark ?? editRemark,
        difference: diff,
        status: res.status || 'checked',
        isAbnormal: diff !== 0,
      };
      onUpdated(updated);
      setEditing(null);
      toast.success('盘点结果已保存');
    } catch (err) {
      logger.error('update check failed', err as Error);
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (item: InventoryCheckItem) => {
    if (item.status === 'confirmed') {
      return { text: '已确认', className: 'bg-success/10 text-success border-success/30' };
    }
    if (item.status === 'checked') {
      if (item.difference === 0) {
        return { text: '已盘点', className: 'bg-primary/10 text-primary border-primary/30' };
      }
      if (item.difference && item.difference > 0) {
        return { text: '盘盈', className: 'bg-warning/10 text-warning border-warning/30' };
      }
      return { text: '盘亏', className: 'bg-destructive/10 text-destructive border-destructive/30' };
    }
    return { text: '待盘点', className: 'bg-muted text-muted-foreground border-border' };
  };

  return (
    <div className="bg-card border border-border rounded-sm">
      {/* Search bar */}
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="搜索资产名称/编码..."
            value={search}
            className="pl-8 h-8 text-sm"
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="text-xs text-muted-foreground ml-auto">
          共 {filtered.length} 条
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/50">
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium h-10">
                资产编码
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium h-10">
                资产名称
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium h-10">
                类型
              </TableHead>
              <TableHead className="text-right text-muted-foreground text-xs uppercase tracking-wider font-medium h-10">
                账面数量
              </TableHead>
              <TableHead className="text-right text-muted-foreground text-xs uppercase tracking-wider font-medium h-10">
                实盘数量
              </TableHead>
              <TableHead className="text-right text-muted-foreground text-xs uppercase tracking-wider font-medium h-10">
                差异
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium h-10">
                状态
              </TableHead>
              <TableHead className="text-right text-muted-foreground text-xs uppercase tracking-wider font-medium h-10 w-[100px]">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
            {paginatedItems.map((item: InventoryCheckItem) => {
              const badge = getStatusBadge(item);
              return (
                <>
                    <TableRow key={item.id} className="border-b border-border/50 hover:bg-accent">
                      <TableCell className="font-mono text-foreground text-sm">
                        {item.assetId || "-"}
                      </TableCell>
                      <TableCell className="text-foreground text-sm">
                        {item.assetName || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {assetTypeLabel(item.assetType)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-foreground">
                        {item.bookQuantity}
                      </TableCell>
                  <TableCell className="text-right font-mono text-foreground">
                    {item.actualQuantity ?? '-'}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-medium ${
                      item.difference && item.difference > 0
                        ? 'text-success'
                        : item.difference && item.difference < 0
                        ? 'text-destructive'
                        : 'text-foreground'
                    }`}
                  >
                    {item.difference === null || item.difference === undefined
                      ? '-'
                      : `${item.difference > 0 ? '+' : ''}${item.difference}`}
                  </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`rounded-sm ${badge.className}`}>
                          {badge.text}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => openEdit(item)}
                          disabled={item.status === 'confirmed'}
                        >
                          <Edit2 className="size-3.5 mr-1" />
                          编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <PaginationFooter
        total={filtered.length}
        page={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-base">编辑盘点结果</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div>
                <div className="text-sm font-medium text-foreground mb-1">
                  {editing.assetName}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {editing.assetId}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">账面数量</div>
                  <div className="font-mono font-medium text-foreground">
                    {editing.bookQuantity}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">实盘数量</div>
                  <Input
                    type="number"
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="h-8 font-mono"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">备注</div>
                <Input
                  value={editRemark}
                  onChange={(e) => setEditRemark(e.target.value)}
                  placeholder="差异原因说明..."
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(null)}
              className="rounded-sm"
            >
              <X className="size-3.5 mr-1" />
              取消
            </Button>
            <Button size="sm" onClick={handleSave} className="rounded-sm" disabled={saving}>
              <Check className="size-3.5 mr-1" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
