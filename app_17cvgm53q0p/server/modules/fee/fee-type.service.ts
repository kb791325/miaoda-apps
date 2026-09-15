import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { feeType, orderFee } from '@server/database/schema';
import type {
  CreateFeeTypeRequest,
  FeeType,
  FeeTypeListResponse,
} from '@shared/fee';

type FeeTypeRow = typeof feeType.$inferSelect;

/** Drizzle 可能把原始 PostgreSQL error 放在 cause 链里，逐层提取 SQLSTATE */
function extractPostgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (
    let depth = 0;
    depth < 4 && current && typeof current === 'object';
    depth += 1
  ) {
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === 'string') return code;
    current = cause;
  }
  return undefined;
}

@Injectable()
export class FeeTypeService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  /** 费用类型列表：预设在前、自定义在后，组内按创建时间升序 */
  async list(): Promise<FeeTypeListResponse> {
    const rows: FeeTypeRow[] = await this.db
      .select()
      .from(feeType)
      .orderBy(asc(feeType.sortOrder), asc(feeType.createdAt));
    return {
      items: rows.map((row: FeeTypeRow) => this.mapFeeType(row)),
    };
  }

  /** 新增自定义费用类型（同名拒绝） */
  async create(dto: CreateFeeTypeRequest, userId?: string): Promise<FeeType> {
    const name: string = (dto.name ?? '').trim();
    if (!name) {
      throw new BadRequestException('费用类型名称不能为空');
    }
    if (name.length > 50) {
      throw new BadRequestException('费用类型名称不能超过 50 字');
    }
    try {
      const rows: FeeTypeRow[] = await this.db
        .insert(feeType)
        .values({
          name,
          isDefault: false,
          sortOrder: 100,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();
      return this.mapFeeType(rows[0]);
    } catch (error) {
      if (extractPostgresErrorCode(error) === '23505') {
        throw new ConflictException('同名费用类型已存在');
      }
      throw error;
    }
  }

  /** 删除费用类型：已被订单费用引用时拒绝 */
  async remove(id: string): Promise<{ success: boolean }> {
    const used: Array<{ id: string }> = await this.db
      .select({ id: orderFee.id })
      .from(orderFee)
      .where(eq(orderFee.feeTypeId, id))
      .limit(1);
    if (used.length > 0) {
      throw new ConflictException('该费用类型已被订单费用使用，无法删除');
    }
    const deleted: Array<{ id: string }> = await this.db
      .delete(feeType)
      .where(eq(feeType.id, id))
      .returning({ id: feeType.id });
    if (deleted.length === 0) {
      throw new NotFoundException('费用类型不存在');
    }
    return { success: true };
  }

  /** 按名称查询费用类型（安装费同步用） */
  async findByName(name: string): Promise<FeeTypeRow | undefined> {
    const rows: FeeTypeRow[] = await this.db
      .select()
      .from(feeType)
      .where(eq(feeType.name, name))
      .limit(1);
    return rows[0];
  }

  /** 按 id 查询，不存在抛 404 */
  async getRequired(id: string): Promise<FeeTypeRow> {
    const rows: FeeTypeRow[] = await this.db
      .select()
      .from(feeType)
      .where(eq(feeType.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('费用类型不存在');
    }
    return row;
  }

  private mapFeeType(row: FeeTypeRow): FeeType {
    return {
      id: row.id,
      name: row.name,
      isDefault: row.isDefault,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
