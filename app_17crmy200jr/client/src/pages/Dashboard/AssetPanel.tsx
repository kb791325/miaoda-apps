import { Package, DollarSign, Archive, Briefcase } from 'lucide-react';
import { AssetStatusChart } from './AssetStatusChart';
import { DepreciationChart } from './DepreciationChart';
import { RepairAssetsTable } from './RepairAssetsTable';
import type {
  DashboardAssetOverview,
  DashboardAssetStatusItem,
  DashboardAssetDepreciation,
  DashboardRepairAssetItem,
} from '@shared/api.interface';

function formatAmount(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface AssetPanelProps {
  assets: DashboardAssetOverview | null;
  statusData: DashboardAssetStatusItem[];
  depreciation: DashboardAssetDepreciation | null;
  repairPending: DashboardRepairAssetItem[];
}

export const AssetPanel: React.FC<AssetPanelProps> = ({
  assets,
  statusData,
  depreciation,
  repairPending,
}) => {
  const metricCards = [
    {
      label: '资产总数',
      value: assets?.totalCount?.toLocaleString() ?? '0',
      unit: '件',
      icon: Package,
      color: 'blue',
    },
    {
      label: '资产总价值',
      value: `¥${formatAmount(depreciation?.originalValue ?? assets?.totalValue ?? 0)}`,
      unit: '',
      icon: DollarSign,
      color: 'blue',
    },
    {
      label: '在库数量',
      value: (assets?.inStockCount ?? 0).toLocaleString(),
      unit: '件',
      icon: Archive,
      color: 'emerald',
    },
    {
      label: '在用数量',
      value: (assets?.inUseCount ?? 0).toLocaleString(),
      unit: '件',
      icon: Briefcase,
      color: 'amber',
    },
  ];

  function iconColorClass(color: string): string {
    switch (color) {
      case 'emerald': return 'bg-emerald-100 text-emerald-500';
      case 'amber': return 'bg-amber-100 text-amber-500';
      case 'red': return 'bg-red-100 text-red-500';
      default: return 'bg-blue-100 text-primary';
    }
  }

  return (
    <div className="space-y-4">
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-ai-section-type="card-stat">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow border border-border"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconColorClass(card.color)}`}
                >
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">{card.label}</div>
                  <div className="text-3xl font-bold font-mono text-right text-foreground">
                    {card.value}
                  </div>
                </div>
              </div>
              {card.unit && (
                <div className="text-xs text-muted-foreground mt-2 text-right">
                  {card.unit}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 状态分布 + 折旧概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg shadow-sm p-5 border border-border hover:shadow-md transition-shadow">
          <h3 className="text-base font-semibold text-foreground mb-4">
            资产状态分布
          </h3>
          <AssetStatusChart data={statusData} />
        </div>
        <div className="bg-card rounded-lg shadow-sm p-5 border border-border hover:shadow-md transition-shadow">
          <h3 className="text-base font-semibold text-foreground mb-4">
            折旧概览
          </h3>
          {depreciation ? (
            <DepreciationChart data={depreciation} />
          ) : (
            <div className="text-sm text-muted-foreground py-16 text-center">
              加载中...
            </div>
          )}
        </div>
      </div>

      {/* 维修资产列表 */}
      <RepairAssetsTable data={repairPending} />
    </div>
  );
};
