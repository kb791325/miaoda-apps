import { useEffect, useState } from 'react';
import { departmentsApi } from '@/api';

export interface SelectOption {
  label: string;
  value: string;
}

/** 从「系统-部门」表加载启用部门下拉选项（加载失败返回空数组，不阻断页面） */
export function useDepartmentOptions(): SelectOption[] {
  const [options, setOptions] = useState<SelectOption[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await departmentsApi.list({ page: 1, pageSize: 100 });
        const rows: Array<Record<string, unknown>> = res?.data?.list || [];
        const opts: SelectOption[] = rows
          .filter((r) => String(r.status || 'active') !== 'disabled')
          .map((r) => String(r.name || '').trim())
          .filter(Boolean)
          .map((name) => ({ label: name, value: name }));
        if (!cancelled) setOptions(opts);
      } catch {
        if (!cancelled) setOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return options;
}
