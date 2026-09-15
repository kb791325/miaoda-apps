import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import { AuthNPaasService } from "@lark-apaas/fullstack-nestjs-core";
import {
  and,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
} from "drizzle-orm";
import {
  license,
  licenseAssignment,
  supplier,
} from "@server/database/schema";
import type {
  LicenseItem,
  LicenseListResponse,
  LicenseAssignmentItem,
  CreateLicenseDto,
  UpdateLicenseDto,
  CreateLicenseAssignmentDto,
  LicenseSoftwareType,
  LicenseMode,
  LicenseAssignmentStatus,
} from "@shared/api.interface";

interface MiaodaUserInfo {
  miaodaUserID: string;
  name?: { zh_cn?: string; en_us?: string };
  avatar?: { image?: { large?: string } };
}

type LicenseSelect = typeof license.$inferSelect;

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly authNPaasService: AuthNPaasService,
  ) {}

  // ============================================================
  // List
  // ============================================================

  async list(
    keyword: string | undefined,
    softwareType: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<LicenseListResponse> {
    const conditions: ReturnType<typeof or>[] = [];

    if (keyword && keyword.trim()) {
      const kw = `%${keyword.trim()}%`;
      conditions.push(
        or(
          ilike(license.name, kw),
          ilike(license.licenseKey, kw),
        ) as ReturnType<typeof or>,
      );
    }

    if (softwareType && softwareType.trim()) {
      conditions.push(
        eq(license.softwareType, softwareType.trim()) as ReturnType<
          typeof eq
        >,
      );
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(license)
        .where(whereClause),
      this.db
        .select({
          id: license.id,
          name: license.name,
          softwareType: license.softwareType,
          licenseMode: license.licenseMode,
          totalSeats: license.totalSeats,
          purchaseDate: license.purchaseDate,
          purchaseAmount: license.purchaseAmount,
          expireDate: license.expireDate,
          remark: license.remark,
          supplierName: supplier.name,
          assignedCount: this.db.$count(
            licenseAssignment,
            and(
              eq(licenseAssignment.licenseId, license.id),
              eq(licenseAssignment.status, "active"),
            ),
          ),
        })
        .from(license)
        .leftJoin(supplier, eq(license.supplierId, supplier.id))
        .where(whereClause)
        .orderBy(desc(license.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);

    const total = Number(totalResult[0]?.total ?? 0);
    const items: LicenseItem[] = rows.map(
      (
        r: {
          id: string;
          name: string;
          softwareType: string;
          licenseMode: string;
          totalSeats: number;
          purchaseDate: string | null;
          purchaseAmount: string | null;
          expireDate: string | null;
          remark: string | null;
          supplierName: string | null;
          assignedCount: number;
        },
      ) => ({
        id: r.id,
        name: r.name,
        softwareType: r.softwareType as LicenseSoftwareType,
        licenseMode: r.licenseMode as LicenseMode,
        totalSeats: r.totalSeats,
        assignedCount: Number(r.assignedCount ?? 0),
        purchaseDate: r.purchaseDate ?? "",
        purchaseAmount: r.purchaseAmount ? Number(r.purchaseAmount) : 0,
        expireDate: r.expireDate ?? "",
        supplierName: r.supplierName ?? "",
        remark: r.remark ?? "",
      }),
    );

    return { items, total };
  }

  // ============================================================
  // Create
  // ============================================================

  async create(dto: CreateLicenseDto): Promise<LicenseItem> {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException("许可证名称不能为空");
    }
    if (dto.totalSeats < 1) {
      throw new BadRequestException("座位数至少为1");
    }

    const [inserted] = await this.db
      .insert(license)
      .values({
        name: dto.name.trim(),
        softwareType: dto.softwareType,
        licenseKey: dto.licenseKey?.trim() ?? null,
        licenseMode: dto.licenseMode,
        totalSeats: dto.totalSeats,
        purchaseDate: dto.purchaseDate?.trim() ?? null,
        purchaseAmount: dto.purchaseAmount != null
          ? String(dto.purchaseAmount)
          : null,
        expireDate: dto.expireDate,
        supplierId: dto.supplierId?.trim() ?? null,
        remark: dto.remark?.trim() ?? null,
      })
      .returning();

    this.logger.log(
      `许可证已创建: ${inserted.id} ${inserted.name}`,
    );

    let supplierName = "";
    if (inserted.supplierId) {
      const [sup] = await this.db
        .select({ name: supplier.name })
        .from(supplier)
        .where(eq(supplier.id, inserted.supplierId));
      supplierName = sup?.name ?? "";
    }

    return {
      id: inserted.id,
      name: inserted.name,
      softwareType: inserted.softwareType as LicenseSoftwareType,
      licenseMode: inserted.licenseMode as LicenseMode,
      totalSeats: inserted.totalSeats,
      assignedCount: 0,
      purchaseDate: inserted.purchaseDate ?? "",
      purchaseAmount: inserted.purchaseAmount
        ? Number(inserted.purchaseAmount)
        : 0,
      expireDate: inserted.expireDate ?? "",
      supplierName,
      remark: inserted.remark ?? "",
    };
  }

  // ============================================================
  // Update
  // ============================================================

  async update(
    id: string,
    dto: UpdateLicenseDto,
  ): Promise<LicenseItem> {
    const patch: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      if (!dto.name || !dto.name.trim()) {
        throw new BadRequestException("许可证名称不能为空");
      }
      patch.name = dto.name.trim();
    }
    if (dto.softwareType !== undefined) {
      patch.softwareType = dto.softwareType;
    }
    if (dto.licenseKey !== undefined) {
      patch.licenseKey = dto.licenseKey.trim() || null;
    }
    if (dto.licenseMode !== undefined) {
      patch.licenseMode = dto.licenseMode;
    }
    if (dto.totalSeats !== undefined) {
      if (dto.totalSeats < 0) {
        throw new BadRequestException("座位数不能为负数");
      }
      patch.totalSeats = dto.totalSeats;
    }
    if (dto.purchaseDate !== undefined) {
      patch.purchaseDate = dto.purchaseDate || null;
    }
    if (dto.purchaseAmount !== undefined) {
      patch.purchaseAmount = dto.purchaseAmount != null
        ? String(dto.purchaseAmount)
        : null;
    }
    if (dto.expireDate !== undefined) {
      patch.expireDate = dto.expireDate;
    }
    if (dto.supplierId !== undefined) {
      patch.supplierId = dto.supplierId || null;
    }
    if (dto.remark !== undefined) {
      patch.remark = dto.remark || null;
    }

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException("未提供可更新字段");
    }

    const rows = await this.db
      .update(license)
      .set(patch)
      .where(eq(license.id, id))
      .returning();

    if (rows.length === 0) {
      throw new NotFoundException("许可证不存在");
    }

    const updated = rows[0]!;
    this.logger.log(
      `许可证已更新: ${updated.id} ${updated.name}`,
    );

    let supplierName = "";
    if (updated.supplierId) {
      const [sup] = await this.db
        .select({ name: supplier.name })
        .from(supplier)
        .where(eq(supplier.id, updated.supplierId));
      supplierName = sup?.name ?? "";
    }

    const [countResult] = await this.db
      .select({ count: count() })
      .from(licenseAssignment)
      .where(
        and(
          eq(licenseAssignment.licenseId, id),
          eq(licenseAssignment.status, "active"),
        ),
      );

    return {
      id: updated.id,
      name: updated.name,
      softwareType: updated.softwareType as LicenseSoftwareType,
      licenseMode: updated.licenseMode as LicenseMode,
      totalSeats: updated.totalSeats,
      assignedCount: Number(countResult?.count ?? 0),
      purchaseDate: updated.purchaseDate ?? "",
      purchaseAmount: updated.purchaseAmount
        ? Number(updated.purchaseAmount)
        : 0,
      expireDate: updated.expireDate ?? "",
      supplierName,
      remark: updated.remark ?? "",
    };
  }

  // ============================================================
  // Delete
  // ============================================================

  async delete(id: string): Promise<void> {
    const rows = await this.db
      .delete(license)
      .where(eq(license.id, id))
      .returning({ id: license.id });

    if (rows.length === 0) {
      throw new NotFoundException("许可证不存在");
    }

    this.logger.log(`许可证已删除: ${id}`);
  }

  // ============================================================
  // Get Assignments
  // ============================================================

  async getAssignments(
    licenseId: string,
  ): Promise<LicenseAssignmentItem[]> {
    const rows = await this.db.execute<{
      id: string;
      assignee_id: string;
      device_id: string | null;
      assign_date: string;
      assigner_id: string;
      status: string;
    }>(
      sql`
        SELECT
          la.id,
          (la.assignee).user_id AS assignee_id,
          la.device_id,
          la.assign_date::text AS assign_date,
          (la.assigner).user_id AS assigner_id,
          la.status
        FROM license_assignment la
        WHERE la.license_id = ${licenseId}
        ORDER BY la.assign_date DESC
      `,
    );

    const userIds = new Set<string>();
    for (const row of rows) {
      if (row.assignee_id) userIds.add(row.assignee_id);
      if (row.assigner_id) userIds.add(row.assigner_id);
    }

    const userMap = new Map<string, string>();
    if (userIds.size > 0) {
      try {
        const users: (MiaodaUserInfo | null)[] =
          await this.authNPaasService.listUsersByIds(
            [...userIds],
          );
        for (const u of users) {
          if (!u) continue;
          const name: string =
            u.name?.zh_cn ?? u.name?.en_us ?? "";
          userMap.set(u.miaodaUserID, name);
        }
      } catch (err: unknown) {
        this.logger.error(
          `获取用户信息失败: ${JSON.stringify(err)}`,
        );
      }
    }

    return rows.map(
      (row: {
        id: string;
        assignee_id: string;
        device_id: string | null;
        assign_date: string;
        assigner_id: string;
        status: string;
      }) => ({
        id: row.id,
        assigneeName:
          userMap.get(row.assignee_id) ?? row.assignee_id,
        deviceName: row.device_id ?? "",
        assignDate: row.assign_date ?? "",
        assignerName:
          userMap.get(row.assigner_id) ?? row.assigner_id,
        status: row.status as LicenseAssignmentStatus,
      }),
    );
  }

  // ============================================================
  // Assign Seat
  // ============================================================

  async assignSeat(
    licenseId: string,
    dto: CreateLicenseAssignmentDto,
    assignerUserId: string,
  ): Promise<LicenseAssignmentItem> {
    const [licenseRow] = await this.db
      .select({
        id: license.id,
        totalSeats: license.totalSeats,
      })
      .from(license)
      .where(eq(license.id, licenseId));

    if (!licenseRow) {
      throw new NotFoundException("许可证不存在");
    }

    const [countResult] = await this.db
      .select({ count: count() })
      .from(licenseAssignment)
      .where(
        and(
          eq(licenseAssignment.licenseId, licenseId),
          eq(licenseAssignment.status, "active"),
        ),
      );

    const activeCount = Number(countResult?.count ?? 0);
    if (activeCount >= licenseRow.totalSeats) {
      throw new ConflictException("许可证座位已满，无法分配");
    }

    const [inserted] = await this.db
      .insert(licenseAssignment)
      .values({
        licenseId,
        assignee: dto.assignee,
        deviceId: dto.deviceId?.trim() ?? null,
        assigner: assignerUserId,
        status: "active",
      })
      .returning();

    this.logger.log(
      `座位已分配: license=${licenseId} assignee=${dto.assignee}`,
    );

    const userIds = [dto.assignee, assignerUserId];
    const userMap = new Map<string, string>();
    try {
      const users: (MiaodaUserInfo | null)[] =
        await this.authNPaasService.listUsersByIds(
          userIds,
        );
      for (const u of users) {
        if (!u) continue;
        const name: string =
          u.name?.zh_cn ?? u.name?.en_us ?? "";
        userMap.set(u.miaodaUserID, name);
      }
    } catch (err: unknown) {
      this.logger.error(
        `获取用户信息失败: ${JSON.stringify(err)}`,
      );
    }

    return {
      id: inserted.id,
      assigneeName:
        userMap.get(dto.assignee) ?? dto.assignee,
      deviceName: inserted.deviceId ?? "",
      assignDate: inserted.assignDate ?? "",
      assignerName:
        userMap.get(assignerUserId) ?? assignerUserId,
      status: inserted.status as LicenseAssignmentStatus,
    };
  }

  // ============================================================
  // Revoke Seat
  // ============================================================

  async revokeSeat(assignmentId: string): Promise<void> {
    const rows = await this.db
      .update(licenseAssignment)
      .set({ status: "revoked" })
      .where(eq(licenseAssignment.id, assignmentId))
      .returning({ id: licenseAssignment.id });

    if (rows.length === 0) {
      throw new NotFoundException("分配记录不存在");
    }

    this.logger.log(`座位已回收: ${assignmentId}`);
  }
}