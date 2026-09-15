import React from 'react';
import { Plus, Settings2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { FeeType } from '@shared/fee';

import { formatAmount } from './order-utils';

export interface FeeEditRow {
  /** 已有费用行的后端 id；新增行无 id */
  id?: string;
  feeTypeId: string;
  amount: number;
  isChargeCustomer: boolean;
  remark: string;
}

export interface OrderFeeEditorProps {
  feeTypes: FeeType[];
  rows: FeeEditRow[];
  onChange: (rows: FeeEditRow[]) => void;
  /** 商品金额（单价×数量），用于汇总行 */
  goodsAmount: number;
  onManageFeeTypes: () => void;
}

const OrderFeeEditor: React.FC<OrderFeeEditorProps> = ({
  feeTypes,
  rows,
  onChange,
  goodsAmount,
  onManageFeeTypes,
}) => {
  const chargeFee: number = rows
    .filter((row: FeeEditRow) => row.isChargeCustomer && row.amount > 0)
    .reduce((sum: number, row: FeeEditRow) => sum + row.amount, 0);
  const totalAmount: number = goodsAmount + chargeFee;

  const updateRow = (index: number, patch: Partial<FeeEditRow>): void => {
    onChange(
      rows.map((row: FeeEditRow, i: number) =>
        i === index ? { ...row, ...patch } : row,
      ),
    );
  };

  const handleAddRow = (): void => {
    onChange([
      ...rows,
      {
        feeTypeId: feeTypes[0]?.id ?? '',
        amount: 0,
        isChargeCustomer: true,
        remark: '',
      },
    ]);
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">费用明细</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
          >
            <Plus className="size-3.5" />
            添加费用
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onManageFeeTypes}
          >
            <Settings2 className="size-3.5" />
            管理类型
          </Button>
        </div>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">
          暂无费用，可点击「添加费用」录入运费、安装费等其他费用
        </p>
      )}

      {rows.map((row: FeeEditRow, index: number) => (
        <div
          key={row.id ?? `new-${index}`}
          className="grid grid-cols-7 items-center gap-2"
        >
          <div className="col-span-2">
            <Select
              value={row.feeTypeId}
              onValueChange={(value: string) =>
                updateRow(index, { feeTypeId: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择费用类型" />
              </SelectTrigger>
              <SelectContent>
                {feeTypes.map((feeType: FeeType) => (
                  <SelectItem key={feeType.id} value={feeType.id}>
                    {feeType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="金额"
            value={row.amount > 0 ? row.amount : ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateRow(index, { amount: Number(e.target.value) || 0 })
            }
          />
          <label className="col-span-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox
              checked={row.isChargeCustomer}
              onCheckedChange={(checked: boolean | 'indeterminate') =>
                updateRow(index, { isChargeCustomer: checked === true })
              }
            />
            向客户收取
          </label>
          <Input
            className="col-span-2"
            placeholder="备注（选填）"
            value={row.remark}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateRow(index, { remark: e.target.value })
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() =>
              onChange(rows.filter((_r: FeeEditRow, i: number) => i !== index))
            }
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}

      <div className="space-y-1 text-right text-xs text-muted-foreground">
        <p>商品金额 {formatAmount(goodsAmount)}</p>
        <p>收取费用 {formatAmount(chargeFee)}</p>
        <p className="text-sm font-semibold text-foreground">
          订单总金额 {formatAmount(totalAmount)}
        </p>
      </div>
    </div>
  );
};

export default OrderFeeEditor;
