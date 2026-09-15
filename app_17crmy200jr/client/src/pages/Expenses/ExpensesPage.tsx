import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { Wallet, FileText } from 'lucide-react';
import { usePagination } from '@client/src/hooks/usePagination';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@client/src/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@client/src/components/ui/alert-dialog';
import type {
  ExpenseItem,
  ExpenseDetail,
  ExpenseListResponse,
  CategoryL1Item,
  CategoryItem,
} from '@shared/api.interface';
import * as expensesApi from '@client/src/api/expenses';
import * as categoriesApi from '@client/src/api/categories';
import ExpenseFormDialog from './ExpenseFormDialog';
import ExpenseDetailDrawer from './ExpenseDetailDrawer';
import ExpenseTable from './ExpenseTable';
import ExpenseBatchToolbar from './ExpenseBatchToolbar';
import ExpenseFilterBar from './ExpenseFilterBar';
import { formatAmount } from '@client/src/utils/format';

type TabValue = 'all' | 'mine';

const ExpensesPage = () => {
  const [tab, setTab] = useState<TabValue>('all');
  const [keyword, setKeyword] = useState('');
  const [filterL1, setFilterL1] = useState('');
  const [filterL2, setFilterL2] = useState('');
  const pagination = usePagination({ initialPage: 1, initialPageSize: 10 });
  const { page, pageSize, totalPages, setPage, setPageSize, resetPage, setTotal } = pagination;
  const [listData, setListData] = useState<ExpenseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoriesL1, setCategoriesL1] = useState<CategoryL1Item[]>([]);
  const [categoriesL2, setCategoriesL2] = useState<CategoryItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const searchParamsRef = useRef({
    keyword: '',
    filterL1: '',
    filterL2: '',
    tab: 'all' as TabValue,
    page: 1,
    pageSize: 10,
  });

  const fetchList = useCallback(() => {
    const requestId = ++requestIdRef.current;
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    const params = searchParamsRef.current;
    expensesApi
      .getExpenses({
        keyword: params.keyword || undefined,
        categoryL1: params.filterL1 || undefined,
        categoryL2: params.filterL2 || undefined,
        viewScope: params.tab !== 'all' ? params.tab : undefined,
        page: params.page,
        pageSize: params.pageSize,
      })
      .then((data) => {
        if (requestIdRef.current === requestId) {
          setListData(data);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (requestIdRef.current !== requestId) return;
        logger.error('加载支出列表失败', err);
        toast.error('加载失败');
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      });
  }, []);

  const debouncedSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      resetPage();
      fetchList();
    }, 300);
  }, [fetchList, resetPage]);

  useEffect(() => {
    categoriesApi.getCategoriesL1().then(setCategoriesL1).catch((err: unknown) => {
      logger.error('加载一级类目失败', err);
    });
  }, []);

  useEffect(() => {
    if (!filterL1) {
      setCategoriesL2([]);
      return;
    }
    categoriesApi
      .getCategoriesL2({ categoryL1: filterL1 })
      .then((res) => setCategoriesL2(res.items))
      .catch((err: unknown) => {
        logger.error('加载二级类目失败', err);
      });
  }, [filterL1]);

  useEffect(() => {
    searchParamsRef.current.keyword = keyword;
    debouncedSearch();
  }, [keyword, debouncedSearch]);

  useEffect(() => {
    searchParamsRef.current.filterL1 = filterL1;
    resetPage();
    fetchList();
  }, [filterL1, fetchList, resetPage]);

  useEffect(() => {
    searchParamsRef.current.filterL2 = filterL2;
    resetPage();
    fetchList();
  }, [filterL2, fetchList, resetPage]);

  useEffect(() => {
    searchParamsRef.current.tab = tab;
    resetPage();
    fetchList();
  }, [tab, fetchList, resetPage]);

  useEffect(() => {
    searchParamsRef.current.page = page;
    fetchList();
  }, [page, fetchList]);

  useEffect(() => {
    searchParamsRef.current.pageSize = pageSize;
    resetPage();
    fetchList();
  }, [pageSize, fetchList, resetPage]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const handleTabChange = (value: string) => {
    setTab(value as TabValue);
  };

  const handleSearch = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    resetPage();
    fetchList();
  };

  const handleRefresh = () => {
    fetchList();
  };

  const handleAdd = () => {
    setEditExpense(null);
    setFormOpen(true);
  };

  const handleEdit = async (item: ExpenseItem) => {
    try {
      const detail = await expensesApi.getExpense(item.id);
      setEditExpense(detail);
      setFormOpen(true);
    } catch (err) {
      logger.error('加载详情失败', err);
      toast.error('加载详情失败');
    }
  };

  const handleView = (item: ExpenseItem) => {
    setDetailId(item.id);
    setDetailOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await expensesApi.deleteExpense(deleteId);
      toast.success('删除成功');
      setDeleteId(null);
      fetchList();
    } catch (err) {
      logger.error('删除失败', err);
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  useEffect(() => {
    setTotal(listData?.total ?? 0);
  }, [listData?.total, setTotal]);

  const totalAmount = listData?.summary?.totalAmount ?? 0;
  const totalCount = listData?.total ?? 0;

  const statCards = [
    {
      label: '合计金额',
      value: `¥${formatAmount(totalAmount)}`,
      icon: Wallet,
      iconBg: 'bg-primary',
      iconFg: 'text-primary-foreground',
      valueColor: 'text-foreground',
    },
    {
      label: '记录总数',
      value: String(totalCount),
      icon: FileText,
      iconBg: 'bg-accent',
      iconFg: 'text-muted-foreground',
      valueColor: 'text-foreground',
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold mb-6">支出管理</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-2" data-ai-section-type="card-stat">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-center gap-4 rounded-lg bg-card p-5 shadow-sm"
            >
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${card.iconBg} ${card.iconFg}`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <div
                  className={`mt-1 font-mono text-2xl font-semibold ${card.valueColor}`}
                >
                  {loading ? '—' : card.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab 切换 */}
      <div className="rounded-lg bg-card p-5 shadow-sm">
         <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="inline-flex h-10 items-center gap-1 rounded-lg bg-muted p-1 border border-border/60 shadow-inner">
              <TabsTrigger
                value="all"
                className="relative inline-flex h-8 items-center justify-center rounded-md px-5 text-sm font-normal text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
               全部
             </TabsTrigger>
              <TabsTrigger
                value="mine"
                className="relative inline-flex h-8 items-center justify-center rounded-md px-5 text-sm font-normal text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
               我提交的
             </TabsTrigger>
           </TabsList>
         </Tabs>
       </div>

      {/* 筛选栏 */}
      <ExpenseFilterBar
        keyword={keyword}
        filterL1={filterL1}
        filterL2={filterL2}
        categoriesL1={categoriesL1}
        categoriesL2={categoriesL2}
        onKeywordChange={setKeyword}
        onFilterL1Change={setFilterL1}
        onFilterL2Change={setFilterL2}
         onSearch={handleSearch}
         onRefresh={handleRefresh}
        onAdd={handleAdd}
      />

      {/* 表格 */}
      <ExpenseBatchToolbar
        selectedIds={selectedIds}
        categoriesL1={categoriesL1}
        categoriesL2={categoriesL2}
        filterL1={filterL1}
        onRefresh={fetchList}
        onClearSelection={handleClearSelection}
      />
      <ExpenseTable
        items={listData?.items ?? []}
        loading={loading}
        total={listData?.total ?? 0}
        totalAmount={totalAmount}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={setDeleteId}
      />

      {/* 新增/编辑弹窗 */}
      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        expense={editExpense}
        onSaved={fetchList}
      />

      {/* 详情侧滑 */}
      <ExpenseDetailDrawer
        open={detailOpen}
        onOpenChange={setDetailOpen}
        expenseId={detailId}
        onChanged={fetchList}
      />

      {/* 删除确认 */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>删除后无法恢复，请确认操作。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground"
            >
              {deleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpensesPage;
