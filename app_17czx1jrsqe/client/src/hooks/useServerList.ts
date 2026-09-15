import { useState, useEffect, useCallback, useRef } from 'react';
import type { ApiResponse, PageResult, ListParams } from '@/api/types';

interface UseServerListOptions {
  fetchFn: (params: ListParams) => Promise<ApiResponse<PageResult<any>>>;
  defaultParams?: Record<string, any>;
  defaultPageSize?: number;
  immediate?: boolean;
}

export function useServerList(
  options: UseServerListOptions,
) {
  const { fetchFn, defaultParams = {}, defaultPageSize = 20, immediate = true } = options;

  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [filters, setFilters] = useState<Record<string, any>>(defaultParams);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const pageTokensRef = useRef<(string | undefined)[]>([undefined]);

  const resetPageTokens = () => {
    pageTokensRef.current = [undefined];
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = pageTokensRef.current[page - 1];
      const params: ListParams = {
        ...filters,
        page,
        pageSize,
        pageToken: token,
        sortBy,
        sortOrder,
      };
      const res = await fetchFn(params);
      if (res.code === 0) {
        setData(res.data.list || []);
        setTotal(res.data.total || 0);
        if (res.data.hasMore && res.data.nextPageToken) {
          pageTokensRef.current[page] = res.data.nextPageToken;
        }
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFn, filters, page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    if (immediate) {
      loadData();
    }
  }, [loadData, immediate]);

  const handleSearch = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setPage(1);
    resetPageTokens();
  };

  const handleReset = () => {
    setFilters(defaultParams as Record<string, any>);
    setPage(1);
    resetPageTokens();
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
    setPage(1);
    resetPageTokens();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    resetPageTokens();
  };

  const refresh = () => {
    loadData();
  };

  return {
    data,
    total,
    loading,
    page,
    pageSize,
    filters,
    sortBy,
    sortOrder,
    setPage: handlePageChange,
    setPageSize: handlePageSizeChange,
    setFilters: handleSearch,
    handleSort,
    handleReset,
    refresh,
    reload: loadData,
  };
}