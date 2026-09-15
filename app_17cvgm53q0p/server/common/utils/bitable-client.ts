import { Injectable, Inject, Logger } from '@nestjs/common';
import { CapabilityService } from '@lark-apaas/fullstack-nestjs-core';

/**
 * feishu-bitable 插件统一调用封装（服务端侧）。
 * 所有读写格式遵循 plugin-guide table.md：
 * - Text 写 string / 读 { text }
 * - Number 读写 number
 * - DateTime 写读均为毫秒时间戳 number
 * - SingleSelect 写读均 string，必须匹配 enumValues
 * - Formula 读 { bizType, value }（只读）
 */
export interface BitableFilterCondition {
  fieldName: string;
  operator:
    | 'is'
    | 'isNot'
    | 'contains'
    | 'doesNotContain'
    | 'isEmpty'
    | 'isNotEmpty'
    | 'isGreater'
    | 'isGreaterEqual'
    | 'isLess'
    | 'isLessEqual';
  value?: string[];
}

export interface BitableFilter {
  conjunction: 'and' | 'or';
  conditions: BitableFilterCondition[];
}

export interface BitableSort {
  fieldName: string;
  desc: boolean;
}

export interface BitableRecordItem {
  id: string;
  record: Record<string, unknown>;
}

export interface BitableSearchOutput {
  records: BitableRecordItem[];
  total: number;
  hasMore: boolean;
  pageToken?: string;
}

export interface BitableMeasure {
  fieldName: string;
  aggregation:
    | 'sum'
    | 'count'
    | 'count_all'
    | 'avg'
    | 'min'
    | 'max'
    | 'distinct_count';
  alias: string;
}

export interface BitableAggregateOutput {
  result: Array<Record<string, { value: unknown }>>;
  hasMore: boolean;
  pageToken?: string;
}

export interface BitableAddOutput {
  records: Array<{ id: string }>;
}

export interface BitableUpdateOutput {
  records: Array<{ id: string }>;
}

export interface BitableDeleteOutput {
  success: boolean;
}

/** 只读 action（幂等）：支持超时 + 重试 */
const READ_ACTIONS: ReadonlySet<string> = new Set([
  'searchRecords',
  'getRecord',
  'aggregateQuery',
]);

/** 单次读调用超时（毫秒） */
const READ_TIMEOUT_MS = 15000;

/** 读调用最大尝试次数（含首次） */
const MAX_READ_ATTEMPTS = 3;

