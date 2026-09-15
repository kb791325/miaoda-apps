import { useState } from 'react';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  File,
} from 'lucide-react';
import type { AttachmentItem } from '@shared/api.interface';
import { formatFileSize, formatTime } from './AttachmentList';
import { Image } from '@client/src/components/ui/image';

const FILE_CATEGORY_LABELS: Record<string, string> = {
  invoice: '发票', receipt: '收据', photo: '照片',
  contract: '合同', other: '其他',
};

interface FilePreviewDialogProps {
  attachment: AttachmentItem | null;
  open: boolean;
  onClose: () => void;
  attachments?: AttachmentItem[];
  onNavigate?: (item: AttachmentItem) => void;
}

const isImage = (ft: string): boolean => /^image\//.test(ft);
const isPdf = (ft: string): boolean => ft === 'application/pdf';

const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({
  attachment, open, onClose, attachments, onNavigate,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!attachment) return null;

  const image = isImage(attachment.fileType);
  const pdf = isPdf(attachment.fileType);

  const currentIndex = attachments
    ? attachments.findIndex((a: AttachmentItem) => a.id === attachment.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < (attachments?.length ?? 0) - 1;

  const handleClose = () => {
    setZoom(1);
    setRotation(0);
    onClose();
  };

  const handlePrev = () => {
    if (hasPrev && attachments && onNavigate) {
      setZoom(1);
      setRotation(0);
      onNavigate(attachments[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && attachments && onNavigate) {
      setZoom(1);
      setRotation(0);
      onNavigate(attachments[currentIndex + 1]);
    }
  };

  const openUrl = () =>
    window.open(attachment.downloadUrl, '_blank');

  return (
    <Dialog
      open={open}
      onOpenChange={(v: boolean) => { if (!v) handleClose(); }}
    >
      <DialogContent className="max-w-4xl" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="truncate flex-1">
              {attachment.fileName}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {image ? (
            <>
              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => setZoom((z: number) =>
                    Math.max(0.25, z - 0.25))}
                  disabled={zoom <= 0.25}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground font-mono min-w-[48px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => setZoom((z: number) =>
                    Math.min(3, z + 0.25))}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() =>
                    setRotation((r: number) => (r + 90) % 360)}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative overflow-auto rounded-sm border bg-muted/10 flex items-center justify-center p-4 min-h-[300px]">
                {hasPrev && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full bg-card/80"
                    onClick={handlePrev}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                <Image
                  src={attachment.downloadUrl}
                  alt={attachment.fileName}
                  className="max-w-full transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                />
                {hasNext && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute right-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full bg-card/80"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-sm border bg-muted/10 p-8">
              {pdf ? (
                <FileText className="h-16 w-16 text-red-500" />
              ) : (
                <File className="h-16 w-16 text-muted-foreground" />
              )}
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">
                  {attachment.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  该文件类型不支持在线预览
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={openUrl}
                >
                  <ExternalLink className="h-4 w-4" />
                  新窗口打开
                </Button>
                <Button type="button" size="sm" onClick={openUrl}>
                  <Download className="h-4 w-4" />
                  下载
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-sm border bg-muted/20 p-3 text-sm">
            <div className="text-muted-foreground">文件名</div>
            <div className="truncate font-medium">
              {attachment.fileName}
            </div>
            <div className="text-muted-foreground">类型</div>
            <div>
              {FILE_CATEGORY_LABELS[attachment.fileCategory] ??
                attachment.fileCategory}
            </div>
            <div className="text-muted-foreground">大小</div>
            <div className="font-mono">
              {formatFileSize(attachment.fileSize)}
            </div>
            <div className="text-muted-foreground">上传时间</div>
            <div className="font-mono">
              {formatTime(attachment.createdAt)}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button" variant="outline" size="sm"
            onClick={openUrl}
          >
            <Download className="h-4 w-4" />下载
          </Button>
          <Button type="button" size="sm" onClick={handleClose}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewDialog;