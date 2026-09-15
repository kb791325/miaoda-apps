import React, { useState, useMemo } from 'react';
import { Printer, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { resolveAppUrl } from '@lark-apaas/client-toolkit/utils/resolveAppUrl';

type LabelSize = 'small' | 'medium' | 'large';

interface LabelConfig {
  width: number;
  height: number;
  cols: number;
  label: string;
}

const LABEL_CONFIGS: Record<LabelSize, LabelConfig> = {
  small: { width: 40, height: 30, cols: 4, label: '小 (40×30mm)' },
  medium: { width: 60, height: 40, cols: 3, label: '中 (60×40mm)' },
  large: { width: 50, height: 50, cols: 2, label: '大 (50×50mm)' },
};

interface AssetQRCodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetIds: string[];
}

const AssetQRCodePrintDialog: React.FC<AssetQRCodePrintDialogProps> = React.memo(({
  open,
  onOpenChange,
  assetIds,
}) => {
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [zoom, setZoom] = useState<number>(100);

  const config: LabelConfig = LABEL_CONFIGS[labelSize];

  const handlePrint = (): void => {
    if (assetIds.length === 0) {
      toast.error('没有可打印的标签');
      return;
    }
    window.print();
  };

  const handleTestPrint = (): void => {
    if (assetIds.length === 0) {
      toast.error('没有可打印的标签');
      return;
    }
    toast.success('正在打印测试页...');
    window.print();
  };

  const printStyles: string = `
    @media print {
      html, body {
        background: white !important;
      }
      body * {
        visibility: hidden;
      }
      .print-area,
      .print-area * {
        visibility: visible;
      }
      .print-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        transform: none !important;
      }
      .print-area .no-print {
        display: none;
      }
      @page {
        margin: 10mm;
        size: auto;
      }
    }
  `;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-sm">
        <style>{printStyles}</style>

        <DialogHeader>
          <DialogTitle>批量打印 QR 码标签</DialogTitle>
          <DialogDescription>
            已选择 {assetIds.length} 个资产，选择标签尺寸后打印
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Label size selector — segmented buttons */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">
              标签尺寸
            </span>
            <div className="flex items-center rounded-sm border border-border overflow-hidden w-fit">
              {(Object.keys(LABEL_CONFIGS) as LabelSize[]).map(
                (key: LabelSize) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setLabelSize(key)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                      key === labelSize
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-transparent text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {LABEL_CONFIGS[key].label}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Zoom slider */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                预览缩放
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {zoom}%
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={200}
              step={10}
              value={zoom}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setZoom(Number(e.target.value))
              }
              className="w-full h-2 rounded-sm appearance-none bg-accent cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-sm
                [&::-webkit-slider-thumb]:bg-primary
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>

          {/* Print preview area */}
          <div className="overflow-auto border border-border rounded-sm bg-card p-4" style={{ maxHeight: '400px' }}>
            <div
              className="print-area"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
              }}
            >
              <div
                className="grid gap-3 p-4 bg-card"
                style={{
                  gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
                }}
              >
                {useMemo(() => {
                  if (assetIds.length === 0) {
                    return (
                      <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
                        暂无选中资产
                      </div>
                    );
                  }
                  return assetIds.map((id: string) => {
                    const url: string = resolveAppUrl(`/fixed-assets/${id}`);
                    const qrData: string = JSON.stringify({
                      type: 'asset',
                      assetId: id,
                      assetName: '',
                      assetCode: `FA-${id.slice(-6)}`,
                      assetType: '',
                      timestamp: Date.now(),
                      viewUrl: url,
                    });
                    return (
                      <div
                        key={id}
                        className="flex flex-col items-center gap-2 p-3 rounded-sm border border-border"
                      >
                        <div
                          className="w-full aspect-square flex items-center justify-center"
                          style={{
                            maxWidth: `${config.width}mm`,
                            maxHeight: `${config.height}mm`,
                          }}
                        >
                          <QRCodeSVG
                            value={qrData}
                            size={Math.min(config.width, config.height) * 3}
                            level="M"
                          />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground text-center truncate w-full">
                          {id}
                        </span>
                      </div>
                    );
                  });
                }, [assetIds, config.width, config.height])}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="no-print flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            variant="outline"
            onClick={handleTestPrint}
            disabled={assetIds.length === 0}
          >
            <FileText className="w-4 h-4" />
            打印测试页
          </Button>
          <Button
            onClick={handlePrint}
            disabled={assetIds.length === 0}
          >
            <Printer className="w-4 h-4" />
            打印
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

AssetQRCodePrintDialog.displayName = 'AssetQRCodePrintDialog';

export default AssetQRCodePrintDialog;