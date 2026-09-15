import { CAPABILITY_INSTANCE_IDS } from '@server/common/constants/capability-instance-ids';
import {
  BitableClient,
  readTextField,
  type BitableRecordItem,
} from '@server/common/utils/bitable-client';

export interface PullSummary {
  added: number;
  updated: number;
  deleted: number;
  skipped: number;
}

export function emptySummary(): PullSummary {
  return { added: 0, updated: 0, deleted: 0, skipped: 0 };
}

/** 全量遍历实例记录（单表数据量小，上限 20 页防御） */
export async function searchAllRecords(
  bitable: BitableClient,
  instanceId: string,
): Promise<BitableRecordItem[]> {
  const all: BitableRecordItem[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 20; i += 1) {
    const out = await bitable.searchRecords(instanceId, {
      pageSize: 200,
      pageToken,
    });
    all.push(...out.records);
    if (!out.hasMore || !out.pageToken) break;
    pageToken = out.pageToken;
  }
  return all;
}

export async function loadProductNameMap(
  bitable: BitableClient,
): Promise<Map<string, string>> {
  const items = await searchAllRecords(
    bitable,
    CAPABILITY_INSTANCE_IDS.product,
  );
  const map = new Map<string, string>();
  for (const item of items) {
    map.set(item.id, readTextField(item.record['商品名称']));
  }
  return map;
}

export async function loadCustomerNameMap(
  bitable: BitableClient,
): Promise<Map<string, string>> {
  const items = await searchAllRecords(
    bitable,
    CAPABILITY_INSTANCE_IDS.customer,
  );
  const map = new Map<string, string>();
  for (const item of items) {
    map.set(item.id, readTextField(item.record['客户姓名']));
  }
  return map;
}
