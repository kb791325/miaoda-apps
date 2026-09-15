import { useCallback } from 'react';
import { toast } from 'sonner';
import type { ApiResponse, ListParams, PageResult } from '@/api/types';
import { useActionLock } from '@/hooks/useActionLock';
import { buildExportData, exportToCSV, exportToExcel } from '@/utils/export-utils';

export type ExportFormat = 'excel' | 'csv';

interface ExportColumn {
  key: string;
  title: string;
}

interface UseExportOptions {
  fetchFn: (params: ListParams) => Promise<ApiResponse<PageResult<any>>>;
  filename: string;
}

const EXPORT_PAGE_SIZE = 200;

export function useExport({ fetchFn, filename }: UseExportOptions) {
  const { withLock, locked } = useActionLock();

  const exportAs = useCallback(
    (
      format: ExportFormat,
      columns: ExportColumn[],
      filters: Record<string, any>,
      sortBy?: string,
      sortOrder?: 'asc' | 'desc',
    ) => {
      withLock(async () => {
        try {
          const all: Record<string, any>[] = [];
          let pageToken: string | undefined;
          do {
            const params: ListParams = { ...filters, page: 1, pageSize: EXPORT_PAGE_SIZE, pageToken, sortBy, sortOrder };
            const res = await fetchFn(params);
            if (res.code !== 0) {
              toast.error(res.message || '导出失败：获取数据失败');
              return;
            }
            all.push(...(res.data.list || []));
            pageToken = res.data.hasMore ? res.data.nextPageToken : undefined;
          } while (pageToken);

          if (all.length === 0) {
            toast.warning('当前筛选条件下无可导出的数据');
            return;
          }

          const [headers, rows] = buildExportData(columns, all);
          if (format === 'excel') exportToExcel(filename, headers, rows);
          else exportToCSV(filename, headers, rows);
          toast.success(`已导出 ${all.length} 条数据`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : '导出失败，请稍后重试');
        }
      });
    },
    [fetchFn, filename, withLock],
  );

  return { exporting: locked, exportAs };
}
