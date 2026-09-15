import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from "@lark-apaas/fullstack-nestjs-core";
import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";
import { supplier } from "@server/database/schema";
import type {
  SupplierItem,
  SupplierListResponse,
  CreateSupplierDto,
  UpdateSupplierDto,
} from "@shared/api.interface";

type SupplierSelect = typeof supplier.$inferSelect;

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private toSupplierItem(row: SupplierSelect): SupplierItem {
    return {
      id: row.id,
      name: row.name,
      contactPerson: row.contactPerson ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      address: row.address ?? "",
      businessScope: row.businessScope ?? "",
      remark: row.remark ?? "",
    };
  }

  async list(
    keyword: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<SupplierListResponse> {
    const conditions = [];

    if (keyword && keyword.trim()) {
      const kw = `%${keyword.trim()}%`;
      conditions.push(
        or(
          ilike(supplier.name, kw),
          ilike(supplier.contactPerson, kw),
          ilike(supplier.phone, kw),
          ilike(supplier.email, kw),
          ilike(supplier.businessScope, kw),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(supplier)
        .where(whereClause),
      this.db
        .select()
        .from(supplier)
        .where(whereClause)
        .orderBy(asc(supplier.name))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);

    const total = Number(totalResult[0]?.total ?? 0);
    const items: SupplierItem[] = rows.map((r: SupplierSelect) =>
      this.toSupplierItem(r),
    );

    return { items, total };
  }

  async create(dto: CreateSupplierDto): Promise<SupplierItem> {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException("供应商名称不能为空");
    }

    const rows = await this.db
      .insert(supplier)
      .values({
        name: dto.name.trim(),
        contactPerson: dto.contactPerson?.trim() ?? null,
        phone: dto.phone?.trim() ?? null,
        email: dto.email?.trim() ?? null,
        address: dto.address?.trim() ?? null,
        businessScope: dto.businessScope?.trim() ?? null,
        remark: dto.remark?.trim() ?? null,
      })
      .returning();

    const created = rows[0]!;
    this.logger.log(`供应商已创建: ${created.id} ${created.name}`);
    return this.toSupplierItem(created);
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierItem> {
    const patch: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      if (!dto.name || !dto.name.trim()) {
        throw new BadRequestException("供应商名称不能为空");
      }
      patch.name = dto.name.trim();
    }
    if (dto.contactPerson !== undefined)
      patch.contactPerson = dto.contactPerson.trim() || null;
    if (dto.phone !== undefined)
      patch.phone = dto.phone.trim() || null;
    if (dto.email !== undefined)
      patch.email = dto.email.trim() || null;
    if (dto.address !== undefined)
      patch.address = dto.address.trim() || null;
    if (dto.businessScope !== undefined)
      patch.businessScope = dto.businessScope.trim() || null;
    if (dto.remark !== undefined)
      patch.remark = dto.remark.trim() || null;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException("未提供可更新字段");
    }

    const rows = await this.db
      .update(supplier)
      .set(patch)
      .where(eq(supplier.id, id))
      .returning();

    if (rows.length === 0) {
      throw new NotFoundException("供应商不存在");
    }

    const updated = rows[0]!;
    this.logger.log(`供应商已更新: ${updated.id} ${updated.name}`);
    return this.toSupplierItem(updated);
  }

  async delete(id: string): Promise<void> {
    const rows = await this.db
      .delete(supplier)
      .where(eq(supplier.id, id))
      .returning({ id: supplier.id });

    if (rows.length === 0) {
      throw new NotFoundException("供应商不存在");
    }

    this.logger.log(`供应商已删除: ${id}`);
  }
}