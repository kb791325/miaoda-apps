import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Package, DollarSign } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Card, CardContent } from '@client/src/components/ui/card';
import { aiTools } from '@client/src/api';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { TransferSuggestionItem } from '@shared/api.interface';

const URGENCY_LABELS: Record<string, string> = {
  high: '紧急',
  medium: '一般',
  low: '较低',
};

const URGENCY_STYLES: Record<string, string> = {
  high: 'rounded-full bg-[hsl(4_75%_52%_0.1)] text-[hsl(4_75%_46%)] border-[hsl(4_75%_52%_0.2)]',
  medium: 'rounded-full bg-[hsl(38_85%_50%_0.1)] text-[hsl(38_85%_40%)] border-[hsl(38_85%_50%_0.2)]',
  low: 'rounded-full bg-[hsl(152_60%_42%_0.1)] text-[hsl(152_60%_36%)] border-[hsl(152_60%_42%_0.2)]',
};

const URGENCY_SORT: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const TransferSuggestionTab: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TransferSuggestionItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiTools.getTransferSuggestions();
      setItems(res.items ?? []);
      setTotalValue(res.totalTransferValue ?? 0);
    } catch (err: unknown) {
      logger.error('Failed to load transfer suggestions', { error: String(err) });
      setError('加载调拨建议失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sortedItems = [...items].sort(
    (a: TransferSuggestionItem, b: TransferSuggestionItem) =>
      (URGENCY_SORT[a.urgency] ?? 9) - (URGENCY_SORT[b.urgency] ?? 9),
  );

  const handleGenerateTransfer = () => {
    const prefill = sortedItems.map((item: TransferSuggestionItem) => ({
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      sourceWarehouse: item.sourceWarehouse,
      targetWarehouse: item.targetWarehouse,
      quantity: item.suggestedQuantity,
    }));
    try {
      localStorage.setItem('transfer-prefill', JSON.stringify(prefill));
    } catch {
      /* ignore */
    }
    navigate('/operations');
  };

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-sm shadow-none border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="size-4 text-primary" />
              <span className="text-sm text-muted-foreground">建议调拨数</span>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-24 bg-accent" />
            ) : (
              <p className="text-3xl font-mono font-light">{items.length}</p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-sm shadow-none border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="size-4 text-primary" />
              <span className="text-sm text-muted-foreground">总调拨价值</span>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-32 bg-accent" />
            ) : (
              <p className="text-3xl font-mono font-light">
                ¥{totalValue.toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 列表 */}
      <Card className="rounded-sm shadow-none border border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 rounded-sm bg-primary" />
              <h3 className="text-sm font-medium text-foreground">AI 调拨建议</h3>
            </div>
            <Button
              onClick={handleGenerateTransfer}
              disabled={sortedItems.length === 0 || loading}
            >
              <ArrowLeftRight className="size-4" />
              生成调拨单
            </Button>
          </div>

          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i: number) => (
                <Skeleton key={i} className="h-10 w-full bg-accent" />
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="text-sm text-destructive text-center py-6">{error}</div>
          )}

          {!loading && !error && sortedItems.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              暂无调拨建议
            </div>
          )}

          {!loading && !error && sortedItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium border border-border">
                      商品 / SKU
                    </th>
                    <th className="text-left px-3 py-2 font-medium border border-border">
                      源仓库
                    </th>
                    <th className="text-left px-3 py-2 font-medium border border-border">
                      目标仓库
                    </th>
                    <th className="text-right px-3 py-2 font-medium border border-border">
                      建议调拨量
                    </th>
                    <th className="text-center px-3 py-2 font-medium border border-border">
                      紧急度
                    </th>
                    <th className="text-left px-3 py-2 font-medium border border-border">
                      预计平衡效果
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item: TransferSuggestionItem) => (
                    <tr key={`${item.productId}-${item.sourceWarehouse}-${item.targetWarehouse}`} className="border border-border">
                      <td className="px-3 py-2 border border-border">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {item.productCode}
                        </div>
                      </td>
                      <td className="px-3 py-2 border border-border">
                        <div>{item.sourceWarehouse}</div>
                        <div className="text-xs text-muted-foreground">
                          库存 {item.sourceStock} · 周转 {item.sourceTurnoverDays}天
                        </div>
                      </td>
                      <td className="px-3 py-2 border border-border">
                        <div>{item.targetWarehouse}</div>
                        <div className="text-xs text-muted-foreground">
                          库存 {item.targetStock} · 周转 {item.targetTurnoverDays}天
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-right font-semibold text-primary border border-border">
                        {item.suggestedQuantity}
                      </td>
                      <td className="px-3 py-2 text-center border border-border">
                        <Badge
                          variant="outline"
                          className={URGENCY_STYLES[item.urgency] ?? ''}
                        >
                          {URGENCY_LABELS[item.urgency] ?? item.urgency}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 border border-border text-muted-foreground">
                        {item.expectedBalanceEffect}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferSuggestionTab;
