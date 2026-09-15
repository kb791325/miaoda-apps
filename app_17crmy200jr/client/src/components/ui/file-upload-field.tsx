import { useRef, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';
import { toast } from 'sonner';
import { Image } from '@client/src/components/ui/image';
import { Button } from '@client/src/components/ui/button';
import {
  Upload,
  X,
  FileText,
  Loader2,
  Download,
  ImageIcon,
} from 'lucide-react';

interface FileUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  maxSizeMB?: number;
  type: 'image' | 'pdf' | 'all';
  hint?: string;
}

const FileUploadField = ({
  label,
  value,
  onChange,
  accept = 'image/*,.pdf',
  maxSizeMB = 10,
  type = 'all',
  hint,
}: FileUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isImage = type === 'image' || (type === 'all' && value && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(value));

  const validateFile = (file: File): string | null => {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `文件大小不能超过 ${maxSizeMB}MB`;
    }
    if (type === 'image' && !file.type.startsWith('image/')) {
      return '仅支持图片文件（jpg、png、gif）';
    }
    return null;
  };

  const handleFile = async (file: File) => {
    const errorMsg = validateFile(file);
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }
    setUploading(true);
    try {
      const dataloom = await getDataloom();
      const { data, error } = await dataloom
        .storage
        .from(getDefaultBucketId())
        .uploadFile(file);
      if (error || !data) {
        const err = error as { message?: string; error_msg?: string } | null;
        throw new Error(
          (err?.message) ||
          (err?.error_msg) ||
          '未知错误',
        );
      }
      onChange(data.download_url);
      toast.success('上传成功');
    } catch (err) {
      logger.error('文件上传失败', err);
      toast.error(`上传失败：${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  if (value) {
    const fileName = value.split('/').pop() || '附件文件';
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="group relative overflow-hidden rounded-sm border bg-muted/20">
          <div className="flex items-center gap-3 p-3">
            {isImage ? (
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-sm border bg-card">
                <Image
                  src={value}
                  alt={fileName}
                  width={80}
                  height={64}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border bg-card">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{fileName}</div>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => window.open(value, '_blank')}
                >
                  <Download className="mr-1 h-3 w-3" />
                  预览/下载
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="mr-1 h-3 w-3" />
                  )}
                  重新上传
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="删除附件"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed px-4 py-8 transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">上传中...</p>
          </>
        ) : (
          <>
            {type === 'image' ? (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm font-medium text-foreground">
              点击或拖拽上传
            </p>
            {hint && (
              <p className="text-xs text-muted-foreground">{hint}</p>
            )}
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};

export default FileUploadField;
