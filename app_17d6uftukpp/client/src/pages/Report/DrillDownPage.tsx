import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Layers, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loadModuleRecords } from '@/lib/data-service';
import type { IBizRecord } from '@/data/mt-records';
import { MODULES } from '@/config/modules';
import { aggregate, asModuleKey, buildSources, dimOptions, isMonthlyDim, monthlyField, type IMeasure } from '@/lib/report';
import { val } from '@/lib/analytics';
import { formatMoneyCompact } from '@/lib/format';

interface PathNode {
  dim: string;
  value: string;
}

/** 数据下钻: 选数据源后按维度逐级聚合, 点击任意分组继续向下钻取, 直到单条明细 */
export default function DrillDownPage() {
  const SOURCES = useMemo(() => buildSources(), []);
  const [sourceKey, setSourceKey] = useState('customer');
  const source = useMemo(() => SOURCES.find((s) => s.key === sourceKey) ?? SOURCES[0], [SOURCES, sourceKey]);
  const allDims = useMemo(() => dimOptions(source), [source]);

  const [rows, setRows] = useState<IBizRecord[] | null>(null);
  const [path, setPath] = useState<PathNode[]>([]);
  const [measureLabel, setMeasureLabel] = useState('记录数');
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    setRows(null);
    setPath([]);
    setShowDetail(false);
    setMeasureLabel(source.measures[0]?.label ?? '记录数');
    void loadModuleRecords(asModuleKey(source.key), true).then(setRows);
  }, [source.key]);

  // 已用于下钻的维度不可重复选
  const usedDims = useMemo(() => new Set(path.map((p) => p.dim)), [path]);
  const nextDimOptions = allDims.filter((d) => !usedDims.has(d.value));
  const [nextDim, setNextDim] = useState('');
  useEffect(() => {
    setNextDim(nextDimOptions[0]?.value ?? '');
  }, [sourceKey, path.length]);

  const measure: IMeasure = useMemo(
    () => source.measures.find((m) => m.label === measureLabel) ?? { label: '记录数', count: true },
    [source, measureLabel],
  );

  // 按面包屑路径逐级过滤出当前作用域记录
  const scopedRows = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) =>
      path.every((p) => {
        const monthly = isMonthlyDim(p.dim);
        const field = monthly ? monthlyField(p.dim) : p.dim;
        const v = val(r, source.key, field);
        return monthly ? v.slice(0, 7) === p.value : v === p.value;
      }),
    );
  }, [rows, path, source.key]);

  const groups = useMemo(() => {
    if (!nextDim) return { data: [], total: 0 };
    return aggregate(scopedRows, source.key, nextDim, measure, 'desc', 'all');
  }, [scopedRows, nextDim, measure, source.key]);

  const detailCols = useMemo(
    () => MODULES[source.key]?.fields.filter((f) => f.inList !== false).slice(0, 8) ?? [],
    [source.key],
  );
  const isMoney = !measure.count;

  const drillInto = (value: string) => {
    if (!nextDim) return;
    setPath([...path, { dim: nextDim, value }]);
    setShowDetail(false);
  };
  const crumbLabel = (dim: string) => (isMonthlyDim(dim) ? `按月·${monthlyField(dim)}` : dim);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">数据下钻</h2>
        <p className="mt-1 text-sm text-muted-foreground">从汇总到分组再到明细, 逐层穿透定位问题数据</p>
      </div>

      {/* 配置条 */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 py-4">
          <div className="w-64 space-y-1.5">
            <label className="text-xs text-muted-foreground">数据源</label>
            <NativeSelect className="w-full" value={sourceKey} onChange={(e) => setSourceKey(e.target.value)}>
              {SOURCES.map((s) => (
                <NativeSelectOption key={s.key} value={s.key}>
                  {s.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="w-40 space-y-1.5">
            <label className="text-xs text-muted-foreground">统计指标</label>
            <NativeSelect className="w-full" value={measureLabel} onChange={(e) => setMeasureLabel(e.target.value)}>
              {source.measures.map((m) => (
                <NativeSelectOption key={m.label} value={m.label}>
                  {m.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {!showDetail ? (
            <div className="w-48 space-y-1.5">
              <label className="text-xs text-muted-foreground">本层下钻维度</label>
              <NativeSelect className="w-full" value={nextDim} onChange={(e) => setNextDim(e.target.value)}>
                {nextDimOptions.length === 0 ? <NativeSelectOption value="">无可下钻维度</NativeSelectOption> : null}
                {nextDimOptions.map((d) => (
                  <NativeSelectOption key={d.value} value={d.value}>
                    {d.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          ) : null}
          <div className="ml-auto">
            <Button variant={showDetail ? 'default' : 'outline'} size="sm" onClick={() => setShowDetail((v) => !v)}>
              <Layers className="size-4" /> {showDetail ? '返回分组视图' : `查看当前明细(${scopedRows.length})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 面包屑 */}
      <div className="flex flex-wrap items-center gap-1 text-sm">
        <Button variant="ghost" size="sm" className="h-7" onClick={() => setPath([])}>
          全部数据
        </Button>
        {path.map((p, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setPath(path.slice(0, i + 1))}>
              {crumbLabel(p.dim)} = {p.value}
            </Button>
          </span>
        ))}
        <Badge variant="secondary" className="ml-2">
          当前 {scopedRows.length} 条
        </Badge>
      </div>

      {!rows ? (
        <Skeleton className="h-[360px]" />
      ) : showDetail ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">明细记录（{scopedRows.length} 条, 最多展示 300 条）</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {detailCols.map((c) => (
                      <TableHead key={c.key}>{c.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopedRows.slice(0, 300).map((r) => (
                    <TableRow key={r.recordId}>
                      {detailCols.map((c) => (
                        <TableCell key={c.key} className="whitespace-nowrap">
                          {String(r.values[c.key] ?? '—')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {nextDim ? `按「${crumbLabel(nextDim)}」分组` : '请选择下钻维度'}（点击任意行继续下钻）
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{crumbLabel(nextDim || '维度')}</TableHead>
                  <TableHead className="text-right">{measure.label}</TableHead>
                  <TableHead className="text-right">占比</TableHead>
                  <TableHead className="text-right">下钻</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      <Search className="mx-auto mb-2 size-5 opacity-40" />
                      当前层级暂无可分组数据
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.data.map((g) => (
                    <TableRow key={g.name} className="cursor-pointer" onClick={() => drillInto(g.name)}>
                      <TableCell className="font-medium">{g.name || '未填写'}</TableCell>
                      <TableCell className="text-right tabular-nums">{isMoney ? formatMoneyCompact(g.value) : g.value}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {groups.total ? ((g.value / groups.total) * 100).toFixed(1) : '0.0'}%
                      </TableCell>
                      <TableCell className="text-right">
                        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
