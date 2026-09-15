import { useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  FolderEdit,
  Layers,
  ArrowRightLeft,
  Trash2,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import AssetBatchDialogs, { type AssetDialogType } from '@client/src/components/batch/AssetBatchDialogs';
import AssetQRCodePrintDialog from '@client/src/components/AssetQRCodePrintDialog';
import type { BatchOperationResult } from '@shared/api.interface';
import * as assetsApi from '@client/src/api/fixed-assets';

interface AssetBatchToolbarProps {
  selectedIds: string[];
  floorOptions: string[];
  onRefresh: () => void;
  onClearSelection: () => void;
}

const showBatchToast = (
  successCount: number,
  failedCount: number,
  failedItems: Array<{ id: string; reason: string }>,
  actionLabel: string,
) => {
  if (failedCount === 0) {
    toast.success(`${actionLabel}成功 ${successCount} 条`);
    return;
  }
  toast(
    <div className="space-y-2">
      <div className="font-medium">
        {actionLabel}完成：成功 {successCount} 条，失败 {failedCount} 条
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {failedItems.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 text-xs text-muted-foreground"
          >
            <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-destructive" />
            <span className="font-mono">{item.id}</span>
            <span>{item.reason}</span>
          </div>
        ))}
        {failedItems.length > 5 && (
          <div className="text-xs text-muted-foreground">
            还有 {failedItems.length - 5} 条失败...
          </div>
        )}
      </div>
    </div>,
  );
};

const AssetBatchToolbar = ({
  selectedIds,
  floorOptions,
  onRefresh,
  onClearSelection,
}: AssetBatchToolbarProps) => {
  const [dialogType, setDialogType] = useState<AssetDialogType>(null);
  const [printQROpen, setPrintQROpen] = useState(false);
  const [acting, setActing] = useState(false);
  const disabled = selectedIds.length === 0;

  const wrap = <T extends unknown[]>(
    fn: (...args: T) => Promise<BatchOperationResult>,
    label: string,
  ) => {
    return async (...args: T) => {
      const result = await fn(...args);
      showBatchToast(result.successCount, result.failedCount, result.failedItems, label);
      return result;
    };
  };

  return (
    <>
       <div className="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
           <span className="text-muted-foreground">已选</span>
          <Badge
             className="rounded-md font-mono font-semibold text-primary bg-primary/20 border-primary/30"
            variant="outline"
          >
            {selectedIds.length}
          </Badge>
           <span className="text-muted-foreground">条</span>
        </div>
         <div className="h-4 w-px bg-border" />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || acting}
             className="rounded-md border-border text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
             onClick={() => setDialogType('category')}
          >
            <FolderEdit className="mr-1.5 h-3.5 w-3.5" />
            批量修改类目
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || acting}
             className="rounded-md border-border text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
             onClick={() => setDialogType('floor')}
          >
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            批量修改楼层
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || acting}
             className="rounded-md border-border text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
             onClick={() => setDialogType('transfer')}
          >
            <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
            批量调拨
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || acting}
             className="rounded-md border-border text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            onClick={() => setDialogType('scrap')}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            批量报废
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || acting}
             className="rounded-md border-border text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30"
            onClick={() => setPrintQROpen(true)}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            批量打印QR码
          </Button>
        </div>
        {selectedIds.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
             className="ml-auto rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={onClearSelection}
          >
            清除选择
          </Button>
        )}
      </div>

      <AssetBatchDialogs
        open={dialogType}
        onOpenChange={setDialogType}
        selectedIds={selectedIds}
        floorOptions={floorOptions}
        onUpdateCategory={wrap(assetsApi.batchUpdateAssetCategory, '批量修改类目')}
        onUpdateFloor={wrap(assetsApi.batchUpdateAssetFloor, '批量修改楼层')}
        onTransfer={wrap(assetsApi.batchTransferAssets, '批量调拨')}
        onScrap={wrap(assetsApi.batchScrapAssets, '批量报废')}
        onSuccess={() => {
          onRefresh();
          onClearSelection();
        }}
        onError={() => {
          logger.error('批量操作失败');
          toast.error('操作失败');
        }}
        acting={acting}
        setActing={setActing}
      />

      <AssetQRCodePrintDialog
        open={printQROpen}
        onOpenChange={setPrintQROpen}
        assetIds={selectedIds}
      />
    </>
  );
};

export default AssetBatchToolbar;
