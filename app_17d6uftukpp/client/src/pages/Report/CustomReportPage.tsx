import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Download, RefreshCw, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loadModuleRecords } from '@/lib/data-service';
import type { IBizRecord } from '@/data/mt-records';
import { MODULES } from '@/config/modules';
import {
  aggregate,
  asModuleKey,
  buildSources,
  createCustomTemplate,
  dimOptions,
  downloadCsv,
  fetchCustomTemplates,
  PRESET_TEMPLATES,
  type ChartType,
  type IMeasure,
  type SortMode,
} from '@/lib/report';
import { isMonthlyDim, monthlyField } from '@/lib/report';
import { val } from '@/lib/analytics';
import { BarChartCard, KpiStrip, LineChartCard, PieChartCard } from '@/components/analytics/Charts';
import { formatMoneyCompact } from '@/lib/format';

const SOURCES = buildSources();
const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'bar', label: '柱状图' },
  { value: 'hbar', label: '条形图' },
  { value: 'pie', label: '饼图' },
  { value: 'line', label: '折线/面积图' },
  { value: 'table', label: '数据表' },
  { value: 'kpi', label: '指标卡' },
];
const SORTS: { value: SortMode; label: string }[] = [
  { value: 'desc', label: '按指标降序' },
  { value: 'asc', label: '按指标升序' },
  { value: 'name', label: '按名称' },
];
const TOPNS: { value: string; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: '5', label: 'Top 5' },
  { value: '10', label: 'Top 10' },
  { value: '20', label: 'Top 20' },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** 自定义报表: 自选数据源 / 维度 / 指标 / 图表, 实时聚合 + 下钻 + 导出 + 保存模板 */
