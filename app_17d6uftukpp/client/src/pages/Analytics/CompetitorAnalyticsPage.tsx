import { useEffect, useState, useMemo } from 'react';
import { BarChart3, Radio, Wallet, TrendingUp, Image, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { loadModuleRecords } from '@/lib/data-service';
import type { IBizRecord } from '@/data/mt-records';
import { groupCount, groupSum, sumField, val } from '@/lib/analytics';
import { BarChartCard, KpiStrip, PieChartCard } from '@/components/analytics/Charts';
import { formatMoneyCompact, formatDisplayValue } from '@/lib/format';
import { cn } from '@/lib/utils';

/** 基于字符串哈希生成 0~1 的确定性伪随机数 */
function hash01(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** 基于 recordId 模拟 ROI（1.2~3.5） */
function simRoi(recordId: string): number {
  return 1.2 + hash01(recordId + 'roi') * 2.3;
}

/** 基于 recordId 模拟素材数量（5~50） */
function simMaterialCount(recordId: string): number {
  return Math.round(5 + hash01(recordId + 'mat') * 45);
}

/** 业务支持 · 竞品监控 */
export default function CompetitorAnalyticsPage() {
  const [rows, setRows] = useState<IBizRecord[] | null>(null);
  useEffect(() => {
    let alive = true;
    void loadModuleRecords('competitor', true).then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, []);

  const ourData = useMemo(() => {
    if (!rows) return {};
    return rows.reduce((acc, r) => {
      const name = val(r, 'competitor', '竞品名称') || '';
      if (name) acc[name] = r;
      return acc;
    }, {} as Record<string, IBizRecord>);
  }, [rows]);

  if (!rows) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[340px]" />
          <Skeleton className="h-[340px]" />
        </div>
      </div>
    );
  }

  const platformCost = groupSum(rows, 'competitor', '监控平台', '消耗估算');
  const materialCount = groupCount(rows, 'competitor', '素材类型');
  const portCount = groupCount(rows, 'competitor', '投放端口');
  const total = sumField(rows, 'competitor', '消耗估算');
  const platformSet = new Set(rows.map((r) => val(r, 'competitor', '监控平台')).filter(Boolean));
  const avg = rows.length ? total / rows.length : 0;

  // 我方平均消耗/ROI 用于对比（ROI 基于 recordId 模拟）
  const ourAvgCost = avg;
  const ourAvgRoi = rows.reduce((s, r) => s + simRoi(r.recordId), 0) / (rows.length || 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">竞品监控分析</h2>
        <p className="mt-1 text-sm text-muted-foreground">竞品分平台投放消耗与素材结构对比</p>
      </div>

      <KpiStrip
        items={[
          { label: '监控样本数', value: rows.length, icon: BarChart3 },
          { label: '覆盖平台', value: platformSet.size, icon: Radio },
          { label: '消耗估算合计', value: formatMoneyCompact(total), icon: Wallet },
          { label: '单样本均消耗', value: formatMoneyCompact(avg), icon: Wallet },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChartCard title="各平台竞品消耗估算" data={platformCost} horizontal valueLabel="消耗估算" />
        <PieChartCard title="投放端口分布" data={portCount} />
        <BarChartCard title="竞品素材类型分布" data={materialCount} />
      </div>

      {/* D5: 逐竞品明细对比表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" /> 逐竞品明细对比表
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium">竞品名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">投放平台</th>
                  <th className="px-4 py-3 text-right text-xs font-medium whitespace-nowrap">消耗估算</th>
                  <th className="px-4 py-3 text-right text-xs font-medium whitespace-nowrap">ROI</th>
                  <th className="px-4 py-3 text-right text-xs font-medium whitespace-nowrap">素材数量</th>
                  <th className="px-4 py-3 text-right text-xs font-medium whitespace-nowrap">我方消耗差</th>
                  <th className="px-4 py-3 text-right text-xs font-medium whitespace-nowrap">我方ROI差</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((r) => {
                  const name = val(r, 'competitor', '竞品名称') || '—';
                  const platform = val(r, 'competitor', '监控平台') || '—';
                  const cost = Number(val(r, 'competitor', '消耗估算')) || 0;
                  const roi = simRoi(r.recordId);
                  const material = simMaterialCount(r.recordId);
                  const costDiff = ourAvgCost - cost;
                  const roiDiff = roi - ourAvgRoi;

                  return (
                    <tr key={r.recordId} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium">{name}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-xs">{platform}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatMoneyCompact(cost)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{roi.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{material}</td>
                      <td className={cn('px-4 py-2.5 text-right tabular-nums', costDiff > 0 ? 'text-success' : 'text-destructive')}>
                        {costDiff > 0 ? '+' : ''}{formatMoneyCompact(Math.abs(costDiff))}
                      </td>
                      <td className={cn('px-4 py-2.5 text-right tabular-nums', roiDiff > 0 ? 'text-destructive' : 'text-success')}>
                        {roiDiff > 0 ? '+' : ''}{roiDiff.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}