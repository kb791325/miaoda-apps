import React, { useRef, useState } from 'react';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Image as ImageComponent } from '@client/src/components/ui/image';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件（jpg / png / webp 等）');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }
    setUploading(true);
    try {
      const dataloom = await getDataloom();
      const { data, error } = await dataloom.storage
        .from(getDefaultBucketId())
        .uploadFile(file);
      if (error || !data) {
        throw new Error(error?.message || '上传失败');
      }
      onChange(data.download_url);
      toast.success('图片上传成功');
    } catch (err) {
      logger.error(`图片上传失败: ${String(err)}`);
      toast.error('图片上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-start gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSelect}
        disabled={disabled || uploading}
      />
      {value ? (
        <div className="relative h-20 w-20 overflow-hidden rounded-sm border border-border">
          <ImageComponent
            src={value}
            alt="商品图片"
            width={80}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-sm border border-dashed border-border text-muted-foreground">
          <Upload className="h-5 w-5" />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-3.5 w-3.5" />
          )}
          {uploading ? '上传中...' : value ? '更换图片' : '上传图片'}
        </Button>
        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => onChange(null)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            移除
          </Button>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
