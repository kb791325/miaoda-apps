import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  ArrowLeftRight,
  Wrench,
  Trash2,
  Hand,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@client/src/lib/utils';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { ScrollArea } from '@client/src/components/ui/scroll-area';

import {
  getAsset,
  getAssetCheckHistory,
  getAssetOperationHistory,
} from '@client/src/api/fixed-assets';
import type {
   FixedAssetDetail,
   CheckHistoryItem,
   AssetStatus,
   AssetOperationRecord,
 } from '@shared/api.interface';

import AssetQRCode from '@client/src/components/AssetQRCode';
import { getAssetQRCode } from '@client/src/api/fixed-assets-qrcode';
import type { AssetQRCodeResponse } from '@client/src/api/fixed-assets-qrcode';
import AssetOperationDialog from './AssetOperationDialog';
import OperationTimeline from './OperationTimeline';
import CheckHistorySection from './CheckHistorySection';
import type { AssetOperationType as DialogOpType } from './operation-config';
import FileUploader from '@client/src/components/FileUpload/FileUploader';
import AttachmentList from '@client/src/components/FileUpload/AttachmentList';
import {
  getAttachmentsByRelated,
  deleteAttachment,
} from '@client/src/api/attachments';
import type { AttachmentItem } from '@shared/api.interface';

interface AssetDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string | null;
  onRefresh?: () => void;
}

const statusLabelMap: Record<AssetStatus, string> = {
  in_stock: '在库',
  in_use: '在用',
  idle: '闲置',
  repairing: '维修',
  transferring: '调拨中',
  scrapped: '报废',
};

const statusStyleMap: Record<AssetStatus, string> = {
  in_stock:
    'border-success/30 bg-success/10 text-success',
  in_use:
    'border-primary/30 bg-primary/10 text-primary',
  idle:
    'border-border bg-muted text-muted-foreground',
  repairing:
    'border-warning/30 bg-warning/10 text-warning',
  transferring:
    'border-[hsl(270_50%_70%)] bg-[hsl(270_50%_95%)] text-[hsl(270_50%_40%)] dark:bg-[hsl(270_40%_25%)] dark:text-[hsl(270_60%_75%)] dark:border-[hsl(270_40%_40%)]',
  scrapped:
    'border-destructive/30 bg-destructive/10 text-destructive',
};

function formatCurrency(value: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
    <span className="w-1 h-4 bg-primary" />
    {children}
  </h3>
);

