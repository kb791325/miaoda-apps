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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTrafficData } from '@/api/traffic';
import type { TrafficChannel, TrafficKeyword } from '@shared/api.interface';
import { CHART_COLORS, CHART_SERIES } from '@/lib/chart-colors';
import {
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Target,
  Calculator,
  Sparkles,
  ArrowUpDown,
  Search,
  Plus,
  Upload,
  Download,
} from 'lucide-react';
import DataImportDialog from '@/components/DataImportDialog';
import { exportToExcel } from '@/utils/export-excel';

type ChannelSortKey = 'cost' | 'clicks' | 'ctr' | 'conversionRate' | 'gmv' | 'roi';
type SortOrder = 'desc' | 'asc';
type KeywordTypeFilter = 'all' | 'keyword' | 'material';

export default function TrafficPage() {
  const [channelSortKey, setChannelSortKey] = useState<ChannelSortKey>('roi');
  const [channelSortOrder, setChannelSortOrder] = useState<SortOrder>('desc');

  // ROI 计算器 state
  const [calcCost, setCalcCost] = useState('10000');
  const [calcAov, setCalcAov] = useState('150');
  const [calcCvr, setCalcCvr] = useState('3.5');

  // 数据管理 state
  const [channels, setChannels] = useState<TrafficChannel[]>([]);
  const [keywords, setKeywords] = useState<TrafficKeyword[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrafficData()
      .then((data) => {
        setChannels(data.channels);
        setKeywords(data.keywords);
      })
      .catch(() => {
        toast.error('加载流量数据失败');
      })
      .finally(() => setLoading(false));
  }, []);

  // 搜索 & 筛选 state
  const [channelSearch, setChannelSearch] = useState('');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [keywordTypeFilter, setKeywordTypeFilter] = useState<KeywordTypeFilter>('all');

  // 对话框 state
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [keywordDialogOpen, setKeywordDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const reloadTrafficData = () => {
    getTrafficData()
      .then((data) => {
        setChannels(data.channels);
        setKeywords(data.keywords);
      })
      .catch(() => {
        toast.error('加载流量数据失败');
      });
  };

  // 新增渠道表单
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelCost, setNewChannelCost] = useState('');
  const [newChannelClicks, setNewChannelClicks] = useState('');
  const [newChannelCtr, setNewChannelCtr] = useState('');
  const [newChannelCvr, setNewChannelCvr] = useState('');
  const [newChannelGmv, setNewChannelGmv] = useState('');

  // 新增关键词/素材表单
  const [newKeywordContent, setNewKeywordContent] = useState('');
  const [newKeywordType, setNewKeywordType] = useState<'keyword' | 'material'>('keyword');
  const [newKeywordClicks, setNewKeywordClicks] = useState('');
  const [newKeywordCvr, setNewKeywordCvr] = useState('');
  const [newKeywordGmv, setNewKeywordGmv] = useState('');

  const calcResult = useMemo(() => {
    const cost = parseFloat(calcCost) || 0;
    const aov = parseFloat(calcAov) || 0;
    const cvr = (parseFloat(calcCvr) || 0) / 100;
    const breakEvenRoi = 2.5;
    const avgCpc = 2.5;
    const clicks = cost / avgCpc;
    const orders = clicks * cvr;
    const gmv = orders * aov;
    const roi = cost > 0 ? gmv / cost : 0;
    const profit = gmv * 0.4 - cost;
    const isProfitable = roi >= breakEvenRoi;
    return { breakEvenRoi, roi, profit, gmv, orders, clicks, isProfitable };
  }, [calcCost, calcAov, calcCvr]);

  const filteredSortedChannels = useMemo(() => {
    let list = [...channels];
    if (channelSearch.trim()) {
      const q = channelSearch.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const diff = a[channelSortKey] - b[channelSortKey];
      return channelSortOrder === 'desc' ? -diff : diff;
    });
    return list;
  }, [channels, channelSearch, channelSortKey, channelSortOrder]);

  const filteredKeywords = useMemo(() => {
    let list = [...keywords];
    if (keywordTypeFilter !== 'all') {
      list = list.filter((k) => k.type === keywordTypeFilter);
    }
    if (keywordSearch.trim()) {
      const q = keywordSearch.trim().toLowerCase();
      list = list.filter((k) => k.content.toLowerCase().includes(q));
    }
    return list;
  }, [keywords, keywordTypeFilter, keywordSearch]);

  const handleChannelSort = (key: ChannelSortKey) => {
    if (channelSortKey === key) {
      setChannelSortOrder(channelSortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setChannelSortKey(key);
      setChannelSortOrder('desc');
    }
  };

  const handleExport = () => {
    if (channels.length === 0) {
      toast.error('暂无渠道数据可导出');
      return;
    }
    exportToExcel<Record<string, unknown>>(
      channels as unknown as Record<string, unknown>[],
      [
        { header: '渠道名称', key: 'name' },
        { header: '花费', key: 'cost' },
        { header: '点击量', key: 'clicks' },
        { header: '点击率', key: 'ctr' },
        { header: '转化率', key: 'conversionRate' },
        { header: 'GMV', key: 'gmv' },
        { header: 'ROI', key: 'roi' },
      ],
      '流量投放',
      '渠道',
    );
  };

  const handleAddChannel = (e: FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) {
      toast.error('请输入渠道名称');
      return;
    }
    const cost = parseFloat(newChannelCost) || 0;
    const clicks = parseFloat(newChannelClicks) || 0;
    const ctr = parseFloat(newChannelCtr) || 0;
    const cvr = parseFloat(newChannelCvr) || 0;
    const gmv = parseFloat(newChannelGmv) || 0;
    const roi = cost > 0 ? gmv / cost : 0;

    const newChannel: TrafficChannel = {
      id: String(Date.now()),
      name: newChannelName.trim(),
      cost,
      clicks,
      ctr,
      conversionRate: cvr,
      gmv,
      roi: Math.round(roi * 100) / 100,
    };
    setChannels((prev) => [...prev, newChannel]);
    setChannelDialogOpen(false);
    setNewChannelName('');
    setNewChannelCost('');
    setNewChannelClicks('');
    setNewChannelCtr('');
    setNewChannelCvr('');
    setNewChannelGmv('');
    toast.success(`渠道「${newChannel.name}」已添加`);
  };

  const handleAddKeyword = (e: FormEvent) => {
    e.preventDefault();
    if (!newKeywordContent.trim()) {
      toast.error('请输入内容');
      return;
    }
    const clicks = parseFloat(newKeywordClicks) || 0;
    const cvr = parseFloat(newKeywordCvr) || 0;
    const gmv = parseFloat(newKeywordGmv) || 0;
    const roi = clicks > 0 ? gmv / (clicks * 2.5) : 0;

    const newKeyword: TrafficKeyword = {
      id: String(Date.now()),
      content: newKeywordContent.trim(),
      type: newKeywordType,
      clicks,
      conversionRate: cvr,
      gmv,
      roi: Math.round(roi * 10) / 10,
    };
    setKeywords((prev) => [...prev, newKeyword]);
    setKeywordDialogOpen(false);
    setNewKeywordContent('');
    setNewKeywordClicks('');
    setNewKeywordCvr('');
    setNewKeywordGmv('');
    toast.success(`${newKeywordType === 'material' ? '素材' : '关键词'}「${newKeyword.content}」已添加`);
  };

  const roiBarOption: EChartsOption = useMemo(() => {
    const paidChannels = channels.filter((c) => c.cost > 0);
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `${p.name}<br/>ROI: ${p.value}`;
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
        data: paidChannels.map((c) => c.name),
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisLabel: { color: '#64748B', fontSize: 12 },
      },
      yAxis: {
        type: 'value',
        name: 'ROI',
        nameTextStyle: { color: '#64748B', fontSize: 11 },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: '#F1F5F9' } },
      },
      series: [
        {
          type: 'bar',
          data: paidChannels.map((c, i) => ({
            value: c.roi,
            itemStyle: {
              color: CHART_SERIES[i % CHART_SERIES.length],
              borderRadius: [6, 6, 0, 0],
            },
          })),
          barWidth: '40%',
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => params.value.toFixed(2),
          },
        },
      ],
    };
  }, [channels]);

  const SortHeader = ({
    label,
    field,
    align = 'right',
  }: {
    label: string;
    field: ChannelSortKey;
    align?: 'left' | 'right';
  }) => (
    <TableHead className={`whitespace-nowrap ${align === 'right' ? 'text-right' : ''}`}>
      <button
        onClick={() => handleChannelSort(field)}
        className="inline-flex items-center gap-1 font-medium hover:text-primary transition-colors"
      >
        {label}
        <ArrowUpDown
          className={`size-3.5 ${
            channelSortKey === field ? 'text-primary' : 'text-muted-foreground'
          }`}
        />
      </button>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">加载流量数据中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">流量与投放</h1>
        <p className="text-sm text-muted-foreground mt-1">
          全渠道投放效果追踪，优化 ROI 与预算分配
        </p>
      </div>

      {/* 渠道效果 + ROI 柱图 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">
                  渠道效果对比
                </CardTitle>
                <p className="text-xs text-muted-foreground">各投放渠道核心指标</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-48">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    placeholder="搜索渠道..."
                    className="h-9 bg-background pl-9"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={() => setChannelDialogOpen(true)}
                >
                  <Plus className="size-4 mr-1" />
                  新增
                </Button>
                <Button size="sm" variant="outline" className="h-9" onClick={handleExport}>
                  <Download className="size-4 mr-1.5" />
                  导出Excel
                </Button>
                <Button size="sm" variant="outline" className="h-9" onClick={() => setImportOpen(true)}>
                  <Upload className="size-4 mr-1.5" />
                  导入Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap font-medium">
                      渠道名称
                    </TableHead>
                    <SortHeader label="花费" field="cost" />
                    <SortHeader label="点击量" field="clicks" />
                    <SortHeader label="点击率" field="ctr" />
                    <SortHeader label="转化率" field="conversionRate" />
                    <SortHeader label="GMV" field="gmv" />
                    <SortHeader label="ROI" field="roi" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSortedChannels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                        未找到匹配的渠道数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSortedChannels.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          ¥{c.cost.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.clicks.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.ctr.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.conversionRate.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          ¥{c.gmv.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-semibold tabular-nums ${
                              c.roi === 0
                                ? 'text-muted-foreground'
                                : c.roi >= 3
                                  ? 'text-emerald-600'
                                  : c.roi >= 2
                                    ? 'text-amber-600'
                                    : 'text-red-500'
                            }`}
                          >
                            {c.roi === 0 ? '-' : c.roi.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ROI 计算器 */}
        <Card className="border-border/60 shadow-sm bg-gradient-to-br from-sky-50/50 to-cyan-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calculator className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  ROI 计算器
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  快速估算投放收益
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  投放花费（元）
                </label>
                <Input
                  type="number"
                  value={calcCost}
                  onChange={(e) => setCalcCost(e.target.value)}
                  className="h-9 bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  客单价（元）
                </label>
                <Input
                  type="number"
                  value={calcAov}
                  onChange={(e) => setCalcAov(e.target.value)}
                  className="h-9 bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  转化率（%）
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={calcCvr}
                  onChange={(e) => setCalcCvr(e.target.value)}
                  className="h-9 bg-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border/60 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">盈亏平衡 ROI</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {calcResult.breakEvenRoi.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">预期 ROI</span>
                <span
                  className={`font-bold text-lg tabular-nums ${
                    calcResult.isProfitable ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {calcResult.roi.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">预期 GMV</span>
                <span className="font-semibold text-foreground tabular-nums">
                  ¥{Math.round(calcResult.gmv).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">预期利润</span>
                <span
                  className={`font-semibold tabular-nums ${
                    calcResult.profit >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {calcResult.profit >= 0 ? '+' : ''}¥
                  {Math.round(calcResult.profit).toLocaleString()}
                </span>
              </div>
              <Badge
                variant={calcResult.isProfitable ? 'default' : 'destructive'}
                className="w-full justify-center h-8 text-sm"
              >
                {calcResult.isProfitable ? '✓ 盈利区间' : '✗ 亏损风险'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROI 柱状图 + 关键词榜 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              各渠道 ROI 对比
            </CardTitle>
            <p className="text-xs text-muted-foreground">付费渠道 ROI 横向对比</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ReactECharts
              option={roiBarOption}
              style={{ height: '300px', width: '100%' }}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-amber-500 shrink-0" />
                <div>
                  <CardTitle className="text-base font-semibold">
                    高转化素材/关键词榜
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Top 转化效果的关键词与素材
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-9 shrink-0 self-start sm:self-auto"
                onClick={() => setKeywordDialogOpen(true)}
              >
                <Plus className="size-4 mr-1" />
                新增
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {/* 搜索 + 类型筛选 */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={keywordSearch}
                  onChange={(e) => setKeywordSearch(e.target.value)}
                  placeholder="搜索关键词/素材..."
                  className="h-9 bg-background pl-9"
                />
              </div>
              <Select
                value={keywordTypeFilter}
                onValueChange={(v) => setKeywordTypeFilter(v as KeywordTypeFilter)}
              >
                <SelectTrigger className="w-full sm:w-[120px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="keyword">关键词</SelectItem>
                  <SelectItem value="material">素材</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap font-medium">
                      类型
                    </TableHead>
                    <TableHead className="whitespace-nowrap font-medium">
                      内容
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right font-medium">
                      点击
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right font-medium">
                      转化率
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right font-medium">
                      ROI
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeywords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                        未找到匹配的数据
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredKeywords.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell>
                          <Badge
                            variant={k.type === 'material' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {k.type === 'material' ? '素材' : '关键词'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium min-w-[140px]">
                          <span className="truncate block max-w-[180px]">
                            {k.content}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {k.clicks.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600 font-medium">
                          {k.conversionRate.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-primary tabular-nums">
                            {k.roi.toFixed(1)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 新增渠道对话框 */}
      <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增投放渠道</DialogTitle>
            <DialogDescription>
              添加新的投放渠道数据，ROI 将自动计算
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddChannel} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">渠道名称</label>
                <Input
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="如：小红书种草"
                  className="h-9 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">花费（元）</label>
                <Input
                  type="number"
                  value={newChannelCost}
                  onChange={(e) => setNewChannelCost(e.target.value)}
                  placeholder="0"
                  className="h-9 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">点击量</label>
                <Input
                  type="number"
                  value={newChannelClicks}
                  onChange={(e) => setNewChannelClicks(e.target.value)}
                  placeholder="0"
                  className="h-9 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">点击率（%）</label>
                <Input
                  type="number"
                  step="0.1"
                  value={newChannelCtr}
                  onChange={(e) => setNewChannelCtr(e.target.value)}
                  placeholder="0.0"
                  className="h-9 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">转化率（%）</label>
                <Input
                  type="number"
                  step="0.1"
                  value={newChannelCvr}
                  onChange={(e) => setNewChannelCvr(e.target.value)}
                  placeholder="0.0"
                  className="h-9 bg-background"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">GMV（元）</label>
                <Input
                  type="number"
                  value={newChannelGmv}
                  onChange={(e) => setNewChannelGmv(e.target.value)}
                  placeholder="0"
                  className="h-9 bg-background"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setChannelDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit">确认添加</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 新增关键词/素材对话框 */}
      <Dialog open={keywordDialogOpen} onOpenChange={setKeywordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增关键词/素材</DialogTitle>
            <DialogDescription>
              添加新的高转化关键词或投放素材
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddKeyword} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">类型</label>
                <Select
                  value={newKeywordType}
                  onValueChange={(v) => setNewKeywordType(v as 'keyword' | 'material')}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">关键词</SelectItem>
                    <SelectItem value="material">素材</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">内容</label>
                <Input
                  value={newKeywordContent}
                  onChange={(e) => setNewKeywordContent(e.target.value)}
                  placeholder={newKeywordType === 'keyword' ? '如：夏季连衣裙新款' : '如：主图视频-场景C'}
                  className="h-9 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">点击量</label>
                <Input
                  type="number"
                  value={newKeywordClicks}
                  onChange={(e) => setNewKeywordClicks(e.target.value)}
                  placeholder="0"
                  className="h-9 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">转化率（%）</label>
                <Input
                  type="number"
                  step="0.1"
                  value={newKeywordCvr}
                  onChange={(e) => setNewKeywordCvr(e.target.value)}
                  placeholder="0.0"
                  className="h-9 bg-background"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">GMV（元）</label>
                <Input
                  type="number"
                  value={newKeywordGmv}
                  onChange={(e) => setNewKeywordGmv(e.target.value)}
                  placeholder="0"
                  className="h-9 bg-background"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setKeywordDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit">确认添加</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DataImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        entity="channels"
        entityLabel="渠道数据"
        onSuccess={() => { reloadTrafficData(); }}
      />
    </div>
  );
}
