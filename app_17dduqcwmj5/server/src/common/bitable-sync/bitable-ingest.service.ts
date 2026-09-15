import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq } from 'drizzle-orm';
import {
  courseGeneralTable,
  marketingContent,
  marketingContentInbox,
} from '@server/database/schema';
import type { BitableIngestSummary } from '@shared/bitable-sync';
import type {
  MarketingContentStatus,
  MarketingContentType,
} from '@shared/content';

type InboxRow = typeof marketingContentInbox.$inferSelect;
type ContentRow = typeof marketingContent.$inferSelect;

const CONTENT_TYPE_FROM_BITABLE: Record<string, MarketingContentType> = {
  招生文案: 'enrollment_copy',
  短视频脚本: 'video_script',
  朋友圈: 'moments',
  海报文案: 'poster_copy',
};

const CONTENT_STATUS_FROM_BITABLE: Record<string, MarketingContentStatus> = {
  待审核: 'pending_review',
  可用: 'available',
  已使用: 'used',
  已驳回: 'rejected',
};

interface MappedInboxContent {
  title: string;
  contentType: string;
  body: string;
  status: string;
  scheduleDate: string | null;
  rejectReason: string | null;
  publishPlatform: string | null;
  likeCount: number | null;
  conversionCount: number | null;
  posterImages: string[] | null;
  attachments: Array<{ name: string; url: string }> | null;
  courseId: string | null;
}

