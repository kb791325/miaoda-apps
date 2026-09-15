import { useEffect, useMemo, useState } from 'react';
import { Loader2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { inventoriesApi, inventoryChecksApi } from '@/api';
import { extractErrorMessage } from '@/lib/error-utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CHECK_SCOPE_OPTS, type CheckDetailItem } from './InventoryCheckTypes';

interface InventoryRow {
  id: string | number;
  material_name?: string;
  category?: string;
  location?: string;
  stock_quantity?: number;
}

function todayStr(): string {
  const d = new Date();
  const pad = (x: number): string => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function makeCheckNo(): string {
  const d = new Date();
  const pad = (x: number): string => String(x).padStart(2, '0');
  return `PD${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

interface CreateCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function InventoryCheckCreateDialog({ open, onOpenChange, onCreated }: CreateCheckDialogProps) {
  const profile = useCurrentUserProfile();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inventories, setInventories] = useState<InventoryRow[]>([]);
  const [rangeType, setRangeType] = useState('全部物资');
  const [warehouse, setWarehouse] = useState('');
  const [category, setCategory] = useState('');
  const [checkNo, setCheckNo] = useState('');
  const [checkDate, setCheckDate] = useState(todayStr());
  const [checkerName, setCheckerName] = useState('');
  const [remark, setRemark] = useState('');

  useEffect(() => {
    if (!open) return;
    setCheckNo(makeCheckNo());
    setCheckDate(todayStr());
    setRangeType('全部物资');
    setWarehouse('');
    setCategory('');
    setRemark('');
    setLoading(true);
    inventoriesApi.list({ page: 1, pageSize: 500 })
      .then((res) => {
        if (res.code === 0 && res.data) setInventories(res.data.list as unknown as InventoryRow[]);
        else toast.error(res.message || '库存物资加载失败');
      })
      .catch((e) => toast.error(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (profile?.name && open && !checkerName) setCheckerName(profile.name);
  }, [profile, open, checkerName]);

  const warehouseOpts = useMemo(
    () => Array.from(new Set(inventories.map((r) => (r.location || '').trim()).filter(Boolean))),
    [inventories],
  );
  const categoryOpts = useMemo(
    () => Array.from(new Set(inventories.map((r) => (r.category || '').trim()).filter(Boolean))),
    [inventories],
  );

  const matched: InventoryRow[] = useMemo(() => {
    if (rangeType === '按仓库') return inventories.filter((r) => (r.location || '').trim() === warehouse);
    if (rangeType === '按分类') return inventories.filter((r) => (r.category || '').trim() === category);
    return inventories;
  }, [inventories, rangeType, warehouse, category]);

  const sumSystem = useMemo(() => matched.reduce((acc, r) => acc + Number(r.stock_quantity ?? 0), 0), [matched]);

  const rangeOptionsReady = rangeType === '全部物资' || (rangeType === '按仓库' ? warehouse !== '' : category !== '');

  const handleSubmit = async () => {
    if (!checkDate) { toast.error('请选择盘点日期'); return; }
    if (!checkerName.trim()) { toast.error('请填写盘点人'); return; }
    if (!rangeOptionsReady) { toast.error(rangeType === '按仓库' ? '请选择仓库' : '请选择分类'); return; }
    if (matched.length === 0) { toast.error('该盘点范围内没有库存物资'); return; }
    const items: CheckDetailItem[] = matched.map((r) => ({
      inventoryId: String(r.id),
      materialName: r.material_name || '',
      category: r.category || '',
      location: r.location || '',
      systemQty: Number(r.stock_quantity ?? 0),
      actualQty: null,
    }));
    const rangeLabel = rangeType === '全部物资' ? '全部物资' : rangeType === '按仓库' ? `仓库：${warehouse}` : `分类：${category}`;
    setSubmitting(true);
    try {
      const res = await inventoryChecksApi.create({
        check_no: checkNo,
        check_date: checkDate,
        check_range: rangeLabel,
        range_type: rangeType,
        warehouse: rangeType === '按仓库' ? warehouse : '',
        category: rangeType === '按分类' ? category : '',
        checker_name: checkerName.trim(),
        remark: remark.trim(),
        system_count: sumSystem,
        actual_count: 0,
        diff_count: 0,
        gain_count: 0,
        loss_count: 0,
        status: 'in_progress',
        check_detail: items,
      } as Record<string, unknown>);
      if (res.code === 0) {
        toast.success(`盘点单已创建，共 ${items.length} 项物资待盘点`);
        onOpenChange(false);
        onCreated();
      } else {
        toast.error(res.message || '创建失败');
      }
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>发起盘点</DialogTitle>
          <DialogDescription>盘点单号 {checkNo || '—'}，创建后自动按范围生成盘点明细</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />加载库存物资...
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>盘点日期 <span className="text-red-500">*</span></Label>
                <Input type="date" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>盘点人 <span className="text-red-500">*</span></Label>
                <Input value={checkerName} placeholder="盘点人姓名" onChange={(e) => setCheckerName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>盘点范围 <span className="text-red-500">*</span></Label>
                <Select value={rangeType} onValueChange={(v) => { setRangeType(v); setWarehouse(''); setCategory(''); }}>
                  <SelectTrigger><SelectValue placeholder="选择范围" /></SelectTrigger>
                  <SelectContent>
                    {CHECK_SCOPE_OPTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {rangeType === '按仓库' && (
                <div className="space-y-1">
                  <Label>仓库 <span className="text-red-500">*</span></Label>
                  <Select value={warehouse} onValueChange={setWarehouse}>
                    <SelectTrigger><SelectValue placeholder="选择仓库" /></SelectTrigger>
                    <SelectContent>
                      {warehouseOpts.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {rangeType === '按分类' && (
                <div className="space-y-1">
                  <Label>分类 <span className="text-red-500">*</span></Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="选择分类" /></SelectTrigger>
                    <SelectContent>
                      {categoryOpts.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-accent/40 px-3 py-2 text-sm">
              <ClipboardList className="size-4 text-primary" />
              <span>共 <b className="tabular-nums">{matched.length}</b> 项物资，系统数量合计 <b className="tabular-nums">{sumSystem}</b></span>
            </div>
            <div className="space-y-1">
              <Label>备注</Label>
              <Input value={remark} placeholder="可选" onChange={(e) => setRemark(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting || loading}>{submitting ? '创建中...' : '创建盘点单'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
