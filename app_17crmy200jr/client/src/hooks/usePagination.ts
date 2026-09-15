import { useState, useCallback, useMemo } from 'react';

interface UsePaginationOptions {
  /** 初始页码，默认 1 */
  initialPage?: number;
  /** 初始每页条数，默认 10 */
  initialPageSize?: number;
}

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetPage: () => void;
  /** 基于 total 计算的总页数 */
  total: number;
  setTotal: (total: number) => void;
}

/**
 * 分页状态管理 Hook
 * @param options 配置项
 */
export function usePagination(
  options: UsePaginationOptions = {},
): Omit<UsePaginationReturn, 'total' | 'setTotal'> & {
  total: number;
  setTotal: (total: number) => void;
  totalPages: number;
} {
  const { initialPage = 1, initialPageSize = 10 } = options;
  const [page, setPageState] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  const setPage = useCallback((nextPage: number) => {
    setPageState(Math.max(1, nextPage));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const resetPage = useCallback(() => {
    setPageState(1);
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  );

  return {
    page,
    pageSize,
    total,
    totalPages,
    setPage,
    setPageSize,
    resetPage,
    setTotal,
  };
}
