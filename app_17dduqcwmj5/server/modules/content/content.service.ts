import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import {
  and,
  arrayContains,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
} from 'drizzle-orm';
import {
  contentMaterialLibrary,
  courseGeneralTable,
  marketingContent,
} from '@server/database/schema';
import type {
  AuditMarketingContentRequest,
  CalendarContentBrief,
  CalendarDayItem,
  CreateMarketingContentRequest,
  CreateMaterialRequest,
  DeleteContentResponse,
  DeleteMaterialResponse,
  MarketingContentCalendarResponse,
  MarketingContentDetail,
  MarketingContentEffectRequest,
  MarketingContentListItem,
  MarketingContentListResponse,
  AttachmentItem,
  MarketingContentStatus,
  MarketingContentStatusResponse,
  MarketingContentType,
  MaterialListItem,
  UpdateMarketingContentMediaRequest,
  UpdateMaterialRequest,
  MaterialListResponse,
  MaterialOptionsResponse,
} from '@shared/content';
import { BitableSyncService } from '@server/src/common/bitable-sync/bitable-sync.service';
import { resolveDisplaySyncStatus } from '@shared/bitable-sync';
import type {
  BitableRecordType,
  BitableSyncResult,
} from '@shared/bitable-sync';
import { parsePagination } from '@server/src/common/utils/pagination';

type MarketingContentRow = typeof marketingContent.$inferSelect;
type MaterialRow = typeof contentMaterialLibrary.$inferSelect;

interface ListContentsParams {
  status?: string;
  keyword?: string;
  page: number;
  pageSize: number;
  publicOnly?: boolean;
}

const PUBLIC_CONTENT_STATUSES: string[] = ['available', 'used'];

interface ListMaterialsParams {
  materialType?: string;
  platform?: string;
  tag?: string;
  keyword?: string;
  page: number;
  pageSize: number;
}

const MONTH_PATTERN = /^\d{4}-\d{2}$/u;

