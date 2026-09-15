// 飞书多维表格通用客户端：封装 capabilityClient 对 6 个 feishu-bitable 插件实例的调用
import { capabilityClient, logger } from '@lark-apaas/client-toolkit-lite';

export const BITABLE_INSTANCES = {
  materials: 'ai_video_workshop_data_base_1',
  scripts: 'ai_video_workshop_storyboard_library_1',
  tasks: 'ai_video_creation_workshop_generation_task_table_1',
  videos: 'ai_video_workshop_video_warehouse_1',
  prompts: 'ai_video_creation_workshop_prompt_template_table_1',
} as const;

export type BitableKey = keyof typeof BITABLE_INSTANCES;

export interface BitableRawRecord {
  id: string;
  record: Record<string, unknown>;
}

interface SearchResponse {
  records?: { id: string; record?: Record<string, unknown> }[];
  hasMore?: boolean;
  pageToken?: string;
  total?: number;
}

interface AddResponse {
  records?: { id: string }[];
}

async function callBitable(key: BitableKey, actionKey: string, input: unknown): Promise<unknown> {
  try {
    const executor = (capabilityClient as unknown as { load: (id: string) => unknown }).load(BITABLE_INSTANCES[key]);
    const caller = executor as { call: (action: string, payload: unknown) => Promise<unknown> };
    if (typeof caller?.call !== 'function') {
      throw new Error(`插件实例不可用: ${BITABLE_INSTANCES[key]}`);
    }
    return await caller.call(actionKey, input);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    logger.error(`[bitable] ${key}.${actionKey} failed`, detail);
    // 包装成带表名与操作名的可读错误，供页面 toast 展示具体原因
    throw new Error(`${TABLE_LABELS[key]}${ACTION_LABELS[actionKey] ?? '操作'}失败（${detail}）`);
  }
}

const TABLE_LABELS: Record<BitableKey, string> = {
  materials: '爆款素材表',
  scripts: '分镜脚本表',
  tasks: '生成任务表',
  videos: '视频成品表',
  prompts: '提示词模板表',
};

const ACTION_LABELS: Record<string, string> = {
  batchAddRecords: '新增记录',
  batchUpdateRecords: '更新记录',
  deleteRecords: '删除记录',
  searchRecords: '查询记录',
};

/** 分页拉取某张表的全部记录（游标分页，每页 500 条） */
export async function fetchAllRecords(key: BitableKey): Promise<BitableRawRecord[]> {
  const out: BitableRawRecord[] = [];
  let pageToken: string | undefined;
  do {
    const res = (await callBitable(key, 'searchRecords', { pageSize: 500, pageToken })) as SearchResponse;
    for (const item of res?.records ?? []) {
      out.push({ id: item.id, record: (item.record ?? {}) as Record<string, unknown> });
    }
    pageToken = res?.hasMore ? res.pageToken : undefined;
  } while (pageToken);
  return out;
}

/** 批量新增记录，返回按顺序对应的记录 ID 列表 */
export async function addRecords(key: BitableKey, records: Record<string, unknown>[]): Promise<string[]> {
  if (records.length === 0) return [];
  const res = (await callBitable(key, 'batchAddRecords', {
    records: records.map((record) => ({ record })),
  })) as AddResponse;
  const ids = (res?.records ?? []).map((r) => r.id);
  if (ids.length !== records.length) {
    logger.warn(`[bitable] ${key} 新增记录数不匹配: ${ids.length}/${records.length}`);
  }
  return ids;
}

/** 更新单条记录（只传需要更新的字段） */
export async function updateRecord(key: BitableKey, id: string, record: Record<string, unknown>): Promise<void> {
  await callBitable(key, 'batchUpdateRecords', { records: [{ id, record }] });
}

/** 批量删除记录 */
export async function deleteRecords(key: BitableKey, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await callBitable(key, 'deleteRecords', { recordIDs: ids });
}
