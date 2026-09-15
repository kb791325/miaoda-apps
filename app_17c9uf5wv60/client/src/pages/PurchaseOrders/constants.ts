import type { PurchaseOrderStatus } from '@shared/api.interface';

export const PAGE_SIZE = 20;

export const STATUS_OPTIONS: {
  value: 'all' | PurchaseOrderStatus;
  label: string;
}[] = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已审批' },
  { value: 'received', label: '已入库' },
  { value: 'cancelled', label: '已取消' },
];

export const STATUS_STYLES: Record<
  PurchaseOrderStatus,
  { label: string; className: string }
> = {
  pending: {
    label: '待审批',
    className: 'rounded-full bg-warning/10 text-warning border-warning/20',
  },
  approved: {
    label: '已审批',
    className: 'rounded-full bg-primary/10 text-primary border-primary/20',
  },
  received: {
    label: '已入库',
    className: 'rounded-full bg-success/10 text-success border-success/20',
  },
  cancelled: {
    label: '已取消',
    className: 'rounded-full bg-muted text-muted-foreground border-border',
  },
};

export const FALLBACK_WAREHOUSES: string[] = [
  '上海仓',
  '北京仓',
  '广州仓',
  '成都仓',
];

export function canApprove(status: PurchaseOrderStatus): boolean {
  return status === 'pending';
}

export function canReceive(status: PurchaseOrderStatus): boolean {
  return status === 'approved';
}

export function canCancel(status: PurchaseOrderStatus): boolean {
  return status === 'pending';
}

interface ApiErrorShape {
  response?: { data?: { error?: { message?: unknown } } };
  message?: unknown;
}

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const shaped: ApiErrorShape = err as ApiErrorShape;
    const apiMessage: unknown = shaped.response?.data?.error?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }
    if (typeof shaped.message === 'string' && shaped.message.trim()) {
      return shaped.message;
    }
  }
  return fallback;
}
