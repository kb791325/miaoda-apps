import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  eq,
  and,
  or,
  gte,
  lt,
  desc,
  count,
  ilike,
  inArray,
  sum,
} from 'drizzle-orm';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { attachments } from '@server/database/schema';
import type {
  AttachmentItem,
  AttachmentListResponse,
  AttachmentStats,
} from '@shared/api.interface';

export interface CreateAttachmentData {
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
  fileCategory: string;
  relatedType: string;
  relatedId: string;
  uploaderId: string;
  uploaderName: string;
  description?: string;
}

export interface AttachmentListParams {
  page?: number;
  pageSize?: number;
  fileCategory?: string;
  relatedType?: string;
  uploaderId?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateAttachmentData {
  description?: string;
  fileCategory?: string;
}

function mapRowToItem(
  row: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    downloadUrl: string;
    fileCategory: string;
    relatedType: string;
    relatedId: string;
    uploaderId: string;
    uploaderName: string;
    description: string | null;
    createdAt: Date;
  },
): AttachmentItem {
  return {
    id: row.id,
    fileName: row.fileName,
    fileType: row.fileType,
    fileSize: row.fileSize,
    downloadUrl: row.downloadUrl,
    fileCategory: row.fileCategory as AttachmentItem['fileCategory'],
    relatedType: row.relatedType,
    relatedId: row.relatedId,
    uploaderId: row.uploaderId,
    uploaderName: row.uploaderName,
    description: (row.description ?? undefined) as AttachmentItem['description'],
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async createAttachment(
    data: CreateAttachmentData,
  ): Promise<AttachmentItem> {
    const [row] = await this.db
      .insert(attachments)
      .values({
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        downloadUrl: data.downloadUrl,
        fileCategory: data.fileCategory,
        relatedType: data.relatedType,
        relatedId: data.relatedId,
        uploaderId: data.uploaderId,
        uploaderName: data.uploaderName,
        description: data.description ?? null,
      })
      .returning();

    return mapRowToItem(row);
  }

  async getAttachmentsByRelated(
    relatedType: string,
    relatedId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<AttachmentListResponse> {
    const whereSql = and(
      eq(attachments.relatedType, relatedType),
      eq(attachments.relatedId, relatedId),
    );

    const [totalRow] = await this.db
      .select({ count: count() })
      .from(attachments)
      .where(whereSql);
    const total: number = Number(totalRow?.count) || 0;

    const rows = await this.db
      .select()
      .from(attachments)
      .where(whereSql)
      .orderBy(desc(attachments.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items: AttachmentItem[] = rows.map((row) =>
      mapRowToItem(row),
    );

    return { items, total, page, pageSize };
  }

  async getAttachments(
    params: AttachmentListParams,
  ): Promise<AttachmentListResponse> {
    const page: number = params.page ?? 1;
    const pageSize: number = Math.min(100, params.pageSize ?? 20);
    const conditions: ReturnType<typeof eq>[] = [];

    if (params.fileCategory) {
      conditions.push(eq(attachments.fileCategory, params.fileCategory));
    }
    if (params.relatedType) {
      conditions.push(eq(attachments.relatedType, params.relatedType));
    }
    if (params.uploaderId) {
      conditions.push(eq(attachments.uploaderId, params.uploaderId));
    }
    if (params.keyword) {
      conditions.push(
        or(
          ilike(attachments.fileName, `%${params.keyword}%`),
          ilike(attachments.description, `%${params.keyword}%`),
        ),
      );
    }
    if (params.startDate) {
      conditions.push(
        gte(attachments.createdAt, new Date(params.startDate)),
      );
    }
    if (params.endDate) {
      const end: Date = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lt(attachments.createdAt, end));
    }

    const whereSql =
      conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await this.db
      .select({ count: count() })
      .from(attachments)
      .where(whereSql);
    const total: number = Number(totalRow?.count) || 0;

    const rows = await this.db
      .select({
        id: attachments.id,
        fileName: attachments.fileName,
        fileType: attachments.fileType,
        fileSize: attachments.fileSize,
        downloadUrl: attachments.downloadUrl,
        fileCategory: attachments.fileCategory,
        relatedType: attachments.relatedType,
        relatedId: attachments.relatedId,
        uploaderId: attachments.uploaderId,
        uploaderName: attachments.uploaderName,
        description: attachments.description,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .where(whereSql)
      .orderBy(desc(attachments.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items: AttachmentItem[] = rows.map((row) =>
      mapRowToItem(row),
    );

    return { items, total, page, pageSize };
  }

  async getAttachmentById(id: string): Promise<AttachmentItem | null> {
    const [row] = await this.db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id));

    if (!row) return null;
    return mapRowToItem(row);
  }

  async updateAttachment(
    id: string,
    data: UpdateAttachmentData,
  ): Promise<AttachmentItem | null> {
    const patch: Record<string, unknown> = {};
    if (data.description !== undefined) {
      patch.description = data.description;
    }
    if (data.fileCategory !== undefined) {
      patch.fileCategory = data.fileCategory;
    }

    const [updated] = await this.db
      .update(attachments)
      .set(patch)
      .where(eq(attachments.id, id))
      .returning();

    if (!updated) return null;
    return mapRowToItem(updated);
  }

  async deleteAttachment(id: string): Promise<void> {
    const [deleted] = await this.db
      .delete(attachments)
      .where(eq(attachments.id, id))
      .returning({ id: attachments.id });

    if (!deleted) {
      this.logger.warn(`附件不存在，删除失败: ${id}`);
    }
  }

  async deleteAttachments(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .delete(attachments)
      .where(inArray(attachments.id, ids));
  }

  async getAttachmentStats(): Promise<AttachmentStats> {
    const [totalRow] = await this.db
      .select({ count: count() })
      .from(attachments);
    const totalCount: number = Number(totalRow?.count) || 0;

    const [sizeRow] = await this.db
      .select({ totalSize: sum(attachments.fileSize) })
      .from(attachments);
    const totalSize: number = Number(sizeRow?.totalSize) || 0;

    const byCategoryRows = await this.db
      .select({
        category: attachments.fileCategory,
        count: count(),
      })
      .from(attachments)
      .groupBy(attachments.fileCategory);

    const byRelatedTypeRows = await this.db
      .select({
        relatedType: attachments.relatedType,
        count: count(),
      })
      .from(attachments)
      .groupBy(attachments.relatedType);

    const now: Date = new Date();
    const monthStart: Date = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );
    const nextMonthStart: Date = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
    );
    const [monthRow] = await this.db
      .select({ count: count() })
      .from(attachments)
      .where(
        and(
          gte(attachments.createdAt, monthStart),
          lt(attachments.createdAt, nextMonthStart),
        ),
      );
    const monthUploadCount: number = Number(monthRow?.count) || 0;

    return {
      totalCount,
      totalSize,
      byCategory: byCategoryRows.map(
        (r: { category: string; count: number }) => ({
          category: r.category,
          count: r.count,
        }),
      ),
      byRelatedType: byRelatedTypeRows.map(
        (r: { relatedType: string; count: number }) => ({
          relatedType: r.relatedType,
          count: r.count,
        }),
      ),
      monthUploadCount,
    };
  }
}