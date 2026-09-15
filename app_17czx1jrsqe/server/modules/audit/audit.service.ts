import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AuthNPaasService } from '@lark-apaas/fullstack-nestjs-core';
import { BitableService } from '../../common/feishu/bitable.service';
import { TABLE_MAP } from '../../config/feishu.config';

export interface RequestWithUser {
  userContext?: {
    userId: string;
    userName?: string;
    roles?: string[];
    departmentName?: string;
    department?: string;
  };
  ip?: string;
  headers?: Record<string, unknown>;
}

export interface OperationLogEntry {
  req: RequestWithUser;
  module: string;
  opType: string;
  objectType?: string;
  objectNo?: string;
  summary: string;
  result?: '成功' | '失败';
  failReason?: string;
}

export interface LoginLogEntry {
  req: RequestWithUser;
  mode: string;
  status?: '成功' | '失败';
  failReason?: string;
  sessionId?: string;
  remark?: string;
}

const OPERATION_TABLE = '系统-操作日志';
const LOGIN_TABLE = '系统-登录日志';

const OPERATION_ENSURE_FIELDS = [
  '操作人标识', '所属部门', '角色', '对象类型', '对象业务编号', '结果', '失败原因', '浏览器', '链路ID',
];

const LOGIN_ENSURE_FIELDS = ['用户标识', '登录方式', '设备', '失败原因', '会话标识', '备注'];

const SENSITIVE_KEY_PATTERN = /金额|充值|消耗|成本|利润|余额|密钥|密码|token|secret/i;
const MAX_SUMMARY_LENGTH = 900;

