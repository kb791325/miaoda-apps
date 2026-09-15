import { Search, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import type { CategoryL1Item, CategoryItem } from '@shared/api.interface';

interface ExpenseFilterBarProps {
  keyword: string;
  filterL1: string;
  filterL2: string;
  categoriesL1: CategoryL1Item[];
  categoriesL2: CategoryItem[];
  onKeywordChange: (value: string) => void;
  onFilterL1Change: (value: string) => void;
  onFilterL2Change: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onAdd: () => void;
}

const ExpenseFilterBar = ({
  keyword,
  filterL1,
  filterL2,
  categoriesL1,
  categoriesL2,
  onKeywordChange,
  onFilterL1Change,
  onFilterL2Change,
  onSearch,
  onRefresh,
  onAdd,
}: ExpenseFilterBarProps) => {
  return (
    <div className="rounded-lg bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索描述或二级类目"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="h-9 rounded-md pl-9"
          />
        </div>
        <div className="w-36">
          <Select
            value={filterL1}
            onValueChange={(v) => {
              onFilterL1Change(v);
              onFilterL2Change('');
            }}
          >
            <SelectTrigger className="h-9 w-[144px] rounded-md">
              <SelectValue placeholder="一级类目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">一级类目</SelectItem>
              {categoriesL1.map((c: CategoryL1Item) => (
                <SelectItem key={c.id} value={c.categoryL1}>
                  {c.categoryL1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Select
            value={filterL2}
            onValueChange={onFilterL2Change}
            disabled={!filterL1}
          >
            <SelectTrigger className="h-9 w-[144px] rounded-md">
              <SelectValue placeholder="二级类目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">二级类目</SelectItem>
              {categoriesL2.map((c: CategoryItem) => (
                <SelectItem key={c.id} value={c.categoryL2}>
                  {c.categoryL2}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onSearch}
            className="h-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
           >
             <Search className="mr-1.5 h-4 w-4" />
             搜索
          </Button>
          <Button
            variant="outline"
            onClick={onRefresh}
             className="h-9 rounded-md border-border text-foreground hover:bg-accent/50"
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            更新
          </Button>
        </div>
        <div className="ml-auto">
          <Button
            onClick={onAdd}
             className="h-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
           >
             <Plus className="mr-1.5 h-4 w-4" />
             新增支出
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseFilterBar;
