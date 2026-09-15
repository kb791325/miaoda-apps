import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { NEED_LOGIN_KEY } from "@lark-apaas/fullstack-nestjs-core";

@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { userId, loginUrl } = request.userContext || {};

    const needLoginMeta = this.reflector.getAllAndOverride(NEED_LOGIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (needLoginMeta && !userId) {
      if (loginUrl) {
        response.setHeader("x-login-url", loginUrl);
      }
      throw new UnauthorizedException("未登录");
    }

    return true;
  }
}
