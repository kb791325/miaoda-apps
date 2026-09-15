import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Send, Printer, X } from 'lucide-react';
import type { InventoryCheckItem } from '@shared/api.interface';

export type EditableItem = InventoryCheckItem & {
  actualQuantityInput: string;
  remarkInput: string;
};

export const CHECK_STATUS_MAP: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: '进行中',
    className: 'rounded-full bg-warning/10 text-warning border-warning/20',
  },
  completed: {
    label: '已完成',
    className: 'rounded-full bg-success/10 text-success border-success/20',
  },
};

interface RecordsInventoryCheckDetailProps {
  checkId: string;
  status: string;
  warehouse: string;
  items: EditableItem[];
  isViewing: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
  onActualChange: (id: string, value: string) => void;
  onRemarkChange: (id: string, value: string) => void;
  onPrint: () => void;
}

export function RecordsInventoryCheckDetail({
  checkId,
  status,
  warehouse,
  items,
  isViewing,
  isSubmitting,
  onSubmit,
  onClose,
  onActualChange,
  onRemarkChange,
  onPrint,
}: RecordsInventoryCheckDetailProps) {
  const isEditable = status === 'pending';
  const totalSKU = items.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-medium text-foreground">
            盘点明细
            <span className="font-mono text-muted-foreground text-xs ml-2">
              {checkId.slice(0, 8)}
            </span>
          </h4>
          <Badge
            variant="secondary"
            className={CHECK_STATUS_MAP[status]?.className ?? ''}
          >
            {CHECK_STATUS_MAP[status]?.label ?? status}
          </Badge>
          <span className="text-sm text-muted-foreground">{warehouse}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            共 <span className="font-mono font-medium text-foreground">{totalSKU}</span> 个 SKU
          </span>
          {isEditable && (
            <Button size="sm" onClick={onSubmit} disabled={isSubmitting}>
              <Send className="size-3.5 mr-1" />
              {isSubmitting ? '提交中...' : '提交盘点'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            disabled={items.length === 0}
          >
            <Printer className="size-3.5 mr-1" />
            打印
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
            <X className="size-3.5 mr-1" />
            关闭
          </Button>
        </div>
      </div>

      {isViewing ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          加载中...
        </div>
      ) : (
        <div className="overflow-auto max-h-[calc(100vh-320px)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted sticky top-0 z-10">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[120px]">
                  编码
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  商品名称
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[120px]">
                  库位
                </th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[100px]">
                  系统库存
                </th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[140px]">
                  实盘数量
                </th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[80px]">
                  差异
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  备注
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: EditableItem) => {
                const actual = Number(item.actualQuantityInput) || 0;
                const diff = actual - item.systemQuantity;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-border/50 hover:bg-accent/50"
                  >
                    <td className="px-3 py-2 font-mono text-xs">
                      {item.productCode}
                    </td>
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">
                      {item.location ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {item.systemQuantity}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isEditable ? (
                        <Input
                          type="number"
                          value={item.actualQuantityInput}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            onActualChange(item.id, e.target.value)
                          }
                          className="w-[120px] h-8 text-right font-mono"
                        />
                      ) : (
                        <span className="font-mono">{item.actualQuantity}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      <span
                        className={
                          diff > 0
                            ? 'text-destructive'
                            : diff < 0
                              ? 'text-success'
                              : 'text-muted-foreground'
                        }
                      >
                        {diff > 0 ? '+' : ''}
                        {diff}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {isEditable ? (
                        <Input
                          value={item.remarkInput}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            onRemarkChange(item.id, e.target.value)
                          }
                          placeholder="备注"
                          className="h-8 text-xs"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {item.remark || '-'}
                        </span>
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
  );
}
