import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Package, CreditCard } from 'lucide-react';
import { formatDisplayValue, formatMoney, optionMeta } from '@/lib/format';
import type { IBizRecord } from '@/data/mt-records';
import type { IFieldConfig } from '@/config/modules';
import { cn } from '@/lib/utils';

interface SupportDetailTabsProps {
  tabKey: 'items' | 'stockIn' | 'payment';
  record: IBizRecord;
  fields: IFieldConfig[];
}

interface ParsedItem {
  name: string;
  quantity?: number;
  unitPrice?: number;
  subtotal?: number;
}

function parseItems(raw: string | number | undefined | null): ParsedItem[] {
  if (raw === undefined || raw === null || raw === '') return [];
  const text = String(raw);
  const lines = text.split(/[\n;；]/).filter(Boolean);
  if (lines.length <= 1) {
    return [{ name: text }];
  }
  return lines.map((line) => {
    const trimmed = line.trim();
    const priceMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*[元¥]?\s*[\/／]\s*(\S+)/);
    const qtyMatch = trimmed.match(/(\d+)\s*[个件套只台支张本]/);
    const amountMatch = trimmed.match(/[小计合计]?\s*[：:]\s*(\d+(?:\.\d+)?)/);
    return {
      name: trimmed,
      quantity: qtyMatch ? Number(qtyMatch[1]) : undefined,
      unitPrice: priceMatch ? Number(priceMatch[1]) : undefined,
      subtotal: amountMatch ? Number(amountMatch[1]) : undefined,
    };
  });
}

function ItemsTab({ record, fields }: { record: IBizRecord; fields: IFieldConfig[] }) {
  const itemField = fields.find((f) => f.key === 'item');
  const raw = record.values['item'];
  const items = parseItems(raw);

  const hasDetail = items.some(
    (it) => it.quantity !== undefined || it.unitPrice !== undefined || it.subtotal !== undefined,
  );

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="size-4 text-muted-foreground" />
            物品明细
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">暂无物品明细</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="size-4 text-muted-foreground" />
          物品明细
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {hasDetail ? (
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">物品名称</TableHead>
                  <TableHead className="whitespace-nowrap text-right">数量</TableHead>
                  <TableHead className="whitespace-nowrap text-right">单价</TableHead>
                  <TableHead className="whitespace-nowrap text-right">小计</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="whitespace-nowrap">{it.name}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {it.quantity !== undefined ? it.quantity : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {it.unitPrice !== undefined ? formatMoney(it.unitPrice) : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {it.subtotal !== undefined ? formatMoney(it.subtotal) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-4">
            <p className="whitespace-pre-wrap break-words text-sm">{formatDisplayValue(raw)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StockInTab({ record, fields }: { record: IBizRecord; fields: IFieldConfig[] }) {
  const stockDate = record.values['stockDate'];
  const stockKeeper = record.values['stockKeeper'];
  const actualAmount = record.values['actualAmount'];
  const note = record.values['note'];

  const hasData = stockDate || stockKeeper || actualAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="size-4 text-muted-foreground" />
          入库记录
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">入库日期</p>
              <p className="text-sm font-medium">{formatDisplayValue(stockDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">入库人</p>
              <p className="text-sm font-medium">{formatDisplayValue(stockKeeper)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">实际金额</p>
              <p className="text-sm font-medium tabular-nums">{formatMoney(actualAmount)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">备注</p>
              <p className="text-sm font-medium">{formatDisplayValue(note)}</p>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无入库记录</p>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentTab({ record }: { record: IBizRecord }) {
  const actualAmount = record.values['actualAmount'];
  const status = record.values['status'];

  const hasData = actualAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="size-4 text-muted-foreground" />
          付款记录
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">实际金额</p>
              <p className="text-sm font-medium tabular-nums">{formatMoney(actualAmount)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">付款状态</p>
              <p className="text-sm font-medium">{formatDisplayValue(status)}</p>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无付款记录</p>
        )}
      </CardContent>
    </Card>
  );
}

function SupportDetailTabs({ tabKey, record, fields }: SupportDetailTabsProps) {
  switch (tabKey) {
    case 'items':
      return <ItemsTab record={record} fields={fields} />;
    case 'stockIn':
      return <StockInTab record={record} fields={fields} />;
    case 'payment':
      return <PaymentTab record={record} />;
    default:
      return null;
  }
}

export default memo(SupportDetailTabs);