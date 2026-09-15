import type { Request } from 'express';
import type { OperatorContext } from '@server/modules/auth/auth.types';

/** 操作人 ID：优先应用内登录账号，回退平台飞书身份 */
export function getRequestOperator(req: Request): string {
  return req.appUser?.id ?? req.userContext?.userId ?? '';
}

/** 操作人上下文：含角色与权限，用于数据范围过滤 */
export function getOperatorContext(req: Request): OperatorContext {
  return {
    userId: req.appUser?.id ?? req.userContext?.userId ?? '',
    roleCode: req.appUser?.roleCode ?? '',
    permissions: req.appUser?.permissions ?? [],
  };
}
