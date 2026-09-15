import { createParamDecorator, SetMetadata } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AppUserContext } from './auth.types';

export const PERMISSIONS_METADATA_KEY = 'app_required_permissions';

/**
 * 声明接口所需权限点（OR 语义：命中任一即可）。
 * 不传权限点时仅要求登录态（有效 token）。
 */
export const RequirePermissions = (...codes: string[]) =>
  SetMetadata(PERMISSIONS_METADATA_KEY, codes);

export const CurrentAppUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AppUserContext | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.appUser;
  },
);
