import { useState, useMemo, useEffect, type FormEvent } from 'react';
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
import { getCustomerData } from '@/api/customer';
import type { Customer, RfmDistribution, RepurchaseTrend } from '@shared/api.interface';
import { CHART_COLORS } from '@/lib/chart-colors';
import {
  Users,
  UserPlus,
  UserCheck,
  Moon,
  Crown,
  ArrowUpDown,
  Coins,
  Search,
  Plus,
  Upload,
  Download,
} from 'lucide-react';
import DataImportDialog from '@/components/DataImportDialog';
import { exportToExcel } from '@/utils/export-excel';

type SortKey = 'totalSpent' | 'purchaseCount' | 'rfmScore' | 'firstPurchaseDate';
type SortOrder = 'desc' | 'asc';

const TAG_OPTIONS = ['新客', '老客', '沉睡客', '高价值客'] as const;

const tagColor: Record<string, string> = {
  高价值客: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  老客: 'bg-blue-100 text-blue-700 border-blue-200',
  新客: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  沉睡客: 'bg-gray-100 text-gray-600 border-gray-200',
};

const rfmPieColors: Record<string, string> = {
  高价值客: '#10b981',
  老客: '#3b82f6',
  新客: '#06b6d4',
  沉睡客: '#94a3b8',
};

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rfmDist, setRfmDist] = useState<RfmDistribution[]>([]);
  const [repurchaseTrendData, setRepurchaseTrendData] = useState<RepurchaseTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('totalSpent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [importOpen, setImportOpen] = useState(false);

  const loadData = () => {
    getCustomerData()
      .then((data) => {
        setCustomers(data.customers);
        setRfmDist(data.rfmDistribution);
        setRepurchaseTrendData(data.repurchaseTrend);
      })
      .catch(() => {
        toast.error('获取客户数据失败');
      });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCustomerData()
      .then((data) => {
        if (cancelled) return;
        setCustomers(data.customers);
        setRfmDist(data.rfmDistribution);
        setRepurchaseTrendData(data.repurchaseTrend);
      })
      .catch(() => {
        if (!cancelled) toast.error('获取客户数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // 新增客户对话框
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formId, setFormId] = useState('');
  const [formSpent, setFormSpent] = useState('');
  const [formCount, setFormCount] = useState('');
  const [formRfm, setFormRfm] = useState('');
  const [formTag, setFormTag] = useState<string>('新客');

  const stats = useMemo(() => {
    const newCustomer = customers.filter((c) => c.tag === '新客').length;
    const oldCustomer = customers.filter((c) => c.tag === '老客').length;
    const sleeping = customers.filter((c) => c.tag === '沉睡客').length;
    const highValue = customers.filter((c) => c.tag === '高价值客').length;
    const totalLtv =
      customers.length > 0
        ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length
        : 0;
    return { newCustomer, oldCustomer, sleeping, highValue, totalLtv };
  }, [customers]);

  const filteredSorted = useMemo(() => {
    let list = [...customers];
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter((c: Customer) => c.customerCode.toLowerCase().includes(kw));
    }
    if (tagFilter !== 'all') {
      list = list.filter((c) => c.tag === tagFilter);
    }
    list.sort((a, b) => {
      let diff: number;
      if (sortKey === 'firstPurchaseDate') {
        diff = new Date(a.firstPurchaseDate).getTime() - new Date(b.firstPurchaseDate).getTime();
      } else {
        diff = a[sortKey] - b[sortKey];
      }
      return sortOrder === 'desc' ? -diff : diff;
    });
    return list;
  }, [customers, keyword, tagFilter, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const handleExport = () => {
    if (customers.length === 0) {
      toast.error('暂无客户数据可导出');
      return;
    }
    exportToExcel<Record<string, unknown>>(
      customers as unknown as Record<string, unknown>[],
      [
        { header: '客户编码', key: 'customerCode' },
        { header: '首购日期', key: 'firstPurchaseDate' },
        { header: '累计消费', key: 'totalSpent' },
        { header: '购买次数', key: 'purchaseCount' },
        { header: '最后购买', key: 'lastPurchaseDate' },
        { header: 'RFM评分', key: 'rfmScore' },
        { header: '客户标签', key: 'tag' },
      ],
      '客户数据',
      '客户',
    );
  };

  const resetForm = () => {
    setFormId('');
    setFormSpent('');
    setFormCount('');
    setFormRfm('');
    setFormTag('新客');
  };

  const handleAddCustomer = (e: FormEvent) => {
    e.preventDefault();
    if (!formId.trim()) {
      toast.error('请输入客户 ID');
      return;
    }
    if (customers.some((c: Customer) => c.customerCode === formId.trim())) {
      toast.error('客户 ID 已存在');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const newCustomer: Customer = {
      id: crypto.randomUUID(),
      customerCode: formId.trim(),
      firstPurchaseDate: today,
      totalSpent: parseFloat(formSpent) || 0,
      purchaseCount: parseInt(formCount) || 1,
      lastPurchaseDate: today,
      rfmScore: Math.min(10, Math.max(1, parseInt(formRfm) || 5)),
      tag: formTag,
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    // Update rfmDist locally
    setRfmDist((prev) => {
      const existing = prev.find((d: RfmDistribution) => d.tag === newCustomer.tag);
      if (existing) {
        return prev.map((d: RfmDistribution) =>
          d.tag === newCustomer.tag ? { ...d, count: d.count + 1 } : d,
        );
      }
      return [...prev, { tag: newCustomer.tag, count: 1 }];
    });
    toast.success(`客户 ${newCustomer.customerCode} 添加成功`);
    resetForm();
    setDialogOpen(false);
  };

  const rfmPieOption: EChartsOption = useMemo(() => {
    const data = rfmDist.map((d: RfmDistribution) => ({
      name: d.tag,
      value: d.count,
    }));
    const colors = rfmDist.map((d: RfmDistribution) => rfmPieColors[d.tag] ?? '#94a3b8');
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number };
          return `${p.name}<br/>人数: ${p.value} 人<br/>占比: ${p.percent}%`;
        },
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        itemGap: 12,
        textStyle: { fontSize: 12, color: '#475569' },
      },
      color: colors,
      series: [
        {
          name: 'RFM分层',
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
          data,
        },
      ],
    };
  }, [rfmDist]);

  const repurchaseOption: EChartsOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const arr = params as { name: string; value: number }[];
          const p = arr[0];
          return `${p.name}<br/>复购率: ${p.value}%`;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: repurchaseTrendData.map((t: RepurchaseTrend) => t.month),
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisLabel: { color: '#64748B', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '复购率 (%)',
        nameTextStyle: { color: '#64748B', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748B', fontSize: 11, formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#F1F5F9' } },
      },
      series: [
        {
          type: 'line',
          data: repurchaseTrendData.map((t: RepurchaseTrend) => t.rate),
          smooth: true,
          lineStyle: { width: 2.5, color: CHART_COLORS.success },
          itemStyle: { color: CHART_COLORS.success },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.25)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
              ],
            },
          },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    };
  }, [repurchaseTrendData]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载客户数据中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">客户分析</h1>
        <p className="text-sm text-muted-foreground mt-1">
          RFM 模型深度分层，洞察客户价值与复购趋势
        </p>
      </div>

      {/* 客户分层卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">新客数</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.newCustomer}</p>
              </div>
              <div className="size-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                <UserPlus className="size-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">老客数</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.oldCustomer}</p>
              </div>
              <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <UserCheck className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">沉睡客数</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.sleeping}</p>
              </div>
              <div className="size-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Moon className="size-5 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">高价值客数</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.highValue}</p>
              </div>
              <div className="size-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Crown className="size-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm col-span-2 md:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均 LTV</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  ¥{Math.round(stats.totalLtv).toLocaleString()}
                </p>
              </div>
              <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Coins className="size-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">RFM 客户分层</CardTitle>
            <p className="text-xs text-muted-foreground">基于消费金额、频率、最近购买的分层模型</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ReactECharts
              option={rfmPieOption}
              style={{ height: '300px', width: '100%' }}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">复购率趋势</CardTitle>
            <p className="text-xs text-muted-foreground">近 6 个月复购率变化</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ReactECharts
              option={repurchaseOption}
              style={{ height: '300px', width: '100%' }}
            />
          </CardContent>
        </Card>
      </div>

      {/* 客户列表 */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">客户列表</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                共 {filteredSorted.length} 位客户
                {(keyword || tagFilter !== 'all') && ` (总计 ${customers.length} 位)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* 搜索框 */}
              <div className="relative w-full sm:w-52">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索客户 ID"
                  className="bg-background pl-9 h-9"
                />
              </div>
              {/* 标签筛选 */}
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-[130px] h-9 text-sm">
                  <SelectValue placeholder="全部标签" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部标签</SelectItem>
                  {TAG_OPTIONS.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* 新增客户按钮 */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9 shrink-0">
                    <Plus className="size-4 mr-1" />
                    新增
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>新增客户</DialogTitle>
                    <DialogDescription>添加新的客户记录到系统中</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddCustomer} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 col-span-2">
                        <Label htmlFor="customerId">客户 ID</Label>
                        <Input
                          id="customerId"
                          value={formId}
                          onChange={(e) => setFormId(e.target.value)}
                          placeholder="如 C021"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="totalSpent">累计消费（元）</Label>
                        <Input
                          id="totalSpent"
                          type="number"
                          min="0"
                          value={formSpent}
                          onChange={(e) => setFormSpent(e.target.value)}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="purchaseCount">购买次数</Label>
                        <Input
                          id="purchaseCount"
                          type="number"
                          min="1"
                          value={formCount}
                          onChange={(e) => setFormCount(e.target.value)}
                          placeholder="1"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="rfmScore">RFM 评分（1-10）</Label>
                        <Input
                          id="rfmScore"
                          type="number"
                          min="1"
                          max="10"
                          value={formRfm}
                          onChange={(e) => setFormRfm(e.target.value)}
                          placeholder="5"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tag">客户标签</Label>
                        <Select value={formTag} onValueChange={setFormTag}>
                          <SelectTrigger id="tag" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TAG_OPTIONS.map((tag) => (
                              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>
                        取消
                      </Button>
                      <Button type="submit">确认添加</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="outline" className="h-9 shrink-0" onClick={handleExport}>
                <Download className="size-4 mr-1.5" />
                导出Excel
              </Button>
              <Button size="sm" variant="outline" className="h-9 shrink-0" onClick={() => setImportOpen(true)}>
                <Upload className="size-4 mr-1.5" />
                导入Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap font-medium">客户 ID</TableHead>
                  <SortHeader label="首购日期" field="firstPurchaseDate" />
                  <SortHeader label="累计消费" field="totalSpent" />
                  <SortHeader label="购买次数" field="purchaseCount" />
                  <TableHead className="whitespace-nowrap text-right font-medium">最后购买</TableHead>
                  <SortHeader label="RFM 评分" field="rfmScore" />
                  <TableHead className="whitespace-nowrap text-right font-medium">标签</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      {keyword || tagFilter !== 'all' ? '没有找到匹配的客户' : '暂无客户数据'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSorted.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm">{c.customerCode}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{c.firstPurchaseDate}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        ¥{c.totalSpent.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.purchaseCount} 次</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                        {c.lastPurchaseDate}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-semibold tabular-nums">{c.rfmScore}</span>
                          <span className="text-muted-foreground text-xs">/10</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`text-xs ${tagColor[c.tag]}`}>
                          {c.tag}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DataImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entity="customers"
        entityLabel="客户数据"
        onSuccess={() => { loadData(); }}
      />
    </div>
  );
}
