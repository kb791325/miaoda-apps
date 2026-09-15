import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface OrdersPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS: number[] = [10, 20, 50];

const OrdersPagination: React.FC<OrdersPaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}) => {
  const [jumpInput, setJumpInput] = React.useState<string>(String(page));

  React.useEffect(() => {
    setJumpInput(String(page));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const handleJump = (): void => {
    const target = Number.parseInt(jumpInput, 10);
    if (Number.isNaN(target)) return;
    const clamped = Math.min(Math.max(target, 1), totalPages);
    if (clamped !== page) onPageChange(clamped);
    else setJumpInput(String(page));
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm">
      <span className="text-muted-foreground">
        第 {page} / {totalPages} 页 · 共 {total} 条
      </span>

      <div className="flex items-center gap-2">
        <Select
          value={String(pageSize)}
          onValueChange={(value: string) => {
            onPageSizeChange(Number.parseInt(value, 10));
          }}
        >
          <SelectTrigger className="h-8 w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size: number) => (
              <SelectItem key={size} value={String(size)}>
                {size} 条/页
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex items-center gap-1">
          <Input
            value={jumpInput}
            className="h-8 w-14 text-center"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setJumpInput(event.target.value);
            }}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') handleJump();
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleJump}
          >
            跳转
          </Button>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default OrdersPagination;
