import React from 'react';
import { Eye, Pencil, Trash2, FileText, ImageIcon } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Checkbox } from '@client/src/components/ui/checkbox';
import type { ExpenseItem } from '@shared/api.interface';
import TablePaginationFooter from './TablePaginationFooter';
import { UserDisplay } from '@client/src/components/business-ui/user-display';
import { formatAmount } from '@client/src/utils/format';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface ExpenseTableProps {
  items: ExpenseItem[];
  loading: boolean;
  total: number;
  totalAmount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onView: (item: ExpenseItem) => void;
  onEdit: (item: ExpenseItem) => void;
  onDelete: (id: string) => void;
}

const ExpenseTable = ({
  items,
  loading,
  total,
  totalAmount,
  page,
  pageSize,
  totalPages,
  selectedIds,
  onSelectedChange,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
}: ExpenseTableProps) => {
  const allChecked = items.length > 0 && items.every((item: ExpenseItem) => selectedIds.includes(item.id));
  const someChecked = items.some((item: ExpenseItem) => selectedIds.includes(item.id));

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      const allIds = items.map((item: ExpenseItem) => item.id);
      const merged = Array.from(new Set([...selectedIds, ...allIds]));
      onSelectedChange(merged);
    } else {
      const pageIds = new Set(items.map((item: ExpenseItem) => item.id));
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
    <div className="overflow-hidden rounded-lg bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2 text-left font-medium">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={handleToggleAll}
                  aria-label="全选"
                  data-state={someChecked && !allChecked ? 'indeterminate' : allChecked ? 'checked' : 'unchecked'}
                />
              </th>
              <th className="w-[160px] px-3 py-2 text-left font-medium">支出日期</th>
              <th className="w-[186px] px-3 py-2 text-left font-medium">支出金额</th>
              <th className="w-[198px] px-3 py-2 text-left font-medium">一级类目</th>
              <th className="w-[198px] px-3 py-2 text-left font-medium">二级类目</th>
              <th className="w-[140px] px-3 py-2 text-left font-medium">部门</th>
              <th className="w-[120px] px-3 py-2 text-left font-medium">经办人</th>
              <th className="w-[120px] px-3 py-2 text-center font-medium">附件</th>
              <th className="w-[120px] px-3 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-12 text-center text-muted-foreground"
                >
                  加载中...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-12 text-center text-muted-foreground"
                >
                  暂无数据
                </td>
              </tr>
            ) : (
              items.map((item: ExpenseItem) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`h-11 border-t border-border transition-colors hover:bg-accent ${isSelected ? 'bg-primary/10' : ''} even:bg-muted/50 even:hover:bg-accent`}
                  >
                    <td className="px-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked: boolean) => handleToggleOne(item.id, checked)}
                        aria-label={`选择 ${item.id}`}
                      />
                    </td>
                    <td className="px-3 text-left">{item.expenseDate}</td>
                    <td className="w-[186px] px-3 text-left font-mono tabular-nums">
                      ¥{formatAmount(item.amount)}
                    </td>
                    <td className="px-3 text-left">{item.categoryL1}</td>
                    <td className="px-3 text-left">{item.categoryL2}</td>
                    <td className="px-3 text-left">{item.department}</td>
                    <td className="px-3 text-left">
                      {item.handler ? (
                        <UserDisplay value={[item.handler]} size="small" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.invoiceUrl ? (
                          <UniversalLink
                            to={item.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-primary hover:bg-primary/10"
                            title="查看发票"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText className="h-4 w-4" />
                          </UniversalLink>
                        ) : null}
                        {item.screenshotUrl ? (
                          <UniversalLink
                            to={item.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-primary hover:bg-primary/10"
                            title="查看购买截图"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ImageIcon className="h-4 w-4" />
                          </UniversalLink>
                        ) : null}
                        {!item.invoiceUrl && !item.screenshotUrl ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onView(item)}
                          title="查看"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onEdit(item)}
                          title="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => onDelete(item.id)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* 底部汇总 + 分页 */}
      <TablePaginationFooter
        total={total}
        totalAmount={totalAmount}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
};

export default React.memo(ExpenseTable);
