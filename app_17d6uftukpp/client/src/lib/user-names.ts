// EXPORTS: formatUserName, addUserNames, USER_NAME_MAP
// 人员 ID → 姓名映射工具
// 飞书多维表格中 User 类型字段返回数字 ID，需要映射为显示名称

export const USER_NAME_MAP: Record<string, string> = {
  // 以下为预设映射，可按需通过 addUserNames 扩展
  '1873394272310424': '张浩然',
};

/** 按 ID 获取显示名称，无映射时返回原始 ID */
export function formatUserName(id: string | number | undefined | null): string {
  if (id === null || id === undefined) return '—';
  const key = String(id);
  return USER_NAME_MAP[key] ?? key;
}

/** 批量添加映射 */
export function addUserNames(entries: Record<string, string>): void {
  Object.assign(USER_NAME_MAP, entries);
}