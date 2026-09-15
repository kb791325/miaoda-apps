const FIXED_ASSET_L1_KEYWORDS = [
  '固定资产',
  '资产采购',
  '设备采购',
  '办公设备采购',
];

const FIXED_ASSET_L2_KEYWORDS = [
  '固定资产',
  '办公设备',
  '电子设备',
  '电脑',
  '笔记本',
  '手机',
  '打印机',
  '投影仪',
  '家具',
  '办公桌椅',
  '服务器',
  '网络设备',
  '摄像头',
  '主机',
];

export function isFixedAsset(
  categoryL1: string,
  categoryL2: string,
): boolean {
  const l1 = categoryL1 ?? '';
  const l2 = categoryL2 ?? '';
  return (
    FIXED_ASSET_L1_KEYWORDS.some((kw) => l1.includes(kw)) ||
    FIXED_ASSET_L2_KEYWORDS.some((kw) => l2.includes(kw))
  );
}

export function inferAssetType(categoryL2: string): string {
  return categoryL2 ?? '';
}
