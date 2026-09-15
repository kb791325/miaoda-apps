import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { Image } from '@client/src/components/ui/image';
import { FileText, ImageIcon, ZoomIn, Download, ExternalLink } from 'lucide-react';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface ExpenseAttachmentPreviewProps {
  invoiceUrl: string;
  screenshotUrl: string;
}

const ExpenseAttachmentPreview = ({
  invoiceUrl,
  screenshotUrl,
}: ExpenseAttachmentPreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const hasInvoice = !!invoiceUrl;
  const hasScreenshot = !!screenshotUrl;

  const isPdf = (url: string): boolean =>
    url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?');

  if (!hasInvoice && !hasScreenshot) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-semibold">附件</div>
        <div className="flex items-center gap-2 rounded-sm border bg-muted/30 p-3 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          暂无附件
        </div>
      </div>
    );
  }

  const openPreview = (url: string, title: string) => {
    setPreviewUrl(url);
    setPreviewTitle(title);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="text-sm font-semibold">附件</div>
        <div className="grid grid-cols-2 gap-3">
          {hasInvoice && (
            <div className="space-y-2">
              {isPdf(invoiceUrl) ? (
                <UniversalLink
                  to={invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden rounded-sm border"
                >
                  <div className="flex aspect-[4/3] items-center justify-center bg-muted/30">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground transition-colors group-hover:text-primary">
                      <FileText className="h-12 w-12" />
                      <span className="text-xs font-medium">发票 PDF</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t bg-card px-2 py-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      发票
                    </span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </UniversalLink>
              ) : (
                <div
                  className="group relative cursor-pointer overflow-hidden rounded-sm border"
                  onClick={() => openPreview(invoiceUrl, '发票图片')}
                >
                  <div className="relative aspect-[4/3] bg-muted/30">
                    <Image
                      src={invoiceUrl}
                      alt="发票图片"
                      width={400}
                      height={300}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                      <ZoomIn className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 border-t bg-card px-2 py-1.5 text-xs text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    发票图片
                  </div>
                </div>
              )}
            </div>
          )}
          {hasScreenshot && (
            <div
              className="group relative cursor-pointer overflow-hidden rounded-sm border"
              onClick={() => openPreview(screenshotUrl, '购买截图')}
            >
              <div className="relative aspect-[4/3] bg-muted/30">
                <Image
                  src={screenshotUrl}
                  alt="购买截图"
                  width={400}
                  height={300}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                  <ZoomIn className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 border-t bg-card px-2 py-1.5 text-xs text-muted-foreground">
                <ImageIcon className="h-3 w-3" />
                购买截图
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!previewUrl} onOpenChange={(v) => !v && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl rounded-sm border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{previewTitle}</DialogTitle>
          <DialogDescription className="sr-only">
            放大预览 {previewTitle}
          </DialogDescription>
          {previewUrl && (
            <div className="relative max-h-[85vh] w-full overflow-hidden rounded-sm border bg-card">
              <div className="border-b px-4 py-2 text-sm font-medium">
                {previewTitle}
              </div>
              <div className="flex items-center justify-center p-4">
                <Image
                  src={previewUrl}
                  alt={previewTitle}
                  className="max-h-[70vh] w-auto object-contain"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpenseAttachmentPreview;
