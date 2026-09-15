import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { BatchOperationResult } from '@shared/api.interface';

export type AssetDialogType = 'category' | 'floor' | 'transfer' | 'scrap' | null;

interface AssetBatchDialogsProps {
  open: AssetDialogType;
  onOpenChange: (type: AssetDialogType) => void;
  selectedIds: string[];
  floorOptions: string[];
  onUpdateCategory: (ids: string[], category: string) => Promise<BatchOperationResult>;
  onUpdateFloor: (ids: string[], floor: string) => Promise<BatchOperationResult>;
  onTransfer: (
    ids: string[],
    data: {
      targetDepartment?: string;
      targetFloor?: string;
      targetUserId?: string;
      reason?: string;
    },
  ) => Promise<BatchOperationResult>;
  onScrap: (ids: string[], reason: string) => Promise<BatchOperationResult>;
  onSuccess: () => void;
  onError: () => void;
  acting: boolean;
  setActing: (v: boolean) => void;
}

const AssetBatchDialogs = ({
  open,
  onOpenChange,
  selectedIds,
  floorOptions,
  onUpdateCategory,
  onUpdateFloor,
  onTransfer,
  onScrap,
  onSuccess,
  onError,
  acting,
  setActing,
}: AssetBatchDialogsProps) => {
  const [categoryValue, setCategoryValue] = useState('');
  const [floorValue, setFloorValue] = useState('');
  const [scrapReason, setScrapReason] = useState('');
  const [transferData, setTransferData] = useState({
    targetDepartment: '',
    targetFloor: '',
    targetUserId: '',
    reason: '',
  });

  const runBatch = async (
    fn: () => Promise<BatchOperationResult>,
    reset: () => void,
  ) => {
    setActing(true);
    try {
      const result = await fn();
      if (result.successCount > 0) onSuccess();
      reset();
      onOpenChange(null);
    } catch {
      onError();
    } finally {
      setActing(false);
    }
  };

  const handleCategory = () => {
    if (!categoryValue.trim()) return;
    runBatch(
      () => onUpdateCategory(selectedIds, categoryValue.trim()),
      () => setCategoryValue(''),
    );
  };

  const handleFloor = () => {
    if (!floorValue) return;
    runBatch(
      () => onUpdateFloor(selectedIds, floorValue),
      () => setFloorValue(''),
    );
  };

  const handleTransfer = () => {
    if (
      !transferData.targetDepartment.trim()
      && !transferData.targetFloor
      && !transferData.targetUserId.trim()
    ) {
      return;
    }
    runBatch(
      () => onTransfer(selectedIds, {
        targetDepartment: transferData.targetDepartment.trim() || undefined,
        targetFloor: transferData.targetFloor || undefined,
        targetUserId: transferData.targetUserId.trim() || undefined,
        reason: transferData.reason.trim() || undefined,
      }),
      () => setTransferData({
        targetDepartment: '',
        targetFloor: '',
        targetUserId: '',
        reason: '',
      }),
    );
  };

  const handleScrap = () => {
    if (!scrapReason.trim()) return;
    runBatch(
      () => onScrap(selectedIds, scrapReason.trim()),
      () => setScrapReason(''),
    );
  };

  const count = selectedIds.length;

  return (
    <>
      {/* 类目 */}
      <Dialog open={open === 'category'} onOpenChange={(v) => !v && onOpenChange(null)}>
        <DialogContent className="rounded-sm sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>批量修改类目</DialogTitle>
            <DialogDescription>已选择 {count} 条资产，请输入新的资产类目。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>资产类目</Label>
            <Input
              value={categoryValue}
              onChange={(e) => setCategoryValue(e.target.value)}
              placeholder="请输入资产类目"
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={acting}>取消</Button>
            </DialogClose>
            <Button onClick={handleCategory} disabled={acting || !categoryValue.trim()}>
              {acting ? '处理中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 楼层 */}
      <Dialog open={open === 'floor'} onOpenChange={(v) => !v && onOpenChange(null)}>
        <DialogContent className="rounded-sm sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>批量修改楼层</DialogTitle>
            <DialogDescription>已选择 {count} 条资产，请选择新的使用楼层。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>使用楼层</Label>
            <Select value={floorValue} onValueChange={setFloorValue}>
              <SelectTrigger><SelectValue placeholder="请选择楼层" /></SelectTrigger>
              <SelectContent>
                {floorOptions.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={acting}>取消</Button>
            </DialogClose>
            <Button onClick={handleFloor} disabled={acting || !floorValue}>
              {acting ? '处理中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 调拨 */}
      <Dialog open={open === 'transfer'} onOpenChange={(v) => !v && onOpenChange(null)}>
        <DialogContent className="rounded-sm sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>批量调拨</DialogTitle>
            <DialogDescription>
              已选择 {count} 条资产，请填写调拨信息（至少一项目标）。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>目标部门</Label>
              <Input
                value={transferData.targetDepartment}
                onChange={(e) => setTransferData((d) => ({ ...d, targetDepartment: e.target.value }))}
                placeholder="请输入目标部门"
              />
            </div>
            <div className="space-y-1.5">
              <Label>目标楼层</Label>
              <Select
                value={transferData.targetFloor}
                onValueChange={(v) => setTransferData((d) => ({ ...d, targetFloor: v }))}
              >
                <SelectTrigger><SelectValue placeholder="请选择目标楼层" /></SelectTrigger>
                <SelectContent>
                  {floorOptions.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>目标人 ID</Label>
              <Input
                value={transferData.targetUserId}
                onChange={(e) => setTransferData((d) => ({ ...d, targetUserId: e.target.value }))}
                placeholder="请输入目标用户 ID"
              />
            </div>
            <div className="space-y-1.5">
              <Label>调拨原因</Label>
              <Textarea
                value={transferData.reason}
                onChange={(e) => setTransferData((d) => ({ ...d, reason: e.target.value }))}
                placeholder="请输入调拨原因（可选）"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={acting}>取消</Button>
            </DialogClose>
            <Button onClick={handleTransfer} disabled={acting}>
              {acting ? '处理中...' : '确认调拨'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 报废 */}
      <Dialog open={open === 'scrap'} onOpenChange={(v) => !v && onOpenChange(null)}>
        <DialogContent className="rounded-sm sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              批量报废
            </DialogTitle>
            <DialogDescription>
              将永久报废 {count} 条资产，此操作不可撤销，请谨慎确认。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>报废原因</Label>
            <Textarea
              value={scrapReason}
              onChange={(e) => setScrapReason(e.target.value)}
              placeholder="请填写报废原因"
              rows={4}
              autoFocus
            />
          </div>
          <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            警告：报废后资产状态将变更为「报废」，相关数据将无法恢复。
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={acting}>取消</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleScrap}
              disabled={acting || !scrapReason.trim()}
            >
              {acting ? '处理中...' : '确认报废'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AssetBatchDialogs;
