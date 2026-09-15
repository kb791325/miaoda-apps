/**
 * 字段映射工具函数
 * - 飞书多维表格字段 → 本地字段 的读写转换
 * - 严格遵循 BizType 读写格式对照表（见 feishu-bitable readme）
 */

import type { FieldMapping } from './feishu-sync.types';

/**
 * 从飞书多维表格的 Text 字段值中提取纯文本
 * 飞书 API 真实返回格式为 [{ type: 'text', text: '...' }] 数组
 * 也兼容 { text: string } 对象和纯字符串格式
 */
function extractTextFromFeishu(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') return raw || null;
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    const parts: string[] = [];
    for (const item of raw) {
      if (typeof item === 'string') {
        parts.push(item);
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        if (typeof obj.text === 'string') parts.push(obj.text);
      }
    }
    return parts.length > 0 ? parts.join('') : null;
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text || null;
  }
  return null;
}

/**
 * 将飞书记录转换为本地数据库记录
 *
 * 读取格式注意：
 * - Text/Email/Barcode: { text: string } → string
 * - Number/Currency/Progress/Rating: number → number
 * - SingleSelect: string → string
 * - MultiSelect: string[] → string[]
 * - DateTime: number (毫秒时间戳) → ISO string
 * - Checkbox: boolean | null → boolean
 * - User: number[] → string (第一个用户ID或逗号拼接，这里取第一个)
 * - Url: { text, link } → string (取 link)
 */
