import { Inject, Injectable } from '@nestjs/common';
import { eq, and, gte, lt, desc, sql, count } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { operationLogs } from '@server/database/schema';
import type {
  OperationLogItem,
  OperationLogListResponse,
  OperationLogDetail,
  OperationLogStatItem,
} from '@shared/api.interface';

@Injectable()
export class OperationLogService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private buildWhereConditions(params: {
    operatorId?: string;
    operationType?: string;
    targetType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { operatorId, operationType, targetType, startDate, endDate } =
      params;
    const whereConditions = [];

    if (operatorId) {
      whereConditions.push(
        sql`(${operationLogs.operator}).user_id = ${operatorId}`,
      );
    }
    if (operationType) {
      whereConditions.push(eq(operationLogs.operationType, operationType));
    }
    if (targetType) {
      whereConditions.push(eq(operationLogs.targetType, targetType));
    }
    if (startDate) {
      whereConditions.push(gte(operationLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereConditions.push(lt(operationLogs.createdAt, end));
    }

    return whereConditions.length > 0
      ? and(...whereConditions)
      : undefined;
  }

  async getOperationLogs(params: {
    page: number;
    pageSize: number;
    operatorId?: string;
    operationType?: string;
    targetType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<OperationLogListResponse> {
    const { page, pageSize } = params;
    const whereSql = this.buildWhereConditions(params);

    // Total count
    const totalRows = await this.db
      .select({ count: count() })
      .from(operationLogs)
      .where(whereSql);
    const total: number = Number(totalRows[0]?.count) || 0;

    // Items
    const rows = await this.db
      .select({
        id: operationLogs.id,
        operator: sql<string>`(${operationLogs.operator}).user_id`.as(
          'operator_id',
        ),
        operationType: operationLogs.operationType,
        targetType: operationLogs.targetType,
        content: operationLogs.content,
        ipAddress: operationLogs.ipAddress,
        createdAt: operationLogs.createdAt,
      })
      .from(operationLogs)
      .where(whereSql)
      .orderBy(desc(operationLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items: OperationLogItem[] = rows.map(
      (row: {
        id: string;
        operator: string | null;
        operationType: string | null;
        targetType: string | null;
        content: string | null;
        ipAddress: string | null;
        createdAt: Date;
      }) => ({
        id: row.id,
        operator: row.operator || '',
        operationType: row.operationType || '',
        targetType: row.targetType || '',
        content: row.content || '',
        ipAddress: row.ipAddress || '',
        createdAt: row.createdAt.toISOString(),
      }),
    );

    return { items, total, page, pageSize };
  }

  async getDetail(id: string): Promise<OperationLogDetail | null> {
    const rows = await this.db
      .select({
        id: operationLogs.id,
        operator: sql<string>`(${operationLogs.operator}).user_id`.as(
          'operator_id',
        ),
        operationType: operationLogs.operationType,
        targetType: operationLogs.targetType,
        targetId: operationLogs.targetId,
        content: operationLogs.content,
        ipAddress: operationLogs.ipAddress,
        createdAt: operationLogs.createdAt,
      })
      .from(operationLogs)
      .where(eq(operationLogs.id, id))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0] as {
      id: string;
      operator: string | null;
      operationType: string | null;
      targetType: string | null;
      targetId: string | null;
      content: string | null;
      ipAddress: string | null;
      createdAt: Date;
    };

    return {
      id: row.id,
      operator: row.operator || '',
      operationType: row.operationType || '',
      targetType: row.targetType || '',
      targetId: row.targetId || '',
      content: row.content || '',
      ipAddress: row.ipAddress || '',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getStats(): Promise<OperationLogStatItem[]> {
    const rows = await this.db
      .select({
        operationType: operationLogs.operationType,
        count: count(),
      })
      .from(operationLogs)
      .groupBy(operationLogs.operationType);

    return rows.map(
      (row: { operationType: string | null; count: number | string }) => ({
        operationType: row.operationType || 'unknown',
        count: Number(row.count) || 0,
      }),
    );
  }
}
