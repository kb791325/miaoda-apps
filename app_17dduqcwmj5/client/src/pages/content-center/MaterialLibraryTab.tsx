import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@client/src/components/ui/badge';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Skeleton } from '@client/src/components/ui/skeleton';
import {
  ChevronDown,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CourseSyncBadge } from '../courses/CourseSyncBadge';
import { useBitableRetry } from '@client/src/hooks/use-bitable-retry';
import type { MaterialListItem, MaterialListResponse, MaterialOptionsResponse } from '@shared/content';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import {
  deleteMaterial,
  extractErrorMessage,
  fetchMaterialOptions,
  fetchMaterials,
} from './content.api';
import { MaterialFormDialog } from './MaterialFormDialog';

const ALL_VALUE = 'all';
const PAGE_SIZE = 12;

interface MaterialFilters {
  materialType: string;
  platform: string;
  tag: string;
}

export const MaterialLibraryTab = () => {
  const [options, setOptions] = useState<MaterialOptionsResponse | null>(null);
  const [filters, setFilters] = useState<MaterialFilters>({
    materialType: ALL_VALUE,
    platform: ALL_VALUE,
    tag: ALL_VALUE,
  });
  const [keywordDraft, setKeywordDraft] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [data, setData] = useState<MaterialListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MaterialListItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MaterialListItem | null>(
    null,
  );
  const [removing, setRemoving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      try {
        const result: MaterialOptionsResponse = await fetchMaterialOptions();
        if (!cancelled) setOptions(result);
      } catch (error) {
        toast.error(extractErrorMessage(error, '获取筛选项失败'));
      }
    };
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result: MaterialListResponse = await fetchMaterials({
        materialType:
          filters.materialType === ALL_VALUE ? undefined : filters.materialType,
        platform: filters.platform === ALL_VALUE ? undefined : filters.platform,
        tag: filters.tag === ALL_VALUE ? undefined : filters.tag,
        keyword: keyword || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setData(result);
    } catch (error) {
      toast.error(extractErrorMessage(error, '获取素材列表失败'));
    } finally {
      setLoading(false);
    }
  }, [filters, keyword, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const { syncingIds, retry } = useBitableRetry('material', loadList);

  const handleFilterChange = (key: keyof MaterialFilters, value: string) => {
    setFilters((prev: MaterialFilters) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearch = () => {
    setKeyword(keywordDraft.trim());
    setPage(1);
  };

  const handleAdd = (): void => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: MaterialListItem): void => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return;
    setRemoving(true);
    try {
      await deleteMaterial(pendingDelete.id);
      toast.success('素材已删除');
      setPendingDelete(null);
      await loadList();
    } catch (error) {
      toast.error(extractErrorMessage(error, '删除素材失败'));
    } finally {
      setRemoving(false);
    }
  };

  const total: number = data?.total ?? 0;
  const totalPages: number = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.materialType}
          onValueChange={(value: string) => handleFilterChange('materialType', value)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="素材类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部类型</SelectItem>
            {(options?.materialTypes ?? []).map((type: string) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.platform}
          onValueChange={(value: string) => handleFilterChange('platform', value)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="适用平台" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部平台</SelectItem>
            {(options?.platforms ?? []).map((platform: string) => (
              <SelectItem key={platform} value={platform}>
                {platform}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.tag}
          onValueChange={(value: string) => handleFilterChange('tag', value)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="标签" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部标签</SelectItem>
            {(options?.tags ?? []).map((tag: string) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={keywordDraft}
          onChange={(e) => setKeywordDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          onBlur={handleSearch}
          placeholder="搜索素材标题，回车查询"
          className="w-64"
        />
        <Button onClick={handleAdd} className="ml-auto" data-ai-section-type="button">
          <Plus className="size-4" />
          新增素材
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((n: number) => (
            <Skeleton key={n} className="h-28 w-full" />
          ))}
        </div>
      ) : (data?.items ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          暂无符合条件的素材
        </div>
      ) : (
        <div className="space-y-3" data-ai-section-type="card-list">
          {(data?.items ?? []).map((item: MaterialListItem) => {
            const expanded: boolean = expandedId === item.id;
            const isSyncing: boolean = syncingIds.includes(item.id);
            return (
              <div key={item.id} className="rounded-lg border bg-card shadow-sm">
                <div className="flex items-start gap-2 p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.title || '未命名素材'}</span>
                      {item.materialType && (
                        <Badge variant="secondary">{item.materialType}</Badge>
                      )}
                      {item.status && (
                        <Badge variant="outline">{item.status}</Badge>
                      )}
                      <CourseSyncBadge
                        syncStatus={item.syncStatus}
                        isSyncing={isSyncing}
                        onRetry={() => void retry(item.id)}
                      />
                    </div>
                    {!expanded && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.coreContent || '暂无核心内容'}
                      </p>
                    )}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(item.applicablePlatform ?? []).map((platform: string) => (
                          <Badge key={`p-${platform}`} variant="outline">
                            {platform}
                          </Badge>
                        ))}
                        {(item.tag ?? []).map((tag: string) => (
                          <Badge
                            key={`t-${tag}`}
                            variant="outline"
                            className="border-primary/30 text-primary"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        'mt-1 size-4 shrink-0 text-muted-foreground transition-transform',
                        expanded && 'rotate-180',
                      )}
                    />
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-primary"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setPendingDelete(item)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                {expanded && (
                  <div className="whitespace-pre-wrap border-t px-4 py-3 text-sm">
                    {item.coreContent || '暂无核心内容'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev: number) => prev - 1)}
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page} / {totalPages} 页，共 {total} 条
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((prev: number) => prev + 1)}
          >
            下一页
          </Button>
        </div>
      )}

      <MaterialFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        options={options}
        initial={editingItem}
        onSuccess={() => void loadList()}
      />
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(nextOpen: boolean) => {
          if (!nextOpen && !removing) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除素材</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除素材「{pendingDelete?.title ?? ''}」吗？删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>取消</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={removing}
            >
              {removing && <Loader2 className="size-4 animate-spin" />}
              确认删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
