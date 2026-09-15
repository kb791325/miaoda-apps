import * as XLSX from 'xlsx';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { ImportSchema } from '@/api/import-schemas';
import { customersApi, publicLeadsApi, leadsApi, accountApplicationsApi, industryRoisApi } from '@/api';
import { buildAttachmentProxyUrl, getCsrfToken } from '@/utils/attachment-utils';
import { extractErrorMessage } from '@/lib/error-utils';

export interface ImportDetailRow {
  row: number;
  ok: boolean;
  reason: string;
}

interface ApiEnvelope {
  code?: number;
  message?: string;
  data?: { record_id?: string; _id?: string; id?: string | number } | null;
}

export type BatchCreateFn = (
  rows: Record<string, unknown>[],
) => Promise<{ code: number; message?: string; data?: Array<{ success: boolean; error?: string }> | null }>;

const IMPORT_TASK_ENTITY = '任务-导入任务';
const EXPORT_TASK_ENTITY = '任务-导出任务';
const IMPORT_BATCH_SIZE = 50;
const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;

export function makeTaskNo(prefix: 'IMP' | 'EXP'): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const seq = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${prefix}${ymd}${seq}`;
}

function recordIdOf(res: ApiEnvelope): string | null {
  const d = res.data;
  if (!d) return null;
  const rid = d.record_id || d._id || (d.id !== undefined ? String(d.id) : '');
  return rid || null;
}

export async function uploadOriginalFile(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error('文件超过 25MB，无法上传原文档');
  }
  if (!file || file.size === 0) {
    throw new Error('文件为空，无法上传');
  }
  const form = new FormData();
  form.append('file', file);
  const data = await new Promise<{ code?: number; message?: string; data?: { file_token?: string } }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const prefix = (() => {
      if (typeof window === 'undefined') return '';
      const m = window.location.pathname.match(/^(\/app\/app_\w+\/)/);
      return m ? m[1] : '';
    })();
    xhr.open('POST', `${prefix}api/upload`);
    xhr.withCredentials = true;
    const csrf = (() => {
      if (typeof document === 'undefined') return null;
      const m2 = document.cookie.match(new RegExp(`(?:^|;\\s*)suda-csrf-token=([^;]+)`));
      return m2 ? decodeURIComponent(m2[1]) : null;
    })();
    if (csrf) xhr.setRequestHeader('x-suda-csrf-token', csrf);
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error(`上传失败 (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('网络错误，请重试'));
    xhr.send(form);
  });
  if (data.code !== 0 || !data.data?.file_token) {
    throw new Error(data.message || '原文档上传失败');
  }
  return data.data.file_token;
}

export async function parseImportFile(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error('文件中没有可读取的工作表');
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
  return raw.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k.replace(/\*+$/, '').trim()] = v;
    }
    return out;
  });
}

function getEntityBatchCreate(tableKey: string): BatchCreateFn | null {
  const map: Record<string, BatchCreateFn> = {
    客户管理: (rows) => customersApi.batchCreate(rows),
    '客户-公海客资': (rows) => publicLeadsApi.batchCreate(rows),
    '客户-线索': (rows) => leadsApi.batchCreate(rows),
    '广告-开户申请': (rows) => accountApplicationsApi.batchCreate(rows),
    '业务-行业ROI': (rows) => industryRoisApi.batchCreate(rows),
  };
  return map[tableKey] ?? null;
}

export function getEntityApiForSchema(schema: ImportSchema): BatchCreateFn | null {
  return getEntityBatchCreate(schema.tableKey);
}

export interface BatchWriteOutcome {
  successRows: number;
  failRows: number;
  details: ImportDetailRow[];
}

export async function batchWriteRows(
  batchCreate: BatchCreateFn,
  rows: Array<{ row: number; payload: Record<string, unknown> }>,
  onProgress?: (done: number, total: number) => void,
): Promise<BatchWriteOutcome> {
  const details: ImportDetailRow[] = [];
  let successRows = 0;
  let failRows = 0;
  for (let i = 0; i < rows.length; i += IMPORT_BATCH_SIZE) {
    const chunk = rows.slice(i, i + IMPORT_BATCH_SIZE);
    try {
      const res = await batchCreate(chunk.map((c) => c.payload));
      if (res.code !== 0) {
        for (const c of chunk) {
          failRows += 1;
          details.push({ row: c.row, ok: false, reason: res.message || '批量写入失败' });
        }
      } else {
        const results = res.data || [];
        chunk.forEach((c, idx) => {
          const r = results[idx];
          if (r && r.success) {
            successRows += 1;
            details.push({ row: c.row, ok: true, reason: '写入成功' });
          } else {
            failRows += 1;
            details.push({ row: c.row, ok: false, reason: (r && r.error) || '写入失败' });
          }
        });
      }
    } catch (e) {
      const msg = extractErrorMessage(e);
      for (const c of chunk) {
        failRows += 1;
        details.push({ row: c.row, ok: false, reason: msg });
      }
    }
    onProgress?.(Math.min(i + IMPORT_BATCH_SIZE, rows.length), rows.length);
  }
  return { successRows, failRows, details };
}

