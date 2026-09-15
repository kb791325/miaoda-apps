import { useCallback, useMemo, useState } from 'react';

function recordKeyOf(record: Record<string, any>, rowKey?: string): string {
  const raw = rowKey ? record[rowKey] : record['id'] ?? record['_id'];
  return String(raw ?? '');
}

/**
 * 批量选择 Hook：跨页维护选中集合（Set），翻页/刷新不丢失已选记录
 */
export function useBatchSelection() {
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());

  const selectedKeys = useMemo(() => Array.from(selectedSet), [selectedSet]);

  const setKeys = useCallback((keys: string[]) => {
    setSelectedSet(new Set(keys));
  }, []);

  const toggle = useCallback((key: string) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isSelected = useCallback((key: string) => selectedSet.has(key), [selectedSet]);

  const toggleAllPage = useCallback((records: Record<string, any>[], rowKey?: string) => {
    const pageKeys = records.map((r) => recordKeyOf(r, rowKey)).filter(Boolean);
    setSelectedSet((prev) => {
      const allSelected = pageKeys.length > 0 && pageKeys.every((k) => prev.has(k));
      const next = new Set(prev);
      pageKeys.forEach((k) => (allSelected ? next.delete(k) : next.add(k)));
      return next;
    });
  }, []);

  const invertPage = useCallback((records: Record<string, any>[], rowKey?: string) => {
    const pageKeys = records.map((r) => recordKeyOf(r, rowKey)).filter(Boolean);
    setSelectedSet((prev) => {
      const next = new Set(prev);
      pageKeys.forEach((k) => {
        if (next.has(k)) next.delete(k);
        else next.add(k);
      });
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedSet(new Set()), []);

  return {
    selectedKeys,
    selectedCount: selectedKeys.length,
    isSelected,
    setKeys,
    toggle,
    toggleAllPage,
    invertPage,
    clear,
  };
}
