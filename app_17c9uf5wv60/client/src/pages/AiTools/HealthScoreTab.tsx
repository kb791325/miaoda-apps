import React, { useState, useEffect } from 'react';
import { Heart, CheckCircle2, RefreshCw } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Button } from '@client/src/components/ui/button';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Card, CardContent } from '@client/src/components/ui/card';
import { aiTools } from '@client/src/api';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { HealthScoreResponse } from '@shared/api.interface';

const RATING_LABELS: Record<string, string> = {
  excellent: '优秀',
  good: '良好',
  fair: '一般',
  needs_improvement: '需改进',
  danger: '危险',
};

const RATING_CLASSES: Record<string, string> = {
  excellent: 'text-[hsl(152_60%_42%)]',
  good: 'text-primary',
  fair: 'text-[hsl(38_85%_45%)]',
  needs_improvement: 'text-[hsl(24_85%_50%)]',
  danger: 'text-[hsl(4_75%_52%)]',
};

const HealthScoreTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HealthScoreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiTools.getHealthScore();
      setData(res);
    } catch (err: unknown) {
      logger.error('Failed to load health score', { error: String(err) });
      setError('加载健康度评分失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const buildRadarOption = (): EChartsOption => {
    const dimensions = data?.dimensions ?? [];
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, data: ['得分'] },
      radar: {
        indicator: dimensions.map((d) => ({ name: d.name })),
        center: ['50%', '45%'],
        radius: '65%',
      },
      series: [
        {
          name: '得分',
          type: 'radar',
          data: [
            {
              value: dimensions.map((d) => d.score),
              name: '得分',
              areaStyle: { color: 'rgba(59, 130, 246, 0.2)' },
              lineStyle: { color: '#3b82f6' },
              itemStyle: { color: '#3b82f6' },
            },
          ],
        },
      ],
    };
  };

  const ratingClass = data
    ? RATING_CLASSES[data.rating] ?? 'text-primary'
    : 'text-primary';
  const ratingLabel = data ? RATING_LABELS[data.rating] ?? data.rating : '-';

  return (
    <div className="space-y-4">
      {/* 综合评分 + 雷达图 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 大字号综合评分 */}
        <Card className="rounded-sm shadow-none border border-border">
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[340px]">
            {loading && (
              <div className="w-full space-y-4 flex flex-col items-center">
                <Skeleton className="h-24 w-32 bg-accent" />
                <Skeleton className="h-6 w-20 bg-accent" />
                <Skeleton className="h-4 w-40 bg-accent" />
              </div>
            )}
            {!loading && error && (
              <div className="text-sm text-destructive text-center">{error}</div>
            )}
            {!loading && !error && data && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="size-5 text-primary" />
                  <span className="text-sm text-muted-foreground">综合健康度</span>
                </div>
                <div
                  className={`text-6xl font-mono font-light tracking-tight ${ratingClass}`}
                >
                  {data.overallScore.toFixed(1)}
                </div>
                <div className={`mt-2 text-lg font-medium ${ratingClass}`}>
                  {ratingLabel}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  评估时间：{data.calculatedAt}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 雷达图 */}
        <Card className="rounded-sm shadow-none border border-border md:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 rounded-sm bg-primary" />
                <h3 className="text-sm font-medium text-foreground">多维度评分</h3>
              </div>
              <Button
                onClick={fetchData}
                variant="outline"
                size="sm"
                className="border-border h-8"
                disabled={loading}
              >
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="ml-1">刷新</span>
              </Button>
            </div>
            {loading && (
              <Skeleton className="h-[280px] w-full bg-accent rounded-sm" />
            )}
            {!loading && !error && data && (
              <ReactECharts
                option={buildRadarOption()}
                theme="ud"
                className="h-[300px] w-full"
              />
            )}
            {error && !loading && (
              <div className="text-sm text-destructive text-center py-16">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 改进建议 */}
      <Card className="rounded-sm shadow-none border border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-1 rounded-sm bg-primary" />
            <h3 className="text-sm font-medium text-foreground">改进建议</h3>
          </div>
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i: number) => (
                <Skeleton key={i} className="h-6 w-full bg-accent" />
              ))}
            </div>
          )}
          {!loading && error && (
            <div className="text-sm text-destructive text-center py-4">{error}</div>
          )}
          {!loading && !error && data && (
            <ul className="space-y-2">
              {data.suggestions.map((s: string, idx: number) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthScoreTab;
