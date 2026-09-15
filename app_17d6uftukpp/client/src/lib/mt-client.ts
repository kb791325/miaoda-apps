// EXPORTS: MT_BITABLE_INSTANCE_ID, isPluginConfigured, isModuleBitableReady, fetchRecordsFromBitable, saveRecordToBitable, updateRecordInBitable, deleteRecordsFromBitable, formatDateTimeFull
// 多维表格「牧唐数智一体化系统」数据通道 (feishu-bitable 插件实例: feishu_multitable_crud_analysis_1)
// 协议要点 (对齐官方 feishu-bitable 插件 action 契约):
// - 字段一律使用「字段名称」(中文) 而非字段 ID; 前端字段 key 通过 IFieldConfig.bitableField 映射到真实列名
// - Text 读取为 [{text}] 富文本数组 / SingleSelect 为字符串 / MultiSelect 为 string[] / DateTime 为毫秒时间戳 / User 为 [{name}]
// - 读取: searchRecords 带 tableId, 返回 { records: [{ id, record: {字段: 值} }] }
// - 写入: batchAddRecords → { records: [{ record: {字段: 值} }] }; batchUpdateRecords → { records: [{ id, record: {字段: 值} }] }; deleteRecords → { recordIDs: [id1,id2] }
import { capabilityClient, logger } from '@lark-apaas/client-toolkit';
import { UserService } from '@lark-apaas/client-toolkit/tools/services';
import type { IBizRecord, ModuleKey } from '@/data/mt-records';
import { toPlainText } from '@/lib/link-utils';
import { MODULES, SUB_INSTANCE, CONFIG_INSTANCE, type IFieldConfig } from '@/config/modules';

/** 各模块对应的多维表格插件实例 ID (一个实例固化绑定一张数据表) */
const MAIN_INSTANCE: Record<string, string> = {
  customer: 'feishu_multitable_crud_analysis_1',
  ad: 'feishu_multitable_crud_analysis_2',
  video: 'feishu_multitable_crud_analysis_3',
  contract: 'feishu_multitable_crud_analysis_4',
  finance: 'feishu_multitable_crud_analysis_5',
  hr: 'feishu_multitable_crud_analysis_6',
  admin: 'feishu_multitable_crud_analysis_7',
  task: 'feishu_multitable_crud_analysis_8',
  system: 'feishu_multitable_crud_analysis_9',
  support: 'feishu_multitable_crud_analysis_10',
};
/** 10 主模块实例 + 58 子表实例 + 2 报表配置实例(共 70 张数据表) */
const MODULE_INSTANCE: Record<string, string> = { ...MAIN_INSTANCE, ...SUB_INSTANCE, ...CONFIG_INSTANCE };
export const MT_BITABLE_INSTANCE_ID = MAIN_INSTANCE.customer;

/** 按模块取对应的插件实例 */
function getModuleInstance(moduleKey: ModuleKey): string {
  return MODULE_INSTANCE[moduleKey] ?? MT_BITABLE_INSTANCE_ID;
}

export function isPluginConfigured(): boolean {
  return MT_BITABLE_INSTANCE_ID.trim().length > 0;
}

/** 模块是否已真实接入多维表格 (插件实例配置 + 模块已启用) */
export function isModuleBitableReady(moduleKey: ModuleKey): boolean {
  return isPluginConfigured() && Boolean(MODULES[moduleKey].bitableEnabled);
}

interface BitableFieldMap {
  record_id?: string;
  fields?: Record<string, unknown>;
}

interface SearchRecordsResponse {
  records?: BitableFieldMap[];
  hasMore?: boolean;
  total?: number;
}

interface AddRecordsResponse {
  records?: { id?: string }[];
}

