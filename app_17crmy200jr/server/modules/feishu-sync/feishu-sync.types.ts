/**
 * 飞书同步类型定义
 *
 * 注意：feishu_sync_configs / feishu_sync_logs 表的 schema
 * 由建表任务完成后自动生成到 server/database/schema.ts，
 * 此处先定义业务层使用的 DTO / 接口类型。
 */

import type { SyncDirection, SyncDomain, SyncStatus } from './feishu-sync.constants';

export type { SyncDirection, SyncDomain, SyncStatus };

/** 字段映射：飞书字段名 → 本地字段名 */
export interface FieldMapping {
  /** 飞书多维表格字段名（中文） */
  feishuField: string;
  /** 本地数据库字段名（snake_case） */
  localField: string;
  /** 字段类型，用于读写时的格式转换 */
  bizType?: string;
  /** 是否在 push（推送到飞书）时跳过该字段（飞书级联单选等不支持写入的字段） */
  skipOnPush?: boolean;
}

/** 同步配置（对应 feishu_sync_configs 表） */
export interface FeishuSyncConfig {
  id: string;
  domain: SyncDomain;
  /** 飞书多维表格 base_token */
  baseToken: string;
  /** 飞书多维表格 table_id */
  tableId: string;
  /** 同步方向 */
  syncDirection: SyncDirection;
  /** 字段映射配置 */
  fieldMapping: FieldMapping[];
  /** 唯一键字段（本地字段名），用于 upsert 匹配 */
  uniqueKey: string;
  /** 是否启用 */
  isEnabled: boolean;
  /** 最后同步时间 */
  lastSyncTime?: string;
  /** 最后同步状态 */
  lastSyncStatus?: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

/** 更新同步配置 DTO */
export interface UpdateSyncConfigDto {
  baseToken?: string;
  tableId?: string;
  syncDirection?: SyncDirection;
  fieldMapping?: FieldMapping[];
  uniqueKey?: string;
  isEnabled?: boolean;
}

/** 同步日志（对应 feishu_sync_logs 表） */
export interface FeishuSyncLog {
  id: string;
  domain: SyncDomain;
  /** 同步类型：full / incremental */
  syncType: string;
  /** 同步方向 */
  direction: SyncDirection;
  /** 状态 */
  status: SyncStatus;
  /** 处理记录数 */
  recordCount: number;
  /** 错误信息 */
  errorMessage?: string;
  /** 开始时间 */
  syncStartedAt?: string;
  /** 结束时间 */
  syncFinishedAt?: string;
  createdAt: string;
}

/** 同步执行结果 */
export interface SyncResult {
  domain: SyncDomain;
  direction: SyncDirection;
  status: SyncStatus;
  recordCount: number;
  errorMessage?: string;
  durationMs: number;
}

/** 手动触发同步请求体 */
export interface TriggerSyncBody {
  direction: SyncDirection;
}

/** 日志查询参数 */
export interface SyncLogQuery {
  domain?: SyncDomain;
  direction?: SyncDirection;
  status?: SyncStatus;
  page?: number;
  pageSize?: number;
}
