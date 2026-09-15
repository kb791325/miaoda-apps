import * as XLSX from 'xlsx';

export interface ExcelColumn<T> {
  header: string;
  /** 取值：直接取行字段或格式化函数 */
  value: (row: T) => string | number;
  width?: number;
}

/**
 * 前端 Excel 导出（xlsx 库，浏览器侧生成）。
 * @param filename 不含扩展名的文件名
 */
export function exportToExcel<T>(
  filename: string,
  sheetName: string,
  columns: ExcelColumn<T>[],
  rows: T[],
): void {
  const data = rows.map((row: T) =>
    columns.reduce<Record<string, string | number>>(
      (acc: Record<string, string | number>, col: ExcelColumn<T>) => {
        acc[col.header] = col.value(row);
        return acc;
      },
      {},
    ),
  );
  const sheet = XLSX.utils.json_to_sheet(data);
  sheet['!cols'] = columns.map((col: ExcelColumn<T>) => ({
    wch: col.width ?? 14,
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  XLSX.writeFile(book, `${filename}.xlsx`);
}
