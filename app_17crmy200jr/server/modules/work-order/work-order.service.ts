import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
  AuthNPaasService,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, ilike, like, or, sql } from 'drizzle-orm';
import { workOrder } from '@server/database/schema';
import type {
  WorkOrderItem,
  WorkOrderDetail,
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
  WorkOrderStatus,
  WorkOrderSatisfaction,
  UserProfileDto,
} from '@shared/api.interface';

interface MiaodaUserInfo {
  miaodaUserID: string;
  name?: { zh_cn?: string; en_us?: string };
  avatar?: { image?: { large?: string } };
}

type WorkOrderRow = typeof workOrder.$inferSelect;

interface ListParams {
  status?: string;
  urgency?: string;
  problemType?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

const STATUS_FLOW: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  pending: ['processing', 'closed'],
  processing: ['waiting_confirm', 'closed'],
  waiting_confirm: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  waiting_confirm: '待确认',
  resolved: '已解决',
  closed: '已关闭',
};

function toISOOrUndefined(d: Date | null): string | undefined {
  if (!d || d.getTime() === 0) return undefined;
  return d.toISOString();
}

@Injectable()
export class WorkOrderService {
  private readonly logger = new Logger(WorkOrderService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly authnService: AuthNPaasService,
  ) {}

  /**
   * 生成工单号 GD-YYYYMMDD-XXXX
   */
  async generateOrderNo(): Promise<string> {
    const today: Date = new Date();
    const yyyy: string = String(today.getFullYear());
    const mm: string = String(today.getMonth() + 1).padStart(2, '0');
    const dd: string = String(today.getDate()).padStart(2, '0');
    const prefix: string = `GD-${yyyy}${mm}${dd}-`;

    const rows: Array<{ orderNo: string }> = await this.db
      .select({ orderNo: workOrder.orderNo })
      .from(workOrder)
      .where(like(workOrder.orderNo, `${prefix}%`))
      .orderBy(desc(workOrder.orderNo))
      .limit(1);

    let seq = 1;
    if (rows.length > 0 && rows[0].orderNo) {
      const lastSeq: number = parseInt(
        rows[0].orderNo.slice(prefix.length),
        10,
      );
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /**
   * 批量获取用户姓名
   */
  private async batchGetUserNames(
    userIds: string[],
  ): Promise<Map<string, string>> {
    const userMap = new Map<string, string>();
    if (userIds.length === 0) return userMap;

    try {
      const users: (MiaodaUserInfo | null)[] =
        await this.authnService.listUsersByIds(userIds);
      for (const u of users) {
        if (!u) continue;
        const name: string =
          u.name?.zh_cn ?? u.name?.en_us ?? '';
        userMap.set(u.miaodaUserID, name);
      }
    } catch (err: unknown) {
      this.logger.error(
        `listUsersByIds failed: ${JSON.stringify(err)}`,
      );
    }

    return userMap;
  }

  /**
   * 将数据库行映射为 WorkOrderItem
   */
  private async mapToItems(
    rows: WorkOrderRow[],
  ): Promise<WorkOrderItem[]> {
    const userIds = new Set<string>();
    for (const row of rows) {
      if (row.reporter) userIds.add(row.reporter);
      if (row.assignee) userIds.add(row.assignee);
    }
    const userMap = await this.batchGetUserNames([...userIds]);

    return rows.map((row: WorkOrderRow) => ({
      id: row.id,
      orderNo: row.orderNo,
      reporter: row.reporter,
      reporterName: userMap.get(row.reporter) ?? '',
      problemType: row.problemType as WorkOrderItem['problemType'],
      urgency: row.urgency as WorkOrderItem['urgency'],
      description: row.description ?? '',
      status: row.status as WorkOrderItem['status'],
      assignee: row.assignee ?? '',
      assigneeName: userMap.get(row.assignee ?? '') ?? '',
      createdAt: row.createdAt.toISOString(),
    }));
  }

  /**
   * 将数据库行映射为 WorkOrderDetail
   */
  private async mapToDetail(
    row: WorkOrderRow,
  ): Promise<WorkOrderDetail> {
    const userIds: string[] = [];
    if (row.reporter) userIds.push(row.reporter);
    if (row.assignee) userIds.push(row.assignee);
    const userMap = await this.batchGetUserNames(userIds);

    const reporterDetail: UserProfileDto = {
      userId: row.reporter,
      name: userMap.get(row.reporter) ?? '',
    };
    const assigneeDetail: UserProfileDto = row.assignee
      ? { userId: row.assignee, name: userMap.get(row.assignee) ?? '' }
      : { userId: '', name: '' };

    return {
      id: row.id,
      orderNo: row.orderNo,
      reporter: row.reporter,
      reporterName: userMap.get(row.reporter) ?? '',
      problemType: row.problemType as WorkOrderItem['problemType'],
      urgency: row.urgency as WorkOrderItem['urgency'],
      description: row.description ?? '',
      status: row.status as WorkOrderItem['status'],
      assignee: row.assignee ?? '',
      assigneeName: userMap.get(row.assignee ?? '') ?? '',
      createdAt: row.createdAt.toISOString(),
      contactPhone: row.contactPhone ?? '',
      assetId: row.assetId ?? '',
      assetName: row.assetName ?? '',
      attachmentUrls: row.attachmentUrls ?? '',
      reporterDetail,
      assigneeDetail,
      solution: row.solution ?? '',
      resolvedAt: toISOOrUndefined(row.resolvedAt) ?? '',
      satisfaction: row.satisfaction as WorkOrderSatisfaction,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * 分页查询工单列表
   */
  async list(params: ListParams): Promise<{
    items: WorkOrderItem[];
    total: number;
  }> {
    const page: number = params.page ?? 1;
    const pageSize: number = Math.min(100, params.pageSize ?? 20);

    const conditions: ReturnType<typeof sql>[] = [];

    if (params.status) {
      conditions.push(eq(workOrder.status, params.status));
    }
    if (params.urgency) {
      conditions.push(eq(workOrder.urgency, params.urgency));
    }
    if (params.problemType) {
      conditions.push(
        eq(workOrder.problemType, params.problemType),
      );
    }
    if (params.keyword) {
      const pattern: string = `%${params.keyword}%`;
      conditions.push(
        or(
          ilike(workOrder.orderNo, pattern),
          ilike(workOrder.description, pattern),
          ilike(workOrder.assetName, pattern),
          ilike(workOrder.contactPhone, pattern),
        )!,
      );
    }

    const where =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, itemsResult] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(workOrder)
        .where(where),
      this.db
        .select()
        .from(workOrder)
        .where(where)
        .orderBy(desc(workOrder.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);

    const total: number = Number(totalResult[0]?.count ?? 0);
    const items: WorkOrderItem[] = await this.mapToItems(
      itemsResult as WorkOrderRow[],
    );

    return { items, total };
  }

  /**
   * 创建工单
   */
  async create(
    dto: CreateWorkOrderDto,
    userId: string,
  ): Promise<WorkOrderItem> {
    const orderNo: string = await this.generateOrderNo();

    const inserted: WorkOrderRow[] = await this.db
      .insert(workOrder)
      .values({
        orderNo,
        reporter: userId,
        contactPhone: dto.contactPhone ?? null,
        assetId: dto.assetId ?? null,
        assetName: dto.assetName ?? null,
        problemType: dto.problemType,
        urgency: dto.urgency,
        description: dto.description,
        attachmentUrls: dto.attachmentUrls ?? null,
        status: 'pending',
      })
      .returning();

    const row: WorkOrderRow = inserted[0];
    this.logger.log(
      `工单创建成功: ${orderNo}, userId=${userId}`,
    );

    const items: WorkOrderItem[] = await this.mapToItems([row]);
    return items[0];
  }

  /**
   * 获取工单详情
   */
  async getById(id: string): Promise<WorkOrderDetail> {
    const rows: WorkOrderRow[] = await this.db
      .select()
      .from(workOrder)
      .where(eq(workOrder.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    return this.mapToDetail(rows[0]);
  }

  /**
   * 更新工单（处理人 + 解决方案）
   */
  async update(
    id: string,
    dto: UpdateWorkOrderDto,
  ): Promise<WorkOrderItem> {
    const patch: Partial<typeof workOrder.$inferInsert> = {};

    if (dto.solution !== undefined) {
      patch.solution = dto.solution;
    }
    if (dto.assignee !== undefined) {
      patch.assignee = dto.assignee || null;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const updated: WorkOrderRow[] = await this.db
      .update(workOrder)
      .set(patch)
      .where(eq(workOrder.id, id))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    this.logger.log(`工单更新成功: ${updated[0].orderNo}`);
    const items: WorkOrderItem[] = await this.mapToItems([updated[0]]);
    return items[0];
  }

  /**
   * 状态流转
   */
  async updateStatus(
    id: string,
    dto: UpdateWorkOrderStatusDto,
  ): Promise<WorkOrderItem> {
    const rows: WorkOrderRow[] = await this.db
      .select()
      .from(workOrder)
      .where(eq(workOrder.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    const current: WorkOrderRow = rows[0];
    const currentStatus: WorkOrderStatus =
      current.status as WorkOrderStatus;
    const targetStatus: WorkOrderStatus = dto.status;

    // 相同状态不操作
    if (currentStatus === targetStatus) {
      throw new BadRequestException(
        `工单已处于「${STATUS_LABELS[targetStatus]}」状态`,
      );
    }

    // 检查状态流转是否合法
    const allowedTransitions: WorkOrderStatus[] =
      STATUS_FLOW[currentStatus];
    if (!allowedTransitions.includes(targetStatus)) {
      throw new BadRequestException(
        `不允许从「${STATUS_LABELS[currentStatus]}」转为「${STATUS_LABELS[targetStatus]}」`,
      );
    }

    // waiting_confirm → resolved 必须填写满意度
    if (
      targetStatus === 'resolved' &&
      !dto.satisfaction
    ) {
      throw new BadRequestException('请填写满意度评价');
    }

    const patch: Partial<typeof workOrder.$inferInsert> = {
      status: targetStatus,
    };

    if (targetStatus === 'resolved') {
      patch.resolvedAt = new Date();
      patch.satisfaction = dto.satisfaction!;
    }

    const updated: WorkOrderRow[] = await this.db
      .update(workOrder)
      .set(patch)
      .where(eq(workOrder.id, id))
      .returning();

    this.logger.log(
      `工单状态流转: ${updated[0].orderNo} ${currentStatus} → ${targetStatus}`,
    );

    const items: WorkOrderItem[] = await this.mapToItems([updated[0]]);
    return items[0];
  }

  /**
   * 删除工单
   */
  async delete(id: string): Promise<void> {
    const deleted: Array<{ id: string }> = await this.db
      .delete(workOrder)
      .where(eq(workOrder.id, id))
      .returning({ id: workOrder.id });

    if (deleted.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    this.logger.log(`工单删除成功: id=${id}`);
  }
}