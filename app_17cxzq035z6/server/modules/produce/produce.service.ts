import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, desc, and, count } from 'drizzle-orm';
import { shiPinZhiZuo as videoProductions } from '@server/database/schema';
import type {
  VideoProduction,
  ListResponse,
  VoiceoverConfig,
  BgmConfig,
} from '@shared/api.interface';

@Injectable()
export class ProduceService {
  private readonly logger = new Logger(ProduceService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async createProduction(scriptId: string): Promise<VideoProduction> {
    const inserted = await this.db.insert(videoProductions).values({
      scriptId,
      status: 'pending',
    }).returning();

    return this.mapVideoProduction(inserted[0]);
  }

  async getProduction(id: string): Promise<VideoProduction | null> {
    const rows = await this.db.select().from(videoProductions).where(eq(videoProductions.id, id));
    if (rows.length === 0) return null;
    return this.mapVideoProduction(rows[0]);
  }

  async updateProduction(
    id: string,
    patch: Partial<VideoProduction>,
  ): Promise<VideoProduction | null> {
    const existing = await this.db.select().from(videoProductions).where(eq(videoProductions.id, id));
    if (existing.length === 0) return null;

    const updateData: Record<string, unknown> = {};

    if (patch.characterRef !== undefined) updateData.characterRef = patch.characterRef;
    if (patch.storyboardImages !== undefined) {
      updateData.storyboardImages = patch.storyboardImages as unknown as Record<string, unknown>;
    }
    if (patch.videoClips !== undefined) {
      updateData.videoClips = patch.videoClips as unknown as Record<string, unknown>;
    }
    if (patch.voiceover !== undefined) {
      updateData.voiceover = patch.voiceover as unknown as Record<string, unknown>;
    }
    if (patch.bgmConfig !== undefined) {
      updateData.bgmConfig = patch.bgmConfig as unknown as Record<string, unknown>;
    }
    if (patch.finalVideoUrl !== undefined) updateData.finalVideoUrl = patch.finalVideoUrl;
    if (patch.status !== undefined) updateData.status = patch.status;
    if (patch.scriptId !== undefined) updateData.scriptId = patch.scriptId;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    updateData.updatedAt = new Date();

    const updated = await this.db.update(videoProductions)
      .set(updateData)
      .where(eq(videoProductions.id, id))
      .returning();

    return this.mapVideoProduction(updated[0]);
  }

  async listProductions(
    page: number,
    pageSize: number,
    status?: string,
  ): Promise<ListResponse<VideoProduction>> {
    const conditions = [];
    if (status) conditions.push(eq(videoProductions.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await this.db
      .select({ value: count() })
      .from(videoProductions)
      .where(whereClause);
    const total = Number(totalResult[0]?.value || 0);

    const offset = (page - 1) * pageSize;
    const rows = whereClause
      ? await this.db.select().from(videoProductions).where(whereClause).orderBy(desc(videoProductions.createdAt)).limit(pageSize).offset(offset)
      : await this.db.select().from(videoProductions).orderBy(desc(videoProductions.createdAt)).limit(pageSize).offset(offset);

    const items: VideoProduction[] = rows.map((r) => this.mapVideoProduction(r));

    return { items, total, page, pageSize };
  }

  // ========== Private helpers ==========

  private mapVideoProduction(row: Record<string, unknown>): VideoProduction {
    const voiceoverVal = row.voiceover as VoiceoverConfig | undefined;
    const bgmConfigVal = row.bgmConfig as BgmConfig | undefined;
    const storyboardImagesVal = row.storyboardImages as { shots: { id: number; imageUrl: string }[] } | undefined;
    const videoClipsVal = row.videoClips as { shots: { id: number; videoUrl: string }[] } | undefined;
    const createdAtVal = row.createdAt as Date | undefined;

    return {
      id: row.id as string,
      scriptId: (row.scriptId as string) || undefined,
      characterRef: (row.characterRef as string) || undefined,
      storyboardImages: storyboardImagesVal && Object.keys(storyboardImagesVal).length > 0
        ? storyboardImagesVal : undefined,
      videoClips: videoClipsVal && Object.keys(videoClipsVal).length > 0
        ? videoClipsVal : undefined,
      voiceover: voiceoverVal && Object.keys(voiceoverVal).length > 0
        ? voiceoverVal : undefined,
      bgmConfig: bgmConfigVal && Object.keys(bgmConfigVal).length > 0
        ? bgmConfigVal : undefined,
      finalVideoUrl: (row.finalVideoUrl as string) || undefined,
      status: (row.status as string) || 'pending',
      createdAt: createdAtVal ? createdAtVal.toISOString() : new Date().toISOString(),
    };
  }
}