export async function createImportTaskRecord(input: {
  taskNo: string;
  taskType: string;
  fileName: string;
  totalRows: number;
  successRows: number;
  failRows: number;
  failDetail: ImportDetailRow[];
  docFileToken?: string;
}): Promise<void> {
  const body: Record<string, unknown> = {
    任务编号: input.taskNo,
    任务类型: input.taskType,
    文件名: input.fileName,
    总条数: input.totalRows,
    成功数: input.successRows,
    失败数: input.failRows,
    失败明细: JSON.stringify(input.failDetail),
    状态: '已完成',
  };
  if (input.docFileToken) {
    body['原文档'] = [{ file_token: input.docFileToken }];
  }
  const res = await axiosForBackend.post(`/api/entity/${encodeURIComponent(IMPORT_TASK_ENTITY)}`, body);
  const data = (res.data ?? {}) as ApiEnvelope;
  if (data.code !== 0) {
    throw new Error(data.message || '导入任务记录写入失败');
  }
}

export async function createProcessingImportTaskRecord(input: {
  taskNo: string;
  taskType: string;
  fileName: string;
  totalRows: number;
  docFileToken?: string;
}): Promise<string> {
  const body: Record<string, unknown> = {
    任务编号: input.taskNo,
    任务类型: input.taskType,
    文件名: input.fileName,
    总条数: input.totalRows,
    成功数: 0,
    失败数: 0,
    状态: '处理中',
  };
  if (input.docFileToken) {
    body['原文档'] = [{ file_token: input.docFileToken }];
  }
  const res = await axiosForBackend.post(`/api/entity/${encodeURIComponent(IMPORT_TASK_ENTITY)}`, body);
  const data = (res.data ?? {}) as ApiEnvelope;
  if (data.code !== 0) {
    throw new Error(data.message || '导入任务创建失败');
  }
  const rid = recordIdOf(data);
  if (!rid) throw new Error('导入任务创建未返回记录 ID');
  return rid;
}

export async function updateImportTaskRecord(
  recordId: string,
  patch: {
    completed: boolean;
    successRows: number;
    failRows: number;
    failDetail: ImportDetailRow[];
  },
): Promise<void> {
  const body: Record<string, unknown> = {
    状态: patch.completed ? '已完成' : '失败',
    成功数: patch.successRows,
    失败数: patch.failRows,
    失败明细: JSON.stringify(patch.failDetail),
  };
  const res = await axiosForBackend.put(
    `/api/entity/${encodeURIComponent(IMPORT_TASK_ENTITY)}/${encodeURIComponent(recordId)}`,
    body,
  );
  const data = (res.data ?? {}) as ApiEnvelope;
  if (data.code !== 0) {
    throw new Error(data.message || '导入任务状态更新失败');
  }
}

export async function createExportTaskRecord(input: {
  taskNo: string;
  taskType: string;
  conditions: string;
  fileName: string;
}): Promise<string> {
  const res = await axiosForBackend.post(`/api/entity/${encodeURIComponent(EXPORT_TASK_ENTITY)}`, {
    任务编号: input.taskNo,
    任务类型: input.taskType,
    导出条件: input.conditions,
    文件名: input.fileName,
    状态: '处理中',
  });
  const data = (res.data ?? {}) as ApiEnvelope;
  if (data.code !== 0) {
    throw new Error(data.message || '导出任务创建失败');
  }
  const rid = recordIdOf(data);
  if (!rid) throw new Error('导出任务创建未返回记录 ID');
  return rid;
}

export async function finishExportTaskRecord(
  recordId: string,
  patch: { completed: boolean; rowCount?: number; failReason?: string; fileName?: string },
): Promise<void> {
  const body: Record<string, unknown> = { 状态: patch.completed ? '已完成' : '失败' };
  if (patch.rowCount !== undefined) body['导出行数'] = patch.rowCount;
  if (patch.failReason) body['失败原因'] = patch.failReason;
  if (patch.fileName) body['文件名'] = patch.fileName;
  const res = await axiosForBackend.put(
    `/api/entity/${encodeURIComponent(EXPORT_TASK_ENTITY)}/${encodeURIComponent(recordId)}`,
    body,
  );
  const data = (res.data ?? {}) as ApiEnvelope;
  if (data.code !== 0) {
    throw new Error(data.message || '导出任务状态更新失败');
  }
}

function isDetailRow(v: unknown): v is ImportDetailRow {
  return typeof v === 'object' && v !== null && 'row' in v && 'ok' in v && 'reason' in v;
}

export function parseFailDetail(raw: unknown): ImportDetailRow[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(isDetailRow);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(isDetailRow);
    } catch {
      return [];
    }
  }
  return [];
}

interface AttachmentItem {
  file_token?: string;
  url?: string;
  tmp_url?: string;
  name?: string;
}

export function getAttachmentDownloadUrl(raw: unknown): string | null {
  const items: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'string' && raw.trim().startsWith('[')
      ? (() => {
          try {
            const parsed: unknown = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];
  for (const item of items) {
    if (typeof item === 'object' && item !== null) {
      const a = item as AttachmentItem;
      if (a.file_token) {
        return buildAttachmentProxyUrl(a.file_token);
      }
      const url = a.tmp_url || a.url;
      if (url) return url;
    }
  }
  return null;
}

export function getAttachmentFileToken(raw: unknown): string | null {
  const items: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'string' && raw.trim().startsWith('[')
      ? (() => {
          try {
            const parsed: unknown = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];
  for (const item of items) {
    if (typeof item === 'object' && item !== null) {
      const a = item as AttachmentItem;
      if (a.file_token) return a.file_token;
    }
  }
  return null;
}

export async function downloadFromUrl(url: string, fileName: string) {
  try {
    const csrfToken = getCsrfToken();
    const headers: Record<string, string> = {};
    if (csrfToken) headers['x-suda-csrf-token'] = csrfToken;
    const res = await fetch(url, { headers, credentials: 'include' });
    if (!res.ok) throw new Error(`下载失败 (${res.status})`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  }
}
