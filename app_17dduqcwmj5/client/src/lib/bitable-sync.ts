import {
  normalizeBitableSyncStatus,
  type BitableSyncStatus,
} from '@shared/bitable-sync';
import {
  getSyncStatusBadgeClass,
  SYNC_STATUS_LABEL,
} from '@client/src/utils/badge';

export const BITABLE_SYNC_STATUS_LABEL: Record<BitableSyncStatus, string> =
  SYNC_STATUS_LABEL;

export const getBitableSyncBadgeClass = getSyncStatusBadgeClass;

export const normalizeSyncStatus = (
  value: string | undefined,
): BitableSyncStatus => normalizeBitableSyncStatus(value);
