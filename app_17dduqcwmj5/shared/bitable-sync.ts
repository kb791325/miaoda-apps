export type BitableSyncStatus = 'synced' | 'failed' | 'not_synced';

export type BitableRecordType =
  | 'student'
  | 'schedule'
  | 'attendance'
  | 'course'
  | 'category'
  | 'faq'
  | 'faqMiss'
  | 'marketingContent'
  | 'material'
  | 'equipment'
  | 'processFlow'
  | 'formula'
  | 'lead'
  | 'followUp'
  | 'leave'
  | 'graduation';

export interface BitableRetryRequest {
  recordType: BitableRecordType;
  recordId: string;
}

export interface BitableSyncResult {
  syncStatus: BitableSyncStatus;
  bitableRecordId?: string;
  message?: string;
}

/**
 * 同步操作统一响应结构：与 BitableSyncResult 归并，
 * 保留两个名字兼容既有引用，BitableSyncResponse 为 BitableSyncResult 的别名。
 */
export type BitableSyncResponse = BitableSyncResult;

export interface BitableReconcileRequest {
  recordTypes: BitableRecordType[];
}

export interface BitableReconcileResultItem {
  recordType: BitableRecordType;
  deleted: number;
  skipped: boolean;
  message?: string;
}

export interface BitableReconcileResponse {
  results: BitableReconcileResultItem[];
}

export interface BitableRepairSummary {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
}

export interface BitableIngestSummary {
  inserted: number;
  updated: number;
  skipped: number;
}

export const BITABLE_SYNC_STATUS: Record<
  string,
  BitableSyncStatus
> = {
  synced: 'synced',
  failed: 'failed',
  not_synced: 'not_synced',
};

export function normalizeBitableSyncStatus(
  value: string | null | undefined,
): BitableSyncStatus {
  if (value === 'synced' || value === 'failed') {
    return value;
  }
  return 'not_synced';
}

export function resolveDisplaySyncStatus(
  syncStatus: string | null | undefined,
  bitableRecordId: string | null | undefined,
  baseRecordId: string | null | undefined,
): BitableSyncStatus {
  const status: BitableSyncStatus = normalizeBitableSyncStatus(syncStatus);
  if (status === 'not_synced' && !bitableRecordId && baseRecordId) {
    return 'synced';
  }
  return status;
}
