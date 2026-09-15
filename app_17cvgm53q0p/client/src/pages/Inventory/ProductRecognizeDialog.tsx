import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  ProductImageUploader,
  type RecognizedProductInfo,
} from './ProductImageUploader';

export interface ProductRecognizeDialogProps {
  open: boolean;
  onClose: () => void;
  /** 进入新增表单：携带识别结果与已上传图片，无识别结果时 info 为 null */
  onProceed: (info: RecognizedProductInfo | null, imageUrl?: string) => void;
}

interface SummaryRow {
  label: string;
  value: string;
}

export const ProductRecognizeDialog: React.FC<ProductRecognizeDialogProps> = ({
  open,
  onClose,
  onProceed,
}) => {
  const [info, setInfo] = useState<RecognizedProductInfo | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setInfo(null);
      setImageUrl(undefined);
    }
  }, [open]);

  const hasAnyInfo: boolean =
    info !== null &&
    (info.productName !== '' || info.brand !== '' || info.specModel !== '');

  const summaryRows: SummaryRow[] =
    info === null
      ? []
      : [
          { label: '商品名称', value: info.productName },
          { label: '品牌', value: info.brand },
          { label: '规格型号', value: info.specModel },
          {
            label: '建议单价',
            value: info.price !== undefined ? `¥ ${info.price}` : '',
          },
        ];

  const handleProceed = (): void => {
    onProceed(hasAnyInfo ? info : null, imageUrl);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean): void => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>图片识别新增商品</DialogTitle>
          <DialogDescription>
            上传商品照片（包装、标签、说明书等），自动识别商品名称、品牌、规格型号与建议单价
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ProductImageUploader
            onRecognized={setInfo}
            onImageChange={setImageUrl}
            onRemoved={(): void => setInfo(null)}
          />
          {summaryRows.length > 0 ? (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="mb-2 text-sm font-medium">识别结果</p>
              <dl className="space-y-1.5">
                {summaryRows.map((row: SummaryRow) => (
                  <div
                    key={row.label}
                    className="flex items-start gap-3 text-sm"
                  >
                    <dt className="w-24 shrink-0 text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd
                      className={
                        row.value !== ''
                          ? 'break-words font-medium'
                          : 'text-muted-foreground'
                      }
                    >
                      {row.value !== '' ? row.value : '未识别到'}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-muted-foreground">
                识别结果如有偏差，可在下一步表单中修改
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="button" size="lg" onClick={handleProceed}>
            {hasAnyInfo ? '下一步：确认商品信息' : '跳过识别，手动填写'}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
