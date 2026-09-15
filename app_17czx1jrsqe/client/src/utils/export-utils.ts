import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ExportColumn {
  key: string;
  title: string;
}

function formatCellValue(value: unknown): string | number {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function buildExportData(
  columns: ExportColumn[],
  records: Record<string, any>[],
): [string[], (string | number)[][]] {
  const headers = columns.map((c) => c.title);
  const rows = records.map((r) => columns.map((c) => formatCellValue(r[c.key])));
  return [headers, rows];
}

export function exportToExcel(filename: string, headers: string[], rows: (string | number)[][]): void {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet['!cols'] = headers.map((h, i) => ({
    wch: Math.min(40, Math.max(10, h.length + 4, ...rows.map((r) => String(r[i] ?? '').length + 2))),
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Sheet1');
  const buffer = XLSX.write(book, { type: 'array', bookType: 'xlsx' });
  saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `${filename}.xlsx`);
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const lines = [headers, ...rows].map((line) => line.map(escapeCsvCell).join(','));
  const content = '\ufeff' + lines.join('\r\n');
  saveAs(new Blob([content], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
}
