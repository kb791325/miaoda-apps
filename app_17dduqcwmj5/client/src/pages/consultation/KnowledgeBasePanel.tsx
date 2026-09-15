import { useMemo, useState } from 'react';
import { formatDateTime } from '@client/src/utils/format';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { Spinner } from '@client/src/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import type {
  CreateFaqRequest,
  FaqListItem,
  UpdateFaqRequest,
} from '@shared/consultation';
import type { BitableSyncStatus } from '@shared/bitable-sync';
import {
  BITABLE_SYNC_STATUS_LABEL,
  getBitableSyncBadgeClass,
  normalizeSyncStatus,
} from '@client/src/lib/bitable-sync';
import FaqFormDialog from './FaqFormDialog';

export interface FaqFilters {
  category: string;
  status: string;
  keyword: string;
}

interface KnowledgeBasePanelProps {
  items: FaqListItem[];
  total: number;
  loading: boolean;
  filters: FaqFilters;
  page: number;
  pageSize: number;
  onFiltersChange: (filters: FaqFilters) => void;
  onPageChange: (page: number) => void;
  onCreate: (request: CreateFaqRequest) => Promise<void>;
  onUpdate: (id: string, request: UpdateFaqRequest) => Promise<void>;
  syncingIds: string[];
  onRetrySync: (id: string) => void;
}

const FAQ_DISABLED_STATUS = '停用';

const KnowledgeBasePanel = ({
  items,
  total,
  loading,
  filters,
  page,
  pageSize,
  onFiltersChange,
  onPageChange,
  onCreate,
  onUpdate,
  syncingIds,
  onRetrySync,
}: KnowledgeBasePanelProps) => {
  const [keywordInput, setKeywordInput] = useState<string>(filters.keyword);
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingFaq, setEditingFaq] = useState<FaqListItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [disablingFaq, setDisablingFaq] = useState<FaqListItem | null>(null);
  const [toggling, setToggling] = useState<boolean>(false);

  const categoryOptions: string[] = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item: FaqListItem) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [items]);

  const totalPages: number = Math.max(1, Math.ceil(total / pageSize));

  const commitKeyword = () => {
    onFiltersChange({ ...filters, keyword: keywordInput.trim() });
  };

  const openCreate = () => {
    setEditingFaq(null);
    setFormOpen(true);
  };

  const openEdit = (item: FaqListItem) => {
    setEditingFaq(item);
    setFormOpen(true);
  };

  const handleSubmit = async (values: CreateFaqRequest): Promise<void> => {
    if (editingFaq) {
      await onUpdate(editingFaq.id, values);
    } else {
      await onCreate(values);
    }
  };

  const handleToggleStatus = async (item: FaqListItem): Promise<void> => {
    const nextStatus: string =
      item.status === FAQ_DISABLED_STATUS ? '启用' : FAQ_DISABLED_STATUS;
    setToggling(true);
    try {
      await onUpdate(item.id, { status: nextStatus });
      toast.success(nextStatus === '启用' ? '已启用该问题' : '已停用该问题');
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : '操作失败，请稍后重试';
      toast.error(message);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.category || 'all'}
          onValueChange={(value: string) =>
            onFiltersChange({
              ...filters,
              category: value === 'all' ? '' : value,
            })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categoryOptions.map((category: string) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status || 'all'}
          onValueChange={(value: string) =>
            onFiltersChange({
              ...filters,
              status: value === 'all' ? '' : value,
            })
          }
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="启用">启用</SelectItem>
            <SelectItem value="停用">停用</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex w-[220px] gap-2">
          <Input
            value={keywordInput}
            placeholder="搜索问题或关键词"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setKeywordInput(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') commitKeyword();
            }}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={commitKeyword}
            data-ai-section-type="button"
          >
            <Search className="size-4" />
          </Button>
        </div>
        <Button className="ml-auto" onClick={openCreate}>
          <Plus className="size-4" />
          新增常见问题
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[36%]">问题</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">命中次数</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead>同步状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-32 text-center">
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    加载中
                  </span>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  暂无常见问题数据
                </TableCell>
              </TableRow>
            ) : (
              items.map((item: FaqListItem) => {
                const expanded: boolean = expandedId === item.id;
                const syncStatus: BitableSyncStatus = normalizeSyncStatus(
                  item.syncStatus,
                );
                const isSyncing: boolean = syncingIds.includes(item.id);
                return [
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : item.id)}
                  >
                    <TableCell>
                      <span className="flex items-start gap-1.5">
                        {expanded ? (
                          <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="break-words">{item.question}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.category || '-'}
                    </TableCell>
                    <TableCell>
                      {item.status === FAQ_DISABLED_STATUS ? (
                        <Badge variant="secondary">停用</Badge>
                      ) : (
                        <Badge className="bg-[hsl(140_60%_94%)] text-[hsl(140_60%_28%)]">
                          启用
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.hitCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(item.updateTime)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getBitableSyncBadgeClass(syncStatus)}`}
                        >
                          {BITABLE_SYNC_STATUS_LABEL[syncStatus]}
                        </span>
                        {syncStatus === 'failed' && (
                          <Button
                            data-ai-section-type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-2 text-xs text-primary"
                            disabled={isSyncing}
                            onClick={(
                              event: React.MouseEvent<HTMLButtonElement>,
                            ) => {
                              event.stopPropagation();
                              onRetrySync(item.id);
                            }}
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`}
                            />
                            {isSyncing ? '同步中' : '重试'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className="inline-flex gap-2"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                        >
                          编辑
                        </Button>
                        {item.status === FAQ_DISABLED_STATUS ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={toggling}
                            onClick={() => void handleToggleStatus(item)}
                          >
                            启用
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={toggling}
                            onClick={() => setDisablingFaq(item)}
                          >
                            停用
                          </Button>
                        )}
                      </span>
                    </TableCell>
                  </TableRow>,
                  expanded ? (
                    <TableRow key={`${item.id}-detail`} className="bg-muted/30">
                      <TableCell colSpan={7}>
                        <div className="space-y-2 py-2 text-sm">
                          <div>
                            <span className="mr-2 text-muted-foreground">
                              标准答案：
                            </span>
                            <span className="whitespace-pre-wrap break-words">
                              {item.answer || '-'}
                            </span>
                          </div>
                          {item.similarQuestion ? (
                            <div>
                              <span className="mr-2 text-muted-foreground">
                                相似问法：
                              </span>
                              {item.similarQuestion}
                            </div>
                          ) : null}
                          {item.keywords.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-muted-foreground">
                                关键词：
                              </span>
                              {item.keywords.map((keyword: string) => (
                                <Badge key={keyword} variant="outline">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null,
                ];
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>共 {total} 条</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            上一页
          </Button>
          <span>
            第 {page} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            下一页
          </Button>
        </div>
      </div>

      <FaqFormDialog
        open={formOpen}
        editing={editingFaq}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={disablingFaq !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDisablingFaq(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认停用该问题？</AlertDialogTitle>
            <AlertDialogDescription>
              停用后「{disablingFaq?.question ?? ''}
              」将不再参与智能问答匹配，可随时重新启用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const target: FaqListItem | null = disablingFaq;
                setDisablingFaq(null);
                if (target) void handleToggleStatus(target);
              }}
            >
              确认停用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default KnowledgeBasePanel;
