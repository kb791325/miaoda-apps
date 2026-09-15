import React, { useState } from 'react';
import { Download, Copy, Check, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Image } from '@client/src/components/ui/image';

type QRSize = 'small' | 'medium' | 'large';

const QR_SIZES: Record<QRSize, { label: string; px: number }> = {
  small: { label: '小', px: 150 },
  medium: { label: '中', px: 200 },
  large: { label: '大', px: 256 },
};

interface AssetQRCodeProps {
  qrDataURL: string;
  assetName: string;
  assetCode: string;
  assetId: string;
}

const arePropsEqual = (
  prev: AssetQRCodeProps,
  next: AssetQRCodeProps,
): boolean =>
  prev.qrDataURL === next.qrDataURL &&
  prev.assetName === next.assetName &&
  prev.assetCode === next.assetCode &&
  prev.assetId === next.assetId;

const AssetQRCode: React.FC<AssetQRCodeProps> = React.memo(({
  qrDataURL,
  assetName,
  assetCode,
  assetId,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [qrSize, setQrSize] = useState<QRSize>('medium');
  const sizePx: number = QR_SIZES[qrSize].px;

  const viewUrl: string = `${window.location.origin}/fixed-assets/${assetId}`;

  const handleDownload = (): void => {
    const link: HTMLAnchorElement = document.createElement('a');
    link.href = qrDataURL;
    link.download = `QR-${assetCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR 码已下载');
  };

  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(viewUrl);
      setCopied(true);
      toast.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  return (
    <div className="inline-flex flex-col items-center gap-3 p-4 rounded-sm border border-border bg-card max-sm:w-full">
      {/* Size selector — segmented control */}
      <div className="flex items-center rounded-sm border border-border overflow-hidden">
        {(Object.keys(QR_SIZES) as QRSize[]).map((key: QRSize) => (
          <button
            key={key}
            type="button"
            onClick={() => setQrSize(key)}
            className={`px-3 py-1 text-xs font-medium transition-colors duration-150 ${
              key === qrSize
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:bg-accent'
            }`}
          >
            {QR_SIZES[key].label}
          </button>
        ))}
      </div>

      {/* QR Code display — border + subtle ring */}
      <div
        className="rounded-sm border border-border ring-1 ring-primary/10 overflow-hidden"
        style={{ width: sizePx, height: sizePx }}
      >
        {qrDataURL ? (
          <div className="animate-qr-fade-in w-full h-full">
            <Image
              src={qrDataURL}
              alt={`QR 码 - ${assetName}`}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-accent">
            <QrCode className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Asset info */}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
          {assetName}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {assetCode}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={!qrDataURL}
        >
          <Download className="w-4 h-4" />
          下载
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
        >
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          复制链接
        </Button>
      </div>

      <style>{`
        @keyframes qr-fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-qr-fade-in {
          animation: qr-fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}, arePropsEqual);

AssetQRCode.displayName = 'AssetQRCode';

export default AssetQRCode;