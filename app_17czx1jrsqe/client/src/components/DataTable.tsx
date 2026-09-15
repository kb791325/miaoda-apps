import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, ArrowDown, ArrowUpDown, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { ActionButton, Column } from '@/components/ServerListPage';

interface DataTableProps<T extends Record<string, any>> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  rowKey?: keyof T;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectedChange?: (keys: string[]) => void;
  rowActions?: ActionButton[] | ((record: T) => ActionButton[]);
  onRowClick?: (record: T) => void;
  emptyText?: string;
  emptyActionText?: string;
  onEmptyAction?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string, order: 'asc' | 'desc') => void;
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  rowKey = 'id' as keyof T,
  selectable = true,
  selectedKeys = [],
  onSelectedChange,
  rowActions = [],
  onRowClick,
  emptyText = '暂无数据',
  emptyActionText,
  onEmptyAction,
  sortBy,
  sortOrder,
  onSort,
}: DataTableProps<T>) {
  const recordKey = (record: T, index: number) =>
    String(record[rowKey] ?? record['id'] ?? record['_id'] ?? index);

  const pageKeys = data.map((r, i) => recordKey(r, i));
  const allSelected = pageKeys.length > 0 && pageKeys.every((k) => selectedKeys.includes(k));
  const someSelected = pageKeys.some((k) => selectedKeys.includes(k));
  const hasRowActions = rowActions && (Array.isArray(rowActions) ? rowActions.length > 0 : true);

  // 全选/取消全选当前页（不影响其他页已选记录，实现跨页选择）
  const handleToggleAll = () => {
    if (!onSelectedChange) return;
    if (allSelected) {
      onSelectedChange(selectedKeys.filter((k) => !pageKeys.includes(k)));
    } else {
      onSelectedChange(Array.from(new Set([...selectedKeys, ...pageKeys])));
    }
  };

  // 反选当前页：页内选中↔未选中互换，页外选中记录保持不变
  const handleInvertPage = () => {
    if (!onSelectedChange) return;
    const next = new Set(selectedKeys);
    pageKeys.forEach((k) => {
      if (next.has(k)) next.delete(k);
      else next.add(k);
    });
    onSelectedChange(Array.from(next));
  };

  const handleToggleRow = (key: string, checked: boolean) => {
    if (!onSelectedChange) return;
    if (checked) onSelectedChange([...selectedKeys, key]);
    else onSelectedChange(selectedKeys.filter((k) => k !== key));
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      onSort?.(key, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort?.(key, 'desc');
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            {selectable && (
              <TableHead className="w-12">
                <div className="flex flex-col items-center gap-0.5">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={handleToggleAll}
                    aria-label={t('全选')}
                  />
                  <button
                    className="text-[10px] leading-none text-muted-foreground hover:text-foreground"
                    onClick={handleInvertPage}
                  >
                    {t('反选')}
                  </button>
                </div>
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  'whitespace-nowrap',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                )}
                style={{ width: col.width }}
              >
                <div
                  className={cn(
                    'flex items-center gap-1',
                    col.align === 'right' && 'justify-end',
                    col.align === 'center' && 'justify-center',
                  )}
                >
                  {t(col.title)}
                  {col.sortable && (
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort(col.key)}
                    >
                      {sortBy === col.key ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="size-3.5" />
                        ) : (
                          <ArrowDown className="size-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </TableHead>
            ))}
            {hasRowActions && (
              <TableHead className="whitespace-nowrap text-right">{t('操作')}</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                {selectable && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
                {Array.isArray(rowActions) && rowActions.length > 0 && (
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                )}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0) + (hasRowActions ? 1 : 0)}
                className="h-40 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-2">
                  <Inbox className="size-9 text-muted-foreground/30" />
                  <div className="text-sm">{t(emptyText)}</div>
                  <div className="text-xs text-muted-foreground/60">{t('可调整筛选条件后重试')}</div>
                  {emptyActionText && onEmptyAction && (
                    <Button size="sm" variant="outline" className="mt-1 h-7" onClick={onEmptyAction}>
                      {emptyActionText}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((record, index) => (
              <TableRow
                key={recordKey(record, index)}
                className={cn(onRowClick && 'cursor-pointer hover:bg-muted/40')}
                onClick={() => onRowClick?.(record)}
              >
                {selectable && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedKeys.includes(recordKey(record, index))}
                      onCheckedChange={(checked) => handleToggleRow(recordKey(record, index), !!checked)}
                      aria-label={t('选择')}
                    />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                    )}
                  >
                    {col.render
                      ? col.render(record, index)
                      : col.dataIndex
                        ? ((record[col.dataIndex] ?? '-') as ReactNode)
                        : null}
                  </TableCell>
                ))}
                {hasRowActions && (
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {(Array.isArray(rowActions) ? rowActions : rowActions(record)).slice(0, 3).map((a, i) => (
                        <button
                          key={i}
                          className={`text-xs hover:underline ${a.variant === 'destructive' ? 'text-destructive' : 'text-primary'}`}
                          onClick={a.onClick}
                        >
                          {t(a.label)}
                        </button>
                      ))}
                      {(Array.isArray(rowActions) ? rowActions.length : rowActions(record).length) > 3 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-xs text-primary hover:underline">{t('更多')}</button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(Array.isArray(rowActions) ? rowActions : rowActions(record)).slice(3).map((a, i) => (
                              <button
                                key={i}
                                className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
                                onClick={a.onClick}
                              >
                                {t(a.label)}
                              </button>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
