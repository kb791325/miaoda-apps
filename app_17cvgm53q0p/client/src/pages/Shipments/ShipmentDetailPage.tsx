import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  Table,
  type TableColumnsType,
} from '@lark-apaas/client-toolkit/antd-table';

import { UserDisplay } from '@/components/business-ui/user-display';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import Image from '@/components/ui/image';
import { Skeleton } from '@/components/ui/skeleton';

import { shipmentApi } from '@client/src/api';
import { useAuth } from '@client/src/hooks/use-auth';
import type {
  ShipmentDetail,
  ShipmentItem,
  ShipmentStatus,
} from '@shared/shipment';

import CompleteInstallDialog from './CompleteInstallDialog';
import ModelMatchBadge from './ModelMatchBadge';
import OutboundPopover from './OutboundPopover';
import ShipmentInfoDialog from './ShipmentInfoDialog';
import ShipmentOrderFeeCard from './ShipmentOrderFeeCard';
import ShipmentProgressSteps from './ShipmentProgressSteps';
import ShipmentStatusBadge from './ShipmentStatusBadge';
import { extractErrorMessage, formatTime } from './shipment-helpers';

const InfoField: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-medium break-words">{children}</span>
  </div>
);

const ShipmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPerm } = useAuth();

  const [detail, setDetail] = React.useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [notFound, setNotFound] = React.useState<boolean>(false);
  const [busy, setBusy] = React.useState<boolean>(false);
  const [completeOpen, setCompleteOpen] = React.useState<boolean>(false);
  const [editOpen, setEditOpen] = React.useState<boolean>(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] =
    React.useState<boolean>(false);

  const loadDetail = React.useCallback(async (): Promise<void> => {
    if (!id) return;
    setLoading(true);
    try {
      const res: ShipmentDetail = await shipmentApi.getShipmentDetail(id);
      setDetail(res);
      setNotFound(false);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error(extractErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleStartInstall = async (): Promise<void> => {
    if (!id) return;
    setBusy(true);
    try {
      await shipmentApi.updateShipmentStatus(id, { targetStatus: '在安装' });
      toast.success('已开始安装');
      await loadDetail();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (): Promise<void> => {
    if (!id) return;
    setBusy(true);
    try {
      await shipmentApi.cancelShipment(id);
      toast.success('配送已取消，订单已回退为待出库');
      navigate('/shipments');
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (notFound || !detail) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-12 shadow-sm">
        <p className="text-base font-medium">配送安装单不存在</p>
        <p className="text-sm text-muted-foreground">
          该配送安装单可能已被取消或链接有误
        </p>
        <Button variant="outline" onClick={() => navigate('/shipments')}>
          <ArrowLeft className="size-4" />
          返回配送安装管理
        </Button>
      </div>
    );
  }

  const { shipment, items } = detail;
  const statusOrCancelled: ShipmentStatus | '已取消' = shipment.shipStatus;

  const itemColumns: TableColumnsType<ShipmentItem> = [
    { title: '需求商品', dataIndex: 'requiredProductName', width: 160 },
    { title: '需求型号', dataIndex: 'requiredModel', width: 130 },
    { title: '需求数量', dataIndex: 'requiredQuantity', width: 90 },
    { title: '实发商品', dataIndex: 'actualProductName', width: 160 },
    { title: '实发型号', dataIndex: 'actualModel', width: 130 },
    { title: '实发数量', dataIndex: 'shipQuantity', width: 90 },
    {
      title: '型号核对',
      dataIndex: 'modelMatch',
      width: 100,
      render: (modelMatch: boolean) => <ModelMatchBadge match={modelMatch} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/shipments')}>
          <ArrowLeft className="size-4" />
          返回
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {shipment.shipNo}
        </h1>
        <ShipmentStatusBadge status={shipment.shipStatus} large />
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <ShipmentProgressSteps status={statusOrCancelled} />
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">基本信息</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <InfoField label="订单号">{shipment.orderNo || '-'}</InfoField>
          <InfoField label="客户">{shipment.customerName || '-'}</InfoField>
          <InfoField label="安装地址">
            {shipment.installAddress || '-'}
          </InfoField>
          <InfoField label="联系人">
            {shipment.installContact || '-'}
          </InfoField>
          <InfoField label="联系电话">
            {shipment.installPhone || '-'}
          </InfoField>
          <InfoField label="预约时间">
            {formatTime(shipment.appointmentTime)}
          </InfoField>
          <InfoField label="备注">{shipment.remark || '-'}</InfoField>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">出库信息</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <InfoField label="出库时间">
            {formatTime(shipment.outboundTime)}
          </InfoField>
          <InfoField label="发货人员">
            {shipment.shipperId ? (
              <UserDisplay value={[shipment.shipperId]} size="small" />
            ) : (
              '-'
            )}
          </InfoField>
          <InfoField label="货车/司机">
            {shipment.truckDriver || '-'}
          </InfoField>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">安装信息</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <InfoField label="安装人员">
            {shipment.installerId ? (
              <UserDisplay value={[shipment.installerId]} size="small" />
            ) : (
              '-'
            )}
          </InfoField>
          <InfoField label="开始安装时间">
            {formatTime(shipment.installStartTime)}
          </InfoField>
          <InfoField label="安装完成时间">
            {formatTime(shipment.installCompleteTime)}
          </InfoField>
          <InfoField label="安装费用">
            {shipment.installFee !== undefined && shipment.installFee !== null
              ? `¥${Number(shipment.installFee).toFixed(2)}`
              : '-'}
          </InfoField>
          <InfoField label="安装备注">
            {shipment.installRemark || '-'}
          </InfoField>
        </div>
        {shipment.acceptancePhotos && shipment.acceptancePhotos.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">验收照片</span>
            <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
              {shipment.acceptancePhotos.map((url: string, index: number) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  className="overflow-hidden rounded-md border transition-opacity duration-200 hover:opacity-80"
                  onClick={() => window.open(url, '_blank')}
                >
                  <Image
                    src={url}
                    className="h-24 w-full object-cover"
                    alt={`验收照片 ${index + 1}`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ShipmentOrderFeeCard orderId={shipment.orderId} />

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">商品明细</h2>
        {shipment.hasModelDiff && (
          <p className="mb-4 rounded-md border border-red-500/40 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            该配送安装单存在型号差异，请核对下方明细
          </p>
        )}
        <Table<ShipmentItem>
          columns={itemColumns}
          dataSource={items}
          rowKey="id"
          pagination={false}
          scroll={{ x: 900 }}
          rowClassName={(record: ShipmentItem) =>
            !record.modelMatch ? 'bg-red-50/60' : ''
          }
          locale={{ emptyText: '暂无配送明细' }}
        />
      </div>

      {(shipment.shipStatus === '待出库' ||
        shipment.shipStatus === '运输中' ||
        shipment.shipStatus === '在安装') && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <span className="text-sm font-medium">操作</span>
          {shipment.shipStatus === '待出库' &&
            hasPerm('shipment:outbound') && (
            <OutboundPopover
              shipmentId={shipment.id}
              buttonSize="default"
              onSuccess={() => {
                void loadDetail();
              }}
            />
          )}
          {shipment.shipStatus === '运输中' &&
            hasPerm('shipment:install') && (
            <Button
              data-ai-section-type="button"
              disabled={busy}
              onClick={() => {
                void handleStartInstall();
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              开始安装
            </Button>
          )}
          {shipment.shipStatus === '在安装' &&
            hasPerm('shipment:install') && (
            <Button
              data-ai-section-type="button"
              disabled={busy}
              onClick={() => setCompleteOpen(true)}
            >
              确认安装完成
            </Button>
          )}
          {shipment.shipStatus === '待出库' && (
            <span className="text-sm text-muted-foreground">
              确认出库后自动扣减库存并安排运输
            </span>
          )}
          {shipment.shipStatus === '运输中' && (
            <span className="text-sm text-muted-foreground">
              师傅到达客户处后，点击开始安装
            </span>
          )}
          {shipment.shipStatus === '在安装' && (
            <span className="text-sm text-muted-foreground">
              安装完成后填写验收信息并确认完成
            </span>
          )}
          {hasPerm('shipment:manage') ? (
            <Button
              data-ai-section-type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setEditOpen(true)}
            >
              编辑配送信息
          </Button>
          ) : null}
          {shipment.shipStatus === '待出库' &&
            hasPerm('shipment:manage') && (
            <Button
              data-ai-section-type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => setCancelConfirmOpen(true)}
            >
              取消配送
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消配送？</AlertDialogTitle>
            <AlertDialogDescription>
              取消后该配送安装单将被删除，订单回退为待出库；若已出库，库存将自动回补。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busy}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                void handleCancel();
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              确认取消
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CompleteInstallDialog
        open={completeOpen}
        shipmentId={shipment.id}
        onOpenChange={setCompleteOpen}
        onSuccess={() => {
          void loadDetail();
        }}
      />

      <ShipmentInfoDialog
        open={editOpen}
        shipment={shipment}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          void loadDetail();
        }}
      />
    </div>
  );
};

export default ShipmentDetailPage;
