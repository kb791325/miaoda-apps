import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  ImageUp,
  QrCode,
  History,
  ArrowLeft,
  ExternalLink,
  LogOut,
  Undo2,
  CheckCircle2,
  XCircle,
  ScanLine,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Label } from '@client/src/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { borrowAsset, returnAsset } from '@client/src/api/fixed-assets';
import type { ScanQRCodeResponse } from '@client/src/api/fixed-assets-qrcode';
import type { FixedAssetDetail } from '@shared/api.interface';

// ---- Types ----

interface ScanHistoryItem {
  timestamp: string;
  assetId: string;
  assetName: string;
  assetCode: string;
  operationType: 'scan' | 'borrow' | 'return';
  operationLabel: string;
}

const HISTORY_KEY: string = 'asset_scan_history';
const DEDUP_INTERVAL_MS: number = 3000;

// ---- Helpers ----

function loadHistory(): ScanHistoryItem[] {
  try {
    const raw: string | null = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ScanHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: ScanHistoryItem[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 50)));
}

const STATUS_LABELS: Record<string, string> = {
  in_stock: '在库',
  in_use: '在借',
  idle: '闲置',
  repairing: '维修中',
  transferring: '调拨中',
  scrapped: '已报废',
};

const STATUS_BORDER: Record<string, string> = {
  in_stock: 'border-[hsl(142_60%_45%)]',
  in_use: 'border-[hsl(38_90%_50%)]',
  idle: 'border-[hsl(215_25%_35%)]',
  repairing: 'border-[hsl(38_90%_50%)]',
  transferring: 'border-[hsl(215_25%_35%)]',
  scrapped: 'border-[hsl(0_70%_55%)]',
};

const STATUS_BG: Record<string, string> = {
  in_stock: 'bg-[hsl(142_60%_95%)]',
  in_use: 'bg-[hsl(38_90%_95%)]',
  idle: 'bg-[hsl(215_25%_95%)]',
  repairing: 'bg-[hsl(38_90%_95%)]',
  transferring: 'bg-[hsl(215_25%_95%)]',
  scrapped: 'bg-[hsl(0_70%_95%)]',
};

const STATUS_FG: Record<string, string> = {
  in_stock: 'text-[hsl(142_60%_30%)]',
  in_use: 'text-[hsl(38_90%_35%)]',
  idle: 'text-[hsl(215_25%_30%)]',
  repairing: 'text-[hsl(38_90%_35%)]',
  transferring: 'text-[hsl(215_25%_30%)]',
  scrapped: 'text-[hsl(0_70%_40%)]',
};

// ---- Component ----

