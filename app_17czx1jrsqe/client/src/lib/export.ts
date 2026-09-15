import { toast } from 'sonner';

export interface CsvColumn {
  key: string;
  label: string;
}

function downloadCsv(filename: string, headerLine: string, bodyLines: string[]): void {
  const csv = `\uFEFF${headerLine}\n${bodyLines.join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * 按表头 + 二维行数据导出 CSV（兼容既有列表组件的导出调用）
 */
export function exportCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  downloadCsv(
    filename,
    headers.map(escapeCell).join(','),
    rows.map((r) => r.map(escapeCell).join(',')),
  );
}

/**
 * 将列表数据导出为 CSV 文件并触发浏览器下载（带 BOM，Excel 打开不乱码）
 */
export function exportRowsToCsv(
  filename: string,
  columns: CsvColumn[],
  rows: object[],
): void {
  if (rows.length === 0) {
    toast.warning('当前没有可导出的数据');
    return;
  }
  downloadCsv(
    filename,
    columns.map((c) => escapeCell(c.label)).join(','),
    rows.map((r) => columns.map((c) => escapeCell((r as Record<string, unknown>)[c.key])).join(',')),
  );
  toast.success(`已导出 ${rows.length} 条数据`);
}
