import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { syncMapping } from '@server/database/schema';
import type { SyncEntityType } from './sync-constants';

export type SyncMappingRow = typeof syncMapping.$inferSelect;

/** 本地记录 ↔ Base 记录映射维护（双向同步的对账基础） */
@Injectable()
export class SyncMappingService {
  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getByLocal(
    entityType: SyncEntityType,
    localId: string,
  ): Promise<SyncMappingRow | undefined> {
    const rows: SyncMappingRow[] = await this.db
      .select()
      .from(syncMapping)
      .where(
        and(
          eq(syncMapping.entityType, entityType),
          eq(syncMapping.localId, localId),
        ),
      );
    return rows[0];
  }

  async listByEntity(entityType: SyncEntityType): Promise<SyncMappingRow[]> {
    return this.db
      .select()
      .from(syncMapping)
      .where(eq(syncMapping.entityType, entityType));
  }

  async upsert(
    entityType: SyncEntityType,
    localId: string,
    baseTableId: string,
    baseRecordId: string,
  ): Promise<void> {
    const now = new Date();
    await this.db
      .insert(syncMapping)
      .values({
        entityType,
        localId,
        baseTableId,
        baseRecordId,
        lastSyncedAt: now,
      })
      .onConflictDoUpdate({
        target: [syncMapping.entityType, syncMapping.localId],
        set: { baseRecordId, lastSyncedAt: now, updatedAt: now },
      });
  }

  async touch(entityType: SyncEntityType, localId: string): Promise<void> {
    const now = new Date();
    await this.db
      .update(syncMapping)
      .set({ lastSyncedAt: now, updatedAt: now })
      .where(
        and(
          eq(syncMapping.entityType, entityType),
          eq(syncMapping.localId, localId),
        ),
      );
  }

  async remove(entityType: SyncEntityType, localId: string): Promise<void> {
    await this.db
      .delete(syncMapping)
      .where(
        and(
          eq(syncMapping.entityType, entityType),
          eq(syncMapping.localId, localId),
        ),
      );
  }
}
