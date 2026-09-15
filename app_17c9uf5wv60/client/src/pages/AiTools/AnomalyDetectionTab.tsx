import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Card, CardContent } from '@client/src/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Badge } from '@client/src/components/ui/badge';
import { aiTools } from '@client/src/api';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { AnomalyDetectionItem } from '@shared/api.interface';

const ANOMALY_TYPE_LABELS: Record<string, string> = {
  spike: '突增',
  drop: '突降',
  stagnation: '停滞',
};

const ANOMALY_TYPE_STYLES: Record<string, string> = {
  spike: 'rounded-full bg-[hsl(4_75%_52%_0.1)] text-[hsl(4_75%_46%)] border-[hsl(4_75%_52%_0.2)]',
  drop: 'rounded-full bg-[hsl(38_85%_50%_0.1)] text-[hsl(38_85%_40%)] border-[hsl(38_85%_50%_0.2)]',
  stagnation: 'rounded-full bg-muted text-muted-foreground border-border',
};

const WAREHOUSE_OPTIONS = ['全部', '上海仓', '北京仓', '广州仓', '深圳仓'];

const AnomalyDetectionTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AnomalyDetectionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { type?: string; warehouse?: string } = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      if (warehouseFilter !== 'all') params.warehouse = warehouseFilter;
      const res = await aiTools.getAnomalyDetection(params);
      setItems(res.items ?? []);
    } catch (err: unknown) {
      logger.error('Failed to load anomaly detection', { error: String(err) });
      setError('加载异常检测数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, warehouseFilter]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const buildTrendOption = (item: AnomalyDetectionItem): EChartsOption => {
    const data = item.last30Days ?? [];
    return {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: ['出入库数量'] },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.date.slice(5)),
        boundaryGap: false,
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '出入库数量',
          type: 'line',
          data: data.map((d) => d.quantity),
          smooth: true,
          lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            color: 'rgba(59, 130, 246, 0.1)',
          },
        },
      ],
    };
  };

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <Card className="rounded-sm shadow-none border border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">异常类型</span>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="spike">突增</SelectItem>
                  <SelectItem value="drop">突降</SelectItem>
                  <SelectItem value="stagnation">停滞</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">仓库</span>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  {WAREHOUSE_OPTIONS.map((wh) => (
                    <SelectItem key={wh} value={wh === '全部' ? 'all' : wh}>
                      {wh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 异常列表 */}
      <Card className="rounded-sm shadow-none border border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-4 w-1 rounded-sm bg-primary" />
            <AlertTriangle className="size-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              异常商品 {items.length > 0 ? `（${items.length} 项）` : ''}
            </span>
          </div>

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i: number) => (
                <Skeleton key={i} className="h-20 w-full bg-accent" />
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="text-sm text-destructive text-center py-6">{error}</div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              暂无异常数据
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="space-y-3">
              {items.map((item: AnomalyDetectionItem) => {
                const isExpanded = expandedId === item.productId;
                return (
                  <div
                    key={item.productId}
                    className="border border-border rounded-sm bg-card overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.productId)}
                      className="w-full p-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {item.productName}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {item.productCode}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              仓库：{item.warehouse}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              ANOMALY_TYPE_STYLES[item.anomalyType] ?? ''
                            }
                          >
                            {ANOMALY_TYPE_LABELS[item.anomalyType] ??
                              item.anomalyType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">
                              Z 分数
                            </div>
                            <div className="text-sm font-mono font-semibold">
                              {item.zScore.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">
                              异常幅度
                            </div>
                            <div className="text-sm font-mono font-semibold text-primary">
                              {(item.anomalyMagnitude * 100).toFixed(1)}%
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">建议：</span>
                        {item.suggestedAction}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-border pt-3">
                        <div className="text-xs text-muted-foreground mb-2">
                          近 30 天出入库趋势
                        </div>
                        <ReactECharts
                          option={buildTrendOption(item)}
                          theme="ud"
                          className="h-[300px] w-full"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnomalyDetectionTab;
