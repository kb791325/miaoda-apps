import React from 'react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { CalendarIcon, Loader2 } from 'lucide-react';

import { UserSelect } from '@/components/business-ui/user-select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { shipmentApi } from '@client/src/api';
import type { Shipment, UpdateShipmentInfoRequest } from '@shared/shipment';

import { extractErrorMessage } from './shipment-helpers';

interface ShipmentInfoDialogProps {
  open: boolean;
  shipment: Shipment;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ShipmentInfoDialog: React.FC<ShipmentInfoDialogProps> = ({
  open,
  shipment,
  onOpenChange,
  onSuccess,
}) => {
  const [installAddress, setInstallAddress] = React.useState<string>('');
  const [installContact, setInstallContact] = React.useState<string>('');
  const [installPhone, setInstallPhone] = React.useState<string>('');
  const [appointmentTime, setAppointmentTime] = React.useState<string>('');
  const [installerId, setInstallerId] = React.useState<string | null>(null);
  const [truckDriver, setTruckDriver] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!open) return;
    setInstallAddress(shipment.installAddress ?? '');
    setInstallContact(shipment.installContact ?? '');
    setInstallPhone(shipment.installPhone ?? '');
    setAppointmentTime(shipment.appointmentTime ?? '');
    setInstallerId(shipment.installerId || null);
    setTruckDriver(shipment.truckDriver ?? '');
  }, [open, shipment]);

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    try {
      const dto: UpdateShipmentInfoRequest = {
        installAddress: installAddress.trim(),
        installContact: installContact.trim(),
        installPhone: installPhone.trim(),
        appointmentTime: appointmentTime ? appointmentTime : null,
        installerId: installerId ?? null,
        truckDriver: truckDriver.trim(),
      };
      await shipmentApi.updateShipmentInfo(shipment.id, dto);
      toast.success('配送信息已更新');
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDate: Date | undefined = appointmentTime
    ? dayjs(appointmentTime).toDate()
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>编辑配送信息</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>安装地址</Label>
            <Input
              value={installAddress}
              placeholder="请输入安装地址"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setInstallAddress(e.target.value)
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>联系人</Label>
              <Input
                value={installContact}
                placeholder="请输入联系人"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setInstallContact(e.target.value)
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>联系电话</Label>
              <Input
                value={installPhone}
                placeholder="请输入联系电话"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setInstallPhone(e.target.value)
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>预约安装时间</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 w-full justify-start font-normal"
                >
                  <CalendarIcon className="size-4 text-muted-foreground" />
                  {appointmentTime ? (
                    <span>{dayjs(appointmentTime).format('YYYY-MM-DD')}</span>
                  ) : (
                    <span className="text-muted-foreground">选择预约日期</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date: Date | undefined) => {
                    setAppointmentTime(
                      date ? dayjs(date).toISOString() : '',
                    );
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>安装人员</Label>
            <UserSelect
              value={installerId}
              onChange={(value: string | null) => setInstallerId(value)}
              placeholder="请选择安装人员"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>货车/司机</Label>
            <Input
              value={truckDriver}
              placeholder="如：京A·88888 / 王师傅"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTruckDriver(e.target.value)
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            data-ai-section-type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShipmentInfoDialog;
