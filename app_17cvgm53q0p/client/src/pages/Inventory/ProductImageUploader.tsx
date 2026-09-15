import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { capabilityClient } from '@lark-apaas/client-toolkit';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, UploadCloud, X } from 'lucide-react';
import { Image } from '@client/src/components/ui/image';
import type { ProductImageInfoExtractionOneOutput } from '@shared/plugin-types';

export interface RecognizedProductInfo {
  productName: string;
  brand: string;
  specModel: string;
  /** 图片识别出的建议销售单价（元），未识别到为 undefined */
  price?: number;
}

export interface ProductImageUploaderProps {
  onRecognized: (info: RecognizedProductInfo) => void;
  onImageChange: (imageUrl: string | undefined) => void;
  onRemoved: () => void;
}

type RecognizeState = 'idle' | 'recognizing' | 'filled' | 'empty' | 'failed';
type SaveState = 'none' | 'saving' | 'saved' | 'failed';

const RECOGNITION_INSTANCE_ID = 'product_image_info_extraction_1';

/** 解析建议单价：兼容数字与带货币符号/单位的字符串，非法或为 0 时返回 undefined */
const parseSuggestedPrice = (raw: unknown): number | undefined => {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  if (typeof raw === 'string' && raw !== '') {
    const cleaned: string = raw.replace(/[^0-9.]/g, '');
    const parsed: number = Number(cleaned);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
};

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  onRecognized,
  onImageChange,
  onRemoved,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [recognizeState, setRecognizeState] =
    useState<RecognizeState>('idle');
  const [saveState, setSaveState] = useState<SaveState>('none');

  const handleFile = (file: File): void => {
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }
    setPreviewUrl((prev: string | null): string => {
      if (prev !== null) {
        URL.revokeObjectURL(prev);
      }
      return URL.createObjectURL(file);
    });
    setRecognizeState('recognizing');
    setSaveState('saving');
    onImageChange(undefined);

    capabilityClient
      .load(RECOGNITION_INSTANCE_ID)
      .call<ProductImageInfoExtractionOneOutput>('imageToJson', {
        product_image: [file],
      })
      .then((result: ProductImageInfoExtractionOneOutput) => {
        const info: RecognizedProductInfo = {
          productName: result.product_name ?? '',
          brand: result.brand ?? '',
          specModel: result.specification_model ?? '',
          price: parseSuggestedPrice(result.suggested_price),
        };
        const hasInfo: boolean =
          info.productName !== '' || info.brand !== '' || info.specModel !== '';
        setRecognizeState(hasInfo ? 'filled' : 'empty');
        if (hasInfo) {
          toast.success('识别完成，已自动填充商品信息');
        }
        onRecognized(info);
      })
      .catch((error: unknown) => {
        logger.error(
          `product image recognize failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        setRecognizeState('failed');
        toast.error('图片识别失败，请手动填写商品信息');
      });

    void saveImage(file);
  };

  const saveImage = async (file: File): Promise<void> => {
    try {
      const dataloom = await getDataloom();
      const { data, error } = await dataloom.storage
        .from(getDefaultBucketId())
        .uploadFile(file);
      if (error || !data) {
        throw new Error(error instanceof Error ? error.message : String(error));
      }
      onImageChange(data.download_url);
      setSaveState('saved');
    } catch (uploadError) {
      logger.error(
        `product image upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`,
      );
      setSaveState('failed');
      toast.warning('商品图片保存失败，仍可提交其他商品信息');
    }
  };

  const handleRemove = (): void => {
    setPreviewUrl((prev: string | null): null => {
      if (prev !== null) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setRecognizeState('idle');
    setSaveState('none');
    onImageChange(undefined);
    onRemoved();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragOver(false);
    const file: File | undefined = event.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const openFilePicker = (): void => {
    inputRef.current?.click();
  };

  const statusText = (): string => {
    switch (recognizeState) {
      case 'recognizing':
        return '正在识别商品信息…';
      case 'filled':
        return '识别完成，已自动填充';
      case 'empty':
        return '未识别到商品信息，请手动填写';
      case 'failed':
        return '识别失败，请手动填写';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-1.5">
      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(event): void => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragOver={(event: DragEvent<HTMLDivElement>): void => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(): void => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'cursor-pointer rounded-lg border border-dashed p-3 transition-colors',
          dragOver
            ? 'border-primary bg-accent'
            : 'border-border hover:border-primary/50 hover:bg-accent/40',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event): void => {
            const file: File | undefined = event.target.files?.[0];
            if (file) {
              handleFile(file);
            }
            event.target.value = '';
          }}
        />
        {previewUrl === null ? (
          <div className="flex flex-col items-center gap-1 py-4 text-muted-foreground">
            <UploadCloud className="h-6 w-6" />
            <p className="text-sm">点击或拖拽上传商品图片</p>
            <p className="text-xs">
              支持商品包装、标签、说明书照片，自动识别名称、品牌、规格型号
            </p>
          </div>
        ) : (
          <div className="relative flex justify-center">
            <Image
              src={previewUrl}
              alt="商品图片预览"
              className="max-h-40 w-auto rounded-md object-contain"
            />
            <button
              type="button"
              aria-label="移除图片"
              onClick={(event): void => {
                event.stopPropagation();
                handleRemove();
              }}
              className="absolute right-1 top-1 rounded-full bg-foreground/60 p-1 text-primary-foreground transition-colors hover:bg-foreground/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      {(recognizeState !== 'idle' || saveState === 'failed') && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {recognizeState === 'recognizing' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : recognizeState === 'filled' ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          ) : null}
          <span>
            {statusText()}
            {saveState === 'failed' ? ' · 图片保存失败' : ''}
          </span>
        </p>
      )}
    </div>
  );
};
