import { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
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
  Search,
  Trash2,
  Paperclip,
  HardDrive,
  Calendar,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import type {
  AttachmentItem,
  AttachmentFileType,
  AttachmentStats,
} from '@shared/api.interface';
import * as attachmentsApi from '@client/src/api/attachments';
import FilePreviewDialog from '@client/src/components/FileUpload/FilePreviewDialog';
import { formatFileSize } from '@client/src/components/FileUpload/AttachmentList';
import AttachmentTable from './AttachmentManagePage/AttachmentTable';

const FILE_CATEGORY_OPTIONS: {
  value: AttachmentFileType | '';
  label: string;
}[] = [
  { value: '', label: '全部分类' },
  { value: 'invoice', label: '发票' },
  { value: 'receipt', label: '收据' },
  { value: 'photo', label: '照片' },
  { value: 'contract', label: '合同' },
  { value: 'other', label: '其他' },
];

const RELATED_TYPE_OPTIONS = [
  { value: '', label: '全部关联' },
  { value: 'expense', label: '行政支出' },
  { value: 'fixed_asset', label: '固定资产' },
  { value: 'inventory', label: '资产盘点' },
  { value: 'reservation', label: '资产预约' },
];

const PAGE_SIZE = 12;

const AttachmentManagePage: React.FC = () => {
  const [stats, setStats] = useState<AttachmentStats | null>(null);
  const [items, setItems] = useState<AttachmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const [fileCategory, setFileCategory] = useState<
    AttachmentFileType | ''
  >('');
  const [relatedType, setRelatedType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(),
  );
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] =
    useState<AttachmentItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data: AttachmentStats =
        await attachmentsApi.getAttachmentStats();
      setStats(data);
    } catch (err) {
      logger.error('获取附件统计失败', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await attachmentsApi.getAttachments({
        page,
        pageSize: PAGE_SIZE,
        fileCategory: fileCategory || undefined,
        relatedType: relatedType || undefined,
        keyword: keyword || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      logger.error('获取附件列表失败', err);
      toast.error('获取附件列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, fileCategory, relatedType, keyword, startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    setPage(1);
  }, [fileCategory, relatedType, keyword, startDate, endDate]);

  const handleDelete = async (id: string) => {
    try {
      await attachmentsApi.deleteAttachment(id);
      toast.success('删除成功');
      setDeleteId(null);
      setSelectedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchItems();
      fetchStats();
    } catch (err) {
      logger.error('删除附件失败', err);
      toast.error('删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await attachmentsApi.batchDeleteAttachments(
        Array.from(selectedIds),
      );
      toast.success('批量删除成功');
      setBatchDeleteOpen(false);
      setSelectedIds(new Set());
      fetchItems();
      fetchStats();
    } catch (err) {
      logger.error('批量删除失败', err);
      toast.error('批量删除失败');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(
        new Set(items.map((it: AttachmentItem) => it.id)),
      );
    }
  };

  const handlePreview = (item: AttachmentItem) => {
    if (/^image\//.test(item.fileType)) {
      setPreviewItem(item);
      setPreviewOpen(true);
    } else {
      window.open(item.downloadUrl, '_blank');
    }
  };

  const statCards = [
    {
      label: '总文件数',
      value: stats?.totalCount ?? 0,
      icon: Paperclip,
      iconBg: 'bg-blue-50',
      iconFg: 'text-blue-600',
    },
    {
      label: '总大小',
      value: stats ? formatFileSize(stats.totalSize) : '0 B',
      icon: HardDrive,
      iconBg: 'bg-green-50',
      iconFg: 'text-green-600',
      mono: false,
    },
    {
      label: '本月上传',
      value: stats?.monthUploadCount ?? 0,
      icon: Calendar,
      iconBg: 'bg-orange-50',
      iconFg: 'text-orange-500',
    },
    {
      label: '图片数量',
      value: stats?.byCategory?.find((c: { category: string }) => c.category === 'photo')?.count ?? 0,
      icon: ImageIcon,
      iconBg: 'bg-purple-50',
      iconFg: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        data-ai-section-type="card-stat"
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-center gap-3 rounded-sm border bg-card p-4"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border ${card.iconBg}`}>
                <Icon className={`h-5 w-5 ${card.iconFg}`} />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">
                  {card.label}
                </div>
                <div
                  className={`text-lg font-semibold ${
                    card.mono !== false ? 'font-mono' : ''
                  }`}
                >
                  {statsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    card.value
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 文件类型快速筛选 */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-sm border bg-card p-1.5">
        {([
          { value: '', label: '全部' },
          { value: 'photo', label: '图片' },
          { value: 'invoice', label: '文档' },
          { value: 'other', label: '其他' },
        ] as const).map((tab) => (
          <Button
            key={tab.value}
            type="button"
            variant={fileCategory === tab.value ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFileCategory(tab.value as AttachmentFileType | '')}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3 rounded-sm border bg-card p-4">
        <Select
          value={fileCategory}
          onValueChange={(v: string) =>
            setFileCategory(v as AttachmentFileType | '')
          }
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue placeholder="文件分类" />
          </SelectTrigger>
          <SelectContent>
            {FILE_CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={relatedType}
          onValueChange={(v: string) => setRelatedType(v)}
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue placeholder="关联类型" />
          </SelectTrigger>
          <SelectContent>
            {RELATED_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={startDate}
            onChange={(
              e: React.ChangeEvent<HTMLInputElement>,
            ) => setStartDate(e.target.value)}
            className="h-8 w-32 text-xs"
          />
          <span className="text-xs text-muted-foreground">至</span>
          <Input
            type="date"
            value={endDate}
            onChange={(
              e: React.ChangeEvent<HTMLInputElement>,
            ) => setEndDate(e.target.value)}
            className="h-8 w-32 text-xs"
          />
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索文件名..."
            value={keyword}
            onChange={(
              e: React.ChangeEvent<HTMLInputElement>,
            ) => setKeyword(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        {selectedIds.size > 0 && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8"
            onClick={() => setBatchDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除 ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* 附件列表 */}
      <AttachmentTable
        items={items}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        loading={loading}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
        onPreview={handlePreview}
        onDelete={(id: string) => setDeleteId(id)}
        onPageChange={setPage}
      />

      {/* 单个删除确认 */}
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
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认 */}
      <AlertDialog
        open={batchDeleteOpen}
        onOpenChange={(open: boolean) => {
          if (!open) setBatchDeleteOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除选中的 {selectedIds.size}{' '}
              个附件吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 预览弹窗 */}
      <FilePreviewDialog
        attachment={previewItem}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
};

export default AttachmentManagePage;