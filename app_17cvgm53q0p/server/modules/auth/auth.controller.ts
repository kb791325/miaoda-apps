import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { AppUserContext } from './auth.types';
import { AppAuthGuard } from './app-auth.guard';
import { RequirePermissions } from './auth.decorator';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME } from './auth.constants';
import type {
  AppPermissionInfo,
  AppRole,
  AppUserWithRole,
  CreateRoleRequest,
  CreateUserRequest,
  LoginRequest,
  LoginResponse,
  PermissionListResponse,
  RoleListResponse,
  SessionResponse,
  UpdateRoleRequest,
  UpdateUserRequest,
  UserListResponse,
  UserOptionListResponse,
} from '@shared/auth';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookie(res: Response, token: string): void {
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    });
  }

  @Post('login')
  async login(
    @Body() dto: LoginRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const result: LoginResponse = await this.authService.login(dto);
    this.setAuthCookie(res, result.token);
    return result;
  }

  @Post('feishu-login')
  async feishuLogin(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const result: LoginResponse = await this.authService.feishuLogin(
      req.userContext?.userId ?? '',
      req.userContext?.userName ?? '',
    );
    this.setAuthCookie(res, result.token);
    return result;
  }

  @Post('logout')
  async logout(
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    return { success: true };
  }

  @UseGuards(AppAuthGuard)
  @Get('me')
  async me(@Req() req: Request): Promise<SessionResponse> {
    const ctx: AppUserContext | undefined = req.appUser;
    if (!ctx) {
      throw new UnauthorizedException('请先登录');
    }
    return this.authService.getSession(ctx.id);
  }

  @UseGuards(AppAuthGuard)
  @Get('user-options')
  async userOptions(): Promise<UserOptionListResponse> {
    const items = await this.authService.listEnabledUserOptions();
    return { items };
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('user:manage')
  @Get('users')
  async listUsers(): Promise<UserListResponse> {
    const items = await this.authService.listUsers();
    return { items };
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('user:manage')
  @Post('users')
  async createUser(@Body() dto: CreateUserRequest): Promise<AppUserWithRole> {
    return this.authService.createUser(dto);
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('user:manage')
  @Put('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserRequest,
  ): Promise<AppUserWithRole> {
    return this.authService.updateUser(id, dto);
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('user:manage')
  @Delete('users/:id')
  async deleteUser(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const currentUserId: string = req.appUser?.id ?? '';
    await this.authService.deleteUser(id, currentUserId);
    return { success: true };
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('role:manage')
  @Get('roles')
  async listRoles(): Promise<RoleListResponse> {
    const items = await this.authService.listRoles();
    return { items };
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('role:manage')
  @Post('roles')
  async createRole(@Body() dto: CreateRoleRequest): Promise<AppRole> {
    return this.authService.createRole(dto);
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('role:manage')
  @Put('roles/:id')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleRequest,
  ): Promise<AppRole> {
    return this.authService.updateRole(id, dto);
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('role:manage')
  @Delete('roles/:id')
  async removeRole(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.authService.deleteRole(id);
    return { success: true };
  }

  @UseGuards(AppAuthGuard)
  @RequirePermissions('role:manage')
  @Get('permissions')
  async listPermissions(): Promise<PermissionListResponse> {
    const defs = await this.authService.listPermissionDefs();
    const items: AppPermissionInfo[] = defs.map((def, index) => ({
      id: def.code,
      code: def.code,
      name: def.name,
      module: def.module,
      sortOrder: index,
    }));
    return { items };
  }
}