const DetailItem = ({
  label,
  value,
  full,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) => (
  <div className={full ? 'col-span-2' : ''}>
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className="text-foreground text-sm">{value}</p>
  </div>
);

const StatBox = ({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) => (
  <div className="border border-border rounded-sm p-3 bg-muted/30">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p
      className={cn(
        'font-mono tabular-nums text-base font-semibold',
        muted ? 'text-muted-foreground' : 'text-foreground',
      )}
    >
      {value}
    </p>
  </div>
);

interface OpButton {
  type: DialogOpType;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'outline' | 'destructive';
}

const getAvailableOps = (status: AssetStatus): OpButton[] => {
  switch (status) {
    case 'in_stock':
    case 'idle':
      return [
        { type: 'borrow', label: '领用', icon: <Hand className="size-3.5 mr-1" /> },
        { type: 'repair_start', label: '维修', icon: <Wrench className="size-3.5 mr-1" />, variant: 'outline' },
        { type: 'transfer_start', label: '调拨', icon: <ArrowLeftRight className="size-3.5 mr-1" />, variant: 'outline' },
        { type: 'scrap', label: '报废', icon: <Trash2 className="size-3.5 mr-1" />, variant: 'destructive' },
      ];
    case 'in_use':
      return [
        { type: 'return', label: '归还', icon: <RotateCcw className="size-3.5 mr-1" /> },
        { type: 'repair_start', label: '维修', icon: <Wrench className="size-3.5 mr-1" />, variant: 'outline' },
        { type: 'transfer_start', label: '调拨', icon: <ArrowLeftRight className="size-3.5 mr-1" />, variant: 'outline' },
        { type: 'scrap', label: '报废', icon: <Trash2 className="size-3.5 mr-1" />, variant: 'destructive' },
      ];
    case 'repairing':
      return [
        { type: 'repair_complete', label: '完成维修', icon: <CheckCircle2 className="size-3.5 mr-1" /> },
      ];
    case 'transferring':
      return [
        { type: 'transfer_complete', label: '完成调拨', icon: <CheckCircle2 className="size-3.5 mr-1" /> },
      ];
    case 'scrapped':
      return [];
    default:
      return [];
  }
};

const AssetDetailPanel = ({
  open,
  onOpenChange,
  assetId,
  onRefresh,
}: AssetDetailPanelProps) => {
  const [detail, setDetail] = useState<FixedAssetDetail | null>(null);
  const [checkHistory, setCheckHistory] = useState<CheckHistoryItem[]>([]);
  const [opHistory, setOpHistory] = useState<AssetOperationRecord[]>([]);
  const [opTotal, setOpTotal] = useState(0);
  const [opPage, setOpPage] = useState(1);
  const [opLoading, setOpLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const pageSize = 10;

  const [qrCodeData, setQrCodeData] = useState<AssetQRCodeResponse | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const [opDialogOpen, setOpDialogOpen] = useState(false);
  const [currentOp, setCurrentOp] = useState<DialogOpType | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!assetId) return;
    setLoading(true);
    try {
      const [d, h] = await Promise.all([
        getAsset(assetId),
        getAssetCheckHistory(assetId, { pageSize: 5 }),
      ]);
      setDetail(d);
      setCheckHistory(h);
    } catch {
      toast.error('加载详情失败');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  const fetchOpHistory = useCallback(
    async (page: number) => {
      if (!assetId) return;
      setOpLoading(true);
      try {
        const res = await getAssetOperationHistory(assetId, page, pageSize);
        setOpHistory((prev) =>
          page === 1 ? res.items : [...prev, ...res.items],
        );
        setOpTotal(res.total);
        setOpPage(page);
      } catch (err) {
        logger.error('load operation history failed', err);
      } finally {
        setOpLoading(false);
      }
    },
    [assetId],
  );

  const fetchAttachments = useCallback(async () => {
    if (!assetId) return;
    setAttachmentsLoading(true);
    try {
      const res = await getAttachmentsByRelated(
        'fixed_asset',
        assetId,
      );
      setAttachments(res.items);
    } catch (err) {
      logger.error('加载附件列表失败', err);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    if (!open || !assetId) return;
    fetchDetail();
    setOpHistory([]);
    fetchOpHistory(1);
    fetchAttachments();
    setQrLoading(true);
    getAssetQRCode(assetId)
      .then((data: AssetQRCodeResponse) => setQrCodeData(data))
      .catch(() => { /* QR code is optional, don't block */ })
      .finally(() => setQrLoading(false));
  }, [open, assetId, fetchDetail, fetchOpHistory, fetchAttachments]);

  const handleDeleteAttachment = async (id: string) => {
    try {
      await deleteAttachment(id);
      setAttachments((prev: AttachmentItem[]) =>
        prev.filter((a: AttachmentItem) => a.id !== id),
      );
      toast.success('附件已删除');
    } catch (err) {
      logger.error('删除附件失败', err);
      toast.error('删除失败');
    }
  };

  const handleUploadComplete = () => {
    fetchAttachments();
  };

  const handleOpClick = (type: DialogOpType) => {
    setCurrentOp(type);
    setOpDialogOpen(true);
  };

  const handleOpSuccess = () => {
    fetchDetail();
    setOpHistory([]);
    fetchOpHistory(1);
    onRefresh?.();
  };

  const handleLoadMore = () => {
    if (!opLoading && opHistory.length < opTotal) {
      fetchOpHistory(opPage + 1);
    }
  };

  if (!detail && !loading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl h-[85vh] p-0 rounded-sm"
        showCloseButton={false}
      >
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg">资产详情</DialogTitle>
            </DialogHeader>

            {loading && !detail ? (
              <div className="text-center py-8 text-muted-foreground">
                加载中...
              </div>
            ) : detail ? (
              <>
                {/* 基本信息 */}
                <div>
                  <SectionTitle>基本信息</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem label="资产名称" value={detail.assetName} />
                    <DetailItem
                      label="资产状态"
                      value={
                        <Badge
                          className={cn(
                            'rounded-sm font-normal border',
                            statusStyleMap[detail.assetStatus],
                          )}
                          variant="outline"
                        >
                          {statusLabelMap[detail.assetStatus]}
                        </Badge>
                      }
                    />
                    <DetailItem
                      label="资产类型"
                      value={
                        <Badge
                          variant="secondary"
                          className="rounded-sm font-normal"
                        >
                          {detail.assetType || '-'}
                        </Badge>
                      }
                    />
                    <DetailItem
                      label="资产类目"
                      value={detail.assetCategory}
                    />
                    <DetailItem
                      label="净值"
                      value={
                        <span className="font-mono tabular-nums font-semibold">
                          ¥{formatCurrency(detail.netValue)}
                        </span>
                      }
                    />
                    <DetailItem
                      label="月折旧额"
                      value={
                        <span className="font-mono tabular-nums text-muted-foreground">
                          ¥{formatCurrency(detail.monthlyDepreciation)}
                        </span>
                      }
                    />
                  </div>
                </div>

                {/* 资产标签QR码 */}
                <div>
                  <SectionTitle>资产标签QR码</SectionTitle>
                  <div className="flex justify-center py-3">
                    {qrLoading ? (
                      <p className="text-sm text-muted-foreground">
                        加载中...
                      </p>
                    ) : qrCodeData ? (
                      <AssetQRCode
                        qrDataURL={qrCodeData.qrDataURL}
                        assetName={detail.assetName}
                        assetCode={detail.assetName}
                        assetId={detail.id}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        QR码加载失败
                      </p>
                    )}
                  </div>
                </div>

                {/* 折旧信息 */}
                <div>
                  <SectionTitle>折旧信息</SectionTitle>
                  <div className="grid grid-cols-2 gap-2">
                    <StatBox
                      label="原值"
                      value={`¥${formatCurrency(detail.originalValue)}`}
                    />
                    <StatBox
                      label="累计折旧"
                      value={`¥${formatCurrency(detail.accumulatedDepreciation)}`}
                      muted
                    />
                    <StatBox
                      label="净值"
                      value={`¥${formatCurrency(detail.netValue)}`}
                    />
                    <StatBox
                      label="折旧年限"
                      value={`${(detail.depreciationMonths / 12).toFixed(1)} 年`}
                      muted
                    />
                  </div>
                </div>

                {/* 采购信息 */}
                <div>
                  <SectionTitle>采购信息</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem label="采购日期" value={detail.purchaseDate} />
                    <DetailItem
                      label="采购金额"
                      value={
                        <span className="font-mono tabular-nums">
                          ¥{formatCurrency(detail.purchaseAmount)}
                        </span>
                      }
                    />
                    <DetailItem
                      label="采购申请部门"
                      value={detail.purchaseDepartment}
                    />
                    <DetailItem label="付费主体" value={detail.payerEntity} />
                    <DetailItem
                      label="经办人"
                      value={detail.handler?.name || '-'}
                      full
                    />
                  </div>
                </div>

                {/* 归属信息 */}
                <div>
                  <SectionTitle>归属信息</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem label="归属人" value={detail.owner?.name || '-'} />
                    <DetailItem label="使用楼层" value={detail.floor} />
                  </div>
                </div>

                {/* 库存信息 */}
                  <div>
                    <SectionTitle>库存信息</SectionTitle>
                    <div className="grid grid-cols-3 gap-3">
                      <DetailItem
                        label="当前库存"
                        value={
                          <span className="font-mono tabular-nums">
                            {detail.currentStock}
                          </span>
                        }
                      />
                    </div>
                  </div>

                {/* 生命周期操作 */}
                {detail.assetStatus !== 'scrapped' && (
                  <div>
                    <SectionTitle>生命周期操作</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                      {getAvailableOps(detail.assetStatus).map((op) => (
                        <Button
                          key={op.type}
                          size="sm"
                          variant={op.variant || 'default'}
                          className="rounded-sm"
                          onClick={() => handleOpClick(op.type)}
                        >
                          {op.icon}
                          {op.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 操作历史时间线 */}
                <OperationTimeline
                  records={opHistory}
                  total={opTotal}
                  loading={opLoading}
                  onLoadMore={handleLoadMore}
                />

                <CheckHistorySection items={checkHistory} />

                {/* 附件管理 */}
                <div>
                  <SectionTitle>附件管理</SectionTitle>
                  <FileUploader
                    relatedType="fixed_asset"
                    relatedId={assetId!}
                    onUploadComplete={handleUploadComplete}
                  />
                  <div className="mt-4">
                    <AttachmentList
                      attachments={attachments}
                      onDelete={handleDeleteAttachment}
                      loading={attachmentsLoading}
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </ScrollArea>

        <AssetOperationDialog
          open={opDialogOpen}
          onOpenChange={setOpDialogOpen}
          assetId={assetId}
          operationType={currentOp}
          onSuccess={handleOpSuccess}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AssetDetailPanel;
