import React, { useMemo } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@client/src/components/ui/pagination';
import { useIsMobile } from '@client/src/hooks/use-mobile';
import { cn } from '@client/src/lib/utils';
import { getPageNumbers } from '@client/src/utils/pagination';
import type { PageToken } from '@client/src/utils/pagination';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  unit: string;
  onChange: (page: number) => void;
  className?: string;
}

const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  totalPages,
  total,
  unit,
  onChange,
  className,
}) => {
  const isMobile: boolean = useIsMobile();
  const pageTokens: PageToken[] = useMemo(
    () => getPageNumbers(page, totalPages, isMobile ? 0 : 1),
    [page, totalPages, isMobile],
  );

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        共 {total} {unit} · 第 {page} / {totalPages} 页
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onChange(Math.max(1, page - 1))}
              className={
                page <= 1
                  ? 'pointer-events-none opacity-40'
                  : 'cursor-pointer'
              }
            />
          </PaginationItem>
          {pageTokens.map((token: PageToken) => (
            <PaginationItem key={token}>
              {typeof token === 'number' ? (
                <PaginationLink
                  isActive={token === page}
                  onClick={() => onChange(token)}
                  className="cursor-pointer"
                >
                  {token}
                </PaginationLink>
              ) : (
                <PaginationEllipsis />
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => onChange(Math.min(totalPages, page + 1))}
              className={
                page >= totalPages
                  ? 'pointer-events-none opacity-40'
                  : 'cursor-pointer'
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export { PaginationBar };
