import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@client/src/components/ui/pagination';
import {
  FileText,
  File,
  FileImage,
  FileSpreadsheet,
  Eye,
  Download,
  Trash2,
  Loader2,
} from 'lucide-react';
import type { AttachmentItem } from '@shared/api.interface';
import { formatFileSize, formatTime } from '@client/src/components/FileUpload/AttachmentList';
import { Image } from '@client/src/components/ui/image';

const FILE_CATEGORY_LABELS: Record<string, string> = {
  invoice: '发票',
  receipt: '收据',
  photo: '照片',
  contract: '合同',
  other: '其他',
};

interface AttachmentTableProps {
  items: AttachmentItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onPreview: (item: AttachmentItem) => void;
  onDelete: (id: string) => void;
  onPageChange: (page: number) => void;
}

const isImage = (ft: string): boolean => /^image\//.test(ft);
const isPdf = (ft: string): boolean => ft === 'application/pdf';
const isSpreadsheet = (ft: string): boolean =>
  ft.includes('spreadsheet') ||
  ft.includes('excel') ||
  /\.xls/.test(ft);
const isDocument = (ft: string): boolean =>
  ft.includes('word') ||
  ft.includes('document') ||
  /\.doc/.test(ft);

const getFileIcon = (item: AttachmentItem) => {
  if (isImage(item.fileType)) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm border bg-muted">
        <Image
          src={item.downloadUrl}
          alt={item.fileName}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }
  if (isPdf(item.fileType)) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border bg-red-50">
        <FileText className="h-5 w-5 text-red-500" />
      </div>
    );
  }
  if (isSpreadsheet(item.fileType)) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border bg-green-50">
        <FileSpreadsheet className="h-5 w-5 text-green-600" />
      </div>
    );
  }
  if (isDocument(item.fileType)) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border bg-blue-50">
        <FileText className="h-5 w-5 text-blue-600" />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border bg-muted/30">
      <File className="h-5 w-5 text-muted-foreground" />
    </div>
  );
};

const AttachmentTable: React.FC<AttachmentTableProps> = ({
  items,
  total,
  page,
  pageSize,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onPreview,
  onDelete,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-sm border bg-card py-16">
        <FileImage className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">暂无附件</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-sm border bg-card overflow-hidden">
        <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <Checkbox
            checked={
              items.length > 0 && selectedIds.size === items.length
            }
            onCheckedChange={onToggleAll}
          />
          <div className="w-10" />
          <div className="flex-1 min-w-0">文件名</div>
          <div className="w-16 text-center">分类</div>
          <div className="w-20 text-center">关联</div>
          <div className="w-20 text-right font-mono">大小</div>
          <div className="w-36 text-right font-mono">上传时间</div>
          <div className="w-24 text-center">操作</div>
        </div>

        {items.map((item: AttachmentItem) => (
          <div
            key={item.id}
            className="flex items-center gap-3 border-b border-border/50 px-4 py-3 hover:bg-accent transition-colors last:border-b-0"
          >
            <Checkbox
              checked={selectedIds.has(item.id)}
              onCheckedChange={() => onToggleSelect(item.id)}
            />
            {getFileIcon(item)}
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium">
                {item.fileName}
              </div>
            </div>
            <div className="w-16 text-center">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0"
              >
                {FILE_CATEGORY_LABELS[item.fileCategory] ??
                  item.fileCategory}
              </Badge>
            </div>
            <div className="w-20 text-center">
              <span className="text-xs text-muted-foreground">
                {item.relatedType}
              </span>
            </div>
            <div className="w-20 text-right font-mono text-xs text-muted-foreground">
              {formatFileSize(item.fileSize)}
            </div>
            <div className="w-36 text-right font-mono text-xs text-muted-foreground">
              {formatTime(item.createdAt)}
            </div>
            <div className="w-24 flex items-center justify-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="预览"
                onClick={() => onPreview(item)}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="下载"
                onClick={() =>
                  window.open(item.downloadUrl, '_blank')
                }
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                title="删除"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          共 {total} 个附件
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() =>
                  onPageChange(Math.max(1, page - 1))
                }
                className={
                  page <= 1 ? 'pointer-events-none opacity-50' : ''
                }
              />
            </PaginationItem>
            {Array.from(
              { length: totalPages },
              (_, i: number) => i + 1,
            )
              .filter(
                (p: number) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - page) <= 1,
              )
              .map((p: number, idx: number, arr: number[]) => (
                <PaginationItem key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      isActive={p === page}
                      onClick={() => onPageChange(p)}
                    >
                      {p}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  onPageChange(Math.min(totalPages, page + 1))
                }
                className={
                  page >= totalPages
                    ? 'pointer-events-none opacity-50'
                    : ''
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </>
  );
};

export default AttachmentTable;