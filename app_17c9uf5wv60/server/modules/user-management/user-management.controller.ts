import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserManagementService } from './user-management.service';
import type {
  Role,
  RoleListResponse,
  UpdateRolePermissionsRequest,
  AddRoleUserRequest,
  UserListParams,
  UserListResponse,
  UserWithRoles,
  AssignRolesRequest,
} from '@shared/api.interface';

@Controller('api/user-management')
export class UserManagementController {
  constructor(private readonly service: UserManagementService) {}

  // ====== Roles ======

  @Get('roles')
  async getRoles(): Promise<RoleListResponse> {
    return this.service.getRoleList();
  }

  @Get('roles/:id')
  async getRoleDetail(@Param('id') id: string): Promise<Role> {
    return this.service.getRoleById(id);
  }

  @Put('roles/:id/permissions')
  async updateRolePermissions(
    @Param('id') id: string,
    @Body() body: UpdateRolePermissionsRequest,
    @Req() req: Request,
  ): Promise<Role> {
    const { userId } = req.userContext;
    return this.service.updateRolePermissions(id, body.permissions, userId);
  }

  @Get('roles/:id/users')
  async getRoleUsers(@Param('id') id: string): Promise<UserWithRoles[]> {
    return this.service.getRoleUsers(id);
  }

  @Post('roles/:id/users')
  @HttpCode(200)
  async addRoleUser(
    @Param('id') id: string,
    @Body() body: AddRoleUserRequest,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    await this.service.addRoleUser(id, body.userId, body.userName, userId);
    return { success: true };
  }

  @Delete('roles/:id/users/:userId')
  async removeRoleUser(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    await this.service.removeRoleUser(id, targetUserId, userId);
    return { success: true };
  }

  // ====== Users ======

  @Get('users')
  async getUsers(
    @Query() query: UserListParams & { page?: string; pageSize?: string },
    @Req() req: Request,
  ): Promise<UserListResponse> {
    const params: UserListParams = {
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
      keyword: query.keyword,
      role: query.role,
      status: query.status,
    };
    return this.service.getUserList(params, req.userContext.userId);
  }

  @Get('users/:id')
  async getUserDetail(@Param('id') id: string): Promise<UserWithRoles> {
    return this.service.getUserDetail(id);
  }

  @Put('users/:id/roles')
  async assignUserRoles(
    @Param('id') id: string,
    @Body() body: AssignRolesRequest,
    @Req() req: Request,
  ): Promise<UserWithRoles> {
    const { userId } = req.userContext;
    return this.service.assignUserRoles(id, body.roleIds, userId);
  }

  @Get('users/search')
  async searchUsers(@Query('keyword') keyword: string) {
    return this.service.searchUsers(keyword ?? '');
  }
}
