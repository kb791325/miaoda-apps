import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface InventoryWarningBarProps {
  warningCount: number;
  warningOnly: boolean;
  onWarningOnlyChange: (checked: boolean) => void;
}

/**
 * 库存预警汇总条：有预警时橙色警示高亮 + 「仅看预警」开关；无预警时中性灰展示。
 */
export const InventoryWarningBar: React.FC<InventoryWarningBarProps> = ({
  warningCount,
  warningOnly,
  onWarningOnlyChange,
}) => {
  const hasWarning = warningCount > 0;
  return (
    <div
      data-ai-section-type="card-stat"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3',
        hasWarning
          ? 'border-[hsl(38_90%_50%)] bg-[hsl(38_90%_95%)]'
          : 'border-border bg-muted',
      )}
    >
      <div className="flex items-center gap-2">
        {hasWarning ? (
          <AlertTriangle
            className="size-4 text-[hsl(38_90%_35%)]"
            aria-hidden="true"
          />
        ) : (
          <CheckCircle2
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <span
          className={cn(
            'text-sm font-medium',
            hasWarning ? 'text-[hsl(38_90%_35%)]' : 'text-muted-foreground',
          )}
        >
          {hasWarning ? `库存预警商品 ${warningCount} 个` : '库存状态正常'}
        </span>
      </div>
      {hasWarning && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[hsl(38_90%_35%)]">
          <span>仅看预警</span>
          <Switch
            checked={warningOnly}
            onCheckedChange={onWarningOnlyChange}
            aria-label="仅看预警"
          />
        </label>
      )}
    </div>
  );
};
