import type { ProductWithInventory } from '@shared/api.interface';

const EXPORT_HEADER: string[] = [
  '编码',
  '名称',
  '品类',
  '品牌',
  '规格',
  '单位',
  '安全库存',
  '单价',
  '总库存',
  '库存金额',
  '状态',
];

function formatCsvCell(cell: string): string {
  return `"${cell.replace(/"/g, '""')}"`;
}

export function buildProductsCsv(data: ProductWithInventory[]): string {
  const rows: string[][] = data.map((item: ProductWithInventory) => [
    item.code,
    item.name,
    item.category,
    item.brand,
    item.spec,
    item.unit,
    String(item.safetyStock),
    item.unitPrice.toFixed(2),
    String(item.totalQuantity),
    item.totalValue.toFixed(2),
    item.status === 'active' ? '上架' : '下架',
  ]);
  return [EXPORT_HEADER, ...rows]
    .map((row: string[]) => row.map(formatCsvCell).join(','))
    .join('\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob: Blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url: string = URL.createObjectURL(blob);
  const link: HTMLAnchorElement = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function getExportFilename(): string {
  const now: Date = new Date();
  const month: string = String(now.getMonth() + 1).padStart(2, '0');
  const day: string = String(now.getDate()).padStart(2, '0');
  return `products_${now.getFullYear()}${month}${day}.csv`;
}
