import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, DollarSign, Search } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
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
import { aiTools } from '@client/src/api';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { ReplenishmentItem } from '@shared/api.interface';

const PRIORITY_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'rounded-full bg-[hsl(4_75%_52%_0.1)] text-[hsl(4_75%_46%)] border-[hsl(4_75%_52%_0.2)]',
  medium: 'rounded-full bg-[hsl(38_85%_50%_0.1)] text-[hsl(38_85%_40%)] border-[hsl(38_85%_50%_0.2)]',
  low: 'rounded-full bg-[hsl(152_60%_42%_0.1)] text-[hsl(152_60%_36%)] border-[hsl(152_60%_42%_0.2)]',
};

const PRIORITY_SORT: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const WAREHOUSE_OPTIONS = ['全部', '上海仓', '北京仓', '广州仓', '深圳仓'];

const ReplenishmentTab: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReplenishmentItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [warehouse, setWarehouse] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [keyword, setKeyword] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { warehouse?: string; priority?: string; keyword?: string } =
        {};
      if (warehouse !== 'all') params.warehouse = warehouse;
      if (priority !== 'all') params.priority = priority;
      if (keyword.trim()) params.keyword = keyword.trim();
      const res = await aiTools.getReplenishment(params);
      setItems(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
      setTotalValue(res.totalValue ?? 0);
    } catch (err: unknown) {
      logger.error('Failed to load replenishment', { error: String(err) });
      setError('加载补货建议失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouse, priority]);

  const handleSearch = () => {
    fetchData();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const sortedItems = useMemo(() => {
    return [...items].sort(
      (a: ReplenishmentItem, b: ReplenishmentItem) =>
        (PRIORITY_SORT[a.priority] ?? 9) - (PRIORITY_SORT[b.priority] ?? 9),
    );
  }, [items]);

  const handleGenerateInbound = () => {
    const prefill = sortedItems.map((item: ReplenishmentItem) => ({
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      quantity: item.suggestedQuantity,
      unitPrice: item.unitPrice,
      warehouse: item.warehouse,
    }));
    try {
      localStorage.setItem('replenishment-prefill', JSON.stringify(prefill));
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
              <span className="text-sm text-muted-foreground">建议商品数</span>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-24 bg-accent" />
            ) : (
              <p className="text-3xl font-mono font-light">{totalItems}</p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-sm shadow-none border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="size-4 text-primary" />
              <span className="text-sm text-muted-foreground">建议补货总金额</span>
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

      {/* 筛选 + 列表 */}
      <Card className="rounded-sm shadow-none border border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">仓库</span>
                <Select value={warehouse} onValueChange={setWarehouse}>
                  <SelectTrigger className="w-32">
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">优先级</span>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={keyword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setKeyword(e.target.value)
                    }
                    onKeyDown={handleKeyDown}
                    placeholder="搜索商品名/SKU"
                    className="w-48 pl-8 rounded-sm h-9"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  variant="outline"
                  size="sm"
                  className="border-border h-9"
                >
                  搜索
                </Button>
              </div>
            </div>
            <Button
              onClick={handleGenerateInbound}
              disabled={sortedItems.length === 0 || loading}
            >
              生成采购入库单
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
              暂无补货建议
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
                      仓库
                    </th>
                    <th className="text-right px-3 py-2 font-medium border border-border">
                      当前库存
                    </th>
                    <th className="text-right px-3 py-2 font-medium border border-border">
                      安全库存
                    </th>
                    <th className="text-right px-3 py-2 font-medium border border-border">
                      日均销量
                    </th>
                    <th className="text-right px-3 py-2 font-medium border border-border">
                      建议补货量
                    </th>
                    <th className="text-left px-3 py-2 font-medium border border-border">
                      预计到货日
                    </th>
                    <th className="text-center px-3 py-2 font-medium border border-border">
                      优先级
                    </th>
                    <th className="text-right px-3 py-2 font-medium border border-border">
                      建议金额
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item: ReplenishmentItem) => (
                    <tr key={`${item.productId}-${item.warehouse}`} className="border border-border">
                      <td className="px-3 py-2 border border-border">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {item.productCode}
                        </div>
                      </td>
                      <td className="px-3 py-2 border border-border">{item.warehouse}</td>
                      <td className="px-3 py-2 font-mono text-right border border-border">
                        {item.currentStock}
                      </td>
                      <td className="px-3 py-2 font-mono text-right border border-border">
                        {item.safetyStock}
                      </td>
                      <td className="px-3 py-2 font-mono text-right border border-border">
                        {item.avgDailySales.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 font-mono text-right font-semibold text-primary border border-border">
                        {item.suggestedQuantity}
                      </td>
                      <td className="px-3 py-2 border border-border">
                        {item.expectedArrivalDate}
                      </td>
                      <td className="px-3 py-2 text-center border border-border">
                        <Badge
                          variant="outline"
                          className={PRIORITY_STYLES[item.priority] ?? ''}
                        >
                          {PRIORITY_LABELS[item.priority] ?? item.priority}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-right border border-border">
                        ¥{item.suggestedAmount.toLocaleString()}
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

export default ReplenishmentTab;
