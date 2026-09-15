import { utils as XLSXUtils, writeFile as XLSXWriteFile } from 'xlsx';
import dayjs from 'dayjs';

export interface ExportColumn<T> {
  header: string;
  key: keyof T | string;
  accessor?: (row: T) => string | number | boolean | null;
}

export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  fileName: string,
  sheetName = '数据',
): void {
  const aoa: (string | number | boolean)[][] = [columns.map((c) => c.header)];
  for (const row of data) {
    const line = columns.map((c) => {
      if (c.accessor) return c.accessor(row);
      const v = (row as unknown as Record<string, unknown>)[c.key as string];
      if (v === null || v === undefined) return '';
      return v as string | number | boolean;
    });
    aoa.push(line);
  }
  const ws = XLSXUtils.aoa_to_sheet(aoa);
  ws['!cols'] = columns.map(() => ({ wch: 16 }));
  const wb = XLSXUtils.book_new();
  XLSXUtils.book_append_sheet(wb, ws, sheetName);
  const stamp = dayjs().format('YYYYMMDD-HHmmss');
  XLSXWriteFile(wb, `${fileName}-${stamp}.xlsx`);
}
