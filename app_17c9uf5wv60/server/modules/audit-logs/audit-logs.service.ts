import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, count, ilike, gte, lt } from 'drizzle-orm';
import { auditLogs } from '@server/database/schema';
import type {
  AuditLog,
  AuditLogListParams,
  AuditLogListResponse,
  AuditActionType,
} from '@shared/api.interface';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private buildConditions(params: AuditLogListParams) {
    const conditions = [];
    if (params.actionType) conditions.push(eq(auditLogs.actionType, params.actionType));
    if (params.targetType) conditions.push(eq(auditLogs.targetType, params.targetType));
    if (params.operator) conditions.push(eq(auditLogs.operator, params.operator));
    if (params.keyword) {
      conditions.push(
        ilike(auditLogs.targetType, `%${params.keyword}%`),
      );
    }
    if (params.startDate) conditions.push(gte(auditLogs.createdAt, new Date(params.startDate)));
    if (params.endDate) conditions.push(lt(auditLogs.createdAt, new Date(params.endDate)));
    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private rowToDto(row: typeof auditLogs.$inferSelect): AuditLog {
    return {
      id: row.id,
      actionType: row.actionType as AuditActionType,
      targetType: row.targetType,
      targetId: row.targetId ?? null,
      operator: row.operator,
      operatorName: row.operatorName ?? undefined,
      ipAddress: row.ipAddress ?? undefined,
      detail: (row.detail ?? {}) as AuditLog['detail'],
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getList(params: AuditLogListParams): Promise<AuditLogListResponse> {
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 20, 100);

    const whereClause = this.buildConditions(params);

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(auditLogs)
      .where(whereClause);

    const rows = await this.db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items: AuditLog[] = rows.map((row) => this.rowToDto(row));

    return {
      items,
      total: Number(totalRow.value),
      page,
      pageSize,
    };
  }

  async exportList(params: AuditLogListParams): Promise<AuditLog[]> {
    const whereClause = this.buildConditions(params);
    const rows = await this.db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(5000);
    return rows.map((row) => this.rowToDto(row));
  }

  async getDetail(id: string): Promise<AuditLog> {
    const rows = await this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new Error('审计日志不存在');
    }
    const row = rows[0];
    return {
      id: row.id,
      actionType: row.actionType as AuditActionType,
      targetType: row.targetType,
      targetId: row.targetId ?? null,
      operator: row.operator,
      operatorName: row.operatorName ?? undefined,
      ipAddress: row.ipAddress ?? undefined,
      detail: (row.detail ?? {}) as AuditLog['detail'],
      createdAt: row.createdAt.toISOString(),
    };
  }

  async createLog(params: {
    actionType: AuditActionType;
    targetType: string;
    targetId?: string;
    operatorUserId: string;
    operatorName?: string;
    ipAddress?: string;
    detail?: AuditLog['detail'];
  }): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        actionType: params.actionType,
        targetType: params.targetType,
        targetId: params.targetId,
        operator: params.operatorUserId,
        operatorName: params.operatorName,
        ipAddress: params.ipAddress,
        detail: params.detail ? (params.detail as unknown as Record<string, unknown>) : undefined,
      });
    } catch (err) {
      this.logger.error(`写入审计日志失败: ${String(err)}`);
    }
  }
}
