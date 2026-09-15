import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  FileDown,
  Plus,
  ScanLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import HelpTip from '@client/src/components/HelpTip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { productApi } from '@client/src/api';
import { exportToExcel } from '@client/src/utils/export-excel';
import { type Product } from '@shared/product';
import { CostPriceDialog } from './CostPriceDialog';
import { ProductCreateDialog } from './ProductCreateDialog';
import { ProductEditDialog } from './ProductEditDialog';
import { ProductRecognizeDialog } from './ProductRecognizeDialog';
import type { RecognizedProductInfo } from './ProductImageUploader';
import {
  ProductsTable,
  type StockChangeActionType,
} from './ProductsTable';
import { StockChangeDialog } from './StockChangeDialog';
import { StocktakeDialog } from './StocktakeDialog';
import { extractErrorMessage } from './inventory-utils';
import { useAuth } from '@client/src/hooks/use-auth';

const SEARCH_DEBOUNCE_MS = 300;
type InventoryTab = 'all' | 'warning';

const InventoryPage: React.FC = () => {
  const { hasPerm } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<InventoryTab>('all');
  const [keyword, setKeyword] = useState<string>(
    () => searchParams.get('keyword') ?? '',
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [recognizeOpen, setRecognizeOpen] = useState<boolean>(false);
  const [createPrefill, setCreatePrefill] = useState<{
    info: RecognizedProductInfo | null;
    imageUrl?: string;
  } | null>(null);
  const [stockChangeState, setStockChangeState] = useState<{
    open: boolean;
    product: Product | null;
    type: StockChangeActionType;
  }>({ open: false, product: null, type: 'in' });
  const [costProduct, setCostProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [stocktakeProduct, setStocktakeProduct] = useState<Product | null>(
    null,
  );

  const loadProducts = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await productApi.fetchProducts({});
      setProducts(result.items ?? []);
    } catch (error: unknown) {
      setProducts([]);
      toast.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback((): void => {
    void loadProducts();
  }, [loadProducts]);

  // 搜索关键字防抖后再触发加载（关键字变化同时驱动客户端过滤）
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>(keyword);
  useEffect(() => {
    const timer = setTimeout((): void => setDebouncedKeyword(keyword), SEARCH_DEBOUNCE_MS);
    return (): void => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  // 搜索关键字同步到 URL，支持全局搜索跳转带入
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (keyword.trim()) {
      next.set('keyword', keyword.trim());
    } else {
      next.delete('keyword');
    }
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  /** 全部商品视图：按关键字（名称/编号/品牌）过滤 */
  const filteredProducts = useMemo((): Product[] => {
    const kw = debouncedKeyword.trim().toLowerCase();
    return products.filter((product: Product): boolean => {
      return (
        !kw ||
        product.productName.toLowerCase().includes(kw) ||
        product.productNo.toLowerCase().includes(kw) ||
        (product.brand ?? '').toLowerCase().includes(kw)
      );
    });
  }, [products, debouncedKeyword]);

  /** 库存预警视图：仅预警商品，按当前库存升序 */
  const warningProducts = useMemo(
    (): Product[] =>
      products
        .filter((product: Product): boolean => product.isWarning === true)
        .sort((a: Product, b: Product): number => a.stock - b.stock),
    [products],
  );

  const handleStockChange = useCallback(
    (product: Product, type: StockChangeActionType): void => {
      setStockChangeState({ open: true, product, type });
    },
    [],
  );

  const handleQuickStockChange = useCallback(
    (type: StockChangeActionType): void => {
      setStockChangeState({ open: true, product: null, type });
    },
    [],
  );

  const handleManualCreate = useCallback((): void => {
    setCreatePrefill(null);
    setCreateOpen(true);
  }, []);

  const handleRecognizeProceed = useCallback(
    (info: RecognizedProductInfo | null, imageUrl?: string): void => {
      setRecognizeOpen(false);
      setCreatePrefill({ info, imageUrl });
      setCreateOpen(true);
    },
    [],
  );

  const handleEditCost = useCallback((product: Product): void => {
    setCostProduct(product);
  }, []);

  const handleStocktake = useCallback((product: Product): void => {
    setStocktakeProduct(product);
  }, []);

  const handleFlow = useCallback(
    (product: Product): void => {
      navigate(`/stock-flows?productId=${product.id}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    async (product: Product): Promise<void> => {
      try {
        await productApi.deleteProduct(product.id);
        toast.success(`已删除商品「${product.productName}」`);
        refresh();
      } catch (error: unknown) {
        toast.error(extractErrorMessage(error));
      }
    },
    [refresh],
  );

  const handleExport = useCallback((): void => {
    if (filteredProducts.length === 0) {
      toast.error('当前没有可导出的商品数据');
      return;
    }
    const canViewCost: boolean = hasPerm('cost:view');
    const columns: Array<{
      header: string;
      value: (row: Product) => string | number;
      width: number;
    }> = [
      {
        header: 'SKU编码',
        value: (row: Product): string => row.productNo,
        width: 16,
      },
      {
        header: '商品名称',
        value: (row: Product): string => row.productName,
        width: 22,
      },
      {
        header: '品牌',
        value: (row: Product): string => row.brand ?? '',
        width: 12,
      },
      { header: '单价', value: (row: Product): number => row.price, width: 10 },
      ...(canViewCost
        ? [
            {
              header: '成本价',
              value: (row: Product): number => row.costPrice ?? 0,
              width: 10,
            },
          ]
        : []),
      {
        header: '当前库存',
        value: (row: Product): number => row.stock,
        width: 10,
      },
      {
        header: '预警阈值',
        value: (row: Product): number => row.warningThreshold,
        width: 10,
      },
      ...(canViewCost
        ? [
            {
              header: '库存金额',
              value: (row: Product): number => row.stockValue ?? 0,
              width: 12,
            },
          ]
        : []),
      {
        header: '库存状态',
        value: (row: Product): string =>
          row.isWarning === true ? '预警' : '正常',
        width: 10,
      },
    ];
    exportToExcel<Product>('库存商品清单', '库存', columns, filteredProducts);
  }, [filteredProducts, hasPerm]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">库存管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            商品库存、出入库登记与预警管理
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasPerm('stock:manage') ? (
            <Button
              variant="outline"
              onClick={() => handleQuickStockChange('in')}
            >
              <ArrowDownToLine className="size-4" />
              入库
            </Button>
          ) : null}
          {hasPerm('stock:manage') ? (
            <Button
              variant="outline"
              onClick={() => handleQuickStockChange('otherOut')}
            >
              <ArrowUpFromLine className="size-4" />
              出库
            </Button>
          ) : null}
          <HelpTip content="选择商品和出入库类型后填写数量，库存会立即更新并记录流水" />
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="size-4" />
            导出
          </Button>
          {hasPerm('product:manage') ? (
            <>
              <Button
                variant="outline"
                onClick={() => setRecognizeOpen(true)}
              >
                <ScanLine className="size-4" />
                图片识别新增
              </Button>
              <Button onClick={handleManualCreate}>
                <Plus className="size-4" />
                新增商品
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value: string) => setTab(value as InventoryTab)}
      >
        <TabsList>
          <TabsTrigger value="all">全部商品</TabsTrigger>
          <TabsTrigger value="warning">
            库存预警
            {warningProducts.length > 0 ? `（${warningProducts.length}）` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={keyword}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setKeyword(event.target.value)
              }
              placeholder="搜索商品名称 / SKU编码 / 品牌"
              className="w-[300px]"
            />
          </div>
          <ProductsTable
            items={filteredProducts}
            loading={loading}
            onStockChange={handleStockChange}
            onEditCost={handleEditCost}
            onFlow={handleFlow}
            onStocktake={handleStocktake}
            onEdit={setEditProduct}
            onDelete={(product: Product) => void handleDelete(product)}
          />
        </TabsContent>

        <TabsContent value="warning" className="mt-4">
          <ProductsTable
            items={warningProducts}
            loading={loading}
            onStockChange={handleStockChange}
            onEditCost={handleEditCost}
            onFlow={handleFlow}
            onStocktake={handleStocktake}
            onEdit={setEditProduct}
            onDelete={(product: Product) => void handleDelete(product)}
            emptyText="当前无预警商品，库存健康"
          />
        </TabsContent>
      </Tabs>

      <ProductRecognizeDialog
        open={recognizeOpen}
        onClose={() => setRecognizeOpen(false)}
        onProceed={handleRecognizeProceed}
      />
      <ProductCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={refresh}
        initialRecognized={createPrefill?.info ?? null}
        initialImageUrl={createPrefill?.imageUrl}
      />
      <StockChangeDialog
        open={stockChangeState.open}
        type={stockChangeState.type}
        product={stockChangeState.product}
        productOptions={products}
        onClose={() =>
          setStockChangeState((prev) => ({ ...prev, open: false }))
        }
        onSuccess={refresh}
      />
      <CostPriceDialog
        open={costProduct !== null}
        product={costProduct}
        onClose={() => setCostProduct(null)}
        onSuccess={refresh}
      />
      <ProductEditDialog
        open={editProduct !== null}
        product={editProduct}
        onClose={() => setEditProduct(null)}
        onSuccess={refresh}
      />
      <StocktakeDialog
        open={stocktakeProduct !== null}
        product={stocktakeProduct}
        onClose={() => setStocktakeProduct(null)}
        onSuccess={refresh}
      />
    </div>
  );
};

export default InventoryPage;
