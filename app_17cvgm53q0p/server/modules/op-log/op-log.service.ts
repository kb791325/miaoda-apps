import { Inject, Injectable, Logger } from '@nestjs/common';
import { desc, eq, and, inArray, count } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { opLog, appUser } from '@server/database/schema';

export interface OpLogInput {
  entityType: string;
  entityId: string;
  entityName?: string;
  action: string;
  detail?: string;
  beforeValue?: string;
  afterValue?: string;
  operatorId?: string;
}

export interface OpLogItem {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  detail: string;
  beforeValue: string;
  afterValue: string;
  operatorId: string;
  operatorName: string;
  createdAt: string;
}

export interface OpLogListResponse {
  items: OpLogItem[];
  total: number;
}

@Injectable()
export class OpLogService {
  private readonly logger = new Logger(OpLogService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async record(input: OpLogInput): Promise<void> {
    try {
      await this.db.insert(opLog).values({
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName ?? '',
        action: input.action,
        detail: input.detail ?? '',
        beforeValue: input.beforeValue ?? null,
        afterValue: input.afterValue ?? null,
        operator: input.operatorId ?? null,
      });
    } catch (error) {
      this.logger.warn(
        `op log write failed: ${JSON.stringify({
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          message: error instanceof Error ? error.message : String(error),
        })}`,
      );
    }
  }

  async listByEntity(
    entityType: string,
    entityId: string,
    page: number,
    pageSize: number,
  ): Promise<OpLogListResponse> {
    const where = and(
      eq(opLog.entityType, entityType),
      eq(opLog.entityId, entityId),
    );
    const totalRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(opLog)
      .where(where);
    const total: number = Number(totalRows[0]?.count ?? 0);
    const rows = await this.db
      .select()
      .from(opLog)
      .where(where)
      .orderBy(desc(opLog.createdAt), desc(opLog.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const operatorIds: string[] = [
      ...new Set(
        rows
          .filter((r) => (r.operator ?? '') !== '')
          .map((r) => r.operator as string),
      ),
    ];
    const nameById: Map<string, string> = new Map();
    if (operatorIds.length > 0) {
      const users = await this.db
        .select({ id: appUser.id, name: appUser.name })
        .from(appUser)
        .where(inArray(appUser.id, operatorIds));
      for (const u of users) {
        nameById.set(u.id, u.name);
      }
    }

    const items: OpLogItem[] = rows.map((row) => ({
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      entityName: row.entityName,
      action: row.action,
      detail: row.detail,
      beforeValue: row.beforeValue ?? '',
      afterValue: row.afterValue ?? '',
      operatorId: row.operator ?? '',
      operatorName: nameById.get(row.operator ?? '') ?? '',
      createdAt: row.createdAt.toISOString(),
    }));

    return { items, total };
  }
}
