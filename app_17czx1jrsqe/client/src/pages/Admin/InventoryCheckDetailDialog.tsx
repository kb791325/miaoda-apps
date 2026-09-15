import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { inventoryChecksApi } from '@/api';
import { extractErrorMessage } from '@/lib/error-utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/lib/format';
import { parseCheckDetail, type CheckDetailItem } from './InventoryCheckTypes';

interface CheckRecord {
  id?: number | string;
  check_no?: string;
  check_date?: string;
  check_range?: string;
  range_type?: string;
  checker_name?: string;
  status?: string;
  remark?: string;
  check_detail?: string | CheckDetailItem[];
  system_count?: number;
  actual_count?: number;
  diff_count?: number;
  gain_count?: number;
  loss_count?: number;
}

interface CheckDetailDialogProps {
  record: CheckRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function diffOf(row: CheckDetailItem): number | null {
  return row.actualQty === null ? null : row.actualQty - row.systemQty;
}

export default function InventoryCheckDetailDialog({ record, open, onOpenChange, onSaved }: CheckDetailDialogProps) {
  const editable = record?.status === 'in_progress';
  const [rows, setRows] = useState<CheckDetailItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open || !record) return;
    setRows(parseCheckDetail(record.check_detail));
    setConfirmOpen(false);
  }, [open, record]);

  const summary = useMemo(() => {
    let gain = 0;
    let loss = 0;
    let gainQty = 0;
    let lossQty = 0;
    let normal = 0;
    let unfilled = 0;
    for (const r of rows) {
      const d = diffOf(r);
      if (d === null) { unfilled += 1; continue; }
      if (d > 0) { gain += 1; gainQty += d; } else if (d < 0) { loss += 1; lossQty += -d; } else { normal += 1; }
    }
    return { gain, loss, gainQty, lossQty, normal, unfilled };
  }, [rows]);

  const setActual = (idx: number, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx
      ? { ...r, actualQty: value.trim() === '' ? null : Math.max(0, Number(value) || 0) }
      : r)));
  };
  const setRemark = (idx: number, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, remark: value } : r)));
  };
  const fillAllNormal = () => {
    setRows((prev) => prev.map((r) => ({ ...r, actualQty: r.systemQty })));
  };
  const applyBatch = (value: string) => {
    if (value.trim() === '') return;
    const v = Math.max(0, Number(value) || 0);
    setRows((prev) => prev.map((r) => ({ ...r, actualQty: v })));
  };

  const persist = async (complete: boolean) => {
    if (!record || record.id === undefined) return;
    const payload: Record<string, unknown> = { check_detail: rows };
    if (complete) {
      if (summary.unfilled > 0) {
        toast.error(`还有 ${summary.unfilled} 项未录入实盘数量`);
        return;
      }
      const sumSystem = rows.reduce((acc, r) => acc + r.systemQty, 0);
      const sumActual = rows.reduce((acc, r) => acc + (r.actualQty ?? 0), 0);
      payload.system_count = sumSystem;
      payload.actual_count = sumActual;
      payload.diff_count = sumActual - sumSystem;
      payload.gain_count = summary.gain;
      payload.loss_count = summary.loss;
      payload.status = 'completed';
    }
    setSaving(true);
    try {
      const res = await inventoryChecksApi.update(record.id!, payload);
      if (res.code === 0) {
        toast.success(complete ? '盘点完成，库存已按实盘数更新' : '盘点明细已保存');
        onSaved();
        if (complete) onOpenChange(false);
      } else {
        toast.error(res.message || '保存失败');
      }
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  if (!record) return null;
  const isCompleted = record.status === 'completed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            盘点明细：{record.check_no}
            <StatusBadge status={isCompleted ? '已完成' : '盘点中'} variant={isCompleted ? 'success' : 'warning'} />
          </DialogTitle>
          <DialogDescription>
            {formatDate(record.check_date)} · 盘点人 {record.checker_name || '-'} · 范围 {record.check_range || '-'}
            {isCompleted && ` · 系统合计 ${record.system_count ?? 0} → 实盘合计 ${record.actual_count ?? 0}，差异 ${record.diff_count ?? 0}`}
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">该盘点单没有明细数据</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex flex-wrap gap-3 text-muted-foreground">
                <span>盘盈 <b className="text-red-600 tabular-nums">{summary.gain}</b> 项（+{summary.gainQty}）</span>
                <span>盘亏 <b className="text-amber-600 tabular-nums">{summary.loss}</b> 项（-{summary.lossQty}）</span>
                <span>正常 <b className="tabular-nums">{summary.normal}</b> 项</span>
                {summary.unfilled > 0 && <span className="text-destructive">未录入 {summary.unfilled} 项</span>}
              </div>
              {editable && (
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 w-28" type="number" min={0} placeholder="批量录入"
                    onKeyDown={(e) => { if (e.key === 'Enter') applyBatch((e.target as HTMLInputElement).value); }}
                  />
                  <Button variant="outline" size="sm" onClick={fillAllNormal}>全部正常</Button>
                </div>
              )}
            </div>
            <div className="max-h-[55vh] overflow-auto rounded-md border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr>
                    <th className="min-w-[140px] px-3 py-2 text-left font-medium whitespace-nowrap">物资名称</th>
                    <th className="w-[90px] px-3 py-2 text-left font-medium whitespace-nowrap">分类</th>
                    <th className="w-[90px] px-3 py-2 text-right font-medium whitespace-nowrap">系统数量</th>
                    <th className="w-[100px] px-3 py-2 text-right font-medium whitespace-nowrap">实盘数量</th>
                    <th className="w-[90px] px-3 py-2 text-right font-medium whitespace-nowrap">差异数量</th>
                    <th className="w-[90px] px-3 py-2 text-left font-medium whitespace-nowrap">差异状态</th>
                    <th className="w-[150px] px-3 py-2 text-left font-medium whitespace-nowrap">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const d = diffOf(row);
                    return (
                      <tr key={`${row.inventoryId}-${idx}`} className="border-t bg-card">
                        <td className="px-3 py-2 font-medium">{row.materialName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.category || '-'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.systemQty}</td>
                        <td className="px-3 py-2 text-right">
                          {editable ? (
                             <Input
                               className="h-8 w-20 text-right" type="number" min={0}
                               value={row.actualQty === null ? '' : row.actualQty}
                               onChange={(e) => setActual(idx, e.target.value)}
                             />
                           ) : <span className="tabular-nums">{row.actualQty ?? '-'}</span>}
                         </td>
                         <td className={`px-3 py-2 text-right tabular-nums ${d !== null && d !== 0 ? 'font-semibold text-destructive' : ''}`}>
                           {d === null ? '-' : d > 0 ? `+${d}` : d}
                         </td>
                         <td className="px-3 py-2 whitespace-nowrap">
                          {d === null
                            ? <span className="text-muted-foreground">待录入</span>
                            : d > 0
                              ? <StatusBadge status="盘盈" variant="danger" />
                              : d < 0
                                ? <StatusBadge status="盘亏" variant="warning" />
                                : <StatusBadge status="正常" variant="success" />}
                        </td>
                          <td className="px-3 py-2">
                            {editable ? (
                              <Input className="h-8 w-28" value={row.remark ?? ''} onChange={(e) => setRemark(idx, e.target.value)} />
                            ) : row.remark || '-'}
                          </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{isCompleted ? '关闭' : '取消'}</Button>
          {editable && rows.length > 0 && (
            <>
              <Button variant="outline" disabled={saving} onClick={() => persist(false)}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}保存草稿
              </Button>
              <Button disabled={saving} onClick={() => setConfirmOpen(true)}>完成盘点</Button>
            </>
          )}
        </DialogFooter>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认完成盘点？</AlertDialogTitle>
              <AlertDialogDescription>
                共 {rows.length} 项物资：盘盈 {summary.gain} 项（共 +{summary.gainQty}），盘亏 {summary.loss} 项（共 -{summary.lossQty}），正常 {summary.normal} 项。确认后库存数量将按实盘数更新（盘盈增加、盘亏减少），盘点单转为已完成，不可再修改。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>再检查一下</AlertDialogCancel>
              <AlertDialogAction onClick={() => persist(true)} disabled={saving}>
                {saving ? '提交中...' : '确认完成'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
