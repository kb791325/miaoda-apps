import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getAfterSaleData, createAfterSaleOrder, updateAfterSaleStatus } from '@/api/after-sale';
import { getProductList } from '@/api/product';
import type { AfterSaleOrder, Product, ReasonCategory, RefundRateTrend } from '@shared/api.interface';
import { ROLE_OPERATIONS, ROLE_SUPERVISOR } from '@shared/roles';
import { CHART_COLORS } from '@/lib/chart-colors';
import {
  Headphones,
  Clock,
  AlertTriangle,
  TrendingDown,
  XCircle,
  Search,
  Plus,
  ArrowUpDown,
  Upload,
  Play,
  CheckCircle,
  Download,
} from 'lucide-react';
import DataImportDialog from '@/components/DataImportDialog';
import { exportToExcel } from '@/utils/export-excel';

const statusVariant: Record<
  string,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  待处理: 'destructive',
  处理中: 'default',
  已完成: 'secondary',
  已拒绝: 'outline',
};

const REASON_OPTIONS: string[] = [
  '质量问题',
  '物流问题',
  '描述不符',
  '七天无理由',
  '其他',
];

const STATUS_OPTIONS: string[] = [
  '待处理',
  '处理中',
  '已完成',
  '已拒绝',
];

type SortKey = 'refundAmount' | 'processDuration' | 'id';
type SortOrder = 'desc' | 'asc';

