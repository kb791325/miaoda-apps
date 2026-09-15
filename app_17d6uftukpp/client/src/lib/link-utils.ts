// EXPORTS: extractLinkIds, extractTextValue, toPlainText
// 稳健提取多维表格 link 关联字段中的所有 record_id（已废弃，保留兼容）
// 文本外键提取函数（当前主用）
// 统一归一化函数（推荐）

/**
 * 从多维表格 link 关联字段的原始值中提取全部 record_id。
 * 兼容多种可能的数据形态：
 * - 字符串: "recvu20SlTu2fc" 或 "recA,recB"
 * - 数组 of 字符串: ["recA","recB"]
 * - 数组 of {id}: [{id:"recA"},{id:"recB"}] — 多维表格 link 字段最常见格式
 * - 数组 of {record_id}: [{record_id:"recA"}]
 * - 单对象 {id:"recA"} 或 {record_id:"recA"}
 * - 嵌套数组/混合格式自动降级展开
 *
 * @deprecated link 关联字段平台禁止读取，永远拿不到值，统一改用文本外键（extractTextValue）
 */
export function extractLinkIds(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];

  // 字符串: 可能是逗号分隔的多个 ID
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  // 数组
  if (Array.isArray(raw)) {
    const ids: string[] = [];
    for (const item of raw) {
      if (typeof item === 'string') {
        ids.push(item.trim());
      } else if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        // 优先取 id, 其次 record_id, 再 text
        const idVal = obj.id ?? obj.record_id ?? obj.recordId ?? obj.text;
        if (typeof idVal === 'string' && idVal.trim()) {
          ids.push(idVal.trim());
        } else if (typeof idVal === 'number') {
          ids.push(String(idVal));
        }
      }
    }
    return ids.filter((s) => s.length > 0);
  }

  // 单对象
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const idVal = obj.id ?? obj.record_id ?? obj.recordId ?? obj.text;
    if (typeof idVal === 'string' && idVal.trim()) return [idVal.trim()];
    if (typeof idVal === 'number') return [String(idVal)];
  }

  return [];
}

/**
 * 统一归一化：把插件运行时可能返回的任意形态文本值转为纯字符串。
 * 覆盖所有已知多维表格 Text 字段读取格式：
 * - string → 直接 trim
 * - number / boolean → String()
 * - { text: "..." } — 多维表格 Text 字段标准读取格式
 * - { value: "..." } / { name: "..." } / { id: "..." } / { record_id: "..." }
 * - [{ type: "text", text: "..." }] — 富文本片段数组
 * - [{ text: "..." }] — 数组 of 对象
 * - ["str1", "str2"] — 字符串数组 → join('') 后 trim
 * - 嵌套两层数组 → 递归展开
 *
 * 跨表过滤时，父 id 和子外键都先 toPlainText 再 trim 后比较。
 */
export function toPlainText(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number') return String(raw);
  if (typeof raw === 'boolean') return raw ? 'true' : 'false';

  if (Array.isArray(raw)) {
    // 递归展开每一层数组，取每个元素的纯文本并 join（去 null）
    return raw
      .map((item) => toPlainText(item))
      .filter(Boolean)
      .join('')
      .trim();
  }

  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    // 多维表格 Text 字段标准读取格式: { text: "..." }
    if (typeof o.text === 'string') return (o.text as string).trim();
    if (typeof o.text === 'number') return String(o.text);
    // 兼容 { value: "..." } / { name: "..." }
    if (typeof o.value === 'string') return (o.value as string).trim();
    if (typeof o.name === 'string') return (o.name as string).trim();
    // 兼容 { id: "..." } / { record_id: "..." }
    if (typeof o.id === 'string') return (o.id as string).trim();
    if (typeof o.record_id === 'string') return (o.record_id as string).trim();
    // 兼容 { type: "text", text: "..." } — 富文本片段
    if (typeof o.type === 'string' && typeof o.text === 'string') return (o.text as string).trim();
    return '';
  }

  return String(raw).trim();
}

/**
 * 从多维表格文本外键字段的原始值中提取纯文本。
 * 兼容多种可能的数据形态（内部调用 toPlainText）。
 *
 * 用于跨表过滤时按【文本外键字符串严格相等】匹配：
 * 当前父记录 record_id 与子行对应文本外键字段值 trim 后相等即命中。
 */
export function extractTextValue(raw: unknown): string {
  return toPlainText(raw);
}