function nowStr(): string {
  const d = new Date();
  const pad = (x: number): string => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function maskValue(key: string, value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  if (SENSITIVE_KEY_PATTERN.test(key)) return '***';
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

export function buildFieldDiff(
  before: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
): string {
  const parts: string[] = [];
  for (const [key, next] of Object.entries(patch)) {
    if (key === '创建时间' || key === '更新时间') continue;
    const prev = before?.[key];
    const prevText = maskValue(key, prev);
    const nextText = maskValue(key, next);
    if (prevText === nextText) continue;
    parts.push(`${key}: ${prevText || '(空)'}→${nextText}`);
    if (parts.length >= 10) break;
  }
  if (parts.length === 0) return '(字段值无变化)';
  const diff = parts.join('; ');
  return diff.length > MAX_SUMMARY_LENGTH ? `${diff.slice(0, MAX_SUMMARY_LENGTH)}…` : diff;
}

function parseBrowser(ua: string): string {
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return ua ? '其他' : '';
}

function parseOs(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac os|macintosh/i.test(ua)) return 'macOS';
  if (/iphone|ipad|ios/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  if (/linux/i.test(ua)) return 'Linux';
  return '';
}

function parseDevice(ua: string): string {
  if (!ua) return '';
  return /mobile|android|iphone|ipad/i.test(ua) ? '移动端' : '桌面端';
}

function pickIp(req: RequestWithUser): string {
  const fwd = req.headers?.['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd;
  if (typeof first === 'string' && first.length > 0) return first.split(',')[0].trim();
  return req.ip || '';
}

function pickTraceId(req: RequestWithUser): string {
  const candidates = ['x-log-trace-id', 'x-trace-id', 'traceparent'];
  for (const key of candidates) {
    const value = req.headers?.[key];
    if (typeof value === 'string' && value.length > 0) return value.slice(0, 64);
  }
  return '';
}

function genLogNo(prefix: string): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 90 + 10)}`;
}

const LOGIN_DEDUP_TTL = 5 * 60 * 1000;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly userNameCache = new Map<string, string>();
  private readonly loginDedup = new Map<string, number>();

  constructor(
    private readonly bitable: BitableService,
    private readonly authn: AuthNPaasService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureLogColumns();
  }

  private async ensureLogColumns(): Promise<void> {
    const plans: Array<{ tableKey: string; fields: string[] }> = [
      { tableKey: OPERATION_TABLE, fields: OPERATION_ENSURE_FIELDS },
      { tableKey: LOGIN_TABLE, fields: LOGIN_ENSURE_FIELDS },
    ];
    for (const plan of plans) {
      const tableId = TABLE_MAP[plan.tableKey];
      if (!tableId) {
        this.logger.warn(`审计日志表未配置 tableId: ${plan.tableKey}`);
        continue;
      }
      for (const field of plan.fields) {
        try {
          await this.bitable.ensureField(tableId, field, 1);
        } catch (e) {
          this.logger.warn(`补列失败 ${plan.tableKey}.${field}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  }

  private pickDepartment(req: RequestWithUser): string {
    const ctx = req.userContext;
    return String(ctx?.departmentName || ctx?.department || '');
  }

  private async pickOperatorName(req: RequestWithUser): Promise<string> {
    const ctx = req.userContext;
    if (!ctx) return '未知';
    if (ctx.userName && ctx.userName.length > 0) return ctx.userName;
    const userId = String(ctx.userId || '');
    if (!userId) return '未知';
    const cached = this.userNameCache.get(userId);
    if (cached) return cached;
    try {
      const [info] = await this.authn.listUsersByIds([userId]);
      const name = info?.name ? String((info.name as { zh_cn?: string }).zh_cn || '') : '';
      if (name) this.userNameCache.set(userId, name);
      return name || userId;
    } catch {
      return userId;
    }
  }

  async writeOperationLog(entry: OperationLogEntry): Promise<void> {
    try {
      const tableId = TABLE_MAP[OPERATION_TABLE];
      if (!tableId) throw new Error(`未配置 ${OPERATION_TABLE} tableId`);
      const now = nowStr();
      const fields: Record<string, string | number> = {
        日志编号: genLogNo('OP'),
        操作人: await this.pickOperatorName(entry.req),
        操作人标识: String(entry.req.userContext?.userId || ''),
        所属部门: this.pickDepartment(entry.req),
        角色: (entry.req.userContext?.roles || []).join('/'),
        模块: entry.module,
        操作类型: entry.opType,
        对象类型: entry.objectType || '',
        对象业务编号: entry.objectNo || '',
        操作内容: entry.summary.slice(0, MAX_SUMMARY_LENGTH),
        结果: entry.result || '成功',
        失败原因: entry.failReason || '',
        IP地址: pickIp(entry.req),
        浏览器: parseBrowser(String(entry.req.headers?.['user-agent'] || '')),
        链路ID: pickTraceId(entry.req),
        操作时间: Date.now(),
        创建时间: now,
      };
      await this.bitable.createRecord(tableId, fields);
    } catch (e) {
      this.logger.warn(`操作日志写入失败 [${entry.module}/${entry.opType}]: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async writeLoginLog(entry: LoginLogEntry): Promise<void> {
    try {
      const tableId = TABLE_MAP[LOGIN_TABLE];
      if (!tableId) throw new Error(`未配置 ${LOGIN_TABLE} tableId`);
      const nowMs = Date.now();
      const dedupKey = `${String(entry.req.userContext?.userId || '')}|${entry.mode}|${entry.status || '成功'}|${(entry.sessionId || '').slice(0, 64)}`;
      const lastAt = this.loginDedup.get(dedupKey);
      if (lastAt !== undefined && nowMs - lastAt < LOGIN_DEDUP_TTL) return;
      for (const [key, at] of this.loginDedup) {
        if (nowMs - at >= LOGIN_DEDUP_TTL) this.loginDedup.delete(key);
      }
      this.loginDedup.set(dedupKey, nowMs);
      const ua = String(entry.req.headers?.['user-agent'] || '');
      const now = nowStr();
      const fields: Record<string, string | number> = {
        日志编号: genLogNo('LG'),
        用户名: await this.pickOperatorName(entry.req),
        用户标识: String(entry.req.userContext?.userId || ''),
        登录方式: entry.mode,
        登录状态: entry.status || '成功',
        失败原因: entry.failReason || '',
        IP地址: pickIp(entry.req),
        浏览器: parseBrowser(ua),
        操作系统: parseOs(ua),
        设备: parseDevice(ua),
        会话标识: (entry.sessionId || '').slice(0, 64),
        备注: (entry.remark || '').slice(0, 200),
        登录时间: Date.now(),
        创建时间: now,
      };
      await this.bitable.createRecord(tableId, fields);
    } catch (e) {
      this.logger.warn(`登录日志写入失败 [${entry.mode}]: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
