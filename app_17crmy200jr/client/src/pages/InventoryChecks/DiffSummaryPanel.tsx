import { useState } from 'react';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { confirmDiff } from '@client/src/api/inventory';
import { assetTypeLabel } from './InventoryTaskCard';
import type { InventoryCheckItem } from '@shared/api.interface';

interface DiffSummaryPanelProps {
  checks: InventoryCheckItem[];
  totalCount: number;
  checkedCount: number;
  onConfirmed: (item: InventoryCheckItem) => void;
}

export function DiffSummaryPanel({
  checks,
  totalCount,
  checkedCount,
  onConfirmed,
}: DiffSummaryPanelProps) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const diffItems = checks.filter(
    (c) => c.difference !== null && c.difference !== 0
  );
  const completionRate =
    totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
  const abnormalCount = diffItems.length;
  const surplusTotal = diffItems.reduce(
    (sum, item) => sum + Math.max(0, item.difference ?? 0),
    0
  );
  const deficitTotal = diffItems.reduce(
    (sum, item) => sum + Math.min(0, item.difference ?? 0) * -1,
    0
  );

  const handleConfirm = async (
    check: InventoryCheckItem,
    adjustStock: number
  ) => {
    setConfirming(check.id);
    try {
      const updated = await confirmDiff(check.id, adjustStock);
      toast.success('差异已确认');
      onConfirmed(updated);
    } catch {
      toast.error('操作失败');
    } finally {
      setConfirming(null);
    }
  };

  const stats = [
    {
      label: '完成率',
      value: `${completionRate}%`,
      icon: Percent,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: '异常资产数',
      value: abnormalCount,
      icon: AlertTriangle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: '盘盈总数',
      value: `+${surplusTotal}`,
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: '盘亏总数',
      value: `-${deficitTotal}`,
      icon: TrendingDown,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ];

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-4 gap-3"
        data-ai-section-type="card-stat"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-sm p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {stat.label}
                </span>
                <div className={`${stat.bg} p-1.5 rounded-sm`}>
                  <Icon className={`size-4 ${stat.color}`} />
                </div>
              </div>
              <div className="text-foreground text-lg font-bold font-mono">
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-sm border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            <span className="text-foreground text-sm font-semibold">
              差异明细
            </span>
            <Badge
              variant="outline"
              className="bg-destructive/10 text-destructive border-destructive/30"
            >
              {diffItems.length} 项
            </Badge>
          </div>
        </div>

        {diffItems.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <CheckCircle className="size-8 mx-auto mb-2 text-success" />
            <p>所有资产账实相符，无差异</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left font-medium px-4 py-2.5">
                    资产名称
                  </th>
                  <th className="text-left font-medium px-4 py-2.5 w-[100px]">
                    资产类型
                  </th>
                  <th className="text-right font-medium px-4 py-2.5 w-[90px]">
                    账面
                  </th>
                  <th className="text-right font-medium px-4 py-2.5 w-[90px]">
                    实盘
                  </th>
                  <th className="text-right font-medium px-4 py-2.5 w-[90px]">
                    差异
                  </th>
                  <th className="text-left font-medium px-4 py-2.5 w-[200px]">
                    备注
                  </th>
                  <th className="text-center font-medium px-4 py-2.5 w-[200px]">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {diffItems.map((item) => {
                  const diff = item.difference ?? 0;
                  const isSurplus = diff > 0;
                  const isConfirmed = item.status === 'confirmed';

                  return (
                    <tr
                      key={item.id}
                      className="border-t border-border hover:bg-accent/50"
                    >
                      <td className="px-4 py-2.5 text-foreground">
                        {item.assetName}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {assetTypeLabel(item.assetType)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {item.bookQuantity}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {item.actualQuantity ?? '-'}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono font-medium ${
                          isSurplus
                            ? 'text-success'
                            : 'text-destructive'
                        }`}
                      >
                        {isSurplus ? '+' : ''}
                        {diff}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {item.remark || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isConfirmed ? (
                          <Badge
                            variant="outline"
                            className="bg-success/10 text-success border-success/30"
                          >
                            <CheckCircle className="size-3 mr-1" />
                            已确认
                          </Badge>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={confirming === item.id}
                              onClick={() =>
                                handleConfirm(item, diff)
                              }
                              className="h-8 rounded-sm"
                            >
                              {isSurplus
                                ? '确认盘盈'
                                : '确认盘亏'}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
