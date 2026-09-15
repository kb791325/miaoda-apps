import { useCallback, useRef, useState } from 'react';
import {
  customersApi,
  filingsApi,
  contractsApi,
  purchaseOrdersApi,
  employeesApi,
} from '@/api';

export interface GlobalSearchItem {
  type: string;
  title: string;
  subtitle?: string;
  path: string;
  raw: Record<string, any>;
}

interface SearchEntityConfig {
  type: string;
  api: {
    list: (params: Record<string, any>) => Promise<{
      code: number;
      data?: { list: Record<string, any>[] };
    }>;
  };
  titleField: string;
  subtitleFields?: string[];
  listPath: string;
  detailPath?: (record: Record<string, any>) => string;
}

const SEARCH_ENTITIES: SearchEntityConfig[] = [
  {
    type: '客户',
    api: customersApi,
    titleField: 'customer_name',
    subtitleFields: ['customer_no', 'group_name'],
    listPath: '/customer/customers',
    detailPath: (r) => `/customer/customers/${r.id || r.record_id}`,
  },
  {
    type: '报备',
    api: filingsApi,
    titleField: 'entity_name',
    subtitleFields: ['filing_no', 'group_name'],
    listPath: '/advertising/filing',
  },
  {
    type: '合同',
    api: contractsApi,
    titleField: 'name',
    subtitleFields: ['contract_no', 'customer_name'],
    listPath: '/contract/contracts',
    detailPath: (r) => `/contract/contracts/${r.id || r.record_id}`,
  },
  {
    type: '采购订单',
    api: purchaseOrdersApi,
    titleField: 'supplier',
    subtitleFields: ['order_no', 'amount'],
    listPath: '/admin/purchase-order',
  },
  {
    type: '员工',
    api: employeesApi,
    titleField: 'name',
    subtitleFields: ['employee_no', 'department'],
    listPath: '/hr/employees',
    detailPath: (r) => `/hr/employees/${r.id || r.record_id}`,
  },
];

export function useGlobalSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((keyword: string) => {
    const kw = keyword.trim();
    if (!kw) {
      setResults([]);
      setLoading(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const promises = SEARCH_ENTITIES.map(async (entity) => {
        try {
          const res = await entity.api.list({
            keyword: kw,
            pageSize: 5,
          });
          if (res.code !== 0 || !res.data?.list) return [];
          return res.data.list.slice(0, 5).map((r) => {
            const title = String(r[entity.titleField] || '');
            const subtitle = (entity.subtitleFields || [])
              .map((f) => r[f])
              .filter((v) => v !== undefined && v !== null && v !== '')
              .join(' · ');
            const path = entity.detailPath
              ? entity.detailPath(r)
              : entity.listPath;
            return { type: entity.type, title, subtitle, path, raw: r };
          });
        } catch {
          return [];
        }
      });

      const allResults = await Promise.all(promises);
      setResults(allResults.flat());
      setLoading(false);
    }, 300);
  }, []);

  return { loading, results, search };
}
