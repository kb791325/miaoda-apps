import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';

const AUDIT_SESSION_ID_KEY = '__audit_session_id';
const AUDIT_SESSION_LOGGED_KEY = '__audit_session_logged';
export const SESSION_LOGGED_KEY = AUDIT_SESSION_LOGGED_KEY;

export interface OperationAuditPayload {
  module: string;
  op_type: string;
  object_type?: string;
  object_no?: string;
  summary: string;
  result?: '成功' | '失败';
  fail_reason?: string;
}

export interface LoginAuditPayload {
  mode: string;
  status?: '成功' | '失败';
  fail_reason?: string;
  session_id?: string;
  remark?: string;
}

export function getAuditSessionId(): string {
  try {
    let sid = sessionStorage.getItem(AUDIT_SESSION_ID_KEY);
    if (!sid) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        sid = crypto.randomUUID();
      } else {
        sid = `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      }
      sessionStorage.setItem(AUDIT_SESSION_ID_KEY, sid);
    }
    return sid;
  } catch {
    return '';
  }
}

export function reportOperation(payload: OperationAuditPayload): void {
  axiosForBackend
    .post('/api/audit/operation', payload)
    .catch((e: unknown) => {
      logger.warn(`[audit] 操作日志上报失败: ${(e as Error)?.message || 'unknown'}`);
    });
}

export function reportLogin(payload: LoginAuditPayload): void {
  const body: LoginAuditPayload = { session_id: getAuditSessionId(), ...payload };
  axiosForBackend
    .post('/api/audit/login', body)
    .catch((e: unknown) => {
      logger.warn(`[audit] 登录日志上报失败: ${(e as Error)?.message || 'unknown'}`);
    });
}
