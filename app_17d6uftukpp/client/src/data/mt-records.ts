// EXPORTS: ModuleKey, IBizRecord, DEMO_RECORDS
// 牧唐数智一体化 · 业务记录类型定义

/** 10 个一级主模块 */
export type MainModuleKey =
  | 'customer'
  | 'ad'
  | 'video'
  | 'contract'
  | 'finance'
  | 'hr'
  | 'admin'
  | 'task'
  | 'system'
  | 'support';
/** 模块标识: 10 个主模块 + 58 张业务子表(子表 key 见 config/sub-modules.ts), 统一为 string 以支持配置驱动扩展 */
export type ModuleKey = string;

export interface IBizRecord {
  /** 记录 ID (来自多维表格) */
  recordId: string;
  createdAt: string;
  updatedAt?: string;
  values: Record<string, string | number>;
  /** 用户字段原始ID映射 (key→userIds), 用于表单UserSelect组件 */
  _userIds?: Record<string, string[]>;
}

export const DEMO_RECORDS: Record<ModuleKey, IBizRecord[]> = {};
