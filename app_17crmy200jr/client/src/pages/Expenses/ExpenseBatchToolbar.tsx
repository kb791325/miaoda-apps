import { useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import {
  FolderEdit,
  Building2,
} from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import BatchDialogs from '@client/src/components/batch/BatchDialogs';
import type { CategoryL1Item, CategoryItem } from '@shared/api.interface';
import * as expensesApi from '@client/src/api/expenses';

interface ExpenseBatchToolbarProps {
  selectedIds: string[];
  categoriesL1: CategoryL1Item[];
  categoriesL2: CategoryItem[];
  filterL1: string;
  onRefresh: () => void;
  onClearSelection: () => void;
}

const ExpenseBatchToolbar = ({
  selectedIds,
  categoriesL1,
  categoriesL2,
  filterL1,
  onRefresh,
  onClearSelection,
}: ExpenseBatchToolbarProps) => {
  const [dialogType, setDialogType] = useState<'category' | 'department' | null>(null);
  const [acting, setActing] = useState(false);
  const disabled = selectedIds.length === 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-card px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">已选</span>
           <Badge
              variant="outline"
              className="rounded-md border-primary/30 bg-primary/10 font-mono font-semibold text-primary"
            >
             {selectedIds.length}
           </Badge>
           <span className="text-muted-foreground">条</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex flex-wrap items-center gap-2">
           <Button
              variant="outline"
              size="sm"
              disabled={disabled || acting}
               className="rounded-md border-border text-foreground hover:bg-accent/50"
               onClick={() => setDialogType('category')}
            >
             <FolderEdit className="mr-1.5 h-3.5 w-3.5" />
             批量修改类目
           </Button>
           <Button
              variant="outline"
              size="sm"
              disabled={disabled || acting}
               className="rounded-md border-border text-foreground hover:bg-accent/50"
               onClick={() => setDialogType('department')}
            >
             <Building2 className="mr-1.5 h-3.5 w-3.5" />
             批量修改部门
           </Button>
        </div>
        {selectedIds.length > 0 && (
           <Button
              variant="ghost"
              size="sm"
               className="ml-auto rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={onClearSelection}
            >
             清除选择
           </Button>
        )}
      </div>

      <BatchDialogs
        open={dialogType}
        onOpenChange={setDialogType}
        selectedIds={selectedIds}
        categoriesL1={categoriesL1}
        categoriesL2={categoriesL2}
        filterL1={filterL1}
        onUpdateCategory={expensesApi.batchUpdateExpenseCategory}
        onUpdateDepartment={expensesApi.batchUpdateExpenseDepartment}
        onSuccess={() => {
          onRefresh();
          onClearSelection();
        }}
        actionLabels={{
          category: '批量修改类目',
          department: '批量修改部门',
        }}
      />
    </>
  );
};

export default ExpenseBatchToolbar;
