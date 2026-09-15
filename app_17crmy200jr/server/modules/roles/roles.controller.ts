import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  Query,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AuditAction } from '@server/common/interceptors/audit.interceptor';
import type {
  Role,
  UserPermissions,
  UserRoleAssignment,
  RoleUserItem,
  UserListResponse,
  RoleWithUserCount,
  MenuPermissions,
  DataPermissions,
  OperationPermissions,
} from '@shared/api.interface';

@ApiTags('角色权限')
@Controller('api/roles')
@NeedLogin()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({ summary: '获取角色列表' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get()
  async getRoleList(): Promise<RoleWithUserCount[]> {
    return this.rolesService.findAllWithUserCount();
  }

  @Get('permissions/me')
  @NeedLogin()
  @ApiOperation({ summary: '获取当前用户权限' })
  @ApiResponse({ status: 200, description: '成功' })
  async getMyPermissions(@Req() req: { userContext: { userId: string } }): Promise<UserPermissions> {
    const { userId } = req.userContext;
    return this.rolesService.getMyPermissions(userId);
  }

  @ApiOperation({ summary: '获取用户列表（分页、筛选）' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('users/list')
  async getUserList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('roleId') roleId?: string,
  ): Promise<UserListResponse> {
    return this.rolesService.getUserList({
      page: page ? parseInt(page, 10) : 1,
      pageSize: Math.min(100, pageSize ? parseInt(pageSize, 10) : 20),
      keyword,
      roleId,
    });
  }

  @ApiOperation({ summary: '获取用户角色分配' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get('users/:userId')
  async getUserRoles(@Param('userId') userId: string): Promise<UserRoleAssignment[]> {
    return this.rolesService.getUserRoles(userId);
  }

  @Post('users/:userId/roles')
  @NeedLogin()
  @ApiOperation({ summary: '分配用户角色' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiResponse({ status: 200, description: '成功' })
  async assignUserRoles(
    @Param('userId') userId: string,
    @Body() body: AssignRoleDto,
  ): Promise<{ success: boolean }> {
    return this.rolesService.assignUserRoles(userId, body.roleIds);
  }

  @Delete('users/:userId/roles/:roleId')
  @NeedLogin()
  @ApiOperation({ summary: '移除用户角色' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiParam({ name: 'roleId', description: '角色ID' })
  @ApiResponse({ status: 200, description: '成功' })
  async removeUserRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ): Promise<{ success: boolean }> {
    await this.rolesService.removeUserRole(userId, roleId);
    return { success: true };
  }

  @ApiOperation({ summary: '获取角色详情' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get(':id')
  async getRoleDetail(@Param('id') id: string): Promise<Role> {
    return this.rolesService.findOne(id);
  }

  @ApiOperation({ summary: '获取角色用户列表' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '成功' })
  @Get(':id/users')
  async getRoleUsers(@Param('id') id: string): Promise<RoleUserItem[]> {
    return this.rolesService.getRoleUsers(id);
  }

  @Post()
  @NeedLogin()
  @AuditAction('role', 'CREATE', 'role')
  @ApiOperation({ summary: '创建角色' })
  @ApiResponse({ status: 200, description: '成功' })
  async createRole(
    @Body() body: CreateRoleDto,
  ): Promise<{ id: string }> {
    return this.rolesService.create({
      roleCode: body.roleCode,
      roleName: body.roleName,
      roleDescription: body.roleDescription,
      menuPermissions: body.menuPermissions as MenuPermissions | undefined,
      dataPermissions: body.dataPermissions as DataPermissions | undefined,
      operationPermissions: body.operationPermissions as OperationPermissions | undefined,
    });
  }

  @Put(':id')
  @NeedLogin()
  @AuditAction('role', 'UPDATE', 'role')
  @ApiOperation({ summary: '更新角色' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateRole(
    @Param('id') id: string,
    @Body() body: UpdateRoleDto,
  ): Promise<Role> {
    return this.rolesService.update(id, {
      roleCode: body.roleCode,
      roleName: body.roleName,
      roleDescription: body.roleDescription,
      menuPermissions: body.menuPermissions as MenuPermissions | undefined,
      dataPermissions: body.dataPermissions as DataPermissions | undefined,
      operationPermissions: body.operationPermissions as OperationPermissions | undefined,
    });
  }

  @Delete(':id')
  @NeedLogin()
  @AuditAction('role', 'DELETE', 'role')
  @ApiOperation({ summary: '删除角色' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '成功' })
  async deleteRole(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.rolesService.remove(id);
    return { success: true };
  }

  @Post(':id/copy')
  @NeedLogin()
  @ApiOperation({ summary: '复制角色' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '成功' })
  async copyRole(@Param('id') id: string): Promise<{ id: string }> {
    return this.rolesService.copy(id);
  }
}
