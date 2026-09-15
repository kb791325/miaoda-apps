import { useState, useMemo, useEffect, useCallback, type FormEvent } from 'react';
import { CanRole } from '@lark-apaas/client-toolkit/auth';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { InventoryItem, Product } from '@shared/api.interface';
import { getInventoryList, changeInventory } from '@/api/inventory';
import { getProductList } from '@/api/product';
import DataImportDialog from '@/components/DataImportDialog';
import InventoryBatchDialog from './InventoryBatchDialog';
import { ROLE_PROCUREMENT, ROLE_SUPERVISOR } from '@shared/roles';
import { CHART_COLORS } from '@/lib/chart-colors';
import { exportToExcel } from '@/utils/export-excel';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Warehouse,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Package,
  ArrowUpDown,
  Search,
  Plus,
  X,
  CheckCircle,
  Filter,
  ArrowDown,
  Upload,
  Check,
  ChevronsUpDown,
  Download,
  ArrowRight,
} from 'lucide-react';

type SortKey = 'currentStock' | 'daysAvailable' | 'avgDailySales30d' | 'suggestedRestock';
type SortOrder = 'desc' | 'asc';
type WarningStatus = 'all' | 'warning' | 'slowMoving' | 'normal';

export default function InventoryPage() {
  const [sortKey, setSortKey] = useState<SortKey>('daysAvailable');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // 搜索 & 筛选
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('all');
  const [warningStatus, setWarningStatus] = useState<WarningStatus>('all');

  // 数据录入
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getInventoryList();
      setItems(res.items);
    } catch {
      toast.error('获取库存数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    getProductList().then((res) => setProducts(res.items)).catch(() => {});
  }, [fetchItems]);
  const [form, setForm] = useState({
    productId: '',
    quantity: '',
    direction: 'in' as 'in' | 'out',
  });

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === form.productId) ?? null,
    [products, form.productId],
  );

  const stats = useMemo(() => {
    const totalSku = items.length;
    const warningCount = items.filter(
      (i) => i.currentStock < i.safetyStock
    ).length;
    const slowMovingCount = items.filter((i) => i.isSlowMoving).length;
    const slowMovingRatio = totalSku > 0 ? (slowMovingCount / totalSku) * 100 : 0;
    const totalValue = items.reduce((s, i) => s + i.stockValue, 0);
    return { totalSku, warningCount, slowMovingRatio, totalValue };
  }, [items]);

  const warningItems = useMemo(
    () => items.filter((i) => i.currentStock < i.safetyStock),
    [items]
  );

  const filteredSorted = useMemo(() => {
    let list = [...items];

    // 搜索
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.productName.toLowerCase().includes(kw) ||
          i.productId.toLowerCase().includes(kw)
      );
    }

    // 分类筛选
    if (category !== 'all') {
      list = list.filter((i) => i.category === category);
    }

    // 预警状态筛选
    if (warningStatus === 'warning') {
      list = list.filter((i) => i.currentStock < i.safetyStock);
    } else if (warningStatus === 'slowMoving') {
      list = list.filter((i) => i.isSlowMoving);
    } else if (warningStatus === 'normal') {
      list = list.filter(
        (i) => i.currentStock >= i.safetyStock && !i.isSlowMoving
      );
    }

    list.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortOrder === 'desc' ? -diff : diff;
    });
    return list;
  }, [items, keyword, category, warningStatus, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const resetForm = () => {
    setForm({
      productId: '',
      quantity: '',
      direction: 'in',
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const quantity = Math.round(parseFloat(form.quantity) || 0);

    if (!form.productId) {
      toast.error('请选择商品');
      return;
    }
    if (!selectedProduct) {
      toast.error('商品信息异常，请重新选择');
      return;
    }
    if (quantity <= 0) {
      toast.error('库存数量必须大于 0');
      return;
    }

    if (form.direction === 'out') {
      const invItem = items.find(
        (i) => i.productName.toLowerCase() === selectedProduct.name.toLowerCase(),
      );
      const currentStock = invItem?.currentStock ?? 0;
      if (quantity > currentStock) {
        toast.error(`库存不足，请先补货后再出库（当前库存 ${currentStock}）`);
        return;
      }
    }

    try {
      const res = await changeInventory({
        productName: selectedProduct.name,
        category: selectedProduct.category,
        quantity,
        direction: form.direction,
      });
      toast.success(res.message);
      await fetchItems();
      resetForm();
      setDialogOpen(false);
      clearFilters();
      setSortKey('currentStock');
      setSortOrder('desc');
    } catch (err: unknown) {
      let msg = '操作失败';
      if (err && typeof err === 'object') {
        const axErr = err as {
          response?: { data?: { error?: { message?: string }; message?: string } };
          message?: string;
        };
        const serverMsg =
          axErr.response?.data?.error?.message ||
          axErr.response?.data?.message;
        if (serverMsg) {
          msg = serverMsg;
        } else if (typeof axErr.message === 'string' && axErr.message) {
          msg = axErr.message;
        }
      }
      toast.error(msg);
    }
  };

  const clearFilters = () => {
    setKeyword('');
    setCategory('all');
    setWarningStatus('all');
  };

  const hasFilters = keyword.trim() !== '' || category !== 'all' || warningStatus !== 'all';

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.productId)),
    [items, selectedIds],
  );

  const allVisibleSelected =
    filteredSorted.length > 0 && filteredSorted.every((i) => selectedIds.has(i.productId));
  const someVisibleSelected =
    filteredSorted.length > 0 &&
    !allVisibleSelected &&
    filteredSorted.some((i) => selectedIds.has(i.productId));

  const handleToggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const i of filteredSorted) {
        if (checked) next.add(i.productId);
        else next.delete(i.productId);
      }
      return next;
    });
  };

  const handleToggleItem = (productId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(productId);
      else next.delete(productId);
      return next;
    });
  };

  const handleExport = () => {
    if (items.length === 0) {
      toast.error('暂无库存数据可导出');
      return;
    }
    exportToExcel(
      items,
      [
        { header: '商品编号', key: 'productId' },
        { header: '商品名称', key: 'productName' },
        { header: '分类', key: 'category' },
        { header: '当前库存', key: 'currentStock' },
        { header: '安全库存', key: 'safetyStock' },
        { header: '近7天日均销量', key: 'avgDailySales7d' },
        { header: '近30天日均销量', key: 'avgDailySales30d' },
        { header: '可售天数', key: 'daysAvailable' },
        { header: '建议补货量', key: 'suggestedRestock' },
        { header: '是否滞销', key: 'isSlowMoving', accessor: (r) => (r.isSlowMoving ? '是' : '否') },
        { header: '库存金额', key: 'stockValue' },
      ],
      '库存数据',
      '库存',
    );
  };

  const slowPieOption: EChartsOption = useMemo(() => {
    const normalCount = items.filter((i) => !i.isSlowMoving).length;
    const slowCount = items.filter((i) => i.isSlowMoving).length;

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) =>
          `${params.name}<br/>数量: ${params.value} 款<br/>占比: ${params.percent}%`,
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        itemGap: 12,
        textStyle: { fontSize: 12, color: '#475569' },
      },
      color: [CHART_COLORS.primary, CHART_COLORS.muted],
      series: [
        {
          name: '库存结构',
          type: 'pie',
          radius: ['55%', '78%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: false },
            scale: true,
            scaleSize: 6,
          },
          labelLine: { show: false },
          data: [
            { name: '正常库存', value: normalCount },
            { name: '滞销库存', value: slowCount },
          ],
        },
      ],
    };
  }, [items]);

  const SortHeader = ({
    label,
    field,
    align = 'right',
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
          className={`size-3.5 ${
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
          <h1 className="text-2xl font-bold text-foreground">库存管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            实时监控库存水平，智能预警缺货与滞销
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="h-9" onClick={handleExport}>
            <Download className="size-4 mr-1.5" />
            导出Excel
          </Button>
          <CanRole roles={[ROLE_PROCUREMENT, ROLE_SUPERVISOR]}>
            <Button size="sm" variant="outline" className="h-9" onClick={() => setImportOpen(true)}>
              <Upload className="size-4 mr-1.5" />
              导入Excel
            </Button>
          </CanRole>
          <CanRole roles={[ROLE_PROCUREMENT, ROLE_SUPERVISOR]}>
            <Button onClick={() => setDialogOpen(true)} className="shrink-0">
              <Plus className="size-4 mr-1.5" />
              新增库存项
            </Button>
          </CanRole>
        </div>
      </div>

      {/* 库存概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SKU 总数</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.totalSku}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-sky-50 flex items-center justify-center">
                <Warehouse className="size-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">预警商品</p>
                <p className="text-2xl font-bold text-red-500 mt-1">
                  {stats.warningCount}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="size-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">滞销占比</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {stats.slowMovingRatio.toFixed(1)}%
                </p>
              </div>
              <div className="size-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <TrendingDown className="size-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">库存总金额</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  ¥{(stats.totalValue / 10000).toFixed(1)}万
                </p>
              </div>
              <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DollarSign className="size-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 库存预警 + 滞销占比饼图 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 库存预警列表 - 占2列 */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border-b border-amber-100">
            <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-4.5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm font-semibold text-amber-900">
                  库存预警
                </CardTitle>
                <Badge
                  variant="destructive"
                  className="text-[11px] h-5 px-1.5"
                >
                  {warningItems.length} 款
                </Badge>
              </div>
              <p className="text-xs text-amber-700/80 mt-0.5">
                库存低于安全库存线，建议尽快补货
              </p>
            </div>
          </div>
          <CardContent className="p-4">
            {warningItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="size-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <CheckCircle className="size-7 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-foreground">暂无预警商品</p>
                <p className="text-xs text-muted-foreground mt-1">
                  所有商品库存均在安全水位以上，运营状况良好
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {warningItems.map((item) => {
                  const urgent = item.daysAvailable <= 3;
                  const stockRatio = item.safetyStock > 0
                    ? Math.min(100, Math.round((item.currentStock / item.safetyStock) * 100))
                    : 0;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border bg-white p-4 ${
                        urgent
                          ? 'border-red-200 bg-red-50/30'
                          : 'border-amber-200 bg-amber-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                              urgent
                                ? 'bg-red-100 text-red-600'
                                : 'bg-amber-100 text-amber-600'
                            }`}
                          >
                            <Package className="size-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-foreground truncate">
                              {item.productName}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {item.category}
                              </span>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">
                                日均销 {item.avgDailySales7d} 件
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground tabular-nums">
                              {item.currentStock}
                              <span className="text-xs text-muted-foreground font-normal">
                                {' / '}
                                {item.safetyStock}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              当前 / 安全库存
                            </p>
                          </div>
                          <div className="text-right min-w-[72px]">
                            <p
                              className={`text-sm font-bold tabular-nums ${
                                urgent ? 'text-red-600' : 'text-amber-600'
                              }`}
                            >
                              仅剩 {item.daysAvailable} 天
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              可售天数
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              urgent ? 'bg-red-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${stockRatio}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 滞销库存占比饼图 */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              滞销库存占比
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              滞销 SKU 占总 SKU 比例
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <ReactECharts
              option={slowPieOption}
              style={{ height: '300px', width: '100%' }}
            />
          </CardContent>
        </Card>
      </div>

      {/* 库存周转表格 */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">库存周转</CardTitle>
              <p className="text-xs text-muted-foreground">
                全品类库存周转与补货建议 · 共 {filteredSorted.length} 条
              </p>
            </div>
          </div>

          {/* 搜索 + 筛选栏 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* 搜索框 */}
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索商品名称或编号"
                className="bg-background pl-9 h-9"
              />
              {keyword && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="!absolute right-1.5 top-1/2 z-20 h-6 w-6 -translate-y-1/2"
                  onClick={() => setKeyword('')}
                  aria-label="清除搜索"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* 分类筛选 */}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm">
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="服装">服装</SelectItem>
                <SelectItem value="美妆">美妆</SelectItem>
                <SelectItem value="食品">食品</SelectItem>
                <SelectItem value="家居">家居</SelectItem>
              </SelectContent>
            </Select>

            {/* 预警状态筛选 */}
            <Select value={warningStatus} onValueChange={(v) => setWarningStatus(v as WarningStatus)}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="warning">⚠ 库存预警</SelectItem>
                <SelectItem value="slowMoving">滞销品</SelectItem>
                <SelectItem value="normal">正常</SelectItem>
              </SelectContent>
            </Select>

            {/* 清除筛选 */}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground shrink-0"
                onClick={clearFilters}
              >
                <Filter className="size-3.5 mr-1" />
                清除筛选
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 pt-2">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allVisibleSelected}
                      ref={undefined}
                      aria-checked={someVisibleSelected ? 'mixed' : allVisibleSelected}
                      onCheckedChange={(v) => handleToggleAllVisible(!!v)}
                      aria-label="全选当前页"
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-medium">
                    商品名称
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-medium">
                    分类
                  </TableHead>
                  <SortHeader label="当前库存" field="currentStock" />
                  <SortHeader label="近30天销量" field="avgDailySales30d" />
                  <SortHeader label="可售天数" field="daysAvailable" />
                  <SortHeader label="建议补货量" field="suggestedRestock" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="size-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                          {hasFilters ? '未找到匹配的库存记录' : '暂无库存数据'}
                        </p>
                        {hasFilters && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs mt-1"
                            onClick={clearFilters}
                          >
                            清除筛选条件
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSorted.map((item) => {
                    const urgent = item.daysAvailable <= 3;
                    const warning =
                      item.daysAvailable > 3 && item.daysAvailable <= 7;
                    const checked = selectedIds.has(item.productId);
                    return (
                      <TableRow
                        key={item.id}
                        className={urgent ? 'bg-red-50/40' : checked ? 'bg-accent/30' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={checked}
                            ref={undefined}
                            onCheckedChange={(v) =>
                              handleToggleItem(item.productId, !!v)
                            }
                            aria-label={`选择 ${item.productName}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className="block truncate max-w-[180px]">
                            {item.productName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.currentStock.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Math.round(item.avgDailySales30d * 30).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-semibold tabular-nums ${
                              urgent
                                ? 'text-red-600'
                                : warning
                                  ? 'text-amber-600'
                                  : item.isSlowMoving
                                    ? 'text-muted-foreground'
                                    : 'text-emerald-600'
                            }`}
                          >
                            {item.daysAvailable} 天
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.suggestedRestock > 0 ? (
                            <span className="font-medium text-primary tabular-nums">
                              +{item.suggestedRestock}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              暂不补货
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 批量操作悬浮条 */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-full border border-border bg-background shadow-lg px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary" className="h-6 px-2 tabular-nums">
              已选 {selectedIds.size} 项
            </Badge>
          </div>
          <div className="h-4 w-px bg-border" />
          <CanRole roles={[ROLE_PROCUREMENT, ROLE_SUPERVISOR]}>
            <Button size="sm" className="h-8" onClick={() => setBatchOpen(true)}>
              批量调整
              <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </CanRole>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => setSelectedIds(new Set())}
          >
            清空
          </Button>
        </div>
      )}

      {/* 新增库存项对话框 */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { resetForm(); } setDialogOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>库存变动</DialogTitle>
            <DialogDescription>
              录入商品名称、分类，选择入库或出库操作
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                商品 <span className="text-red-500">*</span>
              </label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="h-9 w-full justify-between font-normal"
                  >
                    {selectedProduct
                      ? `${selectedProduct.name} (${selectedProduct.category})`
                      : '请选择商品'}
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                  <Command>
                    <CommandInput placeholder="搜索商品..." />
                    <CommandList>
                      <CommandEmpty>未找到商品</CommandEmpty>
                      <CommandGroup>
                        {products.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.name} ${p.category}`}
                            onSelect={() => {
                              setForm((prev) => ({ ...prev, productId: p.id }));
                              setComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 size-4 ${form.productId === p.id ? 'opacity-100' : 'opacity-0'}`}
                            />
                            {p.name}
                            <span className="ml-auto text-muted-foreground text-xs">
                              {p.category}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                操作类型 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, direction: 'in' }))}
                  className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors border ${
                    form.direction === 'in'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent'
                  }`}
                >
                  入库
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, direction: 'out' }))}
                  className={`flex-1 h-9 rounded-md text-sm font-medium transition-colors border ${
                    form.direction === 'out'
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent'
                  }`}
                >
                  出库
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {form.direction === 'in' ? '入库数量' : '出库数量'} <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                placeholder="请输入数量"
                className="h-9"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => { resetForm(); setDialogOpen(false); }}
              >
                取消
              </Button>
              <Button type="submit">
                {form.direction === 'in' ? (
                  <><Plus className="size-4 mr-1.5" />确认入库</>
                ) : (
                  <><ArrowDown className="size-4 mr-1.5" />确认出库</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DataImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entity="inventory"
        entityLabel="库存数据"
        onSuccess={fetchItems}
      />
      <InventoryBatchDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        selectedItems={selectedItems}
        onClearSelection={() => setSelectedIds(new Set())}
        onSuccess={fetchItems}
      />
    </div>
  );
}
