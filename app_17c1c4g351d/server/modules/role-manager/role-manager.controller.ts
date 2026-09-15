import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { AuthorizationSDK, CanRole, NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ROLE_BOSS } from '@shared/roles';

@Controller('api/role-manager')
export class RoleManagerController {
  private readonly logger = new Logger(RoleManagerController.name);

  constructor(private readonly authzSDK: AuthorizationSDK) {}

  @CanRole([ROLE_BOSS])
  @NeedLogin()
  @Get('roles')
  async listRoles() {
    const roles = await this.authzSDK.roles.list();
    return roles;
  }

  @CanRole([ROLE_BOSS])
  @NeedLogin()
  @Get('roles/:bizID')
  async getRole(@Param('bizID') bizID: string) {
    return this.authzSDK.roles.get(bizID);
  }

  @CanRole([ROLE_BOSS])
  @NeedLogin()
  @Post('roles')
  async createRole(
    @Body() body: { role: { name: string; description?: string; bizID: string } },
  ) {
    this.logger.log(`Creating role: ${body.role.bizID}`);
    return this.authzSDK.roles.create(body);
  }

  @CanRole([ROLE_BOSS])
  @NeedLogin()
  @Put('roles/:bizID')
  async updateRole(
    @Param('bizID') bizID: string,
    @Body() body: { role: { name?: string; description?: string } },
  ) {
    this.logger.log(`Updating role: ${bizID}`);
    return this.authzSDK.roles.update(bizID, body);
  }

  @CanRole([ROLE_BOSS])
  @NeedLogin()
  @Delete('roles/:bizID')
  async deleteRole(@Param('bizID') bizID: string) {
    this.logger.log(`Deleting role: ${bizID}`);
    return this.authzSDK.roles.delete(bizID);
  }

  @CanRole([ROLE_BOSS])
  @NeedLogin()
  @Get('roles/:bizID/members')
  async listMembers(
    @Param('bizID') bizID: string,
    @Query() query: { type?: string; page?: string; pageSize?: string },
  ) {
    return this.authzSDK.members.list(bizID, {
      type: query.type as never,
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
    });
  }

  @CanRole([ROLE_BOSS])
  @NeedLogin()
  @Post('roles/:bizID/members')
  async addMembers(
    @Param('bizID') bizID: string,
    @Body() body: { members: Record<string, unknown> },
  ) {
    this.logger.log(`Adding members to role: ${bizID}`);
    return this.authzSDK.members.add(bizID, body as never);
  }

  @CanRole([ROLE_BOSS])
  @NeedLogin()
  @Post('roles/:bizID/members/batch_remove')
  async removeMembers(
    @Param('bizID') bizID: string,
    @Body() body: { members: Record<string, unknown> },
  ) {
    this.logger.log(`Removing members from role: ${bizID}`);
    return this.authzSDK.members.remove(bizID, body as never);
  }

  @CanRole([ROLE_BOSS])
  @NeedLogin()
  @Delete('roles/:bizID/members')
  async clearMembers(@Param('bizID') bizID: string) {
    this.logger.log(`Clearing members from role: ${bizID}`);
    return this.authzSDK.members.clear(bizID);
  }

  @CanRole([ROLE_BOSS])
  @NeedLogin()
  @Post('search')
  async search(@Body() body: { query: string; pageSize?: number; page?: number }) {
    return this.authzSDK.search.search(body);
  }
}