/** 重试退避基数（毫秒，按尝试次数线性递增） */
const RETRY_BACKOFF_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class BitableClient {
  private readonly logger = new Logger(BitableClient.name);

  constructor(
    @Inject() private readonly capabilityService: CapabilityService,
  ) {}

  async searchRecords(
    instanceId: string,
    input: {
      filter?: BitableFilter;
      sort?: BitableSort[];
      pageSize?: number;
      pageToken?: string;
      fieldNames?: string[];
    },
  ): Promise<BitableSearchOutput> {
    return this.call<BitableSearchOutput>(instanceId, 'searchRecords', input);
  }

  async getRecord(
    instanceId: string,
    recordID: string,
  ): Promise<{ id: string; record: Record<string, unknown> }> {
    return this.call(instanceId, 'getRecord', { recordID });
  }

  async batchAddRecords(
    instanceId: string,
    records: Array<{ record: Record<string, unknown> }>,
  ): Promise<BitableAddOutput> {
    return this.call<BitableAddOutput>(instanceId, 'batchAddRecords', {
      records,
    });
  }

  async batchUpdateRecords(
    instanceId: string,
    records: Array<{ id: string; record: Record<string, unknown> }>,
  ): Promise<BitableUpdateOutput> {
    return this.call<BitableUpdateOutput>(instanceId, 'batchUpdateRecords', {
      records,
    });
  }

  async deleteRecords(
    instanceId: string,
    recordIDs: string[],
  ): Promise<BitableDeleteOutput> {
    return this.call<BitableDeleteOutput>(instanceId, 'deleteRecords', {
      recordIDs,
    });
  }

  async aggregateQuery(
    instanceId: string,
    input: {
      dimensions?: string[];
      measures?: BitableMeasure[];
      filter?: BitableFilter;
      sort?: BitableSort[];
      pageSize?: number;
      expandArrayDimension?: boolean;
    },
  ): Promise<BitableAggregateOutput> {
    return this.call<BitableAggregateOutput>(instanceId, 'aggregateQuery', input);
  }

  private async call<T>(
    instanceId: string,
    actionKey: string,
    input: Record<string, unknown>,
  ): Promise<T> {
    const isRead: boolean = READ_ACTIONS.has(actionKey);
    const maxAttempts: number = isRead ? MAX_READ_ATTEMPTS : 1;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.callOnce<T>(instanceId, actionKey, input, isRead);
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `bitable plugin call failed (attempt ${attempt}/${maxAttempts}): ${JSON.stringify({
            pluginInstanceId: instanceId,
            actionKey,
            outputMode: 'unary',
            inputKeys: Object.keys(input),
            error: message,
          })}`,
        );
        if (attempt < maxAttempts) {
          await delay(RETRY_BACKOFF_MS * attempt);
        }
      }
    }
    throw lastError;
  }

  private async callOnce<T>(
    instanceId: string,
    actionKey: string,
    input: Record<string, unknown>,
    applyTimeout: boolean,
  ): Promise<T> {
    const callPromise: Promise<unknown> = this.capabilityService
      .load(instanceId)
      .call(actionKey, input);
    if (!applyTimeout) {
      return (await callPromise) as T;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const output: unknown = await Promise.race([
        callPromise,
        new Promise((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  `bitable call timeout after ${READ_TIMEOUT_MS}ms: ${actionKey}`,
                ),
              ),
            READ_TIMEOUT_MS,
          );
        }),
      ]);
      return output as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** 读取 Text 字段：{ text } → string */
export function readTextField(value: unknown): string {
  if (value && typeof value === 'object' && 'text' in value) {
    return String((value as { text: unknown }).text ?? '');
  }
  return '';
}

/** 读取 Number 字段：number */
export function readNumberField(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

/** 读取 DateTime 字段：毫秒时间戳 → ISO 字符串 */
export function readDateField(value: unknown): string {
  return typeof value === 'number' ? new Date(value).toISOString() : '';
}

/** 读取 Formula 字段值：{ bizType, value } → 原始 value */
export function readFormulaValue(value: unknown): unknown {
  if (value && typeof value === 'object' && 'value' in value) {
    return (value as { value: unknown }).value;
  }
  return undefined;
}

/** Formula 值按字符串读取（value 可能为富文本段落数组 [{text}] 或标量） */
export function readFormulaText(value: unknown): string {
  const raw = readFormulaValue(value);
  if (Array.isArray(raw)) {
    return raw
      .map((seg): string => {
        if (seg && typeof seg === 'object' && 'text' in seg) {
          return String((seg as { text: unknown }).text ?? '');
        }
        return String(seg ?? '');
      })
      .join('');
  }
  return raw === undefined || raw === null ? '' : String(raw);
}

/** Formula 值按数字读取（value 可能为 [number] 或标量） */
export function readFormulaNumber(value: unknown): number {
  const raw = readFormulaValue(value);
  if (Array.isArray(raw) && raw.length > 0) {
    const num = Number(raw[0]);
    return Number.isFinite(num) ? num : 0;
  }
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

/** 读取 Link 字段：{ link_record_ids: string[] } → 关联记录 ID 数组 */
export function readLinkIds(value: unknown): string[] {
  if (
    value &&
    typeof value === 'object' &&
    'link_record_ids' in value &&
    Array.isArray((value as { link_record_ids: unknown }).link_record_ids)
  ) {
    return (value as { link_record_ids: string[] }).link_record_ids;
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string' && value) {
    return [value];
  }
  return [];
}
