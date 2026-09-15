import { useState, useMemo, useCallback } from 'react';

export interface Column<T> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (record: T, index: number) => React.ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  defaultVisible?: boolean;
}

interface UseTableOptions<T> {
  data: T[];
  pageSize?: number;
  rowKey?: keyof T | ((record: T) => string);
}

export function useTable<T extends Record<string, any>>({
  data,
  pageSize = 20,
  rowKey = 'id' as keyof T,
}: UseTableOptions<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; order: 'asc' | 'desc' } | null>(null);
  const [pageSizeState, setPageSizeState] = useState(pageSize);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    const { key, order } = sortConfig;
    return [...data].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === bv) return 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        return order === 'asc' ? av - bv : bv - av;
      }
      return order === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [data, sortConfig]);

  const total = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSizeState));
  const safePage = Math.min(currentPage, totalPages);

  const pagedData = useMemo(() => {
    const start = (safePage - 1) * pageSizeState;
    return sortedData.slice(start, start + pageSizeState);
  }, [sortedData, safePage, pageSizeState]);

  const getRowKey = useCallback(
    (record: T): string => {
      if (typeof rowKey === 'function') return rowKey(record);
      return String(record[rowKey]);
    },
    [rowKey],
  );

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, order: 'desc' };
      if (prev.order === 'desc') return { key, order: 'asc' };
      return null;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedKeys(pagedData.map((r) => getRowKey(r)));
    } else {
      setSelectedKeys([]);
    }
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    setSelectedKeys((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  const isAllSelected = pagedData.length > 0 && pagedData.every((r) => selectedKeys.includes(getRowKey(r)));

  return {
    data: pagedData,
    allData: sortedData,
    total,
    currentPage: safePage,
    setCurrentPage,
    pageSize: pageSizeState,
    setPageSize: (v: number) => {
      setPageSizeState(v);
      setCurrentPage(1);
    },
    selectedKeys,
    setSelectedKeys,
    isAllSelected,
    handleSelectAll,
    handleSelectRow,
    sortConfig,
    handleSort,
    getRowKey,
  };
}
