import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { products, categories as categoriesApi, sync as syncApi, inventory, records } from '@client/src/api';
import { calculateHealthScores } from '../AiTools/healthScoreEngine';
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/src/components/ui/card';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Upload,
  Download,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  ProductWithInventory,
  HealthScore,
  StockTransaction,
  CategoryTurnover,
  ProductListParams,
} from '@shared/api.interface';
import { ProductDetailDialog } from './ProductDetailDialog';
import { ProductEditDialog } from './ProductEditDialog';
import { ProductOfflineDialog } from './ProductOfflineDialog';
import { CategoryManagerDialog } from './CategoryManagerDialog';
import { BatchImportDialog } from './BatchImportDialog';
import { ProductsBulkBar } from './ProductsBulkBar';
import { ProductsTable } from './ProductsTable';
import UndoBanner from '@client/src/components/UndoBanner';
import { usePageShortcuts } from '@client/src/hooks/useAppShortcuts';
import { useProductDeleteUndo } from './useProductDeleteUndo';
import { getStatusTags } from './productStatusTags';
import {
  buildProductsCsv,
  downloadCsv,
  getExportFilename,
} from './productsExport';

const PAGE_SIZE = 20;

function getNextSkuCode(list: ProductWithInventory[]): string {
  const usedNums = new Set(
    list
      .map((p: ProductWithInventory) => {
        const match = p.code.match(/SKU(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n: number) => n > 0),
  );
  let nextNum = 1;
  while (usedNums.has(nextNum)) {
    nextNum += 1;
  }
  return `SKU${String(nextNum).padStart(3, '0')}`;
}

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: '缺货', label: '缺货' },
  { value: '积压', label: '积压' },
  { value: '滞销', label: '滞销' },
  { value: '关注', label: '需关注' },
  { value: '预警', label: '预警' },
  { value: '正常', label: '正常' },
];

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<ProductWithInventory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState<string>(
    searchParams.get('keyword') ?? '',
  );
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithInventory | null>(null);

  const [offlineOpen, setOfflineOpen] = useState(false);
  const [offlineProductId, setOfflineProductId] = useState<string | null>(null);
  const [offlineProductName, setOfflineProductName] = useState('');
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductWithInventory[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [categoryTurnover, setCategoryTurnover] = useState<CategoryTurnover[]>([]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncApi.pushSync('products');
      toast.success('商品数据已同步到飞书');
    } catch (err: unknown) {
      logger.error('同步到飞书失败:', String(err));
      toast.error('同步到飞书失败');
    } finally {
      setSyncing(false);
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: {
        page: number;
        pageSize: number;
        keyword?: string;
        category?: string;
        status?: string;
      } = {
        page,
        pageSize: PAGE_SIZE,
      };
      if (keyword.trim()) params.keyword = keyword.trim();
      if (categoryFilter && categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      const res = await products.getProducts(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      logger.error('获取商品列表失败:', String(err));
      toast.error('获取商品列表失败');
    } finally {
      setIsLoading(false);
    }
  }, [page, keyword, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const paramKeyword: string = searchParams.get('keyword') ?? '';
    if (paramKeyword) {
      setKeyword(paramKeyword);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadHealthBase = async () => {
      try {
        const [allRes, txRes, dashRes] = await Promise.all([
          products.getAllProducts(),
          records.exportTransactions(),
          inventory.getDashboardStats(),
        ]);
        const productList = Array.isArray(allRes) ? allRes : [];
        setAllProducts(productList);
        setTransactions(Array.isArray(txRes) ? txRes : []);
        setCategoryTurnover(
          Array.isArray((dashRes as { categoryTurnover?: CategoryTurnover[] }).categoryTurnover)
            ? (dashRes as { categoryTurnover: CategoryTurnover[] }).categoryTurnover
            : [],
        );
      } catch (err: unknown) {
        logger.error('获取健康评分基础数据失败:', String(err));
      }
    };
    loadHealthBase();
  }, []);

  const healthScoreMap = useMemo(() => {
    if (!allProducts.length) return new Map<string, HealthScore>();
    const scores = calculateHealthScores({
      products: allProducts,
      transactions,
      categoryTurnover,
    });
    const map = new Map<string, HealthScore>();
    for (const s of scores) {
      map.set(s.productId, s);
    }
    return map;
  }, [allProducts, transactions, categoryTurnover]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await categoriesApi.getCategories();
        setCategoryOptions(res.items.map((c) => c.name));
      } catch (err: unknown) {
        logger.error('获取品类列表失败:', String(err));
      }
    };
    loadCategories();
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { filteredItems, filteredTotal, filteredTotalPages } = useMemo(() => {
    if (!statusFilter || statusFilter === 'all') {
      return {
        filteredItems: items,
        filteredTotal: total,
        filteredTotalPages: totalPages,
      };
    }
    const passed = items.filter((item: ProductWithInventory) => {
      const tags = getStatusTags(
        item.id,
        item.totalQuantity,
        item.safetyStock,
        healthScoreMap,
      );
      return tags.some((t) => t.label === statusFilter);
    });
    return {
      filteredItems: passed,
      filteredTotal: passed.length,
      filteredTotalPages: 1,
    };
  }, [items, total, totalPages, statusFilter, healthScoreMap]);

  const handleViewDetail = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const handleEdit = (item: ProductWithInventory) => {
    setEditingProduct(item);
    setEditOpen(true);
  };

  const handleOffline = (item: ProductWithInventory) => {
    setOfflineProductId(item.id);
    setOfflineProductName(item.name);
    setOfflineOpen(true);
  };

  const handleToggleAll = (checked: boolean | 'indeterminate') => {
    const currentPageIds: string[] = filteredItems.map(
      (item: ProductWithInventory) => item.id,
    );
    if (checked === true) {
      setSelectedIds((prev: string[]) =>
        Array.from(new Set([...prev, ...currentPageIds])),
      );
    } else {
      setSelectedIds((prev: string[]) =>
        prev.filter((id: string) => !currentPageIds.includes(id)),
      );
    }
  };

  const handleToggleOne = (id: string, checked: boolean | 'indeterminate') => {
    setSelectedIds((prev: string[]) =>
      checked === true ? [...prev, id] : prev.filter((x: string) => x !== id),
    );
  };

  const handleBulkCompleted = () => {
    setSelectedIds([]);
    fetchData();
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const params: ProductListParams = {};
      if (keyword.trim()) params.keyword = keyword.trim();
      if (categoryFilter && categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      const data: ProductWithInventory[] =
        await products.getExportData(params);
      downloadCsv(buildProductsCsv(data), getExportFilename());
      toast.success('导出成功');
    } catch (err: unknown) {
      logger.error('导出商品数据失败:', String(err));
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const navigate = useNavigate();
  const { undoProduct, notifyDeleted, dismissUndo, handleUndo } =
    useProductDeleteUndo(fetchData);

  usePageShortcuts({
    onNew: () => navigate('/add-product'),
    onExport: () => {
      void handleExport();
    },
  });

  return (
    <div className="space-y-6">
      <UndoBanner
        visible={!!undoProduct}
        message={undoProduct ? `商品「${undoProduct.name}」已删除` : ''}
        onUndo={() => {
          void handleUndo();
        }}
        onDismiss={dismissUndo}
      />
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-5 w-1 rounded-sm bg-primary" />
            <h1 className="text-lg font-semibold tracking-tight">商品管理</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 ml-4">
            管理商品信息、库存与上下架状态
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingProduct(null);
            setEditOpen(true);
          }}
        >
          <Plus className="size-4" />
          新增商品
        </Button>
      </div>

      <Card className="rounded-sm shadow-none border border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Package className="size-4 text-primary" />
              商品列表
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-56">
                <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索商品名称/编码"
                  value={keyword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setKeyword(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={categoryFilter}
                  onValueChange={(val: string) => {
                    setCategoryFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[{ value: 'all', label: '全部品类' }, ...categoryOptions.map((c) => ({ value: c, label: c }))].map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(val: string) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setCategoryManagerOpen(true)}
                >
                  品类管理
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                导出
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setBatchImportOpen(true)}
              >
                <Upload className="size-4" />
                批量导入
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
              >
                <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
                同步到飞书
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.length > 0 && (
            <ProductsBulkBar
              selectedIds={selectedIds}
              categoryOptions={categoryOptions}
              onCompleted={handleBulkCompleted}
            />
          )}
          <ProductsTable
            items={filteredItems}
            total={filteredTotal}
            page={page}
            totalPages={filteredTotalPages}
            isLoading={isLoading}
            healthScoreMap={healthScoreMap}
            selectedIds={selectedIds}
            onToggleAll={handleToggleAll}
            onToggleOne={handleToggleOne}
            onViewDetail={handleViewDetail}
            onEdit={handleEdit}
            onOffline={handleOffline}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <ProductDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        productId={selectedId}
      />

      <ProductEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        product={editingProduct}
        onSaved={() => {
          fetchData();
        }}
        categoryOptions={categoryOptions}
        nextCode={getNextSkuCode(filteredItems)}
      />

      <ProductOfflineDialog
        open={offlineOpen}
        onOpenChange={setOfflineOpen}
        productName={offlineProductName}
        productId={offlineProductId}
        onConfirmed={() => {
          if (offlineProductId) {
            notifyDeleted({
              id: offlineProductId,
              name: offlineProductName,
            });
          }
          fetchData();
        }}
      />
      <CategoryManagerDialog
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        onChanged={() => {
          const loadCategories = async () => {
            try {
              const res = await categoriesApi.getCategories();
              setCategoryOptions(res.items.map((c) => c.name));
            } catch (err: unknown) {
              logger.error('获取品类列表失败:', String(err));
            }
          };
          loadCategories();
          fetchData();
        }}
      />
      <BatchImportDialog
        open={batchImportOpen}
        onOpenChange={setBatchImportOpen}
        onImported={() => {
          fetchData();
        }}
      />
    </div>
  );
}