export default function CustomReportPage() {
  const [searchParams] = useSearchParams();
  const [sourceKey, setSourceKey] = useState('adCost');
  const source = useMemo(() => SOURCES.find((s) => s.key === sourceKey) ?? SOURCES[0], [sourceKey]);
  const dims = useMemo(() => dimOptions(source), [source]);

  const [dim, setDim] = useState('');
  const [measureLabel, setMeasureLabel] = useState('记录数');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [sort, setSort] = useState<SortMode>('desc');
  const [topNStr, setTopNStr] = useState<string>('all');

  // 通过 ?tpl= 套用模板: 先查系统预设, 再从多维表格「报表模板」表查自定义模板
  useEffect(() => {
    const tplId = searchParams.get('tpl');
    if (!tplId) return;
    const preset = PRESET_TEMPLATES.find((t) => t.id === tplId);
    const apply = (tpl: typeof preset) => {
      if (!tpl) return;
      setSourceKey(tpl.source);
      setDim(tpl.dim);
      setMeasureLabel(tpl.measure);
      setChartType(tpl.chartType);
      setSort(tpl.sort);
      setTopNStr(String(tpl.topN));
    };
    if (preset) {
      apply(preset);
    } else {
      void fetchCustomTemplates().then((list) => apply(list.find((t) => t.id === tplId) ?? null));
    }
  }, [searchParams]);

  const [rows, setRows] = useState<IBizRecord[] | null>(null);
  const [drill, setDrill] = useState<{ name: string } | null>(null);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState('自定义报表');
  const [tplScope, setTplScope] = useState<'个人' | '部门' | '全员'>('个人');

  // 切换数据源时, 维度/指标重置为该源首个可选项
  useEffect(() => {
    const d = dims[0];
    if (d) setDim((prev) => (dims.some((x) => x.value === prev) ? prev : d.value));
    setMeasureLabel((prev) => (source.measures.some((m) => m.label === prev) ? prev : source.measures[0]?.label ?? '记录数'));
  }, [sourceKey]);

  const load = () => {
    setRows(null);
    void loadModuleRecords(asModuleKey(source.key), true).then(setRows);
  };
  useEffect(load, [sourceKey]);

  const measure: IMeasure = useMemo(
    () => source.measures.find((m) => m.label === measureLabel) ?? { label: '记录数', count: true },
    [source, measureLabel],
  );
  const topN: number | 'all' = topNStr === 'all' ? 'all' : Number(topNStr);
  const agg = useMemo(() => {
    if (!rows || !dim) return { data: [], total: 0 };
    return aggregate(rows, source.key, dim, measure, sort, topN);
  }, [rows, source.key, dim, measure, sort, topN]);

  // 下钻明细
  const drillRows = useMemo(() => {
    if (!rows || !drill || !dim) return [];
    const monthly = isMonthlyDim(dim);
    const field = monthly ? monthlyField(dim) : dim;
    return rows.filter((r) => {
      const v = val(r, source.key, field);
      return monthly ? v.slice(0, 7) === drill.name : v === drill.name;
    });
  }, [rows, drill, dim, source.key]);
  const detailCols = useMemo(
    () => MODULES[source.key]?.fields.filter((f) => f.inList !== false).slice(0, 7) ?? [],
    [source.key],
  );

  const onExport = () => {
    downloadCsv(
      `报表_${source.label}_${measure.label}`,
      [dim || '维度', measure.label],
      agg.data.map((d) => [d.name, d.value]),
    );
    toast.success('已导出 CSV');
  };

  const [savingTpl, setSavingTpl] = useState(false);
  const onSaveTemplate = () => {
    if (!tplName.trim()) {
      toast.error('请填写模板名称');
      return;
    }
    setSavingTpl(true);
    void createCustomTemplate({
      name: tplName.trim(),
      category: tplCategory.trim() || '自定义报表',
      scope: tplScope,
      source: source.key,
      dim,
      measure: measure.label,
      chartType,
      topN,
      sort,
    })
      .then(() => {
        setTplOpen(false);
        setTplName('');
        toast.success('已保存到多维表格「报表模板」表, 可在「报表模板」页查看');
      })
      .catch(() => toast.error('模板保存失败, 请检查多维表格连接'))
      .finally(() => setSavingTpl(false));
  };

  const months = agg.data.map((d) => d.name);
  const isMoney = !measure.count;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">自定义报表</h2>
          <p className="mt-1 text-sm text-muted-foreground">自选数据源、维度、指标与图表, 实时聚合全部 68 张业务表</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="size-4" /> 刷新数据
          </Button>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="size-4" /> 导出 Excel(CSV)
          </Button>
          <Dialog open={tplOpen} onOpenChange={setTplOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Save className="size-4" /> 保存为模板
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>保存为报表模板</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Field label="模板名称">
                  <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="如: 季度端口消耗分析" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="分类">
                    <Input value={tplCategory} onChange={(e) => setTplCategory(e.target.value)} />
                  </Field>
                  <Field label="可见范围">
                    <NativeSelect className="w-full" value={tplScope} onChange={(e) => setTplScope(e.target.value as '个人' | '部门' | '全员')}>
                      <NativeSelectOption value="个人">个人</NativeSelectOption>
                      <NativeSelectOption value="部门">部门</NativeSelectOption>
                      <NativeSelectOption value="全员">全员</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                </div>
                <p className="text-xs text-muted-foreground">
                  将保存当前配置: {source.label} / {dim || '未选维度'} / {measure.label}
                </p>
              </div>
              <DialogFooter>
                <Button onClick={onSaveTemplate} disabled={savingTpl}>保存模板</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_1fr]">
        {/* 左侧配置面板 */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">报表配置</CardTitle>
            <CardDescription>修改后右侧实时刷新</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="数据源(业务表)">
              <NativeSelect className="w-full" value={sourceKey} onChange={(e) => setSourceKey(e.target.value)}>
                {SOURCES.map((s) => (
                  <NativeSelectOption key={s.key} value={s.key}>
                    {s.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field label="分组维度">
              <NativeSelect className="w-full" value={dim} onChange={(e) => setDim(e.target.value)}>
                {dims.length === 0 ? <NativeSelectOption value="">该表暂无可分组维度</NativeSelectOption> : null}
                {dims.map((d) => (
                  <NativeSelectOption key={d.value} value={d.value}>
                    {d.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field label="统计指标">
              <NativeSelect className="w-full" value={measureLabel} onChange={(e) => setMeasureLabel(e.target.value)}>
                {source.measures.map((m) => (
                  <NativeSelectOption key={m.label} value={m.label}>
                    {m.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field label="图表类型">
              <NativeSelect className="w-full" value={chartType} onChange={(e) => setChartType(e.target.value as ChartType)}>
                {CHART_TYPES.map((c) => (
                  <NativeSelectOption key={c.value} value={c.value}>
                    {c.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="排序">
                <NativeSelect className="w-full" value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
                  {SORTS.map((s) => (
                    <NativeSelectOption key={s.value} value={s.value}>
                      {s.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="TopN">
                <NativeSelect className="w-full" value={topNStr} onChange={(e) => setTopNStr(e.target.value)} disabled={isMonthlyDim(dim)}>
                  {TOPNS.map((t) => (
                    <NativeSelectOption key={t.value} value={t.value}>
                      {t.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* 右侧预览 */}
        <div className="space-y-4">
          {!rows ? (
            <div className="space-y-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-[340px]" />
            </div>
          ) : (
            <>
              <KpiStrip
                items={[
                  { label: '数据记录数', value: rows.length, icon: BarChart3 },
                  { label: '分组数量', value: agg.data.length, icon: Search },
                  { label: measure.label + '合计', value: isMoney ? formatMoneyCompact(agg.total) : agg.total, icon: BarChart3 },
                  { label: '组均' + measure.label, value: isMoney ? formatMoneyCompact(agg.data.length ? agg.total / agg.data.length : 0) : Math.round((agg.data.length ? agg.total / agg.data.length : 0) * 100) / 100 },
                ]}
              />

              {chartType === 'bar' && <BarChartCard title={`${dim} × ${measure.label}`} data={agg.data} valueLabel={measure.label} />}
              {chartType === 'hbar' && <BarChartCard title={`${dim} × ${measure.label}`} data={agg.data} horizontal valueLabel={measure.label} />}
              {chartType === 'pie' && <PieChartCard title={`${measure.label}结构占比`} data={agg.data} />}
              {chartType === 'line' && (
                <LineChartCard title={`${measure.label}趋势`} months={months} series={[{ name: measure.label, data: agg.data.map((d) => d.value) }]} money={isMoney} />
              )}
              {chartType === 'kpi' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{measure.label}总计</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold tabular-nums text-primary">{isMoney ? formatMoneyCompact(agg.total) : agg.total}</div>
                    <p className="mt-1 text-xs text-muted-foreground">共 {agg.data.length} 个分组 / {rows.length} 条记录</p>
                  </CardContent>
                </Card>
              )}

              {/* 聚合结果表(点击行下钻明细) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">聚合结果(点击任意行下钻查看明细)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{dim || '维度'}</TableHead>
                        <TableHead className="text-right">{measure.label}</TableHead>
                        <TableHead className="text-right">占比</TableHead>
                        <TableHead className="text-right">下钻</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agg.data.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                            暂无聚合数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        agg.data.map((d) => (
                          <TableRow key={d.name} className="cursor-pointer" onClick={() => setDrill({ name: d.name })}>
                            <TableCell className="font-medium">{d.name || '未填写'}</TableCell>
                            <TableCell className="text-right tabular-nums">{isMoney ? formatMoneyCompact(d.value) : d.value}</TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {agg.total ? ((d.value / agg.total) * 100).toFixed(1) : '0.0'}%
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">查看明细</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* 下钻明细弹窗 */}
      <Dialog open={Boolean(drill)} onOpenChange={(v) => !v && setDrill(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              明细下钻: {dim} = {drill?.name}（{drillRows.length} 条）
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {detailCols.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {drillRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={detailCols.length || 1} className="py-6 text-center text-sm text-muted-foreground">
                      无明细
                    </TableCell>
                  </TableRow>
                ) : (
                  drillRows.slice(0, 200).map((r) => (
                    <TableRow key={r.recordId}>
                      {detailCols.map((c) => (
                        <TableCell key={c.key} className="whitespace-nowrap">
                          {String(r.values[c.key] ?? '—')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {drillRows.length > 200 ? <p className="text-xs text-muted-foreground">仅展示前 200 条, 完整数据可在对应业务表查看</p> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
