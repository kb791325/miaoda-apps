import { Controller, Logger, Post, Req } from '@nestjs/common';
import { PermissionService } from '@lark-apaas/nestjs-authzpaas';
import type { Request } from 'express';

import type { MyRolesResponse } from '@shared/api.interface';
import { ALL_ROLES } from '@shared/roles';

@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly permissionService: PermissionService) {}

  @Post('my-roles')
  async myRoles(@Req() req: Request): Promise<MyRolesResponse> {
    const contextRoles: string[] = req.userContext?.roles ?? [];
    if (contextRoles.length > 0) {
      return { data: { roleList: this.filterKnownRoles(contextRoles) } };
    }
    try {
      const permissionData: { roles: string[] } | null =
        await this.permissionService.getUserPermissions({});
      const roleList: string[] = this.filterKnownRoles(
        permissionData?.roles ?? [],
      );
      return { data: { roleList } };
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`角色解析失败，返回空角色列表：${message}`);
      return { data: { roleList: [] } };
    }
  }

  private filterKnownRoles(roles: string[]): string[] {
    const known: ReadonlySet<string> = new Set<string>(ALL_ROLES);
    return roles.filter((role: string) => known.has(role));
  }
}
