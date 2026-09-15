// EXPORTS: recordLoginEvent, fetchLoginLogs
// 使用登录日志表专用插件实例 (需在插件面板同步字段后提交)
import { logger, capabilityClient } from '@lark-apaas/client-toolkit';
import type { IAuditLog } from '@/lib/audit-log';

// 登录日志表健康实例（面板新建，tableID: tblC8sY9Yf588Hop）
const WORKING_INSTANCE = 'feishu_bitable_management_crud_analysis_71';

function textVal(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && 'text' in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>).text ?? '');
  }
  return String(v);
}

/** 记录一条登录事件到多维表格 */
export async function recordLoginEvent(params: {
  user?: string;
  status?: '成功' | '失败';
  failReason?: string;
}): Promise<void> {
  const now = Date.now();

  const record: Record<string, unknown> = {
    '登录时间': now,
    '登录状态': params.status ?? '成功',
    '用户': [0],
    '登录IP': '',
    '浏览器': typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : '',
    '失败原因': params.failReason ?? '',
    '操作系统': typeof navigator !== 'undefined' ? (navigator.platform ?? '') : '',
    '登录设备': '',
    '备注': '',
  };

  try {
    await capabilityClient.load(WORKING_INSTANCE).call('batchAddRecords', {
      records: [{ record }],
    });
    logger.info('登录日志已写入多维表格');
  } catch (e) {
    logger.error('登录日志写入失败', String(e));
  }
}

/** 从多维表格读取登录日志 */
export async function fetchLoginLogs(): Promise<IAuditLog[]> {
  try {
    const resp = (await capabilityClient.load(WORKING_INSTANCE).call('searchRecords', {
      sort: [{ fieldName: '登录时间', desc: true }],
      pageSize: 200,
    })) as {
      records: Array<{ id: string; record: Record<string, unknown> }>;
      hasMore: boolean;
      pageToken?: string;
      total: number;
    };

    return resp.records.map((r) => ({
      id: r.id,
      operator: textVal(r.record['用户']),
      action: '登录',
      module: '系统管理',
      description: `用户登录: ${textVal(r.record['用户'])}`,
      result: (String(r.record['登录状态'] ?? '成功') === '成功' ? '成功' : '失败') as '成功' | '失败',
      errorMessage: textVal(r.record['失败原因']),
      timestamp: Number(r.record['登录时间'] ?? 0),
      clientInfo: textVal(r.record['浏览器']),
    }));
  } catch (e) {
    logger.error('读取登录日志失败', String(e));
    return [];
  }
}