export default function AfterSalePage() {
  const [orders, setOrders] = useState<AfterSaleOrder[]>([]);
  const [reasonCategories, setReasonCategories] = useState<ReasonCategory[]>([]);
  const [refundRateTrend, setRefundRateTrend] = useState<RefundRateTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 新增工单表单 state
  const [formProductName, setFormProductName] = useState('');
  const [formReason, setFormReason] = useState<string>('质量问题');
  const [formHandleType, setFormHandleType] = useState<'refund' | 'compensation'>('refund');
  const [formCompensationAmount, setFormCompensationAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [processingOrder, setProcessingOrder] = useState<AfterSaleOrder | null>(null);
  const [processAction, setProcessAction] = useState<'start' | 'complete' | 'reject'>('start');
  const [now, setNow] = useState(Date.now());
  const loadTimeRef = useRef<number>(Date.now());

  const loadData = async () => {
    try {
      const [afterSaleData, productData] = await Promise.all([
        getAfterSaleData(),
        getProductList(),
      ]);
      setOrders(afterSaleData.orders);
      setReasonCategories(afterSaleData.reasonCategories);
      setRefundRateTrend(afterSaleData.refundRateTrend);
      setProducts(productData.items);
    } catch {
      toast.error('加载数据失败');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [afterSaleData, productData] = await Promise.all([
          getAfterSaleData(),
          getProductList(),
        ]);
        if (!cancelled) {
          setOrders(afterSaleData.orders);
          setReasonCategories(afterSaleData.reasonCategories);
          setRefundRateTrend(afterSaleData.refundRateTrend);
          setProducts(productData.items);
        }
      } catch {
        if (!cancelled) {
          toast.error('加载数据失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          loadTimeRef.current = Date.now();
        }
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  const getLiveDuration = (order: AfterSaleOrder): number => {
    if (order.status !== '处理中') {
      return order.processDuration;
    }
    const hours = order.processDuration + (now - (loadTimeRef.current || now)) / 3600000;
    return Math.round(Math.max(0, hours) * 10) / 10;
  };

  const stats = useMemo(() => {
    const todayOrders = orders.length;
    const refundRate = 6.2;
    const avgDuration =
      orders.length > 0
        ? orders.reduce((s, o) => s + getLiveDuration(o), 0) / orders.length
        : 0;
    const overdueCount = orders.filter((o) => o.isOverdue).length;
    return { todayOrders, refundRate, avgDuration, overdueCount };
  }, [orders, now]);

  const filteredOrders = useMemo(() => {
    let list = orders.filter((o) => {
      const matchKeyword =
        keyword === '' ||
        o.orderNo.toLowerCase().includes(keyword.toLowerCase()) ||
        o.productName.toLowerCase().includes(keyword.toLowerCase());
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchReason = reasonFilter === 'all' || o.reason === reasonFilter;
      return matchKeyword && matchStatus && matchReason;
    });
    list = [...list].sort((a, b) => {
      let diff: number;
      if (sortKey === 'id') {
        diff = a.id.localeCompare(b.id);
      } else {
        diff = a[sortKey] - b[sortKey];
      }
      return sortOrder === 'desc' ? -diff : diff;
    });
    return list;
  }, [orders, keyword, statusFilter, reasonFilter, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const handleExport = () => {
    if (orders.length === 0) {
      toast.error('暂无售后数据可导出');
      return;
    }
    exportToExcel<Record<string, unknown>>(
      orders as unknown as Record<string, unknown>[],
      [
        { header: '工单编号', key: 'orderNo' },
        { header: '商品名称', key: 'productName' },
        { header: '售后原因', key: 'reason' },
        { header: '处理类型', key: 'handleType' },
        { header: '退款金额', key: 'refundAmount' },
        { header: '补偿金额', key: 'compensationAmount' },
        { header: '状态', key: 'status' },
        { header: '处理时长', key: 'processDuration' },
        { header: '是否超时', key: 'isOverdue', accessor: (r) => r.isOverdue ? '是' : '否' },
      ],
      '售后工单',
      '售后',
    );
  };

  const reasonBarOption: EChartsOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : params;
          const item = p as { name: string; value: number };
          return `${item.name}<br/>工单数量: ${item.value} 单`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: reasonCategories.map((r) => r.reason),
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisLabel: { color: '#64748B', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '工单数',
        nameTextStyle: { color: '#64748B', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: '#F1F5F9' } },
      },
      series: [
        {
          type: 'bar',
          data: reasonCategories.map((r, i) => ({
            value: r.count,
            itemStyle: {
              color: [
                CHART_COLORS.danger,
                CHART_COLORS.warning,
                CHART_COLORS.info,
                CHART_COLORS.muted,
                CHART_COLORS.secondary,
              ][i],
              borderRadius: [6, 6, 0, 0],
            },
          })),
          barWidth: '45%',
          label: {
            show: true,
            position: 'top',
            formatter: (params: unknown) => `${(params as { value: number }).value}单`,
          },
        },
      ],
    };
  }, [reasonCategories]);

  const refundTrendOption: EChartsOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const p = Array.isArray(params) ? params[0] : params;
          const item = p as { name: string; value: number };
          return `${item.name}<br/>退款率: ${item.value}%`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: refundRateTrend.map((t) => t.date),
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisLabel: { color: '#64748B', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '退款率 (%)',
        nameTextStyle: { color: '#64748B', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748B',
          fontSize: 11,
          formatter: '{value}%',
        },
        splitLine: { lineStyle: { color: '#F1F5F9' } },
      },
      series: [
        {
          type: 'line',
          data: refundRateTrend.map((t) => t.rate),
          smooth: true,
          lineStyle: { width: 2.5, color: CHART_COLORS.danger },
          itemStyle: { color: CHART_COLORS.danger },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(239, 68, 68, 0.2)' },
                { offset: 1, color: 'rgba(239, 68, 68, 0.02)' },
              ],
            },
          },
          symbol: 'circle',
          symbolSize: 6,
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: CHART_COLORS.danger, type: 'dashed' },
            data: [{ yAxis: 5, name: '警戒线' }],
            label: {
              formatter: '警戒线 5%',
              color: CHART_COLORS.danger,
              fontSize: 11,
            },
          },
        },
      ],
    };
  }, [refundRateTrend]);

  const highRefundProducts = useMemo(() => {
    const productMap = new Map<string, number>();
    for (const o of orders) {
      productMap.set(o.productName, (productMap.get(o.productName) ?? 0) + 1);
    }
    const totalOrders = orders.length || 1;
    return Array.from(productMap.entries())
      .map(([name, count]) => ({
        name,
        refundRate: Math.round((count / totalOrders) * 1000) / 10,
        refundCount: count,
      }))
      .sort((a, b) => b.refundCount - a.refundCount)
      .slice(0, 4);
  }, [orders]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.name === formProductName) ?? null,
    [products, formProductName],
  );

  const openProcessDialog = (order: AfterSaleOrder, action: 'start' | 'complete' | 'reject') => {
    setProcessingOrder(order);
    setProcessAction(action);
    setProcessDialogOpen(true);
  };

  const handleProcess = async () => {
    if (!processingOrder) return;
    try {
      const nextStatus =
        processAction === 'start' ? '处理中'
        : processAction === 'complete' ? '已完成'
        : '已拒绝';
      const updated = await updateAfterSaleStatus(processingOrder.id, nextStatus);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      toast.success(
        processAction === 'start' ? '已开始处理'
        : processAction === 'complete' ? '工单已完成'
        : '工单已拒绝',
      );
      setProcessDialogOpen(false);
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  const resetForm = () => {
    setFormProductName('');
    setFormReason('质量问题');
    setFormHandleType('refund');
    setFormCompensationAmount('');
  };

  const handleAddOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!formProductName.trim()) {
      toast.error('请选择商品');
      return;
    }
    if (formHandleType === 'refund' && !selectedProduct) {
      toast.error('请选择商品以获取退款金额');
      return;
    }
    if (formHandleType === 'compensation') {
      if (!formCompensationAmount.trim()) {
        toast.error('请输入补偿金额');
        return;
      }
      const compAmount = parseFloat(formCompensationAmount);
      if (isNaN(compAmount) || compAmount <= 0) {
        toast.error('补偿金额必须为正数');
        return;
      }
    }

    setSubmitting(true);
    try {
      const refundAmount = formHandleType === 'refund' ? selectedProduct!.price : 0;
      const compensationAmount = formHandleType === 'compensation' ? parseFloat(formCompensationAmount) : 0;

      const newOrder = await createAfterSaleOrder({
        productId: selectedProduct?.id ?? '',
        productName: formProductName.trim(),
        reason: formReason,
        handleType: formHandleType,
        refundAmount,
        compensationAmount,
      });

      setOrders((prev) => [newOrder, ...prev]);

      // Update reasonCategories locally
      setReasonCategories((prev) =>
        prev.map((rc) =>
          rc.reason === formReason
            ? { ...rc, count: rc.count + 1 }
            : rc,
        ),
      );

      toast.success('工单创建成功');
      resetForm();
      setDialogOpen(false);
    } catch {
      toast.error('创建工单失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) + (reasonFilter !== 'all' ? 1 : 0);

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">售后管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          监控售后质量，分析退款原因，保障用户体验
        </p>
      </div>

      {/* 售后概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日售后单</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.todayOrders}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-sky-50 flex items-center justify-center">
                <Headphones className="size-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">退款率</p>
                <p className="text-2xl font-bold text-red-500 mt-1">
                  {stats.refundRate.toFixed(1)}%
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
                <p className="text-sm text-muted-foreground">平均处理时长</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.avgDuration.toFixed(1)}h
                </p>
              </div>
              <div className="size-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                <Clock className="size-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">超时单数</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {stats.overdueCount}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="size-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              售后原因分类
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              各类售后原因工单数量对比
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <ReactECharts
              option={reasonBarOption}
              style={{ height: '300px', width: '100%' }}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              退款率趋势
            </CardTitle>
            <p className="text-xs text-muted-foreground">近 7 天退款率变化</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ReactECharts
              option={refundTrendOption}
              style={{ height: '300px', width: '100%' }}
            />
          </CardContent>
        </Card>
      </div>

      {/* 高退款商品预警 */}
      <Card className="border-amber-200 shadow-sm bg-amber-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <XCircle className="size-5 text-amber-500" />
            <CardTitle className="text-base font-semibold text-amber-700">
              高退款商品预警
            </CardTitle>
            <Badge variant="destructive" className="text-xs ml-2">
              {highRefundProducts.length} 款
            </Badge>
          </div>
          <p className="text-xs text-amber-600/80 mt-1">
            退款率高于 5% 的商品，请关注质量与描述一致性
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {highRefundProducts.map((p) => (
              <div
                key={p.name}
                className="p-4 rounded-lg border border-amber-200 bg-white"
              >
                <p className="font-medium text-sm text-foreground truncate">
                  {p.name}
                </p>
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <p className="text-xl font-bold text-red-500 tabular-nums">
                      {p.refundRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">退款率</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground tabular-nums">
                      {p.refundCount} 单
                    </p>
                    <p className="text-xs text-muted-foreground">退款订单</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 售后工单表格 */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base font-semibold shrink-0">售后工单</CardTitle>
            <span className="text-xs text-muted-foreground shrink-0">
              共 {filteredOrders.length} 条
              {activeFilterCount > 0 && (
                <span className="text-primary ml-1">（已筛选）</span>
              )}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索订单号或商品名称..."
                  className="h-9 bg-background pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9 text-sm">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger className="w-[130px] h-9 text-sm">
                  <SelectValue placeholder="全部原因" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部原因</SelectItem>
                  {REASON_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-xs text-muted-foreground shrink-0"
                  onClick={() => {
                    setStatusFilter('all');
                    setReasonFilter('all');
                    setKeyword('');
                  }}
                >
                  清除筛选
                </Button>
              )}
              <CanRole roles={[ROLE_OPERATIONS, ROLE_SUPERVISOR]}>
              <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9">
                    <Plus className="size-4 mr-1.5" />
                    新增工单
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle>新增售后工单</DialogTitle>
                    <DialogDescription>
                      填写售后工单信息，创建后将自动进入待处理队列
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddOrder} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>处理方式</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="handleType"
                            value="refund"
                            checked={formHandleType === 'refund'}
                            onChange={() => setFormHandleType('refund')}
                            className="accent-primary"
                          />
                          <span className="text-sm">退款（全款）</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="handleType"
                            value="compensation"
                            checked={formHandleType === 'compensation'}
                            onChange={() => setFormHandleType('compensation')}
                            className="accent-primary"
                          />
                          <span className="text-sm">补偿</span>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>商品名称</Label>
                      <Select value={formProductName} onValueChange={(v) => setFormProductName(v)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="请选择商品" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.name}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {formHandleType === 'refund' ? (
                      <div className="space-y-1.5">
                        <Label>退款金额（元）</Label>
                        <Input
                          value={selectedProduct ? `¥${selectedProduct.price.toLocaleString()}` : '请先选择商品'}
                          disabled
                          className="h-9 bg-accent/30"
                        />
                        {selectedProduct && (
                          <p className="text-xs text-muted-foreground">
                            全款退款，金额取自商品售价
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label htmlFor="compensationAmount">补偿金额（元）</Label>
                        <Input
                          id="compensationAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formCompensationAmount}
                          onChange={(e) => setFormCompensationAmount(e.target.value)}
                          placeholder="请输入补偿金额"
                          className="h-9"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>售后原因</Label>
                      <Select value={formReason} onValueChange={(v) => setFormReason(v)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REASON_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter className="pt-2">
                      <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>
                        取消
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? '创建中...' : '确认创建'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              </CanRole>
              <Button size="sm" variant="outline" className="h-9" onClick={handleExport}>
                <Download className="size-4 mr-1.5" />
                导出Excel
              </Button>
              <CanRole roles={[ROLE_OPERATIONS, ROLE_SUPERVISOR]}>
              <Button size="sm" variant="outline" className="h-9" onClick={() => setImportOpen(true)}>
                <Upload className="size-4 mr-1.5" />
                导入Excel
              </Button>
              </CanRole>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap font-medium">
                    <button
                      onClick={() => handleSort('id')}
                      className="inline-flex items-center gap-1 font-medium hover:text-primary transition-colors"
                    >
                      工单编号
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortKey === 'id' ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-medium">
                    订单号
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-medium">
                    商品
                  </TableHead>
                  <TableHead className="whitespace-nowrap font-medium">
                    售后原因
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right font-medium">
                    处理类型
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right font-medium">
                    <button
                      onClick={() => handleSort('refundAmount')}
                      className="inline-flex items-center gap-1 font-medium hover:text-primary transition-colors ml-auto"
                    >
                      金额
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortKey === 'refundAmount'
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right font-medium">
                    状态
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right font-medium">
                    <button
                      onClick={() => handleSort('processDuration')}
                      className="inline-flex items-center gap-1 font-medium hover:text-primary transition-colors ml-auto"
                    >
                      处理时长
                      <ArrowUpDown
                        className={`size-3.5 ${
                          sortKey === 'processDuration'
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  </TableHead>
                   <TableHead className="whitespace-nowrap text-right font-medium">
                     是否超时
                   </TableHead>
                   <CanRole roles={[ROLE_OPERATIONS, ROLE_SUPERVISOR]}>
                     <TableHead className="whitespace-nowrap text-right font-medium">
                       操作
                     </TableHead>
                   </CanRole>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={10} className="h-32 text-center">
                       <div className="flex flex-col items-center gap-2">
                         <Search className="size-8 text-muted-foreground/40" />
                         <p className="text-sm text-muted-foreground">
                           没有匹配的工单记录
                         </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            setKeyword('');
                            setStatusFilter('all');
                            setReasonFilter('all');
                          }}
                        >
                          清除筛选条件
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((o) => (
                    <TableRow
                      key={o.id}
                      className={o.isOverdue ? 'bg-red-50/50' : ''}
                    >
                      <TableCell className="font-mono text-sm">
                        AS{o.id.padStart(4, '0')}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {o.orderNo}
                      </TableCell>
                      <TableCell className="font-medium min-w-[120px]">
                        <span className="block truncate max-w-[150px]">
                          {o.productName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {o.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={o.handleType === 'refund' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {o.handleType === 'refund' ? '退款' : '补偿'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {o.handleType === 'compensation'
                          ? `¥${o.compensationAmount.toLocaleString()}`
                          : `¥${o.refundAmount.toLocaleString()}`}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={statusVariant[o.status]} className="text-xs">
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {getLiveDuration(o).toFixed(1)}h
                      </TableCell>
                       <TableCell className="text-right">
                         {o.isOverdue ? (
                           <Badge variant="destructive" className="text-xs">
                             已超时
                           </Badge>
                         ) : (
                           <span className="text-muted-foreground text-xs">正常</span>
                         )}
                       </TableCell>
                       <CanRole roles={[ROLE_OPERATIONS, ROLE_SUPERVISOR]}>
                         <TableCell className="text-right">
                           <div className="inline-flex items-center gap-1">
                             {o.status === '待处理' && (
                               <Button
                                 size="sm"
                                 variant="outline"
                                 className="h-7 px-2 text-xs"
                                 onClick={() => openProcessDialog(o, 'start')}
                               >
                                 <Play className="size-3 mr-1" />
                                 处理
                               </Button>
                             )}
                             {o.status === '处理中' && (
                               <>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   className="h-7 px-2 text-xs text-emerald-600 border-emerald-200"
                                   onClick={() => openProcessDialog(o, 'complete')}
                                 >
                                   <CheckCircle className="size-3 mr-1" />
                                   完成
                                 </Button>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   className="h-7 px-2 text-xs text-red-600 border-red-200"
                                   onClick={() => openProcessDialog(o, 'reject')}
                                 >
                                   <XCircle className="size-3 mr-1" />
                                   拒绝
                                 </Button>
                               </>
                             )}
                           </div>
                         </TableCell>
                       </CanRole>
                     </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={processDialogOpen}
        onOpenChange={(open) => {
          if (!open) setProcessingOrder(null);
          setProcessDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {processAction === 'start' && '开始处理工单'}
              {processAction === 'complete' && '完成工单'}
              {processAction === 'reject' && '拒绝工单'}
            </DialogTitle>
            <DialogDescription>
              {processAction === 'start' && '确认开始处理此售后工单？处理后将开始计时。'}
              {processAction === 'complete' && '确认已完成此工单的处理？'}
              {processAction === 'reject' && '确认拒绝此售后工单？拒绝后不再计入处理时长。'}
            </DialogDescription>
          </DialogHeader>
          {processingOrder && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">工单号</span>
                <span className="font-mono">AS{processingOrder.id.padStart(4, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">商品</span>
                <span className="font-medium">{processingOrder.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">当前处理时长</span>
                <span className="font-medium">
                  {getLiveDuration(processingOrder).toFixed(1)}h
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProcessDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              variant={processAction === 'reject' ? 'destructive' : 'default'}
              onClick={handleProcess}
            >
              {processAction === 'start' && '开始处理'}
              {processAction === 'complete' && '确认完成'}
              {processAction === 'reject' && '确认拒绝'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DataImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entity="after-sale"
        entityLabel="售后工单"
        onSuccess={() => { loadData(); }}
      />
    </div>
  );
}
