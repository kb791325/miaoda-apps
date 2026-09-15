import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { AppUserContext } from './auth.types';
import { PERMISSIONS_METADATA_KEY } from './auth.decorator';
import { AUTH_COOKIE_NAME } from './auth.constants';

function getCookieValue(req: Request, name: string): string {
  const cookieHeader: string = req.headers.cookie ?? '';
  const match: string | undefined = cookieHeader
    .split(';')
    .find((c: string): boolean => c.trim().startsWith(`${name}=`));
  return match ? match.trim().slice(name.length + 1) : '';
}

@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const cookieToken: string = getCookieValue(request, AUTH_COOKIE_NAME);
    const header: string = request.headers.authorization ?? '';
    const headerToken: string = header.startsWith('Bearer ')
      ? header.slice(7).trim()
      : '';
    const token: string = cookieToken || headerToken;

    let appUser: AppUserContext | undefined;
    if (token) {
      try {
        appUser = await this.authService.verifySession(token);
      } catch (error) {
        if (!(error instanceof UnauthorizedException)) {
          throw error;
        }
      }
    }

    if (!appUser) {
      const platformUserId: string = request.userContext?.userId ?? '';
      if (platformUserId) {
        const resolved = await this.authService.resolveFeishuIdentity(platformUserId);
        if (resolved) {
          appUser = await this.authService.buildUserContext(resolved);
        }
      }
    }

    if (!appUser) {
      throw new UnauthorizedException('请先登录');
    }
    request.appUser = appUser;

    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (required && required.length > 0) {
      const allowed = required.some((code: string): boolean =>
        appUser.permissions.includes(code),
      );
      if (!allowed) {
        throw new ForbiddenException('无操作权限，请联系管理员分配角色');
      }
    }
    return true;
  }
}
