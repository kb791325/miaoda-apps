import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, desc, asc, and, count } from 'drizzle-orm';
import { baoKuanJiYin as viralGenes } from '@server/database/schema';
import type { ViralGene, ListResponse } from '@shared/api.interface';

type GeneType = 'hook' | 'copy' | 'emotion' | 'editing' | 'tag' | 'bgm';
type GeneSort = 'effect' | 'useCount' | 'createdAt';

@Injectable()
export class GeneService {
  private readonly logger = new Logger(GeneService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async listGenes(
    type: GeneType | 'all',
    page: number,
    pageSize: number,
    sort: GeneSort = 'effect',
  ): Promise<ListResponse<ViralGene>> {
    const whereClause = type === 'all' ? undefined : eq(viralGenes.geneType, type);

    const orderBy =
      sort === 'effect'
        ? desc(viralGenes.effectScore)
        : sort === 'useCount'
        ? desc(viralGenes.useCount)
        : desc(viralGenes.createdAt);

    const query = whereClause
      ? this.db.select().from(viralGenes).where(whereClause).orderBy(orderBy)
      : this.db.select().from(viralGenes).orderBy(orderBy);

    const totalResult = whereClause
      ? await this.db
          .select({ count: count() })
          .from(viralGenes)
          .where(whereClause)
      : await this.db.select({ count: count() }).from(viralGenes);

    const total = Number(totalResult[0]?.count || 0);

    const rows = await query.limit(pageSize).offset((page - 1) * pageSize);

    const items: ViralGene[] = rows.map((row) => ({
      id: row.id,
      geneType: row.geneType,
      content: row.content,
      effectScore: row.effectScore || 0,
      sourceVideoId: row.sourceVideoId || undefined,
      isFavorite: row.isFavorite || false,
      useCount: row.useCount || 0,
      createdAt: row.createdAt ? row.createdAt.toISOString() : '',
    }));

    return { items, total, page, pageSize };
  }

  async toggleFavorite(id: string): Promise<{ id: string; isFavorite: boolean }> {
    const existing = await this.db
      .select({ id: viralGenes.id, isFavorite: viralGenes.isFavorite })
      .from(viralGenes)
      .where(eq(viralGenes.id, id));

    if (existing.length === 0) {
      throw new NotFoundException('基因不存在');
    }

    const newValue = !existing[0].isFavorite;
    await this.db
      .update(viralGenes)
      .set({ isFavorite: newValue })
      .where(eq(viralGenes.id, id));

    return { id, isFavorite: newValue };
  }

  async incrementUse(id: string): Promise<{ id: string; useCount: number }> {
    const existing = await this.db
      .select({ id: viralGenes.id, useCount: viralGenes.useCount })
      .from(viralGenes)
      .where(eq(viralGenes.id, id));

    if (existing.length === 0) {
      throw new NotFoundException('基因不存在');
    }

    const newCount = (existing[0].useCount || 0) + 1;
    await this.db
      .update(viralGenes)
      .set({ useCount: newCount })
      .where(eq(viralGenes.id, id));

    return { id, useCount: newCount };
  }
}
