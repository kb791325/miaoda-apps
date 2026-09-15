import type { AssetStatus } from '@shared/api.interface';

/**
 * 资产状态选项（含"全部"）
 */
export const ASSET_STATUS_OPTIONS: {
  value: AssetStatus | 'all';
  label: string;
}[] = [
  { value: 'all', label: '全部状态' },
  { value: 'in_stock', label: '在库' },
  { value: 'in_use', label: '在用' },
  { value: 'idle', label: '闲置' },
  { value: 'repairing', label: '维修' },
  { value: 'transferring', label: '调拨中' },
  { value: 'scrapped', label: '报废' },
];

