import { Inject, Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { eq, count, asc, ilike } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { categories } from '@server/database/schema';
import type { Category, CreateCategoryRequest, UpdateCategoryRequest, CategoryListResponse } from '@shared/api.interface';
import { extractPostgresErrorCode } from '@server/common/utils/pg-error';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async findAll(keyword?: string): Promise<CategoryListResponse> {
    const conditions = [];
    if (keyword?.trim()) {
      conditions.push(ilike(categories.name, `%${keyword.trim()}%`));
    }
    const where = conditions.length > 0 ? conditions[0] : undefined;

    const [listResult, countResult] = await Promise.all([
      this.db
        .select({
          id: categories.id,
          name: categories.name,
          description: categories.description,
          sortOrder: categories.sortOrder,
        })
        .from(categories)
        .where(where)
        .orderBy(asc(categories.sortOrder), asc(categories.name)),
      this.db
        .select({ count: count() })
        .from(categories)
        .where(where),
    ]);

    const items: Category[] = listResult.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      sortOrder: row.sortOrder ?? 0,
    }));

    return {
      items,
      total: Number(countResult[0]?.count ?? 0),
    };
  }

  async findOne(id: string): Promise<Category> {
    const rows = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        description: categories.description,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('品类不存在');
    return {
      id: rows[0].id,
      name: rows[0].name,
      description: rows[0].description ?? '',
      sortOrder: rows[0].sortOrder ?? 0,
    };
  }

  async create(dto: CreateCategoryRequest, userId: string): Promise<Category> {
    if (!dto.name?.trim()) throw new BadRequestException('品类名称不能为空');
    try {
      const rows = await this.db
        .insert(categories)
        .values({
          name: dto.name.trim(),
          description: dto.description?.trim() ?? '',
          sortOrder: dto.sortOrder ?? 0,
        })
        .returning({
          id: categories.id,
          name: categories.name,
          description: categories.description,
          sortOrder: categories.sortOrder,
        });
      return {
        id: rows[0].id,
        name: rows[0].name,
        description: rows[0].description ?? '',
        sortOrder: rows[0].sortOrder ?? 0,
      };
    } catch (err: unknown) {
      if (extractPostgresErrorCode(err) === '23505') {
        throw new ConflictException('品类名称已存在');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateCategoryRequest, userId: string): Promise<Category> {
    const patch: Partial<typeof categories.$inferInsert> = {};
    if (dto.name !== undefined) {
      if (!dto.name.trim()) throw new BadRequestException('品类名称不能为空');
      patch.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      patch.description = dto.description.trim();
    }
    if (dto.sortOrder !== undefined) {
      patch.sortOrder = dto.sortOrder;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    try {
      const rows = await this.db
        .update(categories)
        .set(patch)
        .where(eq(categories.id, id))
        .returning({
          id: categories.id,
          name: categories.name,
          description: categories.description,
          sortOrder: categories.sortOrder,
        });
      if (rows.length === 0) throw new NotFoundException('品类不存在');
      return {
        id: rows[0].id,
        name: rows[0].name,
        description: rows[0].description ?? '',
        sortOrder: rows[0].sortOrder ?? 0,
      };
    } catch (err: unknown) {
      if (extractPostgresErrorCode(err) === '23505') {
        throw new ConflictException('品类名称已存在');
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    const rows = await this.db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning({ id: categories.id });
    if (rows.length === 0) throw new NotFoundException('品类不存在');
  }
}
