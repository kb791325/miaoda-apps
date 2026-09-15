import React from 'react';
import { toast } from 'sonner';
import { Loader2, PackageCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { shipmentApi } from '@client/src/api';
import type { ShipmentDetail, ShipmentItem } from '@shared/shipment';

import { extractErrorMessage } from './shipment-helpers';

interface OutboundPopoverProps {
  shipmentId: string;
  onSuccess: (shipmentId: string) => void;
  buttonSize?: 'sm' | 'default';
}

const OutboundPopover: React.FC<OutboundPopoverProps> = ({
  shipmentId,
  onSuccess,
  buttonSize = 'sm',
}) => {
  const [open, setOpen] = React.useState<boolean>(false);
  const [detail, setDetail] = React.useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [submitting, setSubmitting] = React.useState<boolean>(false);

  const [installContact, setInstallContact] = React.useState<string>('');
  const [installPhone, setInstallPhone] = React.useState<string>('');
  const [installAddress, setInstallAddress] = React.useState<string>('');
  const [truckDriver, setTruckDriver] = React.useState<string>('');
  const [remark, setRemark] = React.useState<string>('');

  React.useEffect(() => {
    if (!open) return;
    let cancelled: boolean = false;
    setDetail(null);
    setLoading(true);
    const load = async (): Promise<void> => {
      try {
        const res: ShipmentDetail =
          await shipmentApi.getShipmentDetail(shipmentId);
        if (!cancelled) {
          setDetail(res);
          setInstallContact(res.shipment.installContact ?? '');
          setInstallPhone(res.shipment.installPhone ?? '');
          setInstallAddress(res.shipment.installAddress ?? '');
          setTruckDriver(res.shipment.truckDriver ?? '');
          setRemark(res.shipment.remark ?? '');
        }
      } catch (error: unknown) {
        if (!cancelled) toast.error(extractErrorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, shipmentId]);

  const canSubmit =
    !loading &&
    !!detail &&
    installContact.trim() !== '' &&
    installPhone.trim() !== '' &&
    installAddress.trim() !== '';

  const handleConfirm = async (): Promise<void> => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await shipmentApi.updateShipmentInfo(shipmentId, {
        installContact: installContact.trim(),
        installPhone: installPhone.trim(),
        installAddress: installAddress.trim(),
        truckDriver: truckDriver.trim() || undefined,
      });
      await shipmentApi.updateShipmentStatus(shipmentId, {
        targetStatus: '运输中',
        truckDriver: truckDriver.trim() || undefined,
      });
      toast.success('出库成功，库存已扣减');
      setOpen(false);
      onSuccess(shipmentId);
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const items: ShipmentItem[] = detail?.items ?? [];

  return (
    <>
      <Button
        data-ai-section-type="button"
        size={buttonSize}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        确认出库
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="size-5 text-primary" />
              确认出库
            </DialogTitle>
            <DialogDescription>
              请核对并填写配送信息，确认出库后将自动扣减库存
            </DialogDescription>
          </DialogHeader>
          {loading || !detail ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              加载配送信息中...
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <div>
                    <span className="text-muted-foreground">配送单号：</span>
                    <span className="font-medium">
                      {detail.shipment.shipNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">订单号：</span>
                    <span className="font-medium">
                      {detail.shipment.orderNo}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">客户：</span>
                    <span className="font-medium">
                      {detail.shipment.customerName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>
                    安装联系人 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={installContact}
                    onChange={(e) => setInstallContact(e.target.value)}
                    placeholder="请输入联系人姓名"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>
                    联系电话 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={installPhone}
                    onChange={(e) => setInstallPhone(e.target.value)}
                    placeholder="请输入联系电话"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>
                  安装地址 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={installAddress}
                  onChange={(e) => setInstallAddress(e.target.value)}
                  placeholder="请输入详细安装地址"
                  rows={2}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>货车/司机（选填）</Label>
                <Input
                  value={truckDriver}
                  onChange={(e) => setTruckDriver(e.target.value)}
                  placeholder="如：粤B12345 张师傅"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>发货明细</Label>
                <div className="max-h-40 overflow-y-auto rounded-md border bg-background p-3">
                  {items.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      暂无发货明细
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1.5 text-sm">
                      {items.map((item: ShipmentItem) => {
                        const name: string =
                          item.actualProductName ||
                          item.requiredProductName ||
                          '-';
                        const qty: number =
                          item.shipQuantity || item.requiredQuantity;
                        return (
                          <li
                            key={item.id}
                            className="flex items-center justify-between"
                          >
                            <span className="break-words">{name}</span>
                            <span className="shrink-0 font-medium">× {qty}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              data-ai-section-type="button"
              size="lg"
              disabled={!canSubmit || submitting}
              onClick={() => {
                void handleConfirm();
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  正在出库…
                </>
              ) : (
                '确认出库'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OutboundPopover;
