import { useState } from 'react';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Empty, EmptyContent, EmptyTitle } from '@client/src/components/ui/empty';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import {
  FileText,
  FileImage,
  File,
  FileSpreadsheet,
  Download,
  Eye,
  Trash2,
  Loader2,
} from 'lucide-react';
import type { AttachmentItem } from '@shared/api.interface';
import FilePreviewDialog from './FilePreviewDialog';
import { Image } from '@client/src/components/ui/image';

const FILE_CATEGORY_LABELS: Record<string, string> = {
  invoice: '发票',
  receipt: '收据',
  photo: '照片',
  contract: '合同',
  other: '其他',
};

interface AttachmentListProps {
  attachments: AttachmentItem[];
  onDelete?: (id: string) => void;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  total?: number;
}

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
};

const isImage = (fileType: string): boolean =>
  /^image\//.test(fileType);

const isPdf = (fileType: string): boolean =>
  fileType === 'application/pdf';

const isSpreadsheet = (fileType: string): boolean =>
  fileType.includes('spreadsheet') ||
  fileType.includes('excel') ||
  /\.xls/.test(fileType);

const isDocument = (fileType: string): boolean =>
  fileType.includes('word') ||
  fileType.includes('document') ||
  /\.doc/.test(fileType);

const getFileTypeBadge = (item: AttachmentItem): {
  label: string; bg: string; fg: string;
} | null => {
  if (isImage(item.fileType)) return { label: '图片', bg: 'bg-green-50', fg: 'text-green-600' };
  if (isPdf(item.fileType)) return { label: 'PDF', bg: 'bg-red-50', fg: 'text-red-500' };
  if (isSpreadsheet(item.fileType)) return { label: 'XLS', bg: 'bg-green-50', fg: 'text-green-600' };
  if (isDocument(item.fileType)) return { label: 'DOC', bg: 'bg-blue-50', fg: 'text-blue-600' };
  return null;
};

const getFileTypeIconBg = (item: AttachmentItem): string => {
  if (isImage(item.fileType)) return 'bg-muted';
  if (isPdf(item.fileType)) return 'bg-red-50';
  if (isSpreadsheet(item.fileType)) return 'bg-green-50';
  if (isDocument(item.fileType)) return 'bg-blue-50';
  return 'bg-muted/30';
};

const getFileTypeIconColor = (item: AttachmentItem): string => {
  if (isImage(item.fileType)) return 'text-muted-foreground';
  if (isPdf(item.fileType)) return 'text-red-500';
  if (isSpreadsheet(item.fileType)) return 'text-green-600';
  if (isDocument(item.fileType)) return 'text-blue-600';
  return 'text-muted-foreground';
};

const getFileTypeIcon = (item: AttachmentItem) => {
  if (isImage(item.fileType)) return FileImage;
  if (isPdf(item.fileType)) return FileText;
  if (isSpreadsheet(item.fileType)) return FileSpreadsheet;
  if (isDocument(item.fileType)) return FileText;
  return File;
};

const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  onDelete,
  loading,
  hasMore,
  onLoadMore,
  loadingMore,
  total,
}) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<AttachmentItem | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePreview = (item: AttachmentItem) => {
    if (isImage(item.fileType)) {
      setPreviewItem(item);
      setPreviewOpen(true);
    } else {
      window.open(item.downloadUrl, '_blank');
    }
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const handleDeleteConfirm = () => {
    if (deleteId && onDelete) {
      onDelete(deleteId);
    }
    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <Empty>
        <FileImage className="h-10 w-10 text-muted-foreground" />
        <EmptyContent>
          <EmptyTitle>暂无附件</EmptyTitle>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {attachments.map((item: AttachmentItem) => {
          const Icon = getFileTypeIcon(item);
          const badge = getFileTypeBadge(item);
          const iconBg = getFileTypeIconBg(item);
          const iconColor = getFileTypeIconColor(item);
          return (
          <div
            key={item.id}
            className="flex flex-col rounded-sm border bg-card transition-colors duration-150 hover:bg-accent"
          >
            {/* 预览区 */}
            {isImage(item.fileType) ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-t-sm border-b bg-muted">
                <Image
                  src={item.downloadUrl}
                  alt={item.fileName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className={`flex aspect-[4/3] items-center justify-center rounded-t-sm border-b ${iconBg}`}>
                <Icon className={`h-12 w-12 ${iconColor}`} />
              </div>
            )}
            {/* 信息区 */}
            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <div className="truncate text-sm font-medium">
                {item.fileName}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  {formatFileSize(item.fileSize)}
                </span>
                {badge && (
                  <span className={`inline-flex items-center rounded-sm border px-1.5 py-0 text-[10px] font-medium ${badge.bg} ${badge.fg}`}>
                    {badge.label}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatTime(item.createdAt)}
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-0.5 border-t pt-2 mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="预览"
                  onClick={() => handlePreview(item)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="下载"
                  onClick={() => handleDownload(item.downloadUrl)}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-auto text-muted-foreground hover:text-destructive"
                    title="删除"
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该附件吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {hasMore && onLoadMore && (
        <div className="mt-4 flex items-center justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {total !== undefined
              ? `加载更多（已显示 ${attachments.length}/${total}）`
              : '加载更多'}
          </Button>
        </div>
      )}

      <FilePreviewDialog
        attachment={previewItem}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
};

export default AttachmentList;