export function feishuRecordToLocal(
  feishuRecord: Record<string, unknown>,
  fieldMapping: FieldMapping[],
): Record<string, unknown> {
  const local: Record<string, unknown> = {};

  for (const mapping of fieldMapping) {
    const { feishuField, localField, bizType } = mapping;
    const raw = feishuRecord[feishuField];

    if (raw === undefined || raw === null) {
      local[localField] = null;
      continue;
    }

    switch (bizType) {
      case 'Text':
      case 'Email':
      case 'Barcode':
      case 'Phone': {
        local[localField] = extractTextFromFeishu(raw);
        break;
      }
      case 'DateTime':
      case 'CreatedTime':
      case 'ModifiedTime': {
        let ts: number | null = null;
        if (typeof raw === 'number') {
          ts = raw;
        } else if (typeof raw === 'string' && raw) {
          ts = new Date(raw).getTime();
        } else if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).value)) {
          const arr = (raw as { value: unknown[] }).value;
          if (arr.length > 0 && (typeof arr[0] === 'number' || typeof arr[0] === 'string')) {
            ts = typeof arr[0] === 'number' ? arr[0] : new Date(arr[0] as string).getTime();
          }
        }
        local[localField] = ts !== null && !isNaN(ts) ? new Date(ts).toISOString() : null;
        break;
      }
      case 'Date': {
        let ts: number | null = null;
        if (typeof raw === 'number') {
          ts = raw;
        } else if (typeof raw === 'string' && raw) {
          ts = new Date(raw).getTime();
        } else if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).value)) {
          const arr = (raw as { value: unknown[] }).value;
          if (arr.length > 0 && (typeof arr[0] === 'number' || typeof arr[0] === 'string')) {
            ts = typeof arr[0] === 'number' ? arr[0] : new Date(arr[0] as string).getTime();
          }
        }
        local[localField] = ts !== null && !isNaN(ts) ? new Date(ts).toISOString().slice(0, 10) : null;
        break;
      }
      case 'Checkbox': {
        local[localField] = raw === true;
        break;
      }
      case 'Url': {
        const val = raw as { link?: string; text?: string } | null;
        local[localField] = val?.link ?? val?.text ?? null;
        break;
      }
      case 'Attachment':
      case 'Image': {
        const arr = raw as Array<{ file_token?: string; url?: string }> | null;
        if (Array.isArray(arr) && arr.length > 0) {
          local[localField] = arr[0]?.url ?? arr[0]?.file_token ?? null;
        } else {
          local[localField] = null;
        }
        break;
      }
      case 'User':
      case 'CreatedUser':
      case 'ModifiedUser': {
        let users = raw as unknown;
        if (users && typeof users === 'object' && Array.isArray((users as Record<string, unknown>).value)) {
          users = (users as { value: unknown[] }).value;
        }
        if (Array.isArray(users) && users.length > 0) {
          const first = users[0];
          if (typeof first === 'number' || typeof first === 'string') {
            local[localField] = String(first);
          } else if (first && typeof first === 'object') {
            const u = first as { id?: string; user_id?: string };
            local[localField] = u.id ?? u.user_id ?? null;
          } else {
            local[localField] = null;
          }
        } else if (typeof raw === 'number') {
          local[localField] = raw.toString();
        } else {
          local[localField] = null;
        }
        break;
      }
      case 'SingleSelect':
      case 'SingleLink': {
        if (typeof raw === 'string') {
          local[localField] = raw || null;
        } else if (raw && typeof raw === 'object') {
          const obj = raw as Record<string, unknown>;
          if (typeof obj.text === 'string') {
            local[localField] = obj.text || null;
          } else if (Array.isArray(obj.value) && obj.value.length > 0) {
            const v = obj.value[0];
            if (typeof v === 'string') {
              local[localField] = v || null;
            } else if (v && typeof v === 'object' && typeof (v as Record<string, unknown>).text === 'string') {
              local[localField] = (v as { text: string }).text || null;
            } else {
              local[localField] = null;
            }
          } else if (Array.isArray(raw) && raw.length > 0) {
            const first = raw[0];
            if (typeof first === 'string') {
              local[localField] = first;
            } else if (first && typeof first === 'object' && 'text' in (first as Record<string, unknown>)) {
              local[localField] = (first as { text?: string }).text ?? null;
            } else {
              local[localField] = null;
            }
          } else {
            local[localField] = null;
          }
        } else {
          local[localField] = null;
        }
        break;
      }
      case 'MultiSelect': {
        if (Array.isArray(raw)) {
          local[localField] = raw.map((item: unknown) =>
            typeof item === 'string' ? item : (item as { text?: string })?.text ?? '',
          );
        } else if (typeof raw === 'string') {
          local[localField] = [raw];
        } else {
          local[localField] = [];
        }
        break;
      }
      case 'Lookup':
      case 'Formula': {
        if (raw && typeof raw === 'object' && 'value' in (raw as Record<string, unknown>)) {
          const val = (raw as { value?: unknown }).value;
          if (Array.isArray(val) && val.length > 0) {
            local[localField] = typeof val[0] === 'string' ? val[0] : String(val[0]);
          } else if (typeof val === 'string' || typeof val === 'number') {
            local[localField] = String(val);
          } else {
            local[localField] = extractTextFromFeishu(raw);
          }
        } else if (Array.isArray(raw)) {
          const first = raw[0];
          if (first && typeof first === 'object' && 'text' in (first as Record<string, unknown>)) {
            local[localField] = (first as { text?: string }).text ?? null;
          } else if (typeof first === 'string') {
            local[localField] = first;
          } else {
            local[localField] = extractTextFromFeishu(raw);
          }
        } else {
          local[localField] = extractTextFromFeishu(raw);
        }
        break;
      }
      case 'Number':
      case 'Currency':
      case 'Progress':
      case 'Rating':
      case 'AutoNumber': {
        if (typeof raw === 'number') {
          local[localField] = raw;
        } else if (typeof raw === 'string' && raw) {
          const num = Number(raw);
          local[localField] = isNaN(num) ? null : num;
        } else if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).value)) {
          const arr = (raw as { value: unknown[] }).value;
          if (arr.length > 0) {
            const first = arr[0];
            if (typeof first === 'number') {
              local[localField] = first;
            } else if (typeof first === 'string') {
              const num = Number(first);
              local[localField] = isNaN(num) ? null : num;
            } else {
              local[localField] = null;
            }
          } else {
            local[localField] = null;
          }
        } else {
          local[localField] = null;
        }
        break;
      }
      default: {
        local[localField] = raw;
        break;
      }
    }
  }

  return local;
}

/**
 * 将本地数据库记录转换为飞书记录（写入格式）
 *
 * 写入格式注意：
 * - Text/Email/Barcode: string → string（非 { text: string }）
 * - Number/Currency/Progress/Rating: number → number
 * - SingleSelect: string → string
 * - MultiSelect: string[] → string[]
 * - DateTime: ISO string / Date → number (毫秒时间戳)
 * - Checkbox: boolean → boolean
 * - User: string → number[]
 * - Url: string → { text, link }
 */
export function localRecordToFeishu(
  localRecord: Record<string, unknown>,
  fieldMapping: FieldMapping[],
): Record<string, unknown> {
  const feishu: Record<string, unknown> = {};

  for (const mapping of fieldMapping) {
    const { feishuField, localField, bizType, skipOnPush } = mapping;
    if (skipOnPush) continue;
    const raw = localRecord[localField];

    if (raw === undefined || raw === null) {
      continue; // 跳过空值，飞书不写入
    }

    switch (bizType) {
      case 'DateTime': {
        if (typeof raw === 'string') {
          const t = new Date(raw).getTime();
          if (!Number.isNaN(t)) feishu[feishuField] = t;
        } else if (raw instanceof Date) {
          feishu[feishuField] = raw.getTime();
        } else if (typeof raw === 'number') {
          feishu[feishuField] = raw;
        }
        break;
      }
      case 'Date': {
        if (typeof raw === 'string') {
          const t = new Date(raw + 'T00:00:00Z').getTime();
          if (!Number.isNaN(t)) feishu[feishuField] = t;
        } else if (raw instanceof Date) {
          feishu[feishuField] = raw.getTime();
        } else if (typeof raw === 'number') {
          feishu[feishuField] = raw;
        }
        break;
      }
      case 'User':
      case 'CreatedUser':
      case 'ModifiedUser': {
        if (typeof raw === 'string' && raw) {
          const num = Number(raw);
          if (!Number.isNaN(num)) {
            feishu[feishuField] = [num];
          }
        }
        break;
      }
      case 'Url': {
        if (typeof raw === 'string') {
          feishu[feishuField] = { text: raw, link: raw };
        }
        break;
      }
      case 'Number':
      case 'Currency':
      case 'Progress':
      case 'Rating': {
        const num = Number(raw);
        if (!Number.isNaN(num)) {
          feishu[feishuField] = num;
        }
        break;
      }
      case 'Text':
      case 'Email':
      case 'Barcode':
      case 'SingleSelect':
      case 'MultiSelect':
      case 'Checkbox':
      case 'Phone':
      default: {
        feishu[feishuField] = raw;
        break;
      }
    }
  }

  return feishu;
}

/**
 * 从字段映射中提取飞书字段名列表
 */
export function extractFeishuFieldNames(fieldMapping: FieldMapping[]): string[] {
  return fieldMapping.map((m: FieldMapping) => m.feishuField);
}

/**
 * 校验字段映射是否包含 uniqueKey
 */
export function validateFieldMapping(
  fieldMapping: FieldMapping[],
  uniqueKey: string,
): void {
  if (!fieldMapping || fieldMapping.length === 0) {
    throw new Error('未配置字段映射');
  }
  const keys = uniqueKey.split(',').map((k) => k.trim());
  for (const key of keys) {
    if (key === 'feishu_record_id') continue;
    const hasKey = fieldMapping.some((m: FieldMapping) => m.localField === key);
    if (!hasKey) {
      throw new Error(`字段映射中未找到唯一键字段：${key}`);
    }
  }
}
