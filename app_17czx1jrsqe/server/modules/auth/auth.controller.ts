import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 获取当前登录用户信息（基于平台身份）
   * 已登录：返回用户信息
   * 未登录：守卫返回 401 + x-login-url 跳转到平台登录页
   */
  @Get('me')
  @NeedLogin()
  async me(@Req() req: Request) {
    const { userId, userName, userNameI18n } = req.userContext;
    const name = userNameI18n?.zh_cn || userName || '用户';
    const profile = this.authService.getUserProfile(userId, name);
    return {
      code: 0,
      message: 'ok',
      data: profile,
    };
  }
}
