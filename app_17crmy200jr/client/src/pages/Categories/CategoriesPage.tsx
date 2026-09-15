import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Search,
  Tags,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';

import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Badge } from '@client/src/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/src/components/ui/dialog';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@client/src/components/ui/tooltip';
import { Label } from '@client/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@client/src/components/ui/empty';
import * as categoriesApi from '@client/src/api/categories';
import type {
  CategoryL1Item,
  CategoryItem,
} from '@shared/api.interface';

// ============================================================
// Edit dialog types
// ============================================================

type L1EditState = {
  mode: 'create' | 'edit';
  id?: string;
  categoryL1: string;
};

type L2EditState = {
  mode: 'create' | 'edit';
  id?: string;
  categoryL1: string;
  categoryL2: string;
  sortOrder: number;
};

type DeleteState = {
  id: string;
  name: string;
  level: 1 | 2;
} | null;

// ============================================================
// Main component
// ============================================================

const CategoriesPage = () => {
  // ---- L1 list ----
  const [l1List, setL1List] = useState<CategoryL1Item[]>([]);
  const [l1Loading, setL1Loading] = useState<boolean>(true);
  const [selectedL1Id, setSelectedL1Id] = useState<string | null>(null);
  const [selectedL1Name, setSelectedL1Name] = useState<string>('');

  // ---- L2 table ----
  const [l2List, setL2List] = useState<CategoryItem[]>([]);
  const [l2Loading, setL2Loading] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // ---- Dialogs ----
  const [l1DialogOpen, setL1DialogOpen] = useState<boolean>(false);
  const [l1Edit, setL1Edit] = useState<L1EditState>({
    mode: 'create',
    categoryL1: '',
  });
  const [l1FormError, setL1FormError] = useState<string>('');

  const [l2DialogOpen, setL2DialogOpen] = useState<boolean>(false);
  const [l2Edit, setL2Edit] = useState<L2EditState>({
    mode: 'create',
    categoryL1: '',
    categoryL2: '',
    sortOrder: 1,
  });
  const [l2FormError, setL2FormError] = useState<string>('');

  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);

  // ==========================================================
  // Data loading
  // ==========================================================

  const loadL1List = async () => {
    try {
      setL1Loading(true);
      const data: CategoryL1Item[] = await categoriesApi.getCategoriesL1();
      setL1List(data);
    } catch (err) {
      logger.error('加载一级类目失败', err);
      toast.error('加载一级类目失败');
    } finally {
      setL1Loading(false);
    }
  };

  const loadL2List = async (l1Name: string) => {
    try {
      setL2Loading(true);
      const { items }: { items: CategoryItem[] } = await categoriesApi.getCategoriesL2({
        categoryL1: l1Name,
      });
      setL2List(items);
    } catch (err) {
      logger.error('加载二级类目失败', err);
      toast.error('加载二级类目失败');
    } finally {
      setL2Loading(false);
    }
  };

  useEffect(() => {
    loadL1List();
  }, []);

  // L1 列表加载完成后，若无选中项则默认选中第一个
  useEffect(() => {
    if (l1List.length === 0) return;
    if (!selectedL1Id) {
      const first: CategoryL1Item = l1List[0];
      setSelectedL1Id(first.id);
      setSelectedL1Name(first.categoryL1);
      return;
    }
    // 若已有选中项，按 ID 取出最新名称（一级类目改名后同步更新）
    const matched = l1List.find((item: CategoryL1Item) => item.id === selectedL1Id);
    if (matched && matched.categoryL1 !== selectedL1Name) {
      setSelectedL1Name(matched.categoryL1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l1List, selectedL1Id]);

  // Reload L2 whenever selected L1 changes
  useEffect(() => {
    if (selectedL1Name) {
      loadL2List(selectedL1Name);
    }
  }, [selectedL1Name]);

  // ==========================================================
  // Derived data
  // ==========================================================

  const filteredL2List = useMemo(() => {
    const keyword: string = searchKeyword.trim().toLowerCase();
    const filtered: CategoryItem[] = keyword
      ? l2List.filter((item: CategoryItem) =>
          item.categoryL2.toLowerCase().includes(keyword),
        )
      : l2List;
    return [...filtered].sort(
      (a: CategoryItem, b: CategoryItem) => a.sortOrder - b.sortOrder,
    );
  }, [l2List, searchKeyword]);

  // ==========================================================
  // L1 handlers
  // ==========================================================

  const handleSelectL1 = (item: CategoryL1Item) => {
    setSelectedL1Id(item.id);
    setSelectedL1Name(item.categoryL1);
  };

  const handleAddL1 = () => {
    setL1Edit({ mode: 'create', categoryL1: '' });
    setL1FormError('');
    setL1DialogOpen(true);
  };

  const handleEditL1 = (item: CategoryL1Item) => {
    setL1Edit({
      mode: 'edit',
      id: item.id,
      categoryL1: item.categoryL1,
    });
    setL1FormError('');
    setL1DialogOpen(true);
  };

  const handleSubmitL1 = async () => {
    const name: string = l1Edit.categoryL1.trim();
    if (!name) {
      setL1FormError('类目名称不能为空');
      return;
    }
    try {
      setSubmitting(true);
      if (l1Edit.mode === 'create') {
        await categoriesApi.createCategoryL1({ categoryL1: name });
        toast.success('新增一级类目成功');
      } else if (l1Edit.id) {
        await categoriesApi.updateCategory(l1Edit.id, { categoryL1: name });
        if (selectedL1Id === l1Edit.id) {
          setSelectedL1Name(name);
        }
        toast.success('编辑一级类目成功');
      }
      setL1DialogOpen(false);
      loadL1List();
    } catch (err) {
      logger.error('保存一级类目失败', err);
      toast.error('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================
  // L2 handlers
  // ==========================================================

  const handleAddL2 = () => {
    setL2Edit({
      mode: 'create',
      categoryL1: selectedL1Name,
      categoryL2: '',
      sortOrder: 1,
    });
    setL2FormError('');
    setL2DialogOpen(true);
  };

  const handleEditL2 = (item: CategoryItem) => {
    setL2Edit({
      mode: 'edit',
      id: item.id,
      categoryL1: item.categoryL1,
      categoryL2: item.categoryL2,
      sortOrder: item.sortOrder,
    });
    setL2FormError('');
    setL2DialogOpen(true);
  };

  const handleSubmitL2 = async () => {
    const name: string = l2Edit.categoryL2.trim();
    if (!name) {
      setL2FormError('类目名称不能为空');
      return;
    }
    if (!l2Edit.categoryL1) {
      setL2FormError('请选择所属一级类目');
      return;
    }
    try {
      setSubmitting(true);
      if (l2Edit.mode === 'create') {
        await categoriesApi.createCategoryL2({
          categoryL1: l2Edit.categoryL1,
          categoryL2: name,
          sortOrder: l2Edit.sortOrder,
        });
        toast.success('新增二级类目成功');
      } else if (l2Edit.id) {
        await categoriesApi.updateCategory(l2Edit.id, {
          categoryL1: l2Edit.categoryL1,
          categoryL2: name,
          sortOrder: l2Edit.sortOrder,
        });
        toast.success('编辑二级类目成功');
      }
      setL2DialogOpen(false);
      loadL1List();
      if (selectedL1Name) {
        loadL2List(selectedL1Name);
      }
    } catch (err) {
      logger.error('保存二级类目失败', err);
      toast.error('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================
  // Delete handlers
  // ==========================================================

  const handleConfirmDelete = async () => {
    if (!deleteState) return;
    try {
      setDeleting(true);
      await categoriesApi.deleteCategory(deleteState.id);
      toast.success('删除成功');

      if (deleteState.level === 1) {
        const remaining: CategoryL1Item[] = l1List.filter(
          (item: CategoryL1Item) => item.id !== deleteState.id,
        );
        setL1List(remaining);
        if (selectedL1Id === deleteState.id) {
          if (remaining.length > 0) {
            setSelectedL1Id(remaining[0].id);
            setSelectedL1Name(remaining[0].categoryL1);
          } else {
            setSelectedL1Id(null);
            setSelectedL1Name('');
            setL2List([]);
          }
        }
      } else {
        loadL2List(selectedL1Name);
        loadL1List();
      }
    } catch (err) {
      logger.error('删除类目失败', err);
      toast.error('删除失败，请重试');
    } finally {
      setDeleting(false);
      setDeleteState(null);
    }
  };

  // ==========================================================
  // Render
  // ==========================================================

  return (
    <>
      <h1 className="text-xl font-semibold mb-6">类目管理</h1>
      <div
        data-ai-section-type="card-menu"
        className="flex h-full border border-border rounded-sm bg-card overflow-hidden"
      >
      {/* ============== 左侧：一级类目列表 ============== */}
      <aside className="w-64 flex flex-col border-r border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            一级类目
          </h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleAddL1}
              >
                <Plus className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>新增一级类目</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {l1Loading ? (
            <div className="p-4 text-sm text-muted-foreground">
              加载中...
            </div>
          ) : l1List.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              暂无一级类目
            </div>
          ) : (
            <ul className="flex flex-col">
              {l1List.map((item: CategoryL1Item) => {
                const isActive: boolean = selectedL1Id === item.id;
                return (
                  <li key={item.id} className="relative">
                    <div
                      className={`
                        group flex items-center gap-2 px-4 py-2.5 cursor-pointer
                        transition-colors duration-150
                        ${isActive
                          ? 'bg-accent text-primary'
                          : 'hover:bg-accent text-foreground'}
                      `}
                      onClick={() => handleSelectL1(item)}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 bg-primary rounded-r-sm" />
                      )}
                      <Tags className="size-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-sm truncate">
                        {item.categoryL1}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] px-1.5 py-0"
                      >
                        {item.childCount}
                      </Badge>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditL1(item);
                              }}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>编辑</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteState({
                                  id: item.id,
                                  name: item.categoryL1,
                                  level: 1,
                                });
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>删除</TooltipContent>
                        </Tooltip>
                      </div>
                      <ChevronRight
                        className={`size-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ============== 右侧：二级类目表格 ============== */}
      <section className="flex-1 flex flex-col min-w-0">
         <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            二级类目
            {selectedL1Name && (
              <span className="ml-2 text-muted-foreground font-normal">
                / {selectedL1Name}
              </span>
            )}
            {selectedL1Id && !l2Loading && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                ({filteredL2List.length} 个)
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="搜索二级类目名称"
                className="pl-8 h-9"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={handleAddL2} disabled={!selectedL1Id}>
              <Plus className="size-4" />
              新增二级类目
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {!selectedL1Id ? (
            <div className="h-full flex items-center justify-center">
              <Empty className="w-full max-w-sm">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Tags className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>请选择左侧一级类目</EmptyTitle>
                  <EmptyDescription>
                    选择后将展示该类目下的所有二级类目
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : l2Loading ? (
            <div className="p-8 text-sm text-muted-foreground text-center">
              加载中...
            </div>
          ) : filteredL2List.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Empty className="w-full max-w-sm">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Search className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {searchKeyword ? '未找到匹配类目' : '暂无二级类目'}
                  </EmptyTitle>
                  <EmptyDescription>
                    {searchKeyword
                      ? '请尝试其他关键词'
                      : '点击右上角按钮添加第一个二级类目'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    二级类目名称
                  </TableHead>
                  <TableHead className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    关联一级类目
                  </TableHead>
                  <TableHead className="font-medium text-muted-foreground text-xs uppercase tracking-wider w-24">
                    排序号
                  </TableHead>
                  <TableHead className="font-medium text-muted-foreground text-xs uppercase tracking-wider text-right w-28">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredL2List.map((item: CategoryItem) => (
                  <TableRow key={item.id} className="hover:bg-accent">
                    <TableCell className="text-sm font-medium">
                      {item.categoryL2}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.categoryL1}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-right">
                      {item.sortOrder}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditL2(item)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>编辑</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() =>
                                setDeleteState({
                                  id: item.id,
                                  name: item.categoryL2,
                                  level: 2,
                                })
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>删除</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      {/* ============== 新增/编辑一级类目弹窗 ============== */}
      <Dialog open={l1DialogOpen} onOpenChange={setL1DialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {l1Edit.mode === 'create' ? '新增一级类目' : '编辑一级类目'}
            </DialogTitle>
            <DialogDescription>
              {l1Edit.mode === 'create'
                ? '填写一级类目名称，创建后可在其下添加二级类目。'
                : '修改一级类目名称，下属二级类目不受影响。'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="l1-name">类目名称</Label>
              <Input
                id="l1-name"
                value={l1Edit.categoryL1}
                onChange={(e) => {
                  setL1Edit({ ...l1Edit, categoryL1: e.target.value });
                  if (l1FormError) setL1FormError('');
                }}
                placeholder="请输入一级类目名称"
                autoFocus
              />
              {l1FormError && (
                <p className="text-xs text-destructive">{l1FormError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setL1DialogOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button onClick={handleSubmitL1} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============== 新增/编辑二级类目弹窗 ============== */}
      <Dialog open={l2DialogOpen} onOpenChange={setL2DialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {l2Edit.mode === 'create' ? '新增二级类目' : '编辑二级类目'}
            </DialogTitle>
            <DialogDescription>
              {l2Edit.mode === 'create'
                ? '选择所属一级类目并填写二级类目信息。'
                : '修改二级类目信息，排序号越小越靠前。'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="l2-l1">所属一级类目</Label>
              <Select
                value={l2Edit.categoryL1}
                onValueChange={(val: string) => {
                  setL2Edit({ ...l2Edit, categoryL1: val });
                  if (l2FormError) setL2FormError('');
                }}
              >
                <SelectTrigger id="l2-l1" className="w-full">
                  <SelectValue placeholder="请选择一级类目" />
                </SelectTrigger>
                <SelectContent>
                  {l1List.map((item: CategoryL1Item) => (
                    <SelectItem key={item.id} value={item.categoryL1}>
                      {item.categoryL1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="l2-name">二级类目名称</Label>
              <Input
                id="l2-name"
                value={l2Edit.categoryL2}
                onChange={(e) => {
                  setL2Edit({ ...l2Edit, categoryL2: e.target.value });
                  if (l2FormError) setL2FormError('');
                }}
                placeholder="请输入二级类目名称"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="l2-sort">排序号</Label>
              <Input
                id="l2-sort"
                type="number"
                value={l2Edit.sortOrder}
                onChange={(e) =>
                  setL2Edit({
                    ...l2Edit,
                    sortOrder: Number(e.target.value) || 0,
                  })
                }
                placeholder="数字越小越靠前"
                className="font-mono"
              />
            </div>
            {l2FormError && (
              <p className="text-xs text-destructive">{l2FormError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setL2DialogOpen(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button onClick={handleSubmitL2} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============== 删除确认弹窗 ============== */}
      <AlertDialog
        open={!!deleteState}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteState(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteState && deleteState.level === 1
                ? `确定要删除一级类目「${deleteState.name}」吗？其下所有二级类目也将被移除，此操作不可撤销。`
                : deleteState
                  ? `确定要删除二级类目「${deleteState.name}」吗？此操作不可撤销。`
                  : '此操作不可撤销。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  );
};

export default CategoriesPage;
