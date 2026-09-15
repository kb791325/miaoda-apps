import { Controller, Post, Req, Inject } from '@nestjs/common';
import type { Request } from 'express';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, inArray } from 'drizzle-orm';
import { userRoles, roles } from '@server/database/schema';

const PREDEFINED_ROLES = [
  'boss',
  'supervisor',
  'warehouse_admin',
  'purchaser',
  'sales',
  'finance',
];

@Controller('api/permissions')
export class PermissionsController {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  @Post('roles')
  async getRoles(@Req() req: Request) {
    const platformRoles = req.userContext?.roles ?? [];
    const userId = req.userContext?.userId;

    let appRoleCodes: string[] = [];
    if (userId) {
      try {
        const rows = await this.db
          .select({ roleCode: roles.roleCode })
          .from(userRoles)
          .innerJoin(roles, eq(roles.id, userRoles.roleId))
          .where(eq(userRoles.userId, userId));
        appRoleCodes = rows.map((r) => r.roleCode);
      } catch {
        appRoleCodes = [];
      }
    }

    const merged = new Set<string>();
    for (const r of platformRoles) merged.add(r);
    for (const r of appRoleCodes) merged.add(r);

    const roleList = merged.size > 0
      ? Array.from(merged).filter((r) => PREDEFINED_ROLES.includes(r))
      : PREDEFINED_ROLES;

    return { data: { roleList } };
  }
}
