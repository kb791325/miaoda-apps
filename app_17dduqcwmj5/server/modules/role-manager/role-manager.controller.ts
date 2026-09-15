import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  AuthorizationSDK,
  CanRole,
  NeedLogin,
} from '@lark-apaas/fullstack-nestjs-core';
import type {
  CreateRoleResponse,
  ForceRoleDTO,
  ListMembersResponse,
  MemberMutationData,
  MemberType,
} from '@lark-apaas/fullstack-nestjs-core';

import { APP_ROLES } from '@shared/roles';

export class CreateRoleDto {
  role: { name: string; description?: string; bizID: string };
}

export class UpdateRoleDto {
  role: { name?: string; description?: string };
}

export class AddMembersDto {
  members: MemberMutationData;
}

export class RemoveMembersDto {
  members: MemberMutationData;
}

export class ListMembersQueryDto {
  type?: MemberType;
  page?: number;
  pageSize?: number;
}

const RequirePrincipal: MethodDecorator = CanRole([
  APP_ROLES.principal,
]);

@NeedLogin()
@Controller('api/role_manager')
export class RoleManagerController {
  constructor(private readonly authzSDK: AuthorizationSDK) {}

  @CanRole([APP_ROLES.principal])
  @Get('roles')
  listRoles(): Promise<ForceRoleDTO[]> {
    return this.authzSDK.roles.list();
  }

  @CanRole([APP_ROLES.principal])
  @Get('roles/:bizID')
  getRole(@Param('bizID') bizID: string): Promise<ForceRoleDTO> {
    return this.authzSDK.roles.get(bizID);
  }

  @CanRole([APP_ROLES.principal])
  @Post('roles')
  createRole(@Body() dto: CreateRoleDto): Promise<CreateRoleResponse> {
    return this.authzSDK.roles.create(dto);
  }

  @CanRole([APP_ROLES.principal])
  @Put('roles/:bizID')
  async updateRole(
    @Param('bizID') bizID: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<void> {
    await this.authzSDK.roles.update(bizID, dto);
  }

  @CanRole([APP_ROLES.principal])
  @Delete('roles/:bizID')
  async deleteRole(@Param('bizID') bizID: string): Promise<void> {
    await this.authzSDK.roles.delete(bizID);
  }

  @CanRole([APP_ROLES.principal])
  @Get('roles/:bizID/members')
  listMembers(
    @Param('bizID') bizID: string,
    @Query() query: ListMembersQueryDto,
  ): Promise<ListMembersResponse> {
    return this.authzSDK.members.list(bizID, query);
  }

  @CanRole([APP_ROLES.principal])
  @Post('roles/:bizID/members')
  async addMembers(
    @Param('bizID') bizID: string,
    @Body() dto: AddMembersDto,
  ): Promise<void> {
    await this.authzSDK.members.add(bizID, dto);
  }

  @CanRole([APP_ROLES.principal])
  @Post('roles/:bizID/members/batch_remove')
  async removeMembers(
    @Param('bizID') bizID: string,
    @Body() dto: RemoveMembersDto,
  ): Promise<void> {
    await this.authzSDK.members.remove(bizID, dto);
  }

  @CanRole([APP_ROLES.principal])
  @Delete('roles/:bizID/members')
  async clearMembers(@Param('bizID') bizID: string): Promise<void> {
    await this.authzSDK.members.clear(bizID);
  }
}
