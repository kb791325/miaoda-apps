import { useRef, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@client/src/components/ui/select';
import {
  Upload, X, Loader2, FileText, FileImage, File,
  CheckCircle2, AlertCircle,
} from 'lucide-react';
import type { AttachmentFileType } from '@shared/api.interface';
import * as attachmentsApi from '@client/src/api/attachments';

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.ppt', '.pptx', '.txt', '.csv',
];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const FILE_CATEGORY_OPTIONS: {
  value: AttachmentFileType; label: string;
}[] = [
  { value: 'invoice', label: '发票' },
  { value: 'receipt', label: '收据' },
  { value: 'photo', label: '照片' },
  { value: 'contract', label: '合同' },
  { value: 'other', label: '其他' },
];

interface UploadEntry {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

interface FileUploaderProps {
  relatedType: string;
  relatedId: string;
  onUploadComplete?: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  relatedType, relatedId, onUploadComplete,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileCategory, setFileCategory] =
    useState<AttachmentFileType>('other');

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `不支持的文件类型: ${ext}`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `文件大小不能超过 ${MAX_SIZE_MB}MB`;
    }
    return null;
  };

  const uploadFile = async (entry: UploadEntry): Promise<void> => {
    setEntries((prev: UploadEntry[]) =>
      prev.map((e: UploadEntry) =>
        e.id === entry.id
          ? { ...e, status: 'uploading', progress: 0 }
          : e,
      ),
    );
    try {
      const dataloom = await getDataloom();
      const { data, error } = await dataloom.storage
        .from(getDefaultBucketId())
        .uploadFile(entry.file);
      if (error || !data) {
        const err = error as {
          message?: string; error_msg?: string;
        } | null;
        throw new Error(
          err?.message || err?.error_msg || '上传失败',
        );
      }
      setEntries((prev: UploadEntry[]) =>
        prev.map((e: UploadEntry) =>
          e.id === entry.id ? { ...e, progress: 100 } : e,
        ),
      );
      await attachmentsApi.createAttachment({
        fileName: entry.file.name,
        fileSize: entry.file.size,
        fileType: entry.file.type || 'application/octet-stream',
        fileCategory,
        downloadUrl: data.download_url,
        relatedType,
        relatedId,
      });
      setEntries((prev: UploadEntry[]) =>
        prev.map((e: UploadEntry) =>
          e.id === entry.id ? { ...e, status: 'success' } : e,
        ),
      );
      toast.success(`${entry.file.name} 上传成功`);
      onUploadComplete?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      logger.error('文件上传失败', err);
      setEntries((prev: UploadEntry[]) =>
        prev.map((e: UploadEntry) =>
          e.id === entry.id
            ? { ...e, status: 'error', errorMessage: msg }
            : e,
        ),
      );
      toast.error(`上传失败: ${msg}`);
    }
  };

  const CONCURRENCY = 3;

  const addFiles = (files: FileList | File[]) => {
    const newEntries: UploadEntry[] = [];
    for (const file of files) {
      const errMsg = validateFile(file);
      if (errMsg) { toast.error(errMsg); continue; }
      newEntries.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file, progress: 0, status: 'pending',
      });
    }
    if (newEntries.length === 0) return;
    setEntries((prev: UploadEntry[]) => [...prev, ...newEntries]);
    // Upload in batches of CONCURRENCY
    const uploadBatch = async () => {
      for (let i = 0; i < newEntries.length; i += CONCURRENCY) {
        const batch = newEntries.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((entry) => uploadFile(entry)));
      }
    };
    uploadBatch();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeEntry = (id: string) => {
    setEntries((prev: UploadEntry[]) =>
      prev.filter((e: UploadEntry) => e.id !== id),
    );
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024)
      return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const categoryLabel = FILE_CATEGORY_OPTIONS.find(
    (o) => o.value === fileCategory,
  )?.label ?? '其他';

  const getFileTypeIcon = (file: File) => {
    if (/^image\//.test(file.type)) return FileImage;
    if (file.type === 'application/pdf' || /\b(document|sheet|presentation)\b/.test(file.type)) return FileText;
    return File;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-sm font-medium text-foreground">
          文件分类
        </div>
        <Select
          value={fileCategory}
          onValueChange={(v: string) =>
            setFileCategory(v as AttachmentFileType)
          }
        >
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILE_CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed px-4 py-8 transition-colors duration-150 ${
          isDragging
            ? 'border-primary bg-accent'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        }`}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          点击或拖拽上传文件
        </p>
        <p className="text-xs text-muted-foreground">
          支持 jpg/png/gif/webp/pdf/doc/docx/xls/xlsx/ppt/pptx/txt/csv，
          单文件不超过 {MAX_SIZE_MB}MB
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-1"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          <Upload className="h-4 w-4" />
          选择文件
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED_EXTENSIONS.join(',')}
        onChange={handleChange}
        className="hidden"
      />

      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry: UploadEntry) => {
            const Icon = getFileTypeIcon(entry.file);
            return (
            <div
              key={entry.id}
              className="animate-fadeIn flex items-center gap-3 rounded-sm border bg-card p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border bg-muted/30">
                {entry.status === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : entry.status === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Icon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {entry.file.name}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatSize(entry.file.size)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {categoryLabel}
                  </Badge>
                  {entry.status === 'uploading' && (
                    <>
                      <div className="flex-1 max-w-[100px] h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${entry.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {entry.progress}%
                      </span>
                    </>
                  )}
                  {entry.status === 'error' && (
                    <span className="text-xs text-red-500 truncate">
                      {entry.errorMessage}
                    </span>
                  )}
                </div>
              </div>
              {entry.status === 'uploading' && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  removeEntry(entry.id);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileUploader;