import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { and, count, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';
import { assetReservations } from '@server/database/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { FixedAssetsService } from '../fixed-assets/fixed-assets.service';
import type {
  AssetReservationItem,
  ReservationDetail,
  ReservationOperationRecord,
  ReservationStats,
} from '@shared/api.interface';

interface FindAllParams {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
  userId?: string;
  expectedBorrowDateFrom?: string;
  expectedBorrowDateTo?: string;
}

interface CreateReservationParams {
  assetId: string;
  assetName: string;
  assetCode: string;
  assetType?: string;
  requesterName: string;
  requesterDepartment: string;
  approver?: string;
  purpose: string;
  expectedBorrowDate: string;
  expectedReturnDate: string;
}

type ReservationRow = typeof assetReservations.$inferSelect;

function toISOOrUndefined(d: Date | null): string | undefined {
  if (!d || d.getTime() === 0) return undefined;
  return d.toISOString();
}

function buildOperationHistory(
  row: ReservationRow,
): ReservationOperationRecord[] {
  const history: ReservationOperationRecord[] = [
    {
      id: `create-${row.id}`,
      reservationId: row.id,
      operationType: 'create',
      operatorId: row.requester,
      operatorName: row.requesterName,
      createdAt: row.createdAt.toISOString(),
    },
  ];
  if (row.status === 'approved' || row.status === 'borrowed' || row.status === 'returned') {
    history.push({
      id: `approve-${row.id}`,
      reservationId: row.id,
      operationType: 'approve',
      operatorId: row.approver ?? '',
      operatorName: row.approverName ?? undefined,
      remark: row.approvalRemark ?? undefined,
      createdAt: toISOOrUndefined(row.approvedAt) ?? row.createdAt.toISOString(),
    });
  }
  if (row.status === 'rejected') {
    history.push({
      id: `reject-${row.id}`,
      reservationId: row.id,
      operationType: 'reject',
      operatorId: row.approver ?? '',
      operatorName: row.approverName ?? undefined,
      remark: row.rejectReason ?? undefined,
      createdAt: row.createdAt.toISOString(),
    });
  }
  if (row.status === 'borrowed' || row.status === 'returned') {
    history.push({
      id: `borrow-${row.id}`,
      reservationId: row.id,
      operationType: 'borrow',
      operatorId: row.requester,
      operatorName: row.requesterName,
      createdAt: toISOOrUndefined(row.borrowedAt) ?? row.createdAt.toISOString(),
    });
  }
  if (row.status === 'returned') {
    history.push({
      id: `return-${row.id}`,
      reservationId: row.id,
      operationType: 'return',
      operatorId: row.requester,
      operatorName: row.requesterName,
      remark: row.returnRemark ?? undefined,
      createdAt: toISOOrUndefined(row.returnedAt) ?? row.createdAt.toISOString(),
    });
  }
  if (row.status === 'cancelled') {
    history.push({
      id: `cancel-${row.id}`,
      reservationId: row.id,
      operationType: 'cancel',
      operatorId: row.requester,
      operatorName: row.requesterName,
      createdAt: row.createdAt.toISOString(),
    });
  }
  return history;
}

function mapRow(row: ReservationRow): AssetReservationItem {
  return {
    id: row.id,
    reservationNo: row.reservationNo,
    assetId: row.assetId,
    assetName: row.assetName,
    assetCode: row.assetCode,
    assetType: row.assetType,
    requesterId: row.requester,
    requesterName: row.requesterName,
    requesterDepartment: row.requesterDepartment,
    approverId: row.approver ?? undefined,
    approverName: row.approverName ?? undefined,
    status: row.status as AssetReservationItem['status'],
    purpose: row.purpose,
    expectedBorrowDate: row.expectedBorrowDate,
    expectedReturnDate: row.expectedReturnDate,
    actualBorrowDate: row.actualBorrowDate ?? undefined,
    actualReturnDate: row.actualReturnDate ?? undefined,
    approvalRemark: row.approvalRemark ?? undefined,
    rejectReason: row.rejectReason ?? undefined,
    returnRemark: row.returnRemark ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    approvedAt: toISOOrUndefined(row.approvedAt),
    borrowedAt: toISOOrUndefined(row.borrowedAt),
    returnedAt: toISOOrUndefined(row.returnedAt),
  };
}

@Injectable()
export class AssetReservationsService {
  private readonly logger = new Logger(AssetReservationsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly notificationsService: NotificationsService,
    private readonly fixedAssetsService: FixedAssetsService,
  ) {}

  /**
   * 生成预约单号 RR-YYYYMMDD-XXXX
   */
  async generateReservationNo(): Promise<string> {
    const today: Date = new Date();
    const yyyy: string = String(today.getFullYear());
    const mm: string = String(today.getMonth() + 1).padStart(2, '0');
    const dd: string = String(today.getDate()).padStart(2, '0');
    const prefix: string = `RR-${yyyy}${mm}${dd}-`;

    const rows: Array<{ reservationNo: string }> = await this.db
      .select({ reservationNo: assetReservations.reservationNo })
      .from(assetReservations)
      .where(like(assetReservations.reservationNo, `${prefix}%`))
      .orderBy(desc(assetReservations.reservationNo))
      .limit(1);

    let seq = 1;
    if (rows.length > 0) {
      const lastNo: string = rows[0].reservationNo;
      const lastSeq: number = parseInt(lastNo.slice(prefix.length), 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /**
   * 创建预约申请
   */
  async create(
    dto: CreateReservationParams,
    userId: string,
    userName: string,
    department?: string,
  ): Promise<AssetReservationItem> {
    const reservationNo: string = await this.generateReservationNo();

    const inserted: ReservationRow[] = await this.db
      .insert(assetReservations)
      .values({
        reservationNo,
        assetId: dto.assetId,
        assetName: dto.assetName,
        assetCode: dto.assetCode,
        assetType: dto.assetType ?? '',
        requester: userId,
        requesterName: dto.requesterName || userName,
        requesterDepartment: dto.requesterDepartment || department || '',
        approver: dto.approver ?? null,
        status: 'pending',
        purpose: dto.purpose,
        expectedBorrowDate: dto.expectedBorrowDate,
        expectedReturnDate: dto.expectedReturnDate,
      })
      .returning();

    const reservation: ReservationRow = inserted[0];
    this.logger.log(
      `资产预约创建成功: ${reservationNo}, userId=${userId}`,
    );

    // 通知审批人
    if (dto.approver) {
      await this.notificationsService.create({
        userId: dto.approver,
        type: 'asset',
        title: '新的资产预约申请',
        content: `您有一份新的资产预约申请需要审批：${dto.assetName}（${dto.assetCode}）`,
        relatedType: 'asset_reservation',
        relatedId: reservation.id,
        priority: 'high',
      });
    }

    return mapRow(reservation);
  }

  /**
   * 分页查询预约列表
   */
  async findAll(params: FindAllParams): Promise<{
    items: AssetReservationItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page: number = params.page ?? 1;
    const pageSize: number = Math.min(100, params.pageSize ?? 20);

    const conditions: Array<ReturnType<typeof sql> | ReturnType<typeof eq>> =
      [];

    if (params.status) {
      conditions.push(eq(assetReservations.status, params.status));
    }

    if (params.userId) {
      conditions.push(eq(assetReservations.requester, params.userId));
    }

    if (params.keyword) {
      const pattern: string = `%${params.keyword}%`;
      conditions.push(
        sql`(${assetReservations.assetName} ILIKE ${pattern} OR ${assetReservations.assetCode} ILIKE ${pattern} OR ${assetReservations.requesterName} ILIKE ${pattern})`,
      );
    }

    if (params.expectedBorrowDateFrom) {
      conditions.push(
        gte(
          assetReservations.expectedBorrowDate,
          params.expectedBorrowDateFrom,
        ),
      );
    }

    if (params.expectedBorrowDateTo) {
      conditions.push(
        lte(
          assetReservations.expectedBorrowDate,
          params.expectedBorrowDateTo,
        ),
      );
    }

    const where =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, itemsResult] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(assetReservations)
        .where(where),
      this.db
        .select({
          id: assetReservations.id,
          reservationNo: assetReservations.reservationNo,
          assetId: assetReservations.assetId,
          assetName: assetReservations.assetName,
          assetCode: assetReservations.assetCode,
          assetType: assetReservations.assetType,
          requester: assetReservations.requester,
          requesterName: assetReservations.requesterName,
          requesterDepartment: assetReservations.requesterDepartment,
          approver: assetReservations.approver,
          approverName: assetReservations.approverName,
          status: assetReservations.status,
          purpose: assetReservations.purpose,
          expectedBorrowDate: assetReservations.expectedBorrowDate,
          expectedReturnDate: assetReservations.expectedReturnDate,
          actualBorrowDate: assetReservations.actualBorrowDate,
          actualReturnDate: assetReservations.actualReturnDate,
          approvalRemark: assetReservations.approvalRemark,
          rejectReason: assetReservations.rejectReason,
          returnRemark: assetReservations.returnRemark,
          approvedAt: assetReservations.approvedAt,
          borrowedAt: assetReservations.borrowedAt,
          returnedAt: assetReservations.returnedAt,
          createdAt: assetReservations.createdAt,
          updatedAt: assetReservations.updatedAt,
        })
        .from(assetReservations)
        .where(where)
        .orderBy(desc(assetReservations.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);

    const total: number = Number(totalResult[0]?.count ?? 0);

    return {
      items: itemsResult.map((row: ReservationRow) => mapRow(row)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取预约详情
   */
  async findById(id: string): Promise<ReservationDetail> {
    const rows: ReservationRow[] = await this.db
      .select()
      .from(assetReservations)
      .where(eq(assetReservations.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('预约记录不存在');
    }

    const item: AssetReservationItem = mapRow(rows[0]);
    const operationHistory: ReservationOperationRecord[] =
      buildOperationHistory(rows[0]);
    return { ...item, operationHistory };
  }

  /**
   * 审批通过
   */
  async approve(
    id: string,
    userId: string,
    userName: string,
    remark?: string,
  ): Promise<AssetReservationItem> {
    const existing: ReservationRow[] = await this.db
      .select()
      .from(assetReservations)
      .where(eq(assetReservations.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('预约记录不存在');
    }

    const reservation: ReservationRow = existing[0];

    if (reservation.status !== 'pending') {
      throw new BadRequestException(
        `当前状态为「${reservation.status}」，不允许审批操作`,
      );
    }

    if (reservation.approver && reservation.approver !== userId) {
      throw new ForbiddenException('您不是该预约的指定审批人');
    }

    const now: Date = new Date();

    // 检查同一资产是否已有其他 approved/borrowed 预约
    const conflicting: ReservationRow[] = await this.db
      .select()
      .from(assetReservations)
      .where(
        and(
          eq(assetReservations.assetId, reservation.assetId),
          or(
            eq(assetReservations.status, 'approved'),
            eq(assetReservations.status, 'borrowed'),
          ),
          sql`${assetReservations.id} != ${id}`,
        ),
      )
      .limit(1);

    if (conflicting.length > 0) {
      throw new ConflictException('该资产已被其他预约占用');
    }

    const updated: ReservationRow[] = await this.db
      .update(assetReservations)
      .set({
        status: 'approved',
        approver: userId,
        approverName: userName,
        approvedAt: now,
        approvalRemark: remark ?? null,
      })
      .where(eq(assetReservations.id, id))
      .returning();

    const result: ReservationRow = updated[0];
    this.logger.log(
      `资产预约审批通过: ${result.reservationNo}, approver=${userId}`,
    );

    // 通知申请人
    await this.notificationsService.create({
      userId: result.requester,
      type: 'asset',
      title: '资产预约申请已通过',
      content: `您的资产预约申请（${result.reservationNo}）已通过审批`,
      relatedType: 'asset_reservation',
      relatedId: result.id,
      priority: 'normal',
    });

    return mapRow(result);
  }

  /**
   * 拒绝
   */
  async reject(
    id: string,
    userId: string,
    userName: string,
    reason: string,
  ): Promise<AssetReservationItem> {
    const existing: ReservationRow[] = await this.db
      .select()
      .from(assetReservations)
      .where(eq(assetReservations.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('预约记录不存在');
    }

    const reservation: ReservationRow = existing[0];

    if (reservation.approver && reservation.approver !== userId) {
      throw new ForbiddenException('您不是该预约的指定审批人');
    }

    const updated: ReservationRow[] = await this.db
      .update(assetReservations)
      .set({
        status: 'rejected',
        approver: userId,
        approverName: userName,
        rejectReason: reason,
      })
      .where(eq(assetReservations.id, id))
      .returning();

    const result: ReservationRow = updated[0];
    this.logger.log(
      `资产预约已拒绝: ${result.reservationNo}, rejector=${userId}`,
    );

    // 通知申请人
    await this.notificationsService.create({
      userId: result.requester,
      type: 'asset',
      title: '资产预约申请已拒绝',
      content: `您的资产预约申请（${result.reservationNo}）已被拒绝，原因：${reason}`,
      relatedType: 'asset_reservation',
      relatedId: result.id,
      priority: 'high',
    });

    return mapRow(result);
  }

  /**
   * 借出
   */
  async borrow(id: string): Promise<AssetReservationItem> {
    const existing: ReservationRow[] = await this.db
      .select()
      .from(assetReservations)
      .where(eq(assetReservations.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('预约记录不存在');
    }

    const reservation: ReservationRow = existing[0];

    if (reservation.status !== 'approved') {
      throw new BadRequestException(
        `当前状态为「${reservation.status}」，不允许借出操作`,
      );
    }

    const now: Date = new Date();
    const todayStr: string = now.toISOString().slice(0, 10);

    const updated: ReservationRow[] = await this.db
      .update(assetReservations)
      .set({
        status: 'borrowed',
        actualBorrowDate: todayStr,
        borrowedAt: now,
      })
      .where(eq(assetReservations.id, id))
      .returning();

    const result: ReservationRow = updated[0];
    this.logger.log(
      `资产已借出: ${result.reservationNo}`,
    );

    // 更新资产状态为 in_use
    await this.fixedAssetsService.updateAssetStatus(
      reservation.assetId,
      'in_use',
    );

    // 通知申请人
    await this.notificationsService.create({
      userId: result.requester,
      type: 'asset',
      title: '资产已借出',
      content: `您预约的资产 ${result.assetName}（${result.reservationNo}）已借出`,
      relatedType: 'asset_reservation',
      relatedId: result.id,
      priority: 'normal',
    });

    return mapRow(result);
  }

  /**
   * 归还
   */
  async returnAsset(
    id: string,
    remark?: string,
  ): Promise<AssetReservationItem> {
    const existing: ReservationRow[] = await this.db
      .select()
      .from(assetReservations)
      .where(eq(assetReservations.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('预约记录不存在');
    }

    const reservation: ReservationRow = existing[0];

    if (reservation.status !== 'borrowed') {
      throw new BadRequestException(
        `当前状态为「${reservation.status}」，不允许归还操作`,
      );
    }

    const now: Date = new Date();
    const todayStr: string = now.toISOString().slice(0, 10);

    const updated: ReservationRow[] = await this.db
      .update(assetReservations)
      .set({
        status: 'returned',
        actualReturnDate: todayStr,
        returnedAt: now,
        returnRemark: remark ?? null,
      })
      .where(eq(assetReservations.id, id))
      .returning();

    const result: ReservationRow = updated[0];
    this.logger.log(
      `资产已归还: ${result.reservationNo}`,
    );

    // 恢复资产状态为 in_stock
    await this.fixedAssetsService.updateAssetStatus(
      reservation.assetId,
      'in_stock',
    );

    // 通知申请人
    await this.notificationsService.create({
      userId: result.requester,
      type: 'asset',
      title: '资产已归还',
      content: `您预约的资产 ${result.assetName}（${result.reservationNo}）已归还`,
      relatedType: 'asset_reservation',
      relatedId: result.id,
      priority: 'normal',
    });

    return mapRow(result);
  }

  /**
   * 取消
   */
  async cancel(
    id: string,
    userId: string,
  ): Promise<AssetReservationItem> {
    const existing: ReservationRow[] = await this.db
      .select()
      .from(assetReservations)
      .where(eq(assetReservations.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('预约记录不存在');
    }

    const reservation: ReservationRow = existing[0];

    if (
      reservation.status !== 'pending' &&
      reservation.status !== 'approved' &&
      reservation.status !== 'borrowed'
    ) {
      throw new BadRequestException(
        `当前状态为「${reservation.status}」，不允许取消操作`,
      );
    }

    if (reservation.requester !== userId) {
      throw new ForbiddenException('您不是该预约的申请人，无法取消');
    }

    const updated: ReservationRow[] = await this.db
      .update(assetReservations)
      .set({ status: 'cancelled' })
      .where(eq(assetReservations.id, id))
      .returning();

    const result: ReservationRow = updated[0];
    this.logger.log(
      `资产预约已取消: ${result.reservationNo}`,
    );

    // 如果已审批或已借出，恢复资产状态
    if (
      reservation.status === 'approved' ||
      reservation.status === 'borrowed'
    ) {
      await this.fixedAssetsService.updateAssetStatus(
        reservation.assetId,
        'in_stock',
      );
    }

    return mapRow(result);
  }

  /**
   * 我的预约列表
   */
  async getMyReservations(
    userId: string,
    params: FindAllParams,
  ): Promise<{
    items: AssetReservationItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.findAll({ ...params, userId });
  }

  /**
   * 待审批列表
   */
  async getPendingApprovals(params: FindAllParams): Promise<{
    items: AssetReservationItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.findAll({ ...params, status: 'pending' });
  }

  /**
   * 统计各状态数量
   */
  async getStats(): Promise<ReservationStats> {
    const rows: Array<{ status: string; count: number }> = await this.db
      .select({
        status: assetReservations.status,
        count: count(),
      })
      .from(assetReservations)
      .groupBy(assetReservations.status);

    const stats: ReservationStats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      borrowed: 0,
      returned: 0,
      cancelled: 0,
    };

    for (const row of rows) {
      const n: number = Number(row.count);
      stats.total += n;
      if (row.status in stats) {
        stats[row.status as keyof ReservationStats] = n;
      }
    }

    return stats;
  }
}