import { TABLE_DATE_FIELDS, TABLE_JSON_TEXT_FIELDS } from '../../config/feishu.config';

const TS_THRESHOLD = 1e12;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function tsToDateStr(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function tsToDatetimeStr(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function isDateField(fieldName: string, dateFields: string[], datetimeFields: string[]): 'date' | 'datetime' | null {
  if (dateFields.includes(fieldName)) return 'date';
  if (datetimeFields.includes(fieldName)) return 'datetime';
  return null;
}

export function normalizeRecord(record: any, tableKey?: string): Record<string, any> {
  if (!record?.fields) return record || {};
  const result: Record<string, any> = { _id: record.record_id || record._id };

  const dateConfig = tableKey ? TABLE_DATE_FIELDS[tableKey] : undefined;
  const dateFields = dateConfig?.date ?? [];
  const datetimeFields = dateConfig?.datetime ?? [];

  for (const [key, value] of Object.entries(record.fields)) {
    const normalized = normalizeFieldValue(value);

    const jsonFields = tableKey ? TABLE_JSON_TEXT_FIELDS[tableKey] ?? [] : [];
    if (jsonFields.includes(key) && typeof normalized === 'string' && normalized.length > 0) {
      try {
        result[key] = JSON.parse(normalized);
      } catch {
        result[key] = normalized;
      }
      continue;
    }

    if (typeof normalized === 'number' && normalized >= TS_THRESHOLD) {
      const kind = isDateField(key, dateFields, datetimeFields);
      if (kind === 'date') {
        result[key] = tsToDateStr(normalized);
      } else if (kind === 'datetime') {
        result[key] = tsToDatetimeStr(normalized);
      } else {
        result[key] = normalized;
      }
    } else {
      result[key] = normalized;
    }
  }

  return result;
}

function normalizeFieldValue(value: any): any {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    const first = value[0];

    if (typeof first === 'object' && first !== null) {
      if ('text' in first && 'type' in first) {
        return value
          .map((item: any) => item.text)
          .join('')
          .trim();
      }

      if ('id' in first && 'name' in first) {
        return value.map((item: any) => ({
          id: item.id,
          name: item.name,
          ...(item.en_name ? { en_name: item.en_name } : {}),
        }));
      }

      if ('text' in first && !('type' in first)) {
        return value.map((item: any) => item.text).join(', ');
      }

      if ('link' in first || 'record_ids' in first || 'attachment_token' in first) {
        return value;
      }

      return value;
    }

    return value;
  }

  if (typeof value === 'object') {
    if ('text' in value && 'type' in value) {
      return value.text;
    }
    if ('id' in value && 'name' in value) {
      return { id: value.id, name: value.name };
    }
  }

  return value;
}

export const ATTACHMENT_FIELDS = new Set(['素材文件', '视频封面', '原文档', '简历附件']);

export function toBitableValue(fieldName: string, value: any, tableKey?: string): any {
  if (value === null || value === undefined || value === '') return null;

  const dateConfig = tableKey ? TABLE_DATE_FIELDS[tableKey] : undefined;
  const dateFields = dateConfig?.date ?? [];
  const datetimeFields = dateConfig?.datetime ?? [];
  const isDate = dateFields.includes(fieldName) || datetimeFields.includes(fieldName);

  const jsonFields = tableKey ? TABLE_JSON_TEXT_FIELDS[tableKey] ?? [] : [];
  if (jsonFields.includes(fieldName) && (Array.isArray(value) || typeof value === 'object')) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    const first = value[0];
    if (typeof first === 'object' && first !== null && 'id' in first && 'name' in first) {
      return value.map((item: any) => item.id);
    }
    if (ATTACHMENT_FIELDS.has(fieldName)) {
      const normalized: { file_token: string }[] = [];
      for (const item of value) {
        if (typeof item === 'string' && item.trim().length > 0) {
          normalized.push({ file_token: item.trim() });
        } else if (item && typeof item === 'object' && typeof item.file_token === 'string' && item.file_token.trim().length > 0) {
          normalized.push({ file_token: item.file_token.trim() });
        }
      }
      return normalized;
    }
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    if ('id' in value && 'name' in value) {
      return [value.id];
    }
  }

  if (isDate && typeof value === 'string') {
    const ts = new Date(value).getTime();
    if (!isNaN(ts)) return ts;
  }

  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value;

  return value;
}

export function buildKeywordFilter(keyword: string, fields: string[], numericFields?: string[]): any {
  if (!keyword || fields.length === 0) return null;

  const conditions: Array<{ field_name: string; operator: string; value: (string | number)[] }> = fields.map((field) => ({
    field_name: field,
    operator: 'contains' as const,
    value: [keyword],
  }));

  if (numericFields && numericFields.length > 0) {
    const num = Number(keyword);
    if (!isNaN(num)) {
      for (const nf of numericFields) {
        conditions.push({
          field_name: nf,
          operator: 'is' as const,
          value: [num],
        });
      }
    }
  }

  return {
    conjunction: 'or' as const,
    conditions,
  };
}

export function buildDateRangeFilter(
  fieldName: string,
  start?: string,
  end?: string,
): any {
  const conditions: Array<{ field_name: string; operator: string; value: number[] }> = [];

  if (start) {
    const startTime = new Date(start).getTime();
    if (!isNaN(startTime)) {
      conditions.push({
        field_name: fieldName,
        operator: 'isGreaterEqual',
        value: [startTime],
      });
    }
  }

  if (end) {
    const endTime = new Date(end).getTime();
    if (!isNaN(endTime)) {
      conditions.push({
        field_name: fieldName,
        operator: 'isLessEqual',
        value: [endTime],
      });
    }
  }

  if (conditions.length === 0) return null;

  return {
    conjunction: 'and',
    conditions,
  };
}

export function combineFilters(filters: any[]): any {
  const valid = filters.filter(Boolean);
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0];

  // 嵌套结构保留每个子过滤自身的 conjunction（如 keyword 的多字段 or），
  // 子组之间为 and 叠加
  return {
    conjunction: 'and',
    children: valid,
  };
}