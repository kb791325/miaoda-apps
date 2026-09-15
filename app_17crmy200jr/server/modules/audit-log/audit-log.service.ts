import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  eq,
  and,
  or,
  gte,
  lt,
  desc,
  asc,
  count,
  ilike,
  sql,
} from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { auditLogs } from '@server/database/schema';
import type {
  AuditLogItem,
  AuditLogDetail,
  AuditLogStats,
  AuditLogListResponse,
  AuditModuleStat,
  AuditDailySummaryResponse,
  AuditDailySummary,
  AuditUserStat,
  AuditLogStatus,
  AuditTrendItem,
  AuditTypeDistribution,
  AuditTopTarget,
} from '@shared/api.interface';

export interface AuditLogEntry {
  traceId: string;
  userId: string;
  userName: string;
  userDepartment: string;
  module: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  description?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  status?: string;
  errorMessage?: string;
  duration?: number;
}

export interface AuditLogQueryParams {
  page?: number;
  pageSize?: number;
  module?: string;
  operationType?: string;
  operator?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  keyword?: string;
}

const MAX_EXPORT = 1000;

/** Map DB status value to AuditLogStatus */
function mapStatus(status: string): 'success' | 'failure' {
  return status === 'failed' ? 'failure' : 'success';
}

function mapRowToItem(
  row: {
    id: string;
    traceId: string;
    userId: string;
    userName: string;
    userDepartment: string;
    module: string;
    action: string;
    targetType: string;
    targetId: string | null;
    targetName: string | null;
    description: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    requestMethod: string | null;
    requestPath: string | null;
    status: string;
    errorMessage: string | null;
    duration: number;
    createdAt: Date;
  },
): AuditLogItem {
  return {
    id: row.id,
    traceId: row.traceId,
    operator: row.userId,
    operatorName: row.userName || undefined,
    department: row.userDepartment || undefined,
    module: row.module,
    operationType: row.action,
    targetType: row.targetType,
    targetId: row.targetId ?? '',
    targetName: row.targetName ?? undefined,
    status: mapStatus(row.status),
    duration: row.duration,
    ipAddress: row.ipAddress ?? '',
    userAgent: row.userAgent ?? undefined,
    method: row.requestMethod ?? '',
    path: row.requestPath ?? '',
    description: row.description ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapRowToDetail(
  row: {
    id: string;
    traceId: string;
    userId: string;
    userName: string;
    userDepartment: string;
    module: string;
    action: string;
    targetType: string;
    targetId: string | null;
    targetName: string | null;
    description: string | null;
    beforeData: unknown;
    afterData: unknown;
    changedFields: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    requestMethod: string | null;
    requestPath: string | null;
    status: string;
    errorMessage: string | null;
    duration: number;
    createdAt: Date;
  },
): AuditLogDetail {
  return {
    ...mapRowToItem(row),
    beforeData: (row.beforeData as Record<string, unknown>) ?? undefined,
    afterData: (row.afterData as Record<string, unknown>) ?? undefined,
    changedFields: (row.changedFields as string[]) ?? undefined,
  };
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private buildWhereConditions(params: AuditLogQueryParams) {
    const {
      module,
      operationType,
      operator,
      status,
      keyword,
      startDate,
      endDate,
    } = params;
    const conditions: ReturnType<typeof eq>[] = [];

    if (module) {
      conditions.push(eq(auditLogs.module, module));
    }
    if (operationType) {
      conditions.push(eq(auditLogs.action, operationType));
    }
    if (operator) {
      conditions.push(eq(auditLogs.userId, operator));
    }
    if (status) {
      // Map API status back to DB value
      const dbStatus = status === 'failure' ? 'failed' : status;
      conditions.push(eq(auditLogs.status, dbStatus));
    }
    if (keyword) {
      const escaped: string = keyword.replace(/%/g, '\\%').replace(/_/g, '\\_');
      conditions.push(
        or(
          ilike(auditLogs.userName, `%${escaped}%`),
          ilike(auditLogs.targetName, `%${escaped}%`),
          ilike(auditLogs.description, `%${escaped}%`),
        ),
      );
    }
    if (startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lt(auditLogs.createdAt, end));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  async logAction(data: AuditLogEntry): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        traceId: data.traceId,
        userId: data.userId,
        userName: data.userName,
        userDepartment: data.userDepartment,
        module: data.module,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId ?? null,
        targetName: data.targetName ?? null,
        description: data.description ?? null,
        beforeData: data.beforeData ?? null,
        afterData: data.afterData ?? null,
        changedFields: data.changedFields ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        requestMethod: data.requestMethod ?? null,
        requestPath: data.requestPath ?? null,
        status: data.status ?? 'success',
        errorMessage: data.errorMessage ?? null,
        duration: data.duration ?? 0,
      });
    } catch (error: unknown) {
      this.logger.error(
        `审计日志写入失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getAuditLogs(
    params: AuditLogQueryParams,
  ): Promise<AuditLogListResponse> {
    const page: number = params.page ?? 1;
    const pageSize: number = params.pageSize ?? 20;
    const whereSql = this.buildWhereConditions(params);

    const totalRows = await this.db
      .select({ count: count() })
      .from(auditLogs)
      .where(whereSql);
    const total: number = Number(totalRows[0]?.count) || 0;

    const rows = await this.db
      .select({
        id: auditLogs.id,
        traceId: auditLogs.traceId,
        userId: auditLogs.userId,
        userName: auditLogs.userName,
        userDepartment: auditLogs.userDepartment,
        module: auditLogs.module,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        targetName: auditLogs.targetName,
        description: auditLogs.description,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        requestMethod: auditLogs.requestMethod,
        requestPath: auditLogs.requestPath,
        status: auditLogs.status,
        errorMessage: auditLogs.errorMessage,
        duration: auditLogs.duration,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(whereSql)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items: AuditLogItem[] = rows.map(
      (row: {
        id: string;
        traceId: string;
        userId: string;
        userName: string;
        userDepartment: string;
        module: string;
        action: string;
        targetType: string;
        targetId: string | null;
        targetName: string | null;
        description: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        requestMethod: string | null;
        requestPath: string | null;
        status: string;
        errorMessage: string | null;
        duration: number;
        createdAt: Date;
      }) => mapRowToItem(row),
    );

    return { items, total, page, pageSize };
  }

  async getAuditLogById(id: string): Promise<AuditLogDetail | null> {
    const rows = await this.db
      .select({
        id: auditLogs.id,
        traceId: auditLogs.traceId,
        userId: auditLogs.userId,
        userName: auditLogs.userName,
        userDepartment: auditLogs.userDepartment,
        module: auditLogs.module,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        targetName: auditLogs.targetName,
        description: auditLogs.description,
        beforeData: auditLogs.beforeData,
        afterData: auditLogs.afterData,
        changedFields: auditLogs.changedFields,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        requestMethod: auditLogs.requestMethod,
        requestPath: auditLogs.requestPath,
        status: auditLogs.status,
        errorMessage: auditLogs.errorMessage,
        duration: auditLogs.duration,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.id, id))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0] as {
      id: string;
      traceId: string;
      userId: string;
      userName: string;
      userDepartment: string;
      module: string;
      action: string;
      targetType: string;
      targetId: string | null;
      targetName: string | null;
      description: string | null;
      beforeData: unknown;
      afterData: unknown;
      changedFields: unknown;
      ipAddress: string | null;
      userAgent: string | null;
      requestMethod: string | null;
      requestPath: string | null;
      status: string;
      errorMessage: string | null;
      duration: number;
      createdAt: Date;
    };

    return mapRowToDetail(row);
  }

  async getAuditStats(params: {
    startDate?: string;
    endDate?: string;
  }): Promise<AuditLogStats> {
    const effectiveParams = { ...params };
    if (!effectiveParams.startDate) {
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 90);
      effectiveParams.startDate = defaultStart.toISOString().slice(0, 10);
    }
    const whereSql = this.buildWhereConditions(effectiveParams);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartIso: string = todayStart.toISOString();

    const rows = await this.db.execute(sql`
      SELECT
        count(*)::int as total,
        count(*) filter (where ${auditLogs.status} = 'success')::int as success,
        count(*) filter (where ${auditLogs.status} = 'failed')::int as failure,
        count(*) filter (where ${auditLogs.createdAt} >= ${todayStartIso})::int as today
      FROM ${auditLogs}
      ${whereSql ? sql`WHERE ${whereSql}` : sql``}
    `);

    const row = rows[0] as {
      total: number;
      success: number;
      failure: number;
      today: number;
    };

    return {
      totalOperations: Number(row.total) || 0,
      successCount: Number(row.success) || 0,
      failureCount: Number(row.failure) || 0,
      todayOperations: Number(row.today) || 0,
    };
  }

  async getAuditTrail(
    targetType: string,
    targetId: string,
  ): Promise<AuditLogItem[]> {
    const rows = await this.db
      .select({
        id: auditLogs.id,
        traceId: auditLogs.traceId,
        userId: auditLogs.userId,
        userName: auditLogs.userName,
        userDepartment: auditLogs.userDepartment,
        module: auditLogs.module,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        targetName: auditLogs.targetName,
        description: auditLogs.description,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        requestMethod: auditLogs.requestMethod,
        requestPath: auditLogs.requestPath,
        status: auditLogs.status,
        errorMessage: auditLogs.errorMessage,
        duration: auditLogs.duration,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.targetType, targetType),
          eq(auditLogs.targetId, targetId),
        ),
      )
      .orderBy(asc(auditLogs.createdAt))
      .limit(200);

    return rows.map(
      (row: {
        id: string;
        traceId: string;
        userId: string;
        userName: string;
        userDepartment: string;
        module: string;
        action: string;
        targetType: string;
        targetId: string | null;
        targetName: string | null;
        description: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        requestMethod: string | null;
        requestPath: string | null;
        status: string;
        errorMessage: string | null;
        duration: number;
        createdAt: Date;
      }) => mapRowToItem(row),
    );
  }

  async getUserActions(
    userId: string,
    params: AuditLogQueryParams,
  ): Promise<AuditLogListResponse> {
    return this.getAuditLogs({ ...params, operator: userId });
  }

  async getModuleActions(
    module: string,
    params: AuditLogQueryParams,
  ): Promise<AuditModuleStat> {
    const whereSql = this.buildWhereConditions({ ...params, module });

    const totalRow = await this.db
      .select({ count: count() })
      .from(auditLogs)
      .where(whereSql);
    const totalCount: number = Number(totalRow[0]?.count) || 0;

    const successRow = await this.db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        whereSql
          ? and(whereSql, eq(auditLogs.status, 'success'))
          : eq(auditLogs.status, 'success'),
      );
    const successCount: number = Number(successRow[0]?.count) || 0;

    const failureRow = await this.db
      .select({ count: count() })
      .from(auditLogs)
      .where(
        whereSql
          ? and(whereSql, eq(auditLogs.status, 'failed'))
          : eq(auditLogs.status, 'failed'),
      );
    const failureCount: number = Number(failureRow[0]?.count) || 0;

    return { module, count: totalCount, successCount, failureCount };
  }

  async getDailyAuditSummary(
    date: string,
  ): Promise<AuditDailySummaryResponse> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const whereSql = and(
      gte(auditLogs.createdAt, startDate),
      lt(auditLogs.createdAt, endDate),
    );

    const totalRow = await this.db
      .select({ count: count() })
      .from(auditLogs)
      .where(whereSql);
    const total: number = Number(totalRow[0]?.count) || 0;

    const successRow = await this.db
      .select({ count: count() })
      .from(auditLogs)
      .where(and(whereSql, eq(auditLogs.status, 'success')));
    const successCount: number = Number(successRow[0]?.count) || 0;

    const failureRow = await this.db
      .select({ count: count() })
      .from(auditLogs)
      .where(and(whereSql, eq(auditLogs.status, 'failed')));
    const failureCount: number = Number(failureRow[0]?.count) || 0;

    const dailyItem: AuditDailySummary = {
      date,
      total,
      successCount,
      failureCount,
    };

    // Overall stats — reuse getAuditStats to avoid full-table scans
    const overallStats: AuditLogStats = await this.getAuditStats({});

    return {
      items: [dailyItem],
      summary: {
        totalOperations: overallStats.totalOperations,
        successCount: overallStats.successCount,
        failureCount: overallStats.failureCount,
        todayOperations: overallStats.todayOperations,
      },
    };
  }

  async getModuleStats(
    params: AuditLogQueryParams,
  ): Promise<AuditModuleStat[]> {
    const effectiveParams = this.applyDefaultTimeWindow(params);
    const whereSql = this.buildWhereConditions(effectiveParams);

    const rows = await this.db
      .select({
        module: auditLogs.module,
        count: count(),
        successCount: sql<number>`count(*) filter (where ${auditLogs.status} = 'success')`,
        failureCount: sql<number>`count(*) filter (where ${auditLogs.status} = 'failed')`,
      })
      .from(auditLogs)
      .where(whereSql)
      .groupBy(auditLogs.module)
      .orderBy(desc(sql`count(*)`));

    return rows.map(
      (r: {
        module: string;
        count: number | string;
        successCount: number | string;
        failureCount: number | string;
      }) => ({
        module: r.module,
        count: Number(r.count) || 0,
        successCount: Number(r.successCount) || 0,
        failureCount: Number(r.failureCount) || 0,
      }),
    );
  }

  async getUserStats(
    params: AuditLogQueryParams,
  ): Promise<AuditUserStat[]> {
    const effectiveParams = this.applyDefaultTimeWindow(params);
    const whereSql = this.buildWhereConditions(effectiveParams);

    const rows = await this.db
      .select({
        userId: auditLogs.userId,
        userName: auditLogs.userName,
        count: count(),
        successCount: sql<number>`count(*) filter (where ${auditLogs.status} = 'success')`,
        failureCount: sql<number>`count(*) filter (where ${auditLogs.status} = 'failed')`,
      })
      .from(auditLogs)
      .where(whereSql)
      .groupBy(auditLogs.userId, auditLogs.userName)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return rows.map(
      (r: {
        userId: string;
        userName: string;
        count: number | string;
        successCount: number | string;
        failureCount: number | string;
      }) => ({
        userId: r.userId,
        userName: r.userName,
        count: Number(r.count) || 0,
        successCount: Number(r.successCount) || 0,
        failureCount: Number(r.failureCount) || 0,
      }),
    );
  }

  private applyDefaultTimeWindow(
    params: AuditLogQueryParams,
  ): AuditLogQueryParams {
    if (!params.startDate && !params.endDate) {
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 90);
      return {
        ...params,
        startDate: defaultStart.toISOString().slice(0, 10),
      };
    }
    return params;
  }

  async getAuditTrend(params: {
    days?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<AuditTrendItem[]> {
    const endDate: Date = params.endDate
      ? new Date(params.endDate)
      : new Date();
    const days: number = params.days ?? 30;
    const startDate: Date = params.startDate
      ? new Date(params.startDate)
      : new Date(endDate.getTime() - days * 86400000);

    const rows = await this.db
      .select({
        date: sql<string>`${auditLogs.createdAt}::date::text`,
        total: count(),
        successCount: sql<number>`count(*) filter (where ${auditLogs.status} = 'success')`,
        failureCount: sql<number>`count(*) filter (where ${auditLogs.status} = 'failed')`,
      })
      .from(auditLogs)
      .where(
        and(
          gte(auditLogs.createdAt, startDate),
          lt(auditLogs.createdAt, endDate),
        ),
      )
      .groupBy(sql`${auditLogs.createdAt}::date`)
      .orderBy(sql`${auditLogs.createdAt}::date`);

    return rows.map(
      (r: {
        date: string;
        total: number | string;
        successCount: number | string;
        failureCount: number | string;
      }) => ({
        date: r.date,
        total: Number(r.total) || 0,
        successCount: Number(r.successCount) || 0,
        failureCount: Number(r.failureCount) || 0,
      }),
    );
  }

  async getOperationTypeDistribution(params: {
    startDate?: string;
    endDate?: string;
  }): Promise<AuditTypeDistribution[]> {
    const effectiveParams = this.applyDefaultTimeWindow(params);
    const whereSql = this.buildWhereConditions(effectiveParams);

    const rows = await this.db
      .select({
        action: auditLogs.action,
        count: count(),
      })
      .from(auditLogs)
      .where(whereSql)
      .groupBy(auditLogs.action)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    return rows.map(
      (r: { action: string; count: number | string }) => ({
        operationType: r.action,
        count: Number(r.count) || 0,
      }),
    );
  }

  async getTopTargets(params: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditTopTarget[]> {
    const effectiveParams = this.applyDefaultTimeWindow(params);
    const whereSql = this.buildWhereConditions(effectiveParams);
    const limit: number = params.limit ?? 10;

    const rows = await this.db
      .select({
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        targetName: auditLogs.targetName,
        count: count(),
      })
      .from(auditLogs)
      .where(whereSql)
      .groupBy(
        auditLogs.targetType,
        auditLogs.targetId,
        auditLogs.targetName,
      )
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return rows.map(
      (r: {
        targetType: string;
        targetId: string | null;
        targetName: string | null;
        count: number | string;
      }) => ({
        targetType: r.targetType,
        targetId: r.targetId ?? '',
        targetName: r.targetName ?? '',
        count: Number(r.count) || 0,
      }),
    );
  }

  async exportAuditLogs(
    params: AuditLogQueryParams,
  ): Promise<AuditLogItem[]> {
    const whereSql = this.buildWhereConditions(params);

    const rows = await this.db
      .select({
        id: auditLogs.id,
        traceId: auditLogs.traceId,
        userId: auditLogs.userId,
        userName: auditLogs.userName,
        userDepartment: auditLogs.userDepartment,
        module: auditLogs.module,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        targetName: auditLogs.targetName,
        description: auditLogs.description,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        requestMethod: auditLogs.requestMethod,
        requestPath: auditLogs.requestPath,
        status: auditLogs.status,
        errorMessage: auditLogs.errorMessage,
        duration: auditLogs.duration,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(whereSql)
      .orderBy(desc(auditLogs.createdAt))
      .limit(MAX_EXPORT);

    return rows.map(
      (row: {
        id: string;
        traceId: string;
        userId: string;
        userName: string;
        userDepartment: string;
        module: string;
        action: string;
        targetType: string;
        targetId: string | null;
        targetName: string | null;
        description: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        requestMethod: string | null;
        requestPath: string | null;
        status: string;
        errorMessage: string | null;
        duration: number;
        createdAt: Date;
      }) => mapRowToItem(row),
    );
  }

  async exportAuditLogsCSV(params: AuditLogQueryParams): Promise<string> {
    const items: AuditLogItem[] = await this.exportAuditLogs(params);
    const headers: string[] = [
      'ID', 'Trace ID', '用户ID', '用户名', '部门', '模块',
      '操作', '目标类型', '目标ID', '目标名称', '描述',
      'IP地址', 'User Agent', '请求方法', '请求路径',
      '状态', '错误信息', '耗时(ms)', '操作时间',
    ];
    const escapeCsv = (v: unknown): string => {
      const s: string = v != null ? String(v) : '';
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const lines: string[] = [headers.join(',')];
    for (const item of items) {
      lines.push(
        [
          item.id,
          item.traceId,
          item.operator,
          item.operatorName ?? '',
          item.department ?? '',
          item.module,
          item.operationType,
          item.targetType,
          item.targetId,
          item.targetName ?? '',
          item.description ?? '',
          item.ipAddress,
          item.userAgent ?? '',
          item.method,
          item.path,
          item.status,
          item.errorMessage ?? '',
          item.duration,
          item.createdAt,
        ].map(escapeCsv).join(','),
      );
    }
    return lines.join('\n');
  }

}