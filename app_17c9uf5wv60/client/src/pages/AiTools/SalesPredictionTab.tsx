import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Card, CardContent } from '@client/src/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { aiTools, products } from '@client/src/api';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { ProductWithInventory, SalesPredictionItem } from '@shared/api.interface';

type Period = 7 | 14 | 30;

const TREND_LABELS: Record<string, string> = {
  up: '上升',
  down: '下降',
  stable: '稳定',
};

const TREND_ICONS: Record<string, React.FC<{ className?: string }>> = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const TREND_CLASSES: Record<string, string> = {
  up: 'text-[hsl(152_60%_42%)]',
  down: 'text-[hsl(4_75%_52%)]',
  stable: 'text-muted-foreground',
};

const SalesPredictionTab: React.FC = () => {
  const [allProducts, setAllProducts] = useState<ProductWithInventory[]>([]);
  const [productId, setProductId] = useState<string>('');
  const [period, setPeriod] = useState<Period>(7);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<SalesPredictionItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const list = await products.getAllProducts();
        setAllProducts(Array.isArray(list) ? list : []);
      } catch (err: unknown) {
        logger.error('Failed to load products', { error: String(err) });
      } finally {
        setProductsLoading(false);
      }
    };
    loadProducts();
  }, []);

  const handlePredict = async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiTools.getSalesPrediction({ productId, period });
      setPrediction(res);
    } catch (err: unknown) {
      logger.error('Failed to load sales prediction', { error: String(err) });
      setError('加载销售预测失败');
    } finally {
      setLoading(false);
    }
  };

  const buildChartOption = (): EChartsOption => {
    if (!prediction) return {};
    const historical = prediction.historicalData ?? [];
    const predicted = prediction.predictedData ?? [];

    const allDates = [
      ...historical.map((d) => d.date.slice(5)),
      ...predicted.map((d) => d.date.slice(5)),
    ];

    const historicalData = historical.map((d) => d.quantity);
    const predictedData = predicted.map((d) => d.quantity);
    const lowerBound = predicted.map((d) => d.lowerBound);
    const upperBound = predicted.map((d) => d.upperBound);

    // 历史部分占位
    const historyLen = historical.length;
    const predictedPlaceholder = new Array(historyLen).fill(null);
    const historyPlaceholder = new Array(predicted.length).fill(null);

    return {
      tooltip: { trigger: 'axis' },
      legend: {
        bottom: 0,
        data: ['历史销量', '预测销量', '置信区间'],
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: allDates,
        boundaryGap: false,
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '历史销量',
          type: 'line',
          data: [...historicalData, ...historyPlaceholder],
          smooth: true,
          lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            color: 'rgba(59, 130, 246, 0.1)',
          },
        },
        {
          name: '预测销量',
          type: 'line',
          data: [...predictedPlaceholder, ...predictedData],
          smooth: true,
          lineStyle: { color: '#f59e0b', width: 2, type: 'dashed' },
          itemStyle: { color: '#f59e0b' },
        },
        {
          name: '置信区间',
          type: 'line',
          data: [...predictedPlaceholder, ...upperBound],
          stack: 'confidence',
          lineStyle: { opacity: 0 },
          stackStrategy: 'all',
          areaStyle: {
            color: 'rgba(245, 158, 11, 0.15)',
          },
          symbol: 'none',
        },
        {
          name: '置信区间下限',
          type: 'line',
          data: [...predictedPlaceholder, ...lowerBound],
          stack: 'confidence',
          lineStyle: { opacity: 0 },
          stackStrategy: 'all',
          areaStyle: {
            color: 'transparent',
          },
          symbol: 'none',
        },
      ],
    };
  };

  const trendClass = prediction
    ? TREND_CLASSES[prediction.trend] ?? 'text-muted-foreground'
    : 'text-muted-foreground';

  return (
    <div className="space-y-4">
      <Card className="rounded-sm shadow-none border border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded-sm bg-primary" />
              <h3 className="text-sm font-medium text-foreground">AI 销售预测</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">商品</span>
                <Select
                  value={productId}
                  onValueChange={setProductId}
                  disabled={productsLoading}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="选择商品" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProducts.map((p: ProductWithInventory) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex border border-border rounded-sm overflow-hidden">
                {[7, 14, 30].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p as Period)}
                    className={`px-4 py-1.5 text-sm transition-colors ${
                      period === p
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {p}天
                  </button>
                ))}
              </div>
              <Button
                onClick={handlePredict}
                disabled={!productId || loading}
              >
                <TrendingUp className="size-4" />
                开始预测
              </Button>
            </div>
          </div>

          {loading && (
            <Skeleton className="h-[380px] w-full bg-accent rounded-sm" />
          )}

          {error && !loading && (
            <div className="text-sm text-destructive text-center py-20">{error}</div>
          )}

          {!loading && !error && !prediction && (
            <div className="text-sm text-muted-foreground text-center py-20">
              选择商品后点击"开始预测"查看销售预测
            </div>
          )}

          {!loading && !error && prediction && (
            <div className="space-y-4">
              {/* 趋势方向 + 置信度 */}
              <div className="flex items-center gap-6 px-2">
                <div className="flex items-center gap-2">
                  <div className={trendClass}>
                    {prediction.trend === 'up' && <TrendingUp className="size-5" />}
                    {prediction.trend === 'down' && <TrendingDown className="size-5" />}
                    {prediction.trend === 'stable' && <Minus className="size-5" />}
                  </div>
                  <span className="text-sm text-muted-foreground">趋势方向</span>
                  <span className={`text-base font-semibold ${trendClass}`}>
                    {TREND_LABELS[prediction.trend] ?? prediction.trend}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">置信度</span>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {(prediction.confidence * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">商品</span>
                  <span className="text-sm font-medium">{prediction.productName}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {prediction.productCode}
                  </span>
                </div>
              </div>

              <ReactECharts
                option={buildChartOption()}
                theme="ud"
                className="h-[380px] w-full"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesPredictionTab;
