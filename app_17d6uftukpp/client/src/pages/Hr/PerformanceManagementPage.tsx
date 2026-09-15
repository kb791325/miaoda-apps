import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Award, Medal, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { useModuleData } from '@/lib/data-service';
import { formatUserName } from '@/lib/user-names';
import { cn } from '@/lib/utils';

interface PerformanceEntry {
  id: string;
  name: string;
  department: string;
  type: string;
  score: number;
  rank: number;
  status: string;
}

const MEDAL_STYLES: Record<number, { icon: typeof Trophy; bg: string; text: string }> = {
  1: { icon: Trophy, bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-600' },
  2: { icon: Medal, bg: 'bg-slate-50 dark:bg-slate-900', text: 'text-slate-500' },
  3: { icon: Award, bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-600' },
};

export default function PerformanceManagementPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'okr' | 'kpi'>('okr');
  const [sortAsc, setSortAsc] = useState(false);

  const { records, loading } = useModuleData('performance' as any);

  const entries = useMemo(() => {
    const list = records.length > 0
      ? records.map((r) => {
          // 评分字段：优先取 config 中的 score key，兜底取原始中文字段名「评分」
          const rawScore = r.values.score ?? r.values['评分'];
          const score = rawScore !== undefined && rawScore !== null ? Number(rawScore) : 0;
          return {
            id: r.recordId,
            name: formatUserName(String(r.values.name ?? r.values.f26 ?? '')),
            department: String(r.values.department ?? ''),
            type: String(r.values.f2 ?? ''), // 绩效类型：OKR / KPI
            score: Number.isNaN(score) ? 0 : score,
            rank: 0,
            status: String(r.values.status ?? '待确认'),
          };
        })
        .filter((e) => {
          // 按绩效类型过滤：OKR tab 只显示 OKR，KPI tab 只显示 KPI
          const targetType = mode === 'okr' ? 'OKR' : 'KPI';
          return e.type === targetType;
        })
      : [];

    const sorted = [...list].sort((a, b) =>
      sortAsc ? a.score - b.score : b.score - a.score,
    );
    return sorted.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [records, mode, sortAsc]);

  const top3 = entries.slice(0, 3);

  const modeLabel = mode === 'okr' ? 'OKR' : 'KPI';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">绩效管理</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {modeLabel} 评分排名 · 共 {entries.length} 人
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'okr' | 'kpi')}>
            <TabsList>
              <TabsTrigger value="okr">OKR</TabsTrigger>
              <TabsTrigger value="kpi">KPI</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortAsc(!sortAsc)}
          >
            <ArrowUpDown className="size-4" />
            {sortAsc ? '升序' : '降序'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* 前三名奖牌 */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {top3.map((entry) => {
                const style = MEDAL_STYLES[entry.rank] ?? { icon: Award, bg: 'bg-muted', text: 'text-muted-foreground' };
                const Icon = style.icon;
                return (
                  <Card key={entry.id} className={cn('border', style.bg)}>
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-full', style.text, 'bg-background')}>
                        <Icon className="size-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">{entry.department || '—'}</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                          {entry.score > 0 ? entry.score : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">#{entry.rank} · {modeLabel}评分</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 完整排名列表 */}
          {entries.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>暂无{modeLabel}数据</EmptyTitle>
                <EmptyDescription>当前{modeLabel}类型暂无绩效记录</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{modeLabel} 评分排名</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground w-16">排名</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">姓名</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">部门</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-muted-foreground">得分</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/50"
                          onClick={() => navigate(`/sub/performance/${entry.id}`)}
                        >
                          <td className="whitespace-nowrap px-4 py-3">
                            {entry.rank <= 3 ? (
                              <span className={cn(
                                'inline-flex items-center gap-1 font-semibold',
                                entry.rank === 1 ? 'text-amber-600' : entry.rank === 2 ? 'text-slate-500' : 'text-orange-600',
                              )}>
                                {entry.rank === 1 ? <Trophy className="size-4" /> : entry.rank === 2 ? <Medal className="size-4" /> : <Award className="size-4" />}
                                #{entry.rank}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">#{entry.rank}</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-medium">{entry.name}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{entry.department || '—'}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums">
                            {entry.score > 0 ? entry.score : '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Badge variant="secondary" className="text-xs">{entry.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}