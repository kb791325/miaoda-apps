import { z } from 'zod';
import type { Supplier } from '@shared/api.interface';

export const SUPPLIER_PAGE_SIZE = 20;

export const SUPPLIER_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '合作中' },
  { value: 'paused', label: '已暂停' },
  { value: 'terminated', label: '已终止' },
];

export const SUPPLIER_FORM_STATUS_OPTIONS = [
  { value: 'active', label: '合作中' },
  { value: 'paused', label: '已暂停' },
  { value: 'terminated', label: '已终止' },
];

export const SUPPLIER_STATUS_BADGE_VARIANT: Record<string, string> = {
  active:
    'bg-[hsl(152_60%_42%_0.1)] text-[hsl(152_60%_36%)] border-[hsl(152_60%_42%_0.2)]',
  paused:
    'bg-[hsl(38_85%_50%_0.1)] text-[hsl(38_85%_40%)] border-[hsl(38_85%_50%_0.2)]',
  terminated:
    'bg-[hsl(4_75%_52%_0.1)] text-[hsl(4_75%_46%)] border-[hsl(4_75%_52%_0.2)]',
};

export const SUPPLIER_STATUS_LABEL: Record<string, string> = {
  active: '合作中',
  paused: '已暂停',
  terminated: '已终止',
};

export const supplierFormSchema = z.object({
  code: z.string().min(1, { message: '供应商编号不能为空' }),
  name: z.string().min(1, { message: '供应商名称不能为空' }),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  address: z.string().optional(),
  mainCategory: z.string().optional(),
  status: z.enum(['active', 'paused', 'terminated']),
  remark: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export function formatSupplierDate(dateStr: string): string {
  if (!dateStr) return '-';
  return dateStr.slice(0, 10);
}

export function formatSupplierAmount(amount: number): string {
  if (amount == null) return '0.00';
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/u.test(value)) {
    return `"${value.replace(/"/gu, '""')}"`;
  }
  return value;
}

export function getExportDateStamp(): string {
  const now: Date = new Date();
  const month: string = String(now.getMonth() + 1).padStart(2, '0');
  const day: string = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}${month}${day}`;
}

export function buildSuppliersCsv(data: Supplier[]): string {
  const header: string[] = [
    '编码', '名称', '联系人', '电话', '邮箱', '主营品类', '状态', '备注',
  ];
  const rows: string[][] = data.map((item: Supplier) => [
    item.code,
    item.name,
    item.contactPerson ?? '',
    item.phone ?? '',
    item.email ?? '',
    item.mainCategory ?? '',
    SUPPLIER_STATUS_LABEL[item.status] ?? item.status,
    item.remark ?? '',
  ]);
  return [header, ...rows]
    .map((row: string[]) => row.map(escapeCsvCell).join(','))
    .join('\n');
}

export function downloadCsvBlob(blob: Blob, filename: string): void {
  const url: string = URL.createObjectURL(blob);
  const link: HTMLAnchorElement = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
