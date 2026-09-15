import type { BitableSyncStatus } from '@shared/bitable-sync';

/** 筛选下拉中表示「全部」的哨兵值 */
export const ALL_VALUE: string = '__all__';

/** 多维表格同步状态文案（全站统一，唯一来源） */
export const SYNC_STATUS_LABEL: Record<BitableSyncStatus, string> = {
  synced: '已同步',
  failed: '同步失败',
  not_synced: '未同步',
};

/** 多维表格同步状态徽章样式（全站统一，唯一来源） */
export const getSyncStatusBadgeClass = (
  status: BitableSyncStatus,
): string => {
  if (status === 'synced') {
    return 'bg-[hsl(140_60%_45%/0.12)] text-[hsl(140_60%_28%)]';
  }
  if (status === 'failed') {
    return 'bg-[hsl(5_75%_55%/0.12)] text-[hsl(5_75%_40%)]';
  }
  return 'bg-muted text-muted-foreground';
};