function parseFirstLinkRecordId(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const candidate: { link_record_ids?: unknown } = value as {
    link_record_ids?: unknown;
  };
  if (!Array.isArray(candidate.link_record_ids)) {
    return null;
  }
  const first: unknown = candidate.link_record_ids[0];
  return typeof first === 'string' ? first : null;
}

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableSyncService: BitableSyncService,
  ) {}

  async listContents(
    params: ListContentsParams,
  ): Promise<MarketingContentListResponse> {
    const pagination: { page: number; pageSize: number; offset: number } =
      parsePagination({ page: params.page, pageSize: params.pageSize });
    const page: number = pagination.page;
    const pageSize: number = pagination.pageSize;
    const conditions = [];
    if (params.publicOnly) {
      conditions.push(
        inArray(marketingContent.status, PUBLIC_CONTENT_STATUSES),
      );
    }
    if (params.status) {
      conditions.push(eq(marketingContent.status, params.status));
    }
    if (params.keyword) {
      conditions.push(ilike(marketingContent.title, `%${params.keyword}%`));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = this.db
      .select()
      .from(marketingContent)
      .orderBy(desc(marketingContent.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const countQuery = this.db
      .select({ value: count() })
      .from(marketingContent);

    const [rows, totalRows]: [MarketingContentRow[], Array<{ value: number }>] =
      await Promise.all([
        whereClause ? baseQuery.where(whereClause) : baseQuery,
        whereClause ? countQuery.where(whereClause) : countQuery,
      ]);

    const courseIds: string[] = [...new Set(
      rows
        .map((row: MarketingContentRow) => row.courseId)
        .filter((id: string | null): id is string => Boolean(id)),
    )];
    const courseNameMap: Map<string, string> = new Map();
    if (courseIds.length > 0) {
      const courses = await this.db
        .select({
          id: courseGeneralTable.id,
          courseName: courseGeneralTable.courseName,
        })
        .from(courseGeneralTable)
        .where(inArray(courseGeneralTable.id, courseIds));
      for (const course of courses) {
        courseNameMap.set(course.id, course.courseName ?? '');
      }
    }

    const items: MarketingContentListItem[] = rows.map(
      (row: MarketingContentRow) =>
        this.toListItem(
          row,
          row.courseId ? courseNameMap.get(row.courseId) ?? null : null,
        ),
    );

    const total: number = Number(totalRows[0]?.value ?? 0);
    return { items, total };
  }

  private toListItem(
    row: MarketingContentRow,
    courseName: string | null,
  ): MarketingContentListItem {
    return {
      id: row.id,
      title: row.title,
      courseId: row.courseId,
      courseName,
      contentType: row.contentType as MarketingContentType,
      body: row.body,
      status: row.status as MarketingContentStatus,
      scheduleDate: row.scheduleDate,
      rejectReason: row.rejectReason,
      publishPlatform: row.publishPlatform,
      likeCount: row.likeCount ?? null,
      conversionCount: row.conversionCount ?? null,
      posterImages: (row.posterImages ?? []) as string[],
      attachments: (row.attachments ?? []) as AttachmentItem[],
      createdAt: row.createdAt.toISOString(),
      syncStatus: row.syncStatus,
    };
  }

  async getContentDetail(
    id: string,
    publicOnly: boolean = false,
  ): Promise<MarketingContentDetail> {
    const rows: MarketingContentRow[] = await this.db
      .select()
      .from(marketingContent)
      .where(eq(marketingContent.id, id));
    if (rows.length === 0) {
      throw new NotFoundException('内容不存在');
    }
    const row: MarketingContentRow = rows[0];
    if (
      publicOnly &&
      row.status !== 'available' &&
      row.status !== 'used'
    ) {
      throw new NotFoundException('内容不存在');
    }
    let courseName: string | null = null;
    if (row.courseId) {
      const courses = await this.db
        .select({ name: courseGeneralTable.courseName })
        .from(courseGeneralTable)
        .where(eq(courseGeneralTable.id, row.courseId));
      courseName = courses[0]?.name ?? null;
    }
    return this.toListItem(row, courseName);
  }

  async createContent(
    dto: CreateMarketingContentRequest,
  ): Promise<{ id: string }> {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException('标题不能为空');
    }
    if (!dto.body || dto.body.trim().length === 0) {
      throw new BadRequestException('内容正文不能为空');
    }
    this.validateAttachments(dto.attachments);
    const inserted = await this.db
      .insert(marketingContent)
      .values({
        title: dto.title.trim(),
        courseId: dto.courseId,
        contentType: dto.contentType,
        body: dto.body,
        status: 'pending_review',
        scheduleDate: dto.scheduleDate ?? null,
        posterImages: dto.posterImages ?? null,
        attachments: dto.attachments ?? null,
      })
      .returning({ id: marketingContent.id });
    if (inserted.length === 0) {
      throw new BadRequestException('内容创建失败');
    }
    this.logger.log(`招生内容创建成功: ${inserted[0].id}`);
    await this.bitableSyncService.syncRecord('marketingContent', inserted[0].id);
    return { id: inserted[0].id };
  }

  private validateAttachments(attachments: unknown): void {
    if (attachments === undefined || attachments === null) {
      return;
    }
    if (!Array.isArray(attachments)) {
      throw new BadRequestException('附件必须为数组');
    }
    attachments.forEach((item: unknown) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException('附件条目格式不正确');
      }
      const candidate: { name?: unknown; url?: unknown } = item as {
        name?: unknown;
        url?: unknown;
      };
      if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
        throw new BadRequestException('附件名称不能为空');
      }
      if (typeof candidate.url !== 'string' || candidate.url.trim().length === 0) {
        throw new BadRequestException('附件链接不能为空');
      }
    });
  }

  async auditContent(
    id: string,
    dto: AuditMarketingContentRequest,
  ): Promise<MarketingContentStatusResponse> {
    if (dto.action !== 'approve' && dto.action !== 'reject') {
      throw new BadRequestException('无效的审核操作');
    }
    if (
      dto.action === 'reject' &&
      (!dto.rejectReason || dto.rejectReason.trim().length === 0)
    ) {
      throw new BadRequestException('驳回时必须填写驳回原因');
    }
    const isApprove: boolean = dto.action === 'approve';
    const updated = await this.db
      .update(marketingContent)
      .set(
        isApprove
          ? { status: 'available' }
          : { status: 'rejected', rejectReason: dto.rejectReason },
      )
      .where(
        and(
          eq(marketingContent.id, id),
          eq(marketingContent.status, 'pending_review'),
        ),
      )
      .returning({
        id: marketingContent.id,
        status: marketingContent.status,
      });
    if (updated.length === 0) {
      throw new BadRequestException('仅待审核状态的内容可以审核');
    }
    this.logger.log(`招生内容审核完成: ${id} -> ${updated[0].status}`);
    await this.bitableSyncService.syncRecord('marketingContent', id);
    return { status: updated[0].status as MarketingContentStatus };
  }

  async useContent(id: string): Promise<MarketingContentStatusResponse> {
    const updated = await this.db
      .update(marketingContent)
      .set({ status: 'used' })
      .where(
        and(
          eq(marketingContent.id, id),
          eq(marketingContent.status, 'available'),
        ),
      )
      .returning({
        id: marketingContent.id,
        status: marketingContent.status,
      });
    if (updated.length === 0) {
      throw new ConflictException('仅可用状态的内容可以标记为已使用');
    }
    this.logger.log(`招生内容标记为已使用: ${id}`);
    await this.bitableSyncService.syncRecord('marketingContent', id);
    return { status: updated[0].status as MarketingContentStatus };
  }

  async saveEffect(
    id: string,
    dto: MarketingContentEffectRequest,
  ): Promise<{ id: string }> {
    const updated = await this.db
      .update(marketingContent)
      .set({
        publishPlatform: dto.publishPlatform,
        likeCount: dto.likeCount,
        conversionCount: dto.conversionCount,
      })
      .where(eq(marketingContent.id, id))
      .returning({ id: marketingContent.id });
    if (updated.length === 0) {
      throw new NotFoundException('内容不存在');
    }
    this.logger.log(`招生内容效果数据已录入: ${id}`);
    await this.bitableSyncService.syncRecord('marketingContent', id);
    return { id: updated[0].id };
  }

  async updateMedia(
    id: string,
    dto: UpdateMarketingContentMediaRequest,
  ): Promise<MarketingContentDetail> {
    this.validateAttachments(dto.attachments);
    const patch: Partial<typeof marketingContent.$inferInsert> = {};
    if (dto.posterImages !== undefined) patch.posterImages = dto.posterImages;
    if (dto.attachments !== undefined) patch.attachments = dto.attachments;
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    const updated = await this.db
      .update(marketingContent)
      .set(patch)
      .where(eq(marketingContent.id, id))
      .returning({ id: marketingContent.id });
    if (updated.length === 0) {
      throw new NotFoundException('内容不存在');
    }
    this.logger.log(`招生内容素材已更新: ${id}`);
    await this.bitableSyncService.syncRecord('marketingContent', id);
    return this.getContentDetail(id);
  }

  async getCalendar(month: string): Promise<MarketingContentCalendarResponse> {
    if (!month || !MONTH_PATTERN.test(month)) {
      throw new BadRequestException('月份格式应为 YYYY-MM');
    }
    const [yearPart, monthPart] = month.split('-');
    const year: number = Number(yearPart);
    const monthNum: number = Number(monthPart);
    if (monthNum < 1 || monthNum > 12) {
      throw new BadRequestException('无效的月份');
    }
    const start: string = `${month}-01`;
    const nextYear: number = monthNum === 12 ? year + 1 : year;
    const nextMonth: number = monthNum === 12 ? 1 : monthNum + 1;
    const end: string = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const rows = await this.db
      .select({
        id: marketingContent.id,
        title: marketingContent.title,
        status: marketingContent.status,
        contentType: marketingContent.contentType,
        scheduleDate: marketingContent.scheduleDate,
      })
      .from(marketingContent)
      .where(
        and(
          gte(marketingContent.scheduleDate, start),
          lt(marketingContent.scheduleDate, end),
        ),
      )
      .orderBy(marketingContent.scheduleDate);

    const dayMap: Map<string, CalendarContentBrief[]> = new Map();
    for (const row of rows) {
      if (!row.scheduleDate) continue;
      const list: CalendarContentBrief[] = dayMap.get(row.scheduleDate) ?? [];
      list.push({
        id: row.id,
        title: row.title,
        status: row.status as MarketingContentStatus,
        contentType: row.contentType as MarketingContentType,
      });
      dayMap.set(row.scheduleDate, list);
    }
    const items: CalendarDayItem[] = [...dayMap.entries()]
      .sort((a: [string, CalendarContentBrief[]], b: [string, CalendarContentBrief[]]) =>
        a[0].localeCompare(b[0]),
      )
      .map(([date, contents]: [string, CalendarContentBrief[]]) => ({
        date,
        contents,
      }));
    return { items };
  }

  async listMaterials(
    params: ListMaterialsParams,
  ): Promise<MaterialListResponse> {
    const pagination: { page: number; pageSize: number; offset: number } =
      parsePagination({ page: params.page, pageSize: params.pageSize });
    const page: number = pagination.page;
    const pageSize: number = pagination.pageSize;
    const conditions = [];
    if (params.materialType) {
      conditions.push(
        eq(contentMaterialLibrary.materialType, params.materialType),
      );
    }
    if (params.platform) {
      conditions.push(
        arrayContains(contentMaterialLibrary.applicablePlatform, [
          params.platform,
        ]),
      );
    }
    if (params.tag) {
      conditions.push(arrayContains(contentMaterialLibrary.tag, [params.tag]));
    }
    if (params.keyword) {
      conditions.push(
        ilike(contentMaterialLibrary.materialTitle, `%${params.keyword}%`),
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = this.db
      .select()
      .from(contentMaterialLibrary)
      .orderBy(desc(contentMaterialLibrary.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const countQuery = this.db
      .select({ value: count() })
      .from(contentMaterialLibrary);

    const [rows, totalRows]: [MaterialRow[], Array<{ value: number }>] =
      await Promise.all([
        whereClause ? baseQuery.where(whereClause) : baseQuery,
        whereClause ? countQuery.where(whereClause) : countQuery,
      ]);

    const items: MaterialListItem[] = rows.map((row: MaterialRow) => ({
      id: row.id,
      title: row.materialTitle ?? '',
      materialType: row.materialType ?? '',
      relatedCourseId: parseFirstLinkRecordId(row.relatedCourse),
      coreContent: row.coreContent ?? '',
      applicablePlatform: row.applicablePlatform ?? [],
      tag: row.tag ?? [],
      status: row.status ?? '',
      syncStatus: resolveDisplaySyncStatus(
        row.syncStatus,
        row.bitableRecordId,
        row.baseRecordId,
      ),
    }));

    const total: number = Number(totalRows[0]?.value ?? 0);
    return { items, total };
  }

  async getMaterialOptions(): Promise<MaterialOptionsResponse> {
    const [typeRows, arrayRows, statusRows] = await Promise.all([
      this.db
        .selectDistinct({ value: contentMaterialLibrary.materialType })
        .from(contentMaterialLibrary),
      this.db
        .select({
          platforms: contentMaterialLibrary.applicablePlatform,
          tags: contentMaterialLibrary.tag,
        })
        .from(contentMaterialLibrary),
      this.db
        .selectDistinct({ value: contentMaterialLibrary.status })
        .from(contentMaterialLibrary),
    ]);

    const materialTypes: string[] = [
      ...new Set(
        typeRows
          .map((row: { value: string | null }) => row.value)
          .filter((value: string | null): value is string => Boolean(value)),
      ),
    ].sort();

    const platformSet: Set<string> = new Set();
    const tagSet: Set<string> = new Set();
    for (const row of arrayRows) {
      for (const platform of row.platforms ?? []) {
        if (platform) platformSet.add(platform);
      }
      for (const tag of row.tags ?? []) {
        if (tag) tagSet.add(tag);
      }
    }

    return {
      materialTypes,
      platforms: [...platformSet].sort(),
      tags: [...tagSet].sort(),
      statuses: [
        ...new Set(
          statusRows
            .map((row: { value: string | null }) => row.value)
            .filter((value: string | null): value is string => Boolean(value)),
        ),
      ].sort(),
    };
  }

  async createMaterial(
    dto: CreateMaterialRequest,
  ): Promise<{ id: string }> {
    if (!dto.materialTitle || dto.materialTitle.trim().length === 0) {
      throw new BadRequestException('素材标题不能为空');
    }
    const inserted: Array<{ id: string }> = await this.db
      .insert(contentMaterialLibrary)
      .values({
        materialTitle: dto.materialTitle.trim(),
        materialType: dto.materialType ?? null,
        relatedCourse: dto.relatedCourseId
          ? { link_record_ids: [dto.relatedCourseId] }
          : null,
        coreContent: dto.coreContent ?? null,
        applicablePlatform: dto.applicablePlatform ?? [],
        tag: dto.tag ?? [],
        status: dto.status ?? null,
      })
      .returning({ id: contentMaterialLibrary.id });
    const insertedId: string | undefined = inserted[0]?.id;
    if (!insertedId) {
      throw new BadRequestException('素材创建失败');
    }
    this.logger.log(`素材新增成功: ${insertedId}`);
    await this.bitableSyncService.syncRecord('material', insertedId);
    return { id: insertedId };
  }

  async updateMaterial(
    id: string,
    dto: UpdateMaterialRequest,
  ): Promise<{ id: string }> {
    const patch: Partial<typeof contentMaterialLibrary.$inferInsert> = {};
    if (dto.materialTitle !== undefined) {
      if (!dto.materialTitle.trim()) {
        throw new BadRequestException('素材标题不能为空');
      }
      patch.materialTitle = dto.materialTitle.trim();
    }
    if (dto.materialType !== undefined) {
      patch.materialType = dto.materialType;
    }
    if (dto.relatedCourseId !== undefined) {
      patch.relatedCourse = dto.relatedCourseId
        ? { link_record_ids: [dto.relatedCourseId] }
        : null;
    }
    if (dto.coreContent !== undefined) {
      patch.coreContent = dto.coreContent;
    }
    if (dto.applicablePlatform !== undefined) {
      patch.applicablePlatform = dto.applicablePlatform;
    }
    if (dto.tag !== undefined) {
      patch.tag = dto.tag;
    }
    if (dto.status !== undefined) {
      patch.status = dto.status;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: Array<{ id: string }> = await this.db
      .update(contentMaterialLibrary)
      .set(patch)
      .where(eq(contentMaterialLibrary.id, id))
      .returning({ id: contentMaterialLibrary.id });
    if (updated.length === 0) {
      throw new NotFoundException('素材不存在');
    }
    this.logger.log(`素材更新成功: ${id}`);
    await this.bitableSyncService.syncRecord('material', id);
    return { id };
  }

  /** 先远端后本地：远端删除失败仅记录日志，不阻断本地删除 */
  private async deleteRemoteRecord(
    recordType: BitableRecordType,
    recordId: string,
  ): Promise<BitableSyncResult> {
    try {
      return await this.bitableSyncService.deleteRecord(recordType, recordId);
    } catch (error) {
      const errorMessage: string =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `bitable 远端删除失败，继续本地删除: ${JSON.stringify({
          recordType,
          recordId,
          error: errorMessage,
        })}`,
        error instanceof Error ? error.stack : undefined,
      );
      return { syncStatus: 'failed', message: errorMessage };
    }
  }

  async deleteMaterial(id: string): Promise<DeleteMaterialResponse> {
    const syncResult: BitableSyncResult = await this.deleteRemoteRecord(
      'material',
      id,
    );
    const deleted: Array<{ id: string }> = await this.db
      .delete(contentMaterialLibrary)
      .where(eq(contentMaterialLibrary.id, id))
      .returning({ id: contentMaterialLibrary.id });
    if (deleted.length === 0) {
      throw new NotFoundException('素材不存在');
    }
    this.logger.log(`素材删除成功: ${id}`);
    return {
      id,
      syncStatus: syncResult.syncStatus,
      bitableRecordId: syncResult.bitableRecordId,
      message: syncResult.message,
    };
  }

  async deleteContent(id: string): Promise<DeleteContentResponse> {
    const syncResult: BitableSyncResult = await this.deleteRemoteRecord(
      'marketingContent',
      id,
    );
    const deleted: Array<{ id: string }> = await this.db
      .delete(marketingContent)
      .where(eq(marketingContent.id, id))
      .returning({ id: marketingContent.id });
    if (deleted.length === 0) {
      throw new NotFoundException('招生内容不存在');
    }
    this.logger.log(`招生内容删除成功: ${id}`);
    return {
      id,
      syncStatus: syncResult.syncStatus,
      bitableRecordId: syncResult.bitableRecordId,
      message: syncResult.message,
    };
  }
}
