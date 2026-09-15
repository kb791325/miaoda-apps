import React from 'react';
import { Eye, Pencil, Trash2, QrCode } from 'lucide-react';

import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Checkbox } from '@client/src/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@client/src/components/ui/table';
import { cn } from '@client/src/lib/utils';

import type { FixedAssetItem, AssetStatus } from '@shared/api.interface';
import AssetTableFooter from './AssetTableFooter';
import { UserDisplay } from '@client/src/components/business-ui/user-display';

interface AssetTableProps {
  items: FixedAssetItem[];
  loading: boolean;
  page: number;
  total: number;
  pageSize: number;
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  onView: (id: string) => void;
  onEdit: (asset: FixedAssetItem) => void;
  onDelete: (id: string) => void;
  onQRCode: (id: string) => void;
  onPageChange: (page: number) => void;
}

const TypeBadge = ({ type }: { type: string }) => (
  <Badge
    variant="outline"
    className="border-border bg-muted text-muted-foreground font-normal"
  >
    {type || '-'}
  </Badge>
);

const statusLabelMap: Record<AssetStatus, string> = {
  in_stock: '在库',
  in_use: '在用',
  idle: '闲置',
  repairing: '维修',
  transferring: '调拨中',
  scrapped: '报废',
};

const statusStyleMap: Record<AssetStatus, string> = {
  in_stock: 'border-success/30 bg-success/10 text-success',
  in_use: 'border-primary/30 bg-primary/10 text-primary',
  idle: 'border-border bg-muted text-muted-foreground',
  repairing: 'border-warning/30 bg-warning/10 text-warning',
  transferring: 'border-[hsl(270_50%_70%)] bg-[hsl(270_50%_95%)] text-[hsl(270_50%_40%)] dark:bg-[hsl(270_40%_25%)] dark:text-[hsl(270_60%_75%)] dark:border-[hsl(270_40%_40%)]',
  scrapped: 'border-destructive/30 bg-destructive/10 text-destructive',
};

function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN');
}

function formatCurrency(value: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const TH = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <TableHead
    className={`text-xs uppercase tracking-wider text-muted-foreground font-medium bg-muted text-left ${className}`}
  >
    {children}
  </TableHead>
);

const StatusBadge = ({ status }: { status: AssetStatus }) => (
  <Badge
    className={cn(
      'rounded-md font-medium border px-2 py-0.5',
      statusStyleMap[status],
    )}
    variant="outline"
  >
    {statusLabelMap[status]}
  </Badge>
);

const AssetTable = ({
  items,
  loading,
  page,
  total,
  pageSize,
  selectedIds,
  onSelectedChange,
  onView,
  onEdit,
  onDelete,
  onQRCode,
  onPageChange,
}: AssetTableProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const COL_SPAN = 12;

  const allChecked = items.length > 0 && items.every((item: FixedAssetItem) => selectedIds.includes(item.id));
  const someChecked = items.some((item: FixedAssetItem) => selectedIds.includes(item.id));

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      const allIds = items.map((item: FixedAssetItem) => item.id);
      const merged = Array.from(new Set([...selectedIds, ...allIds]));
      onSelectedChange(merged);
    } else {
      const pageIds = new Set(items.map((item: FixedAssetItem) => item.id));
      onSelectedChange(selectedIds.filter((id: string) => !pageIds.has(id)));
    }
  };

  const handleToggleOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectedChange([...selectedIds, id]);
    } else {
      onSelectedChange(selectedIds.filter((s: string) => s !== id));
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
           <TableRow className="hover:bg-transparent border-border">
            <TH className="w-10">
              <Checkbox
                checked={allChecked}
                onCheckedChange={handleToggleAll}
                aria-label="全选"
                data-state={someChecked && !allChecked ? 'indeterminate' : allChecked ? 'checked' : 'unchecked'}
              />
            </TH>
            <TH className="w-48">资产名称</TH>
            <TH className="w-24">资产类型</TH>
            <TH className="w-28">资产类目</TH>
            <TH className="w-24">资产状态</TH>
            <TH className="w-[100px]">采购日期</TH>
            <TH className="w-[100px] !text-right">采购金额</TH>
            <TH className="w-32 !text-right">归属人</TH>
            <TH className="w-24 !text-right">使用楼层</TH>
            <TH className="w-24 !text-right">当前库存</TH>
            <TH className="w-32 !text-right">操作</TH>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COL_SPAN}
                className="text-center py-8 text-muted-foreground"
              >
                加载中...
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COL_SPAN}
                className="text-center py-8 text-muted-foreground"
              >
                暂无数据
              </TableCell>
            </TableRow>
          ) : (
            items.map((item: FixedAssetItem) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                 <TableRow
                   key={item.id}
                    className={cn(
                      'border-border h-10 hover:bg-accent transition-colors',
                     isSelected ? 'bg-primary/10' : 'even:bg-muted/50',
                   )}
                 >
                   <TableCell className="w-10">
                     <Checkbox
                       checked={isSelected}
                       onCheckedChange={(checked: boolean) => handleToggleOne(item.id, checked)}
                       aria-label={`选择 ${item.assetName}`}
                     />
                   </TableCell>
                   <TableCell className="w-48 font-medium">{item.assetName}</TableCell>
                    <TableCell className="w-24">
                     <TypeBadge type={item.assetType} />
                    </TableCell>
                   <TableCell className="w-28 text-muted-foreground">
                     {item.assetCategory}
                   </TableCell>
                   <TableCell className="w-24">
                     <StatusBadge status={item.assetStatus} />
                   </TableCell>
                   <TableCell className="w-[100px]">{item.purchaseDate}</TableCell>
                     <TableCell className="w-[100px] text-right font-mono tabular-nums text-foreground">
                       ¥{formatCurrency(item.purchaseAmount)}
                     </TableCell>
                     <TableCell className="w-32 text-right">
                       {item.owner ? (
                         <div className="flex justify-end">
                           <UserDisplay value={[item.owner]} size="small" />
                         </div>
                       ) : (
                         <span className="text-muted-foreground text-xs">-</span>
                       )}
                     </TableCell>
                     <TableCell className="w-24 text-right">{item.floor}</TableCell>
                     <TableCell className="w-24 text-right font-mono tabular-nums">
                       {item.currentStock}
                     </TableCell>
                    <TableCell className="w-32 text-right">
                     <div className="flex items-center justify-end gap-0.5">
                       <Button
                         variant="ghost"
                         size="icon"
                          className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                         onClick={() => onView(item.id)}
                         title="查看"
                       >
                         <Eye className="size-4" />
                       </Button>
                       <Button
                         variant="ghost"
                         size="icon"
                          className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                         onClick={() => onEdit(item)}
                         title="编辑"
                       >
                         <Pencil className="size-4" />
                       </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                           className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => onQRCode(item.id)}
                          title="QR码"
                        >
                          <QrCode className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                           className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDelete(item.id)}
                          title="删除"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                     </div>
                   </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
       </Table>
      <AssetTableFooter
        total={total}
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  );
};

export default React.memo(AssetTable);