const AssetScanPage: React.FC = () => {
  const navigate = useNavigate();

  // Camera
  const [cameraOn, setCameraOn] = useState<boolean>(false);
  const [scanFlash, setScanFlash] = useState<boolean>(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId: string = 'qr-scanner-viewport';
  const lastScanRef = useRef<{ data: string; time: number }>({
    data: '',
    time: 0,
  });

  // Scan result
  const [scanResult, setScanResult] = useState<ScanQRCodeResponse | null>(null);
  const [scanLoading, setScanLoading] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Borrow dialog
  const [borrowOpen, setBorrowOpen] = useState<boolean>(false);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>('');
  const [borrowRemark, setBorrowRemark] = useState<string>('');
  const [borrowLoading, setBorrowLoading] = useState<boolean>(false);

  // Return dialog
  const [returnOpen, setReturnOpen] = useState<boolean>(false);
  const [returnRemark, setReturnRemark] = useState<string>('');
  const [returnLoading, setReturnLoading] = useState<boolean>(false);

  // Flashlight & gallery
  const [flashlightOn, setFlashlightOn] = useState<boolean>(false);
  const [galleryLoading, setGalleryLoading] = useState<boolean>(false);

  // History
  const [history, setHistory] = useState<ScanHistoryItem[]>(loadHistory());

  // ---- Flashlight ----

  const toggleFlashlight = async (): Promise<void> => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: !flashlightOn }] as any,
      });
      setFlashlightOn((prev: boolean) => !prev);
    } catch {
      toast.error('手电筒功能不可用');
    }
  };

  // ---- Gallery Pick ----

  const handleGalleryPick = async (): Promise<void> => {
    const input: HTMLInputElement = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: Event) => {
      const target: HTMLInputElement = e.target as HTMLInputElement;
      const file: File | null = target.files?.[0] ?? null;
      if (!file) return;
      setGalleryLoading(true);
      try {
        if (cameraOn) {
          await stopCamera();
        }
        const tempScanner: Html5Qrcode = new Html5Qrcode(scannerDivId);
        const decodedText: string = await tempScanner.scanFile(file, false);
        handleScanResult(decodedText);
      } catch {
        toast.error('未能识别图片中的 QR 码');
      } finally {
        setGalleryLoading(false);
      }
    };
    input.click();
  };

  // ---- Camera Logic ----

  const startCamera = useCallback(async (): Promise<void> => {
    try {
      const scanner: Html5Qrcode = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) => {
          const now: number = Date.now();
          if (
            decodedText === lastScanRef.current.data &&
            now - lastScanRef.current.time < DEDUP_INTERVAL_MS
          ) {
            return;
          }
          lastScanRef.current = { data: decodedText, time: now };
          handleScanResult(decodedText);
        },
        () => {
          // ignore scan failures
        },
      );
      setCameraOn(true);
      logger.info('QR 扫码摄像头已启动');
    } catch (err: unknown) {
      logger.error('摄像头启动失败', err);
      if (err instanceof Error && err.message.includes('NotAllowedError')) {
        toast.error('摄像头权限被拒绝，请在浏览器设置中允许摄像头访问');
      } else {
        toast.error('摄像头启动失败，请检查设备');
      }
      setCameraOn(false);
    }
  }, []);

  const stopCamera = useCallback(async (): Promise<void> => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setCameraOn(false);
    logger.info('QR 扫码摄像头已关闭');
  }, []);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  // ---- Scan Result ----

  const handleScanResult = async (qrData: string): Promise<void> => {
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 600);

    setScanLoading(true);
    setScanError(null);
    setScanResult(null);

    try {
      const response = await axiosForBackend({
        url: '/api/fixed-assets/scan',
        method: 'POST',
        data: { qrData },
      });
      const result: ScanQRCodeResponse = response.data as ScanQRCodeResponse;
      setScanResult(result);

      if (result.valid && result.assetId) {
        const historyItem: ScanHistoryItem = {
          timestamp: new Date().toISOString(),
          assetId: result.assetId,
          assetName: result.assetName ?? '未知资产',
          assetCode: result.assetCode ?? '',
          operationType: 'scan',
          operationLabel: '扫码',
        };
        setHistory((prev: ScanHistoryItem[]) => {
          const updated: ScanHistoryItem[] = [historyItem, ...prev];
          saveHistory(updated);
          return updated;
        });
        toast.success(`已识别：${result.assetName ?? '未知资产'}`);
      } else {
        toast.error('无效的 QR 码');
      }
    } catch (err: unknown) {
      const msg: string =
        err instanceof Error ? err.message : '扫码验证失败';
      setScanError(msg);
      logger.error('扫码验证失败', err);
      toast.error(msg);
    } finally {
      setScanLoading(false);
    }
  };

  // ---- Borrow ----

  const handleBorrow = async (): Promise<void> => {
    if (!scanResult?.assetId) return;
    setBorrowLoading(true);
    try {
      await borrowAsset(scanResult.assetId, {
        targetUserId: '',
        expectedReturnDate: expectedReturnDate || undefined,
        remark: borrowRemark || undefined,
      });
      toast.success('借出操作成功');
      setBorrowOpen(false);
      setExpectedReturnDate('');
      setBorrowRemark('');

      const historyItem: ScanHistoryItem = {
        timestamp: new Date().toISOString(),
        assetId: scanResult.assetId,
        assetName: scanResult.assetName ?? '未知资产',
        assetCode: scanResult.assetCode ?? '',
        operationType: 'borrow',
        operationLabel: '借出',
      };
      setHistory((prev: ScanHistoryItem[]) => {
        const updated: ScanHistoryItem[] = [historyItem, ...prev];
        saveHistory(updated);
        return updated;
      });

      setScanResult(null);
    } catch (err: unknown) {
      const msg: string =
        err instanceof Error ? err.message : '借出操作失败';
      toast.error(msg);
      logger.error('借出失败', err);
    } finally {
      setBorrowLoading(false);
    }
  };

  // ---- Return ----

  const handleReturn = async (): Promise<void> => {
    if (!scanResult?.assetId) return;
    setReturnLoading(true);
    try {
      await returnAsset(scanResult.assetId, {
        remark: returnRemark || undefined,
      });
      toast.success('归还操作成功');
      setReturnOpen(false);
      setReturnRemark('');

      const historyItem: ScanHistoryItem = {
        timestamp: new Date().toISOString(),
        assetId: scanResult.assetId,
        assetName: scanResult.assetName ?? '未知资产',
        assetCode: scanResult.assetCode ?? '',
        operationType: 'return',
        operationLabel: '归还',
      };
      setHistory((prev: ScanHistoryItem[]) => {
        const updated: ScanHistoryItem[] = [historyItem, ...prev];
        saveHistory(updated);
        return updated;
      });

      setScanResult(null);
    } catch (err: unknown) {
      const msg: string =
        err instanceof Error ? err.message : '归还操作失败';
      toast.error(msg);
      logger.error('归还失败', err);
    } finally {
      setReturnLoading(false);
    }
  };

  // ---- History ----

  const clearHistory = (): void => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    toast.success('扫码历史已清除');
  };

  // ---- Helpers ----

  const formatTime = (iso: string): string => {
    const d: Date = new Date(iso);
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // ---- Render ----

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Nav */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-primary" />
          扫码管理
        </h1>
      </header>

      <div className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full flex flex-col gap-4">
        {/* Camera Section */}
        <div className="rounded-sm border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              扫码区域
            </span>
            <div className="flex items-center gap-2">
              {cameraOn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFlashlight}
                  title={flashlightOn ? '关闭手电筒' : '打开手电筒'}
                >
                  {flashlightOn ? (
                    <FlashlightOff className="w-4 h-4" />
                  ) : (
                    <Flashlight className="w-4 h-4" />
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleGalleryPick}
                disabled={galleryLoading}
              >
                <ImageUp className="w-4 h-4" />
                {galleryLoading ? '识别中...' : '从相册选择'}
              </Button>
              <Button
                variant={cameraOn ? 'default' : 'outline'}
                size="sm"
                onClick={cameraOn ? stopCamera : startCamera}
              >
                {cameraOn ? (
                  <>
                    <CameraOff className="w-4 h-4" />
                    关闭摄像头
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    打开摄像头
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center justify-center">
              <div
                id={scannerDivId}
                className="w-full max-w-sm"
                style={{ minHeight: cameraOn ? 300 : 120 }}
              />
            </div>
            {!cameraOn && (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                <CameraOff className="w-10 h-10" />
                <span className="text-sm">摄像头未开启</span>
              </div>
            )}
            {/* Scanning line animation */}
            {cameraOn && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute left-0 right-0 h-0.5 bg-primary/50 animate-scan-line" />
              </div>
            )}
            {scanFlash && (
              <div className="absolute inset-0 border-4 border-[hsl(142_60%_45%)] rounded-sm animate-pulse pointer-events-none" />
            )}
          </div>
        </div>

        {/* Scan Result */}
        {scanLoading && (
          <div className="rounded-sm border border-border bg-card p-4 text-center">
            <span className="text-sm text-muted-foreground">
              正在验证 QR 码...
            </span>
          </div>
        )}

        {scanError && (
          <div className="rounded-sm border border-[hsl(0_70%_55%)] bg-[hsl(0_70%_95%)] p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-[hsl(0_70%_40%)] mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-[hsl(0_70%_40%)]">
                扫码失败
              </span>
              <span className="text-xs text-[hsl(0_70%_40%)]">
                {scanError}
              </span>
            </div>
          </div>
        )}

        {scanResult && scanResult.valid && (
          <div className="rounded-sm border border-border bg-card">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <CheckCircle2 className="w-5 h-5 text-[hsl(142_60%_45%)]" />
              <span className="text-sm font-semibold text-foreground">
                扫码结果
              </span>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {/* Asset info rows */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">资产名称</span>
                  <span className="text-sm font-medium text-foreground truncate">
                    {scanResult.assetName ?? '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">资产编码</span>
                  <span className="font-mono text-sm text-foreground">
                    {scanResult.assetCode ?? '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">资产类型</span>
                  <span className="text-sm text-foreground">
                    {scanResult.assetType ?? '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">状态</span>
                  <span
                    className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium w-fit ${
                      STATUS_BORDER[scanResult.assetStatus ?? ''] ?? 'border-border'
                    } ${
                      STATUS_BG[scanResult.assetStatus ?? ''] ?? 'bg-card'
                    } ${
                      STATUS_FG[scanResult.assetStatus ?? ''] ?? 'text-foreground'
                    }`}
                  >
                    {STATUS_LABELS[scanResult.assetStatus ?? ''] ?? scanResult.assetStatus ?? '-'}
                  </span>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-border" />

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {scanResult.assetStatus === 'in_stock' && (
                  <Button
                    size="sm"
                    onClick={() => setBorrowOpen(true)}
                  >
                    <LogOut className="w-4 h-4" />
                    借出
                  </Button>
                )}
                {scanResult.assetStatus === 'in_use' && (
                  <Button
                    size="sm"
                    onClick={() => setReturnOpen(true)}
                  >
                    <Undo2 className="w-4 h-4" />
                    归还
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/fixed-assets/${scanResult.assetId}`)
                  }
                >
                  <ExternalLink className="w-4 h-4" />
                  查看详情
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Scan History */}
        <div className="rounded-sm border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <History className="w-4 h-4" />
              扫码历史
            </span>
            {history.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
              >
                清除
              </Button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              暂无扫码记录
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.map((item: ScanHistoryItem, idx: number) => (
                <div
                  key={`${item.timestamp}-${idx}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors duration-150"
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="text-sm font-medium text-foreground truncate">
                      {item.assetName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.assetCode}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${
                      item.operationType === 'borrow'
                        ? 'border-[hsl(38_90%_50%)] bg-[hsl(38_90%_95%)] text-[hsl(38_90%_35%)]'
                        : item.operationType === 'return'
                          ? 'border-[hsl(142_60%_45%)] bg-[hsl(142_60%_95%)] text-[hsl(142_60%_30%)]'
                          : 'border-[hsl(215_25%_35%)] bg-[hsl(215_25%_95%)] text-[hsl(215_25%_30%)]'
                    }`}
                  >
                    {item.operationLabel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Borrow Dialog */}
      <Dialog open={borrowOpen} onOpenChange={setBorrowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>借出资产</DialogTitle>
            <DialogDescription>
              确认借出「{scanResult?.assetName ?? '-'}」
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="expected-return-date">预计归还日期</Label>
              <Input
                id="expected-return-date"
                type="date"
                value={expectedReturnDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setExpectedReturnDate(e.target.value)
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="borrow-remark">备注</Label>
              <Input
                id="borrow-remark"
                placeholder="借出备注（选填）"
                value={borrowRemark}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setBorrowRemark(e.target.value)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBorrowOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleBorrow}
              disabled={borrowLoading}
            >
              {borrowLoading ? '处理中...' : '确认借出'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>归还资产</DialogTitle>
            <DialogDescription>
              确认归还「{scanResult?.assetName ?? '-'}」
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="return-remark">备注</Label>
              <Input
                id="return-remark"
                placeholder="归还备注（选填）"
                value={returnRemark}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setReturnRemark(e.target.value)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReturnOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleReturn}
              disabled={returnLoading}
            >
              {returnLoading ? '处理中...' : '确认归还'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes scan-line {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AssetScanPage;