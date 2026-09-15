import { useState, useEffect, useMemo, useCallback, type FormEvent } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getProductList, createProduct, deleteProduct } from '@/api/product';
import DataImportDialog from '@/components/DataImportDialog';
import type { Product } from '@shared/api.interface';
import { toast } from 'sonner';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpDown,
  Percent,
  Search,
  Plus,
  X,
  Upload,
  Trash2,
  Download,
} from 'lucide-react';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { exportToExcel } from '@/utils/export-excel';

type SortKey = 'salesVolume' | 'salesAmount' | 'profit' | 'profitMargin' | 'conversionRate';
type SortOrder = 'desc' | 'asc';

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  爆款: 'default',
  潜力款: 'secondary',
  滞销款: 'outline',
};

const CATEGORIES = ['服装', '美妆', '食品', '家居'] as const;

export default function ProductAnalysisPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('salesAmount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProductList();
      setProducts(res.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 新增商品表单 state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<string>('服装');
  const [formPrice, setFormPrice] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formShipping, setFormShipping] = useState('');
  const [formStatus, setFormStatus] = useState<string>('潜力款');

  const stats = useMemo(() => {
    const total = products.length;
    const hot = products.filter((p) => p.status === '爆款').length;
    const slow = products.filter((p) => p.status === '滞销款').length;
    const avgMargin = total > 0
      ? products.reduce((sum, p) => sum + p.profitMargin, 0) / total
      : 0;
    return { total, hot, slow, avgMargin };
  }, [products]);

  const filteredSorted = useMemo(() => {
    let list = [...products];
    if (category !== 'all') {
      list = list.filter((p) => p.category === category);
    }
    if (status !== 'all') {
      list = list.filter((p) => p.status === status);
    }
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(kw));
    }
    list.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortOrder === 'desc' ? -diff : diff;
    });
    return list;
  }, [products, category, status, keyword, sortKey, sortOrder]);

  const slowProducts = useMemo(
    () => products.filter((p) => p.status === '滞销款'),
    [products]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormCategory('服装');
    setFormPrice('');
    setFormCost('');
    setFormShipping('');
    setFormStatus('潜力款');
  };

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    const price = parseFloat(formPrice) || 0;
    const cost = parseFloat(formCost) || 0;
    const shipping = parseFloat(formShipping) || 0;
    if (!formName.trim() || price <= 0 || cost <= 0) return;

    setSubmitting(true);
    try {
      const { item } = await createProduct({
        name: formName.trim(),
        category: formCategory,
        price,
        cost,
        shippingCost: shipping,
        status: formStatus,
      });
      setProducts((prev) => [item, ...prev]);
      toast.success('商品新增成功');
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error('新增商品失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveProduct = async (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    if (!await showConfirm(`确定要删除商品「${product.name}」吗？此操作不可撤销。`)) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success(`已删除商品「${product.name}」`);
    } catch {
      toast.error('删除商品失败，请重试');
    }
  };

  const handleExport = () => {
    if (products.length === 0) {
      toast.error('暂无商品数据可导出');
      return;
    }
    exportToExcel<Record<string, unknown>>(
      products as unknown as Record<string, unknown>[],
      [
        { header: '商品名称', key: 'name' },
        { header: '分类', key: 'category' },
        { header: '售价', key: 'price' },
        { header: '成本', key: 'cost' },
        { header: '运费', key: 'shippingCost' },
        { header: '销量', key: 'salesVolume' },
        { header: '销售额', key: 'salesAmount' },
        { header: '利润', key: 'profit' },
        { header: '利润率', key: 'profitMargin' },
        { header: '转化率', key: 'conversionRate' },
        { header: '状态', key: 'status' },
        { header: '零销天数', key: 'daysZeroSales' },
      ],
      '商品数据',
      '商品',
    );
  };

  const SortHeader = ({
    label,
    field,
    align = 'left',
  }: {
    label: string;
    field: SortKey;
    align?: 'left' | 'right';
  }) => (
    <TableHead className={`whitespace-nowrap ${align === 'right' ? 'text-right' : ''}`}>
      <button
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 font-medium hover:text-primary transition-colors"
      >
        {label}
        <ArrowUpDown
          className={`size-3.5 transition-colors ${
            sortKey === field ? 'text-primary' : 'text-muted-foreground'
          }`}
        />
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">商品分析</h1>
          <p className="text-sm text-muted-foreground mt-1">
            深度分析商品表现，识别爆款与滞销品，优化商品结构
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="h-9" onClick={handleExport}>
            <Download className="size-4 mr-1.5" />
            导出Excel
          </Button>
          <Button size="sm" variant="outline" className="h-9" onClick={() => setImportOpen(true)}>
            <Upload className="size-4 mr-1.5" />
            导入Excel
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-1.5 w-fit">
            <Plus className="size-4" />
            新增商品
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">加载商品数据中...</p>
          </div>
        </div>
      ) : (
      <>
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">商品总数</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.total}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-sky-50 flex items-center justify-center">
                <Package className="size-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">爆款数</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.hot}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="size-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">滞销数</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.slow}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-red-50 flex items-center justify-center">
                <TrendingDown className="size-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均利润率</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.avgMargin.toFixed(1)}%
                </p>
              </div>
              <div className="size-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                <Percent className="size-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 商品排行榜 */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">商品排行榜</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                单品利润 = 售价 - 成本 - 平台佣金(5%) - 运费 - 退款损耗
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* 搜索框 */}
              <div className="relative w-full sm:w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索商品名称"
                  className="bg-background pl-9 h-9"
                />
              </div>
              {/* 分类筛选 */}
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[120px] h-9 text-sm">
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* 状态筛选 */}
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[120px] h-9 text-sm">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="爆款">爆款</SelectItem>
                  <SelectItem value="潜力款">潜力款</SelectItem>
                  <SelectItem value="滞销款">滞销款</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* 筛选标签 */}
          {(keyword.trim() || category !== 'all' || status !== 'all') && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-xs text-muted-foreground">当前筛选：</span>
              {keyword.trim() && (
                <Badge variant="secondary" className="text-xs gap-1 h-6 px-2">
                  名称含 &ldquo;{keyword.trim()}&rdquo;
                  <button onClick={() => setKeyword('')} className="hover:text-foreground">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {category !== 'all' && (
                <Badge variant="secondary" className="text-xs gap-1 h-6 px-2">
                  {category}
                  <button onClick={() => setCategory('all')} className="hover:text-foreground">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {status !== 'all' && (
                <Badge variant="secondary" className="text-xs gap-1 h-6 px-2">
                  {status}
                  <button onClick={() => setStatus('all')} className="hover:text-foreground">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              <button
                onClick={() => { setKeyword(''); setCategory('all'); setStatus('all'); }}
                className="text-xs text-primary hover:underline ml-1"
              >
                清除全部
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap font-medium">
                    商品名称
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-medium">
                    分类
                  </TableHead>
                  <SortHeader label="销量" field="salesVolume" align="right" />
                  <SortHeader label="销售额" field="salesAmount" align="right" />
                  <TableHead className="whitespace-nowrap text-right font-medium">
                    成本
                  </TableHead>
                  <SortHeader label="利润" field="profit" align="right" />
                  <SortHeader label="利润率" field="profitMargin" align="right" />
                  <SortHeader label="转化率" field="conversionRate" align="right" />
                  <TableHead className="whitespace-nowrap text-center font-medium">
                    状态
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-center font-medium w-[80px]">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="size-8 opacity-40" />
                        <p className="text-sm">没有找到匹配的商品</p>
                        <p className="text-xs">尝试调整筛选条件或新增商品</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSorted.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <span className="block truncate max-w-[160px]">{p.name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {p.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.salesVolume.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ¥{p.salesAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        ¥{p.cost}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-emerald-600">
                        ¥{p.profit.toLocaleString()}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-medium ${
                          p.profitMargin >= 45
                            ? 'text-emerald-600'
                            : p.profitMargin >= 30
                              ? 'text-foreground'
                              : 'text-amber-600'
                        }`}
                      >
                        {p.profitMargin.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.conversionRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusVariant[p.status]} className="text-xs">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveProduct(p.id)}
                        >
                          <Trash2 className="size-3.5" />
                          删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* 结果计数 */}
          <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border/40">
            共 {filteredSorted.length} 条结果
            {(category !== 'all' || status !== 'all' || keyword.trim()) && (
              <span>（已筛选，总计 {products.length} 条）</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 滞销预警 */}
      <Card className="border-red-200 shadow-sm bg-red-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-500" />
            <CardTitle className="text-base font-semibold text-red-700">
              滞销预警
            </CardTitle>
            <Badge variant="destructive" className="text-xs ml-2">
              {slowProducts.length} 款
            </Badge>
          </div>
          <p className="text-xs text-red-600/80 mt-1">
            连续 7 天以上零销量商品，建议清仓或优化
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {slowProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">暂无滞销商品 🎉</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {slowProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-red-200 bg-white"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      零销量 {p.daysZeroSales} 天 · {p.category}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-medium text-red-600">
                      {p.salesVolume} 件
                    </p>
                    <p className="text-xs text-muted-foreground">累计销量</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      </>
      )}

      {/* 新增商品对话框 */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增商品</DialogTitle>
            <DialogDescription>
              填写商品基本信息，系统将自动计算利润率
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">商品名称 *</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="请输入商品名称"
                  className="h-9"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">分类 *</label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">状态</label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="爆款">爆款</SelectItem>
                      <SelectItem value="潜力款">潜力款</SelectItem>
                      <SelectItem value="滞销款">滞销款</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">售价（元）*</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">成本（元）*</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    placeholder="0.00"
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">运费（元）</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formShipping}
                    onChange={(e) => setFormShipping(e.target.value)}
                    placeholder="5.00"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* 利润预览 */}
            {formPrice && formCost && (
              <div className="p-3 rounded-lg bg-muted/60 border border-border/40">
                <p className="text-xs text-muted-foreground mb-1.5">利润预览</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">预估利润率</span>
                  <span className={`font-bold tabular-nums ${
                    (() => {
                      const p = parseFloat(formPrice) || 0;
                      const c = parseFloat(formCost) || 0;
                      const s = parseFloat(formShipping) || 0;
                      const profit = p - c - p * 0.05 - s - p * 0.03;
                      const margin = p > 0 ? (profit / p) * 100 : 0;
                      return margin >= 30 ? 'text-emerald-600' : margin >= 0 ? 'text-amber-600' : 'text-red-500';
                    })()
                  }`}>
                    {(() => {
                      const p = parseFloat(formPrice) || 0;
                      const c = parseFloat(formCost) || 0;
                      const s = parseFloat(formShipping) || 0;
                      const profit = p - c - p * 0.05 - s - p * 0.03;
                      const margin = p > 0 ? (profit / p) * 100 : 0;
                      return `${margin.toFixed(1)}%`;
                    })()}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDialogOpen(false); resetForm(); }}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting || !formName.trim() || !formPrice || !formCost}>
                {submitting ? '提交中...' : '确认新增'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DataImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entity="products"
        entityLabel="商品数据"
        onSuccess={fetchProducts}
      />
    </div>
  );
}
