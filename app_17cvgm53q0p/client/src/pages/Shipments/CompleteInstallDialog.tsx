import React from 'react';
import { toast } from 'sonner';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Image from '@/components/ui/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { shipmentApi } from '@client/src/api';

import { extractErrorMessage } from './shipment-helpers';

interface CompleteInstallDialogProps {
  open: boolean;
  shipmentId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CompleteInstallDialog: React.FC<CompleteInstallDialogProps> = ({
  open,
  shipmentId,
  onOpenChange,
  onSuccess,
}) => {
  const [installFee, setInstallFee] = React.useState<string>('');
  const [installRemark, setInstallRemark] = React.useState<string>('');
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState<boolean>(false);
  const [submitting, setSubmitting] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!open) return;
    setInstallFee('');
    setInstallRemark('');
    setPhotos([]);
  }, [open]);

  const handleFiles = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const files: File[] = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    try {
      const dataloom = await getDataloom();
      for (const file of files) {
        const { data, error } = await dataloom.storage
          .from(getDefaultBucketId())
          .uploadFile(file);
        if (error || !data?.download_url) {
          throw new Error('验收照片上传失败');
        }
        setPhotos((prev: string[]) => [...prev, data.download_url]);
      }
    } catch (error: unknown) {
      logger.error(`upload acceptance photo failed: ${String(error)}`);
      toast.error('验收照片上传失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    const feeStr: string = installFee.trim();
    let fee: number | undefined;
    if (feeStr !== '') {
      fee = Number(feeStr);
      if (!Number.isFinite(fee) || fee < 0) {
        toast.error('安装费用必须为非负数字');
        return;
      }
    }
    setSubmitting(true);
    try {
      await shipmentApi.updateShipmentStatus(shipmentId, {
        targetStatus: '已完成',
        installFee: fee,
        installRemark: installRemark.trim() || undefined,
        acceptancePhotos: photos,
      });
      toast.success('安装已完成');
      onOpenChange(false);
      onSuccess();
    } catch (error: unknown) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>确认安装完成</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>安装费用（选填）</Label>
            <Input
              type="number"
              min={0}
              placeholder="请输入安装费用"
              value={installFee}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setInstallFee(e.target.value)
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>安装备注（选填）</Label>
            <Textarea
              rows={3}
              placeholder="记录安装情况、注意事项等"
              value={installRemark}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setInstallRemark(e.target.value)
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>验收照片（选填，可多张）</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((url: string, index: number) => (
                <div
                  key={`${url}-${index}`}
                  className="group relative size-20 overflow-hidden rounded-md border"
                >
                  <Image
                    src={url}
                    className="size-20 object-cover"
                    alt={`验收照片 ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors duration-200 hover:bg-black/80"
                    onClick={() =>
                      setPhotos((prev: string[]) =>
                        prev.filter((_: string, i: number) => i !== index),
                      )
                    }
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition-colors duration-200 hover:bg-accent">
                {uploading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <ImagePlus className="size-5" />
                )}
                <span className="text-xs">上传</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    void handleFiles(e);
                  }}
                />
              </label>
            </div>
          </div>
          <Button
            data-ai-section-type="button"
            size="lg"
            className="w-full"
            disabled={submitting || uploading}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            确认完成
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompleteInstallDialog;