/** 读取格式归一: Text/AutoNumber -> { text }, 数组拼接, 对象降级序列化。link 字段 [{id}] 提取 id 逗号拼接 */
function normalizeBitableValue(raw: unknown): string | number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'boolean') return raw ? '是' : '否';
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    // 统一走 toPlainText 归一化 (兼容 [{text}], ["str"], [{type,text}] 等所有富文本形态)
    const plain = toPlainText(raw);
    return plain || undefined;
  }
  if (typeof raw === 'object') {
    // 统一走 toPlainText 归一化 (兼容 {text}, {type,text}, [{text}] 等所有富文本形态)
    const plain = toPlainText(raw);
    return plain || undefined;
  }
  return undefined;
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0) {
    return `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return date;
}

/** 格式化毫秒时间戳为 yyyy-MM-dd HH:mm (含时分) */
export function formatDateTimeFull(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 多维表格读取值 -> 前端展示值 (含枚举值反向映射) */
function fromBitableValue(field: IFieldConfig, normalized: string | number): string | number {
  if (field.type === 'date' && typeof normalized === 'number') {
    return formatDateTime(normalized);
  }
  if (field.fromBitableMap) {
    const key = String(normalized);
    return field.fromBitableMap[key] ?? normalized;
  }
  return normalized;
}

/** 前端表单值 -> 多维表格写入值 (Text=string / Url={text,link} / MultiSelect=string[] / DateTime=毫秒时间戳 / User=[{id}] / Number=number / Checkbox=boolean / 枚举映射) */
function toBitableValue(field: IFieldConfig, raw: string | number): unknown {
  if (raw === '' || raw === undefined || raw === null) return undefined;
  const mapped = field.toBitableMap ? (field.toBitableMap[String(raw)] ?? String(raw)) : raw;
  
  // Url: 多维表格 URL 字段期望 { text, link } 对象
  if (field.bitableType === 'Url') {
    const str = String(mapped);
    return { text: str, link: str };
  }
  // Number: 保持数字类型不转为字符串
  if (field.bitableType === 'Number') {
    const n = Number(mapped);
    return Number.isNaN(n) ? undefined : n;
  }
  // User: 多维表格人员字段期望 [{ id: string }] 数组
  if (field.bitableType === 'User') {
    const userId = String(raw);
    if (!userId || userId === '0') return undefined;
    return [{ id: userId }];
  }
  // Attachment: 多维表格附件字段, 传文件信息数组
  if (field.bitableType === 'Attachment') {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return undefined;
    } catch {
      return undefined;
    }
  }
  // Checkbox: 布尔值
  if (field.bitableType === 'Checkbox') {
    return mapped === 'true' || mapped === '是' || mapped === 1;
  }
  // MultiSelect: 字符串数组
  if (field.bitableType === 'MultiSelect') {
    return String(mapped).split(',').filter(Boolean);
  }
  // DateTime: 毫秒时间戳
  if (field.bitableType === 'DateTime') {
    const ts = new Date(String(mapped)).getTime();
    return Number.isNaN(ts) ? undefined : ts;
  }
  return mapped;
}

/** 安全序列化(防循环), 用于把插件原始返回/错误带到 UI 以便定位写库问题 */
function safeStringify(value: unknown, max = 900): string {
  try {
    const seen = new Set<unknown>();
    const s = JSON.stringify(value, (_key, v) => {
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[circular]';
        seen.add(v);
      }
      return v;
    });
    if (!s) return String(value);
    return s.length > max ? `${s.slice(0, max)}…` : s;
  } catch {
    return String(value);
  }
}
/** 从插件抛出的错误对象中抽取 name/code/message/extra 等关键信息 */
function describeError(e: unknown): string {
  if (e === null || e === undefined) return String(e);
  if (typeof e !== 'object') return String(e);
  const o = e as Record<string, unknown>;
  const parts: string[] = [];
  for (const k of ['name', 'code', 'errorCode', 'status', 'message', 'msg', 'extra']) {
    if (o[k] !== undefined && o[k] !== null) parts.push(`${k}=${safeStringify(o[k], 220)}`);
  }
  return `${parts.join(' | ')} || raw=${safeStringify(e, 600)}`;
}
/** 判定插件 resolve 的业务返回是否为失败(部分插件不 reject, 而是 resolve {code,msg}) */
function isBizFailure(resp: unknown): { fail: boolean; reason: string } {
  if (!resp || typeof resp !== 'object') return { fail: false, reason: '' };
  const r = resp as Record<string, unknown>;
  const code = r.code ?? r.Code ?? r.errCode ?? r.status_code;
  if (code !== undefined && code !== 0 && code !== '0' && code !== 200 && code !== '200') {
    return { fail: true, reason: `code=${safeStringify(code)} msg=${safeStringify(r.msg ?? r.message ?? '', 300)}` };
  }
  const success = r.success ?? r.ok;
  if (success === false) return { fail: true, reason: `success=false ${safeStringify(resp, 400)}` };
  return { fail: false, reason: '' };
}
function recordLastWrite(snapshot: Record<string, unknown>): void {
  try {
    (window as unknown as { __mtLastWrite?: unknown }).__mtLastWrite = { ...snapshot, at: Date.now() };
  } catch {
    /* ignore */
  }
}
/**
 * 从 searchRecords 返回的单行中稳健提取真实 record_id。
 * 兼容不同插件版本的字段位置/命名: 顶层 record_id | recordId | id, 嵌套 record.{record_id|recordId|id},
 * 最后用飞书 record_id 形如 recXXXXXX 的特征做有限深度兜底, 避免回退成 bt-index 占位导致更新/删除落空。
 */
function pickRecordId(rawRow: Record<string, unknown>, index: number): string {
  const nested =
    rawRow.record && typeof rawRow.record === 'object'
      ? ((rawRow.record as Record<string, unknown>) ?? {})
      : {};
  const directCandidates = [rawRow.id, rawRow.record_id, rawRow.recordId, nested.id, nested.record_id, nested.recordId];
  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  const RECORD_ID_RE = /^rec[A-Za-z0-9]{5,}$/;
  let hit: string | undefined;
  const seen = new Set<unknown>();
  const findDeep = (node: unknown, depth: number) => {
    if (hit !== undefined || depth > 4 || node === null || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);
    for (const value of Object.values(node as Record<string, unknown>)) {
      if (typeof value === 'string' && RECORD_ID_RE.test(value)) {
        hit = value;
        return;
      }
      if (typeof value === 'object') findDeep(value, depth + 1);
    }
  };
  findDeep(rawRow, 0);
  return hit ?? `bt-${index}`;
}
/** 多维表格中所有文本外键字段名（跨表过滤必需） */
export const TEXT_FK_FIELDS = ['关联客户ID', '关联项目ID', '关联合同ID', '关联采购单ID'];

/** 查询模块记录列表 (searchRecords)。extraFieldNames 仅跨表Tab链路B使用，主记录链路A不传 */
export async function fetchRecordsFromBitable(
  moduleKey: ModuleKey,
  extraFieldNames?: string[],
): Promise<IBizRecord[]> {
  const config = MODULES[moduleKey];
  const params: Record<string, unknown> = {};
  // 链路B：显式传 fieldNames 强制旧实例返回文本外键字段
  if (extraFieldNames && extraFieldNames.length > 0) {
    const allNames = Array.from(new Set([
        ...config.fields.map((f) => f.bitableField).filter((k): k is string => Boolean(k)),
        ...extraFieldNames,
      ]));
    if (allNames.length > 0) params.fieldNames = allNames;
  }
  const payload = (await capabilityClient.load(getModuleInstance(moduleKey)).call('searchRecords', params)) as SearchRecordsResponse;

  const userFields = config.fields.filter((f) => f.bitableType === 'User');
  const userIdSet = new Set<string>();

  const records = (payload?.records ?? []).map((row, index) => {
    // 兼容字段容器的不同位置: 官方格式 row.record 即字段容器; 也兼容 row.fields / row 本身即字段 map
    const rawRow = row as unknown as Record<string, unknown>;
    let source: Record<string, unknown> = {};
    // 优先: 官方格式 row.record 直接就是字段容器
    const rec = rawRow.record;
    if (rec && typeof rec === 'object') {
      const recFields = (rec as Record<string, unknown>).fields;
      if (recFields && typeof recFields === 'object' && Object.keys(recFields as object).length > 0) {
        source = recFields as Record<string, unknown>;
      } else {
        source = rec as Record<string, unknown>;
      }
    }
    // 回退: row.fields (旧格式)
    if (Object.keys(source).length === 0 && row.fields) {
      source = row.fields as Record<string, unknown>;
    }
    // 兜底: row 本身即字段 map
    if (Object.keys(source).length === 0 && !('record_id' in rawRow) && !('recordId' in rawRow) && !('id' in rawRow)) {
      source = rawRow;
    }
    const values: Record<string, string | number> = {};
    const fieldKeys = new Set(config.fields.map((f) => f.key));
    for (const field of config.fields) {
      // 依次按 真实列名 / 中文 label / 前端 key 取数, 最大化兼容
      const candidates = [field.bitableField, field.label, field.key].filter(
        (k): k is string => Boolean(k),
      );
      let normalized: string | number | undefined;
      for (const cand of candidates) {
        const rawValue = source[cand];
        // MultiSelect: 数组值用逗号连接，保持多选语义
        if (field.bitableType === 'MultiSelect' && Array.isArray(rawValue)) {
          const arr = rawValue as unknown[];
          const joined = arr
            .map((v: unknown) => {
              if (typeof v === 'string') return v;
              if (typeof v === 'object' && v !== null) {
                const o = v as Record<string, unknown>;
                return String(o.text ?? o.name ?? o.value ?? '');
              }
              return String(v);
            })
            .filter(Boolean)
            .join(',');
          if (joined) normalized = joined;
          break;
        }
        // Attachment: 保留原始数组为JSON字符串，供详情页渲染附件预览
        if (field.bitableType === 'Attachment' && Array.isArray(rawValue)) {
          const arr = rawValue as Record<string, unknown>[];
          if (arr.length > 0) {
            normalized = JSON.stringify(arr);
            break;
          }
          normalized = undefined;
          break;
        }
        normalized = normalizeBitableValue(rawValue);
        if (normalized !== undefined) break;
      }
      if (normalized !== undefined) {
        values[field.key] = fromBitableValue(field, normalized);
      }
    }
    // 捕获 config.fields 中未声明的额外字段 (如新增的文本外键字段「关联客户ID」「关联项目ID」等)
    let extraCount = 0;
    for (const [rawKey, rawVal] of Object.entries(source)) {
      if (fieldKeys.has(rawKey) || rawVal === undefined || rawVal === null) continue;
      const normalized = normalizeBitableValue(rawVal);
      if (normalized !== undefined) {
        values[rawKey] = normalized;
        extraCount++;
      }
    }
    if (index === 0 && extraCount > 0) {
      logger.info(`fetchRecords[${moduleKey}] extra fields captured: ${extraCount}, raw keys: ${Object.keys(source).filter(k => !fieldKeys.has(k)).slice(0, 10).join(', ')}`);
    }
    const createdRaw = normalizeBitableValue(source['创建时间']);
    const result = {
      recordId: pickRecordId(rawRow, index),
      createdAt: typeof createdRaw === 'number' ? formatDateTime(createdRaw) : String(createdRaw ?? ''),
      values,
      _userIds: userFields.length > 0 ? new Map(userFields.map((f) => [f.key, source[f.bitableField ?? f.label] as number[] | undefined])) : undefined,
    };
    if (index === 0) {
      (window as unknown as Record<string, unknown>).__mtDebug = { moduleKey, source, values, rawRow };
    }
    return result;
  });

  if (userFields.length > 0) {
    records.forEach((rec) => {
      if (!rec._userIds) return;
      rec._userIds.forEach((ids) => {
        if (Array.isArray(ids)) ids.forEach((id: number) => userIdSet.add(String(id)));
      });
    });
    if (userIdSet.size > 0) {
      try {
        const userIdArr = Array.from(userIdSet);
        const userSvc = new UserService();
        const resp = await userSvc.listUsersByIds(userIdArr);
        const userInfoMap: Record<string, { name?: { zh_cn?: string } }> = resp?.data?.userInfoMap ?? {};
        const idToName = new Map<string, string>();
        Object.keys(userInfoMap).forEach((id) => {
          idToName.set(id, userInfoMap[id]?.name?.zh_cn || id);
        });
        records.forEach((rec) => {
          if (!rec._userIds) return;
          rec._userIds.forEach((ids, key) => {
            if (Array.isArray(ids) && ids.length > 0) {
              rec.values[key] = ids.map((id: number) => idToName.get(String(id)) || String(id)).join(',');
            }
          });
        });
      } catch (e) {
        logger.warn('UserService.listUsersByIds 失败, 回退显示用户ID', String(e));
      }
    }
  }

  return records.map(({ _userIds, ...rest }) => ({ ...rest, _userIds: _userIds ? Object.fromEntries(Array.from(_userIds.entries()).map(([k, v]) => { const arr = Array.isArray(v) ? v : (v != null ? [v] : []); return [k, arr.map(String)]; })) : undefined }));
}

/** 新建记录 (batchAddRecords), 返回记录 ID */
export async function saveRecordToBitable(
  moduleKey: ModuleKey,
  values: Record<string, string | number>,
): Promise<string> {
  const config = MODULES[moduleKey];
  const record: Record<string, unknown> = {};
  for (const field of config.fields) {
    const raw = values[field.key];
    if (raw === undefined || raw === '') continue;
    const writeValue = toBitableValue(field, raw);
    if (writeValue !== undefined) {
      record[field.bitableField ?? field.key] = writeValue;
    }
  }
  const input = { records: [{ record }] };
  let payload: AddRecordsResponse;
  try {
    payload = (await capabilityClient.load(getModuleInstance(moduleKey)).call('batchAddRecords', input)) as AddRecordsResponse;
  } catch (e) {
    const detail = describeError(e);
    recordLastWrite({ phase: 'reject', action: 'batchAddRecords', input, error: detail });
    logger.error('mt-bitable batchAddRecords REJECT', detail);
    throw new Error(`多维表格新建被拒绝: ${detail}`);
  }
  const biz = isBizFailure(payload);
  recordLastWrite({ phase: 'resolve', action: 'batchAddRecords', input, resp: safeStringify(payload), fail: biz.fail });
  if (biz.fail) throw new Error(`多维表格新建返回失败: ${biz.reason}`);
  const recordId = payload?.records?.[0]?.id;
  if (!recordId) {
    logger.warn('mt-bitable 新建记录未返回 record_id', moduleKey, safeStringify(payload));
  }
  return recordId ?? `bt-${Date.now()}`;
}

/** 更新记录字段 (batchUpdateRecords) */
export async function updateRecordInBitable(
  moduleKey: ModuleKey,
  recordId: string,
  patch: Record<string, string | number>,
): Promise<void> {
  const config = MODULES[moduleKey];
  const record: Record<string, unknown> = {};
  for (const field of config.fields) {
    const raw = patch[field.key];
    if (raw === undefined || raw === '') continue;
    const writeValue = toBitableValue(field, raw);
    if (writeValue !== undefined) {
      record[field.bitableField ?? field.key] = writeValue;
    }
  }
  const input = { records: [{ id: recordId, record }] };
  let resp: unknown;
  try {
    resp = await capabilityClient.load(getModuleInstance(moduleKey)).call('batchUpdateRecords', input);
  } catch (e) {
    const detail = describeError(e);
    recordLastWrite({ phase: 'reject', action: 'batchUpdateRecords', input, error: detail });
    logger.error('mt-bitable batchUpdateRecords REJECT', detail);
    throw new Error(`多维表格写入被拒绝: ${detail}`);
  }
  const biz = isBizFailure(resp);
  recordLastWrite({ phase: 'resolve', action: 'batchUpdateRecords', input, resp: safeStringify(resp), fail: biz.fail });
  if (biz.fail) throw new Error(`多维表格写入返回失败: ${biz.reason}`);
}

/** 删除记录 (deleteRecords); records 为 [{record_id}] 对象数组, 对齐官方 feishu-bitable deleteRecords 契约 */
export async function deleteRecordsFromBitable(
  moduleKey: ModuleKey,
  recordIds: string[],
): Promise<void> {
  if (recordIds.length === 0) return;
  const config = MODULES[moduleKey];
  const batchSize = 500;
  for (let i = 0; i < recordIds.length; i += batchSize) {
    const chunk = recordIds.slice(i, i + batchSize);
    let resp: unknown;
    try {
      resp = await capabilityClient.load(getModuleInstance(moduleKey)).call('deleteRecords', { recordIDs: chunk });
    } catch (e) {
      const detail = describeError(e);
      recordLastWrite({ phase: 'reject', action: 'deleteRecords', input: { recordIDs: chunk }, error: detail });
      logger.error('mt-bitable deleteRecords REJECT', detail);
      throw new Error(`多维表格删除被拒绝: ${detail}`);
    }
    const biz = isBizFailure(resp);
    recordLastWrite({ phase: 'resolve', action: 'deleteRecords', input: { recordIDs: chunk }, resp: safeStringify(resp), fail: biz.fail });
    if (biz.fail) throw new Error(`多维表格删除返回失败: ${biz.reason}`);
  }
}