@Injectable()
export class BitableIngestService {
  private readonly logger = new Logger(BitableIngestService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async ingestMarketingContent(): Promise<BitableIngestSummary> {
    const summary: BitableIngestSummary = {
      inserted: 0,
      updated: 0,
      skipped: 0,
    };
    const inboxRows: InboxRow[] = await this.db
      .select()
      .from(marketingContentInbox);
    if (inboxRows.length === 0) {
      return summary;
    }

    const courseRows: Array<{
      id: string;
      baseRecordId: string | null;
      bitableRecordId: string | null;
    }> = await this.db
      .select({
        id: courseGeneralTable.id,
        baseRecordId: courseGeneralTable.baseRecordId,
        bitableRecordId: courseGeneralTable.bitableRecordId,
      })
      .from(courseGeneralTable);
    const courseByRecordId: Map<string, string> = new Map();
    for (const course of courseRows) {
      if (course.baseRecordId) {
        courseByRecordId.set(course.baseRecordId, course.id);
      }
      if (course.bitableRecordId) {
        courseByRecordId.set(course.bitableRecordId, course.id);
      }
    }

    const localRows: ContentRow[] = await this.db
      .select()
      .from(marketingContent);
    const localByAnchor: Map<string, ContentRow> = new Map();
    for (const row of localRows) {
      if (row.baseRecordId) {
        localByAnchor.set(row.baseRecordId, row);
      }
    }

    for (const inbox of inboxRows) {
      const anchor: string | null = inbox.baseRecordId;
      if (!anchor || !inbox.contentTitle) {
        summary.skipped += 1;
        continue;
      }
      const mapped: MappedInboxContent = this.mapInboxRow(
        inbox,
        courseByRecordId,
      );
      const existing: ContentRow | undefined = localByAnchor.get(anchor);
      if (!existing) {
        await this.db.insert(marketingContent).values({
          title: mapped.title,
          contentType: mapped.contentType,
          body: mapped.body,
          status: mapped.status,
          scheduleDate: mapped.scheduleDate,
          rejectReason: mapped.rejectReason,
          publishPlatform: mapped.publishPlatform,
          likeCount: mapped.likeCount,
          conversionCount: mapped.conversionCount,
          posterImages: mapped.posterImages,
          attachments: mapped.attachments,
          courseId: mapped.courseId,
          baseRecordId: anchor,
          bitableRecordId: anchor,
          syncStatus: 'synced',
        });
        summary.inserted += 1;
        continue;
      }
      if (this.isRemoteNewer(inbox.updatedAt, existing.updatedAt)) {
        await this.db
          .update(marketingContent)
          .set({
            title: mapped.title,
            contentType: mapped.contentType,
            body: mapped.body,
            status: mapped.status,
            scheduleDate: mapped.scheduleDate,
            rejectReason: mapped.rejectReason,
            publishPlatform: mapped.publishPlatform,
            likeCount: mapped.likeCount,
            conversionCount: mapped.conversionCount,
            posterImages: mapped.posterImages,
            attachments: mapped.attachments,
            courseId: mapped.courseId,
            syncStatus: 'synced',
            updatedAt: new Date(),
          })
          .where(eq(marketingContent.id, existing.id));
        summary.updated += 1;
      } else {
        summary.skipped += 1;
      }
    }

    this.logger.log(`招生内容入站完成: ${JSON.stringify(summary)}`);
    return summary;
  }

  private mapInboxRow(
    inbox: InboxRow,
    courseByRecordId: Map<string, string>,
  ): MappedInboxContent {
    const rawType: string | null = inbox.contentType;
    const rawStatus: string | null = inbox.status;
    const mappedType: MarketingContentType | undefined =
      rawType ? CONTENT_TYPE_FROM_BITABLE[rawType] : undefined;
    if (rawType && !mappedType) {
      this.logger.warn(
        `入站内容类型未知，归一为 enrollment_copy: ${JSON.stringify({
          recordId: inbox.baseRecordId ?? inbox.id,
          rawType,
        })}`,
      );
    }
    const mappedStatus: MarketingContentStatus | undefined =
      rawStatus ? CONTENT_STATUS_FROM_BITABLE[rawStatus] : undefined;
    if (rawStatus && !mappedStatus) {
      this.logger.warn(
        `入站内容状态未知，归一为 pending_review: ${JSON.stringify({
          recordId: inbox.baseRecordId ?? inbox.id,
          rawStatus,
        })}`,
      );
    }
    return {
      title: inbox.contentTitle ?? '',
      contentType: mappedType ?? 'enrollment_copy',
      body: inbox.body ?? '',
      status: mappedStatus ?? 'pending_review',
      scheduleDate: inbox.scheduleDate,
      rejectReason: inbox.rejectReason,
      publishPlatform: inbox.publishPlatform,
      likeCount: inbox.likeCount,
      conversionCount: inbox.conversionCount,
      posterImages: this.parseJsonTextArray(inbox.posterImages),
      attachments: this.parseJsonTextObjects(inbox.attachmentList),
      courseId: this.resolveCourseId(inbox.relatedCourses, courseByRecordId),
    };
  }

  private parseJsonTextArray(raw: string | null): string[] | null {
    if (!raw) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return null;
      }
      return parsed.filter((item: unknown) => typeof item === 'string');
    } catch (error) {
      this.logger.warn(`海报图反序列化失败: ${(error as Error).message}`);
      return null;
    }
  }

  private parseJsonTextObjects(
    raw: string | null,
  ): Array<{ name: string; url: string }> | null {
    if (!raw) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return null;
      }
      return parsed
        .filter(
          (item): item is Record<string, unknown> =>
            item !== null && typeof item === 'object',
        )
        .filter(
          (item): item is { name: string; url: string } =>
            typeof item.name === 'string' &&
            item.name.trim().length > 0 &&
            typeof item.url === 'string' &&
            item.url.trim().length > 0,
        );
    } catch (error) {
      this.logger.warn(`附件清单反序列化失败: ${(error as Error).message}`);
      return null;
    }
  }

  private resolveCourseId(
    relatedCourses: unknown,
    courseByRecordId: Map<string, string>,
  ): string | null {
    if (!relatedCourses || typeof relatedCourses !== 'object') {
      return null;
    }
    const linkRecordIds: unknown = (
      relatedCourses as { link_record_ids?: unknown }
    ).link_record_ids;
    if (!Array.isArray(linkRecordIds) || linkRecordIds.length === 0) {
      return null;
    }
    const first: unknown = linkRecordIds[0];
    if (typeof first !== 'string') {
      return null;
    }
    return courseByRecordId.get(first) ?? null;
  }

  private isRemoteNewer(remote: Date | null, local: Date | null): boolean {
    if (!remote) {
      return false;
    }
    if (!local) {
      return true;
    }
    return remote.getTime() > local.getTime();
  }
}
