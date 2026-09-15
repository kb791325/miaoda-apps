import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import type { BitableSyncStatus } from '@shared/bitable-sync';
import {
  BITABLE_SYNC_STATUS_LABEL,
  getBitableSyncBadgeClass,
  normalizeSyncStatus,
} from '@client/src/lib/bitable-sync';

interface CourseSyncBadgeProps {
  syncStatus?: string;
  isSyncing: boolean;
  onRetry: () => void;
}

export const CourseSyncBadge: React.FC<CourseSyncBadgeProps> = ({
  syncStatus,
  isSyncing,
  onRetry,
}) => {
  const status: BitableSyncStatus = normalizeSyncStatus(syncStatus);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getBitableSyncBadgeClass(status)}`}
      >
        {BITABLE_SYNC_STATUS_LABEL[status]}
      </span>
      {status === 'failed' && (
        <Button
          data-ai-section-type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs text-primary"
          disabled={isSyncing}
          onClick={onRetry}
        >
          <RefreshCw className={isSyncing ? 'size-3 animate-spin' : 'size-3'} />
          重新同步
        </Button>
      )}
    </div>
  );
};
