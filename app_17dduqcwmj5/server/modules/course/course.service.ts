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
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  sql,
  type Column,
  type SQL,
  type Table,
} from 'drizzle-orm';
import {
  contentMaterialLibrary,
  courseCategory,
  courseGeneralTable,
  courseScheduleTable,
  equipmentToolTable,
  formulaDetailTable,
  marketingContent,
  processFlowTable,
  studentRegistrationTable,
} from '@server/database/schema';
import type { BitableSyncResult } from '@shared/bitable-sync';
import type {
  CourseCategory,
  CourseDetail,
  CourseFormPayload,
  CourseListItem,
  CourseScheduleBrief,
  CreateEquipmentRequest,
  CreateFormulaRequest,
  CreateProcessFlowRequest,
  EquipmentItem,
  FormulaItem,
  ProcessFlowItem,
  UpdateCourseRequest,
  UpdateEquipmentRequest,
  UpdateFormulaRequest,
  UpdateProcessFlowRequest,
} from '@shared/course';
import { BitableSyncService } from '@server/src/common/bitable-sync/bitable-sync.service';
import { resolveDisplaySyncStatus } from '@shared/bitable-sync';

export interface CourseListQuery {
  category?: string;
  difficulty?: string;
  status?: string;
  keyword?: string;
  page: number;
  pageSize: number;
}

type CourseRow = typeof courseGeneralTable.$inferSelect;

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
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly bitableSyncService: BitableSyncService,
  ) {}

  private toListItem(row: CourseRow): CourseListItem {
    return {
      id: row.id,
      courseName: row.courseName ?? '',
      courseCategory: row.courseCategory,
      difficultyLevel: row.difficultyLevel,
      studyDuration: row.studyDuration,
      tuitionFee: row.tuitionFee === null ? null : Number(row.tuitionFee),
      productImage: row.productImage ?? [],
      status: row.status,
      syncStatus: resolveDisplaySyncStatus(
        row.syncStatus,
        row.bitableRecordId,
        row.baseRecordId,
      ),
    };
  }

  private linkContains(column: Column, baseRecordId: string): SQL {
    return sql`${column}->'link_record_ids' @> ${JSON.stringify([baseRecordId])}::jsonb`;
  }

  private courseLinkCondition(column: Column, course: CourseRow): SQL {
    const conditions: SQL[] = [this.linkContains(column, course.id)];
    if (course.baseRecordId) {
      conditions.push(this.linkContains(column, course.baseRecordId));
    }
    if (conditions.length === 1) {
      return conditions[0];
    }
    const combined: SQL | undefined = or(...conditions);
    return combined as SQL;
  }

  private async getCourseRow(courseId: string): Promise<CourseRow> {
    const rows: CourseRow[] = await this.db
      .select()
      .from(courseGeneralTable)
      .where(eq(courseGeneralTable.id, courseId));
    const row: CourseRow | undefined = rows[0];
    if (!row) {
      throw new NotFoundException(`课程 ${courseId} 不存在`);
    }
    return row;
  }

  async listCourses(
    query: CourseListQuery,
  ): Promise<{ items: CourseListItem[]; total: number }> {
    const conditions: SQL[] = [];
    if (query.category) {
      conditions.push(
        eq(courseGeneralTable.courseCategory, query.category),
      );
    }
    if (query.difficulty) {
      conditions.push(
        eq(courseGeneralTable.difficultyLevel, query.difficulty),
      );
    }
    if (query.status) {
      conditions.push(eq(courseGeneralTable.status, query.status));
    }
    if (query.keyword) {
      conditions.push(
        ilike(courseGeneralTable.courseName, `%${query.keyword}%`),
      );
    }
    const whereClause: SQL | undefined =
      conditions.length > 0 ? and(...conditions) : undefined;

    const rows: CourseRow[] = await this.db
      .select()
      .from(courseGeneralTable)
      .where(whereClause)
      .orderBy(desc(courseGeneralTable.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const totalRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(courseGeneralTable)
      .where(whereClause);
    const total: number = Number(totalRows[0]?.count ?? 0);

    this.logger.log(
      `课程列表查询：page=${query.page}, pageSize=${query.pageSize}, total=${total}`,
    );

    return {
      items: rows.map((row: CourseRow) => this.toListItem(row)),
      total,
    };
  }

  async getCourseDetail(courseId: string): Promise<CourseDetail> {
    const row: CourseRow = await this.getCourseRow(courseId);
    return {
      ...this.toListItem(row),
      courseIntro: row.courseIntro,
    };
  }

  async listCategories(): Promise<CourseCategory[]> {
    const rows: CourseCategory[] = await this.db
      .select({ id: courseCategory.id, name: courseCategory.name })
      .from(courseCategory)
      .orderBy(asc(courseCategory.name));
    return rows;
  }

  async createCategory(name: string): Promise<CourseCategory> {
    const trimmed: string = name.trim();
    if (!trimmed) {
      throw new BadRequestException('类别名称不能为空');
    }
    if (trimmed.length > 255) {
      throw new BadRequestException('类别名称过长');
    }
    try {
      const inserted: CourseCategory[] = await this.db
        .insert(courseCategory)
        .values({ name: trimmed })
        .returning({ id: courseCategory.id, name: courseCategory.name });
      await this.bitableSyncService.syncRecord('category', inserted[0].id);
      return inserted[0];
    } catch (error: unknown) {
      if (extractPostgresErrorCode(error) === '23505') {
        throw new ConflictException('该类别已存在');
      }
      throw error;
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const rows: CourseCategory[] = await this.db
      .select({ id: courseCategory.id, name: courseCategory.name })
      .from(courseCategory)
      .where(eq(courseCategory.id, categoryId));
    const target: CourseCategory | undefined = rows[0];
    if (!target) {
      throw new NotFoundException('类别不存在');
    }
    const usageRows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(courseGeneralTable)
      .where(eq(courseGeneralTable.courseCategory, target.name));
    if (Number(usageRows[0]?.count ?? 0) > 0) {
      throw new ConflictException('该类别下仍有课程，无法删除');
    }
    const syncResult: BitableSyncResult =
      await this.bitableSyncService.deleteRecord('category', categoryId);
    if (syncResult.syncStatus === 'failed') {
      throw new ConflictException(
        syncResult.message ||
          '多维表格类别删除失败，已中止本地删除，请稍后重试',
      );
    }
    const deleted: Array<{ id: string }> = await this.db
      .delete(courseCategory)
      .where(eq(courseCategory.id, categoryId))
      .returning({ id: courseCategory.id });
    if (deleted.length === 0) {
      throw new NotFoundException('类别不存在');
    }
    this.logger.log(`课程类别已删除：${target.name}`);
  }

  async createCourse(
    payload: CourseFormPayload,
  ): Promise<{ id: string }> {
    const inserted: Array<{ id: string }> = await this.db
      .insert(courseGeneralTable)
      .values({
        courseName: payload.courseName.trim(),
        courseCategory: payload.courseCategory ?? null,
        difficultyLevel: payload.difficultyLevel ?? null,
        studyDuration: payload.studyDuration ?? null,
        tuitionFee:
          payload.tuitionFee === undefined || payload.tuitionFee === null
            ? null
            : String(payload.tuitionFee),
        courseIntro: payload.courseIntro ?? null,
        productImage: payload.productImage ?? [],
        status: payload.status ?? null,
      })
      .returning({ id: courseGeneralTable.id });
    const insertedId: string | undefined = inserted[0]?.id;
    if (!insertedId) {
      throw new NotFoundException('课程创建失败');
    }
    this.logger.log(
      `课程新增成功：${JSON.stringify({ id: insertedId, courseName: payload.courseName })}`,
    );
    await this.bitableSyncService.syncRecord('course', insertedId);
    return { id: insertedId };
  }

  async updateCourse(
    courseId: string,
    payload: UpdateCourseRequest,
  ): Promise<{ id: string }> {
    const patch: Partial<typeof courseGeneralTable.$inferInsert> = {};
    if (payload.courseName !== undefined) {
      patch.courseName = payload.courseName.trim();
    }
    if (payload.courseCategory !== undefined) {
      patch.courseCategory = payload.courseCategory;
    }
    if (payload.difficultyLevel !== undefined) {
      patch.difficultyLevel = payload.difficultyLevel;
    }
    if (payload.studyDuration !== undefined) {
      patch.studyDuration = payload.studyDuration;
    }
    if (payload.tuitionFee !== undefined) {
      patch.tuitionFee =
        payload.tuitionFee === null ? null : String(payload.tuitionFee);
    }
    if (payload.courseIntro !== undefined) {
      patch.courseIntro = payload.courseIntro;
    }
    if (payload.productImage !== undefined) {
      patch.productImage = payload.productImage;
    }
    if (payload.status !== undefined) {
      patch.status = payload.status;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();

    const updated: Array<{ id: string }> = await this.db
      .update(courseGeneralTable)
      .set(patch)
      .where(eq(courseGeneralTable.id, courseId))
      .returning({ id: courseGeneralTable.id });
    if (updated.length === 0) {
      throw new NotFoundException(`课程 ${courseId} 不存在`);
    }
    this.logger.log(`课程更新成功：${JSON.stringify({ id: courseId })}`);
    await this.bitableSyncService.syncRecord('course', courseId);
    return { id: courseId };
  }

  private async countRelated(
    table: Table,
    condition: SQL,
  ): Promise<number> {
    const rows: Array<{ count: number }> = await this.db
      .select({ count: count() })
      .from(table)
      .where(condition);
    return Number(rows[0]?.count ?? 0);
  }

  async deleteCourse(courseId: string): Promise<void> {
    const course: CourseRow = await this.getCourseRow(courseId);
    const labels: string[] = [
      '排期',
      '报名学员',
      '配方',
      '工艺流程',
      '器材工具',
      '素材库素材',
      '营销内容',
    ];
    const counts: number[] = await Promise.all([
      this.countRelated(
        courseScheduleTable,
        this.courseLinkCondition(courseScheduleTable.courseName, course),
      ),
      this.countRelated(
        studentRegistrationTable,
        this.courseLinkCondition(studentRegistrationTable.enrollCourse, course),
      ),
      this.countRelated(
        formulaDetailTable,
        this.courseLinkCondition(formulaDetailTable.courseRelated, course),
      ),
      this.countRelated(
        processFlowTable,
        this.courseLinkCondition(processFlowTable.course, course),
      ),
      this.countRelated(
        equipmentToolTable,
        this.courseLinkCondition(equipmentToolTable.courseAffiliation, course),
      ),
      this.countRelated(
        contentMaterialLibrary,
        this.courseLinkCondition(contentMaterialLibrary.relatedCourse, course),
      ),
      this.countRelated(
        marketingContent,
        eq(marketingContent.courseId, course.id),
      ),
    ]);
    const existing: string[] = labels.filter(
      (_: string, index: number) => (counts[index] ?? 0) > 0,
    );
    if (existing.length > 0) {
      throw new ConflictException(
        `该课程仍有${existing.join('、')}，请先清理关联数据后再删除`,
      );
    }
    const remoteAnchor: string | null =
      course.bitableRecordId ?? course.baseRecordId ?? null;
    if (remoteAnchor) {
      try {
        const cleanup: { deleted: number } =
          await this.bitableSyncService.deleteRemoteRecordsLinkedToCourse(
            remoteAnchor,
          );
        this.logger.log(
          `课程删除前远端子资源清理完成：${JSON.stringify({
            id: courseId,
            anchor: remoteAnchor,
            deleted: cleanup.deleted,
          })}`,
        );
      } catch (error) {
        const message: string =
          error instanceof Error ? error.message : 'Unknown error';
        throw new ConflictException(
          `多维表格子资源（配方/工艺流程/器材工具）清理失败，已中止本地删除，请稍后重试：${message}`,
        );
      }
    }
    const syncResult: BitableSyncResult =
      await this.bitableSyncService.deleteRecord('course', courseId);
    if (syncResult.syncStatus === 'failed') {
      throw new ConflictException(
        syncResult.message ||
          '多维表格课程总表删除失败，已中止本地删除，请稍后重试',
      );
    }
    const deleted: Array<{ id: string }> = await this.db
      .delete(courseGeneralTable)
      .where(eq(courseGeneralTable.id, courseId))
      .returning({ id: courseGeneralTable.id });
    if (deleted.length === 0) {
      throw new NotFoundException(`课程 ${courseId} 不存在`);
    }
    this.logger.log(
      `课程已删除：${JSON.stringify({ id: courseId, courseName: course.courseName })}`,
    );
  }

  async listFormulas(
    courseId: string,
    keyword?: string,
  ): Promise<FormulaItem[]> {
    const course: CourseRow = await this.getCourseRow(courseId);
    const conditions: SQL[] = [
      this.courseLinkCondition(formulaDetailTable.courseRelated, course),
    ];
    if (keyword) {
      conditions.push(ilike(formulaDetailTable.ingredientName, `%${keyword}%`));
    }
    const rows: Array<typeof formulaDetailTable.$inferSelect> =
      await this.db
        .select()
        .from(formulaDetailTable)
        .where(and(...conditions));
    return rows.map(
      (row: typeof formulaDetailTable.$inferSelect): FormulaItem => ({
        id: row.id,
        ingredientName: row.ingredientName,
        quantity: row.quantity === null ? null : Number(row.quantity),
        unit: row.unit,
        ingredientCategory: row.ingredientCategory,
        remark: row.remark,
        syncStatus: resolveDisplaySyncStatus(
          row.syncStatus,
          row.bitableRecordId,
          row.baseRecordId,
        ),
      }),
    );
  }

  async listProcessFlows(courseId: string): Promise<ProcessFlowItem[]> {
    const course: CourseRow = await this.getCourseRow(courseId);
    const rows: Array<typeof processFlowTable.$inferSelect> = await this.db
      .select()
      .from(processFlowTable)
      .where(this.courseLinkCondition(processFlowTable.course, course))
      .orderBy(asc(processFlowTable.stepNo));
    return rows.map(
      (row: typeof processFlowTable.$inferSelect): ProcessFlowItem => ({
        id: row.id,
        stepNo: row.stepNo,
        stepName: row.stepName,
        operationDesc: row.operationDesc,
        keyControlPoint: row.keyControlPoint,
        estimatedDuration: row.estimatedDuration,
        operationVideo: row.operationVideo ?? [],
        syncStatus: resolveDisplaySyncStatus(
          row.syncStatus,
          row.bitableRecordId,
          row.baseRecordId,
        ),
      }),
    );
  }

  async listEquipments(courseId: string): Promise<EquipmentItem[]> {
    const course: CourseRow = await this.getCourseRow(courseId);
    const rows: Array<typeof equipmentToolTable.$inferSelect> = await this.db
      .select()
      .from(equipmentToolTable)
      .where(
        this.courseLinkCondition(equipmentToolTable.courseAffiliation, course),
      );
    return rows.map(
      (row: typeof equipmentToolTable.$inferSelect): EquipmentItem => ({
        id: row.id,
        equipmentToolName: row.equipmentToolName,
        specification: row.specification,
        quantity: row.quantity,
        remark: row.remark,
        syncStatus: resolveDisplaySyncStatus(
          row.syncStatus,
          row.bitableRecordId,
          row.baseRecordId,
        ),
      }),
    );
  }

  async listSchedules(courseId: string): Promise<CourseScheduleBrief[]> {
    const course: CourseRow = await this.getCourseRow(courseId);
    if (!course.baseRecordId) {
      return [];
    }
    const rows: Array<typeof courseScheduleTable.$inferSelect> =
      await this.db
        .select()
        .from(courseScheduleTable)
        .where(
          this.linkContains(courseScheduleTable.courseName, course.baseRecordId),
        )
        .orderBy(asc(courseScheduleTable.classDate));
    return rows.map(
      (row: typeof courseScheduleTable.$inferSelect): CourseScheduleBrief => ({
        id: row.id,
        scheduleName: row.scheduleName,
        classDate: row.classDate,
        startTime: row.startTime,
        endTime: row.endTime,
        status: row.appStatus,
      }),
    );
  }

  private buildCourseLink(courseId: string): { link_record_ids: string[] } {
    return { link_record_ids: [courseId] };
  }

  async createEquipment(
    payload: CreateEquipmentRequest,
  ): Promise<{ id: string }> {
    const course: CourseRow = await this.getCourseRow(payload.courseName);
    const inserted: Array<{ id: string }> = await this.db
      .insert(equipmentToolTable)
      .values({
        courseAffiliation: this.buildCourseLink(course.id),
        equipmentToolName: payload.equipmentToolName.trim(),
        specification: payload.specification ?? null,
        quantity: payload.quantity ?? null,
        remark: payload.remark ?? null,
      })
      .returning({ id: equipmentToolTable.id });
    const insertedId: string | undefined = inserted[0]?.id;
    if (!insertedId) {
      throw new NotFoundException('器材工具创建失败');
    }
    this.logger.log(`器材工具新增成功：${JSON.stringify({ id: insertedId })}`);
    await this.bitableSyncService.syncRecord('equipment', insertedId);
    return { id: insertedId };
  }

  async updateEquipment(
    equipmentId: string,
    payload: UpdateEquipmentRequest,
  ): Promise<{ id: string }> {
    const patch: Partial<typeof equipmentToolTable.$inferInsert> = {};
    if (payload.courseName !== undefined) {
      const course: CourseRow = await this.getCourseRow(payload.courseName);
      patch.courseAffiliation = this.buildCourseLink(course.id);
    }
    if (payload.equipmentToolName !== undefined) {
      patch.equipmentToolName = payload.equipmentToolName.trim();
    }
    if (payload.specification !== undefined) {
      patch.specification = payload.specification;
    }
    if (payload.quantity !== undefined) {
      patch.quantity = payload.quantity;
    }
    if (payload.remark !== undefined) {
      patch.remark = payload.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: Array<{ id: string }> = await this.db
      .update(equipmentToolTable)
      .set(patch)
      .where(eq(equipmentToolTable.id, equipmentId))
      .returning({ id: equipmentToolTable.id });
    if (updated.length === 0) {
      throw new NotFoundException(`器材工具 ${equipmentId} 不存在`);
    }
    this.logger.log(`器材工具更新成功：${JSON.stringify({ id: equipmentId })}`);
    await this.bitableSyncService.syncRecord('equipment', equipmentId);
    return { id: equipmentId };
  }

  async deleteEquipment(equipmentId: string): Promise<{ id: string }> {
    const syncResult: BitableSyncResult =
      await this.bitableSyncService.deleteRecord('equipment', equipmentId);
    if (syncResult.syncStatus === 'failed') {
      throw new ConflictException(
        syncResult.message ||
          '多维表格器材工具删除失败，已中止本地删除，请稍后重试',
      );
    }
    const deleted: Array<{ id: string }> = await this.db
      .delete(equipmentToolTable)
      .where(eq(equipmentToolTable.id, equipmentId))
      .returning({ id: equipmentToolTable.id });
    if (deleted.length === 0) {
      throw new NotFoundException(`器材工具 ${equipmentId} 不存在`);
    }
    this.logger.log(`器材工具删除成功：${JSON.stringify({ id: equipmentId })}`);
    return { id: equipmentId };
  }

  async createProcessFlow(
    payload: CreateProcessFlowRequest,
  ): Promise<{ id: string }> {
    const course: CourseRow = await this.getCourseRow(payload.courseName);
    const inserted: Array<{ id: string }> = await this.db
      .insert(processFlowTable)
      .values({
        course: this.buildCourseLink(course.id),
        stepNo: payload.stepNo ?? null,
        stepName: payload.stepName.trim(),
        operationDesc: payload.operationDesc ?? null,
        keyControlPoint: payload.keyControlPoint ?? null,
        estimatedDuration: payload.estimatedDuration ?? null,
      })
      .returning({ id: processFlowTable.id });
    const insertedId: string | undefined = inserted[0]?.id;
    if (!insertedId) {
      throw new NotFoundException('工艺流程创建失败');
    }
    this.logger.log(`工艺流程新增成功：${JSON.stringify({ id: insertedId })}`);
    await this.bitableSyncService.syncRecord('processFlow', insertedId);
    return { id: insertedId };
  }

  async updateProcessFlow(
    flowId: string,
    payload: UpdateProcessFlowRequest,
  ): Promise<{ id: string }> {
    const patch: Partial<typeof processFlowTable.$inferInsert> = {};
    if (payload.courseName !== undefined) {
      const course: CourseRow = await this.getCourseRow(payload.courseName);
      patch.course = this.buildCourseLink(course.id);
    }
    if (payload.stepNo !== undefined) {
      patch.stepNo = payload.stepNo;
    }
    if (payload.stepName !== undefined) {
      patch.stepName = payload.stepName.trim();
    }
    if (payload.operationDesc !== undefined) {
      patch.operationDesc = payload.operationDesc;
    }
    if (payload.keyControlPoint !== undefined) {
      patch.keyControlPoint = payload.keyControlPoint;
    }
    if (payload.estimatedDuration !== undefined) {
      patch.estimatedDuration = payload.estimatedDuration;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: Array<{ id: string }> = await this.db
      .update(processFlowTable)
      .set(patch)
      .where(eq(processFlowTable.id, flowId))
      .returning({ id: processFlowTable.id });
    if (updated.length === 0) {
      throw new NotFoundException(`工艺流程 ${flowId} 不存在`);
    }
    this.logger.log(`工艺流程更新成功：${JSON.stringify({ id: flowId })}`);
    await this.bitableSyncService.syncRecord('processFlow', flowId);
    return { id: flowId };
  }

  async deleteProcessFlow(flowId: string): Promise<{ id: string }> {
    const syncResult: BitableSyncResult =
      await this.bitableSyncService.deleteRecord('processFlow', flowId);
    if (syncResult.syncStatus === 'failed') {
      throw new ConflictException(
        syncResult.message ||
          '多维表格工艺流程删除失败，已中止本地删除，请稍后重试',
      );
    }
    const deleted: Array<{ id: string }> = await this.db
      .delete(processFlowTable)
      .where(eq(processFlowTable.id, flowId))
      .returning({ id: processFlowTable.id });
    if (deleted.length === 0) {
      throw new NotFoundException(`工艺流程 ${flowId} 不存在`);
    }
    this.logger.log(`工艺流程删除成功：${JSON.stringify({ id: flowId })}`);
    return { id: flowId };
  }

  async createFormula(
    payload: CreateFormulaRequest,
  ): Promise<{ id: string }> {
    const course: CourseRow = await this.getCourseRow(payload.courseName);
    const inserted: Array<{ id: string }> = await this.db
      .insert(formulaDetailTable)
      .values({
        courseRelated: this.buildCourseLink(course.id),
        ingredientName: payload.ingredientName.trim(),
        quantity:
          payload.quantity === undefined || payload.quantity === null
            ? null
            : String(payload.quantity),
        unit: payload.unit ?? null,
        ingredientCategory: payload.ingredientCategory ?? null,
        remark: payload.remark ?? null,
      })
      .returning({ id: formulaDetailTable.id });
    const insertedId: string | undefined = inserted[0]?.id;
    if (!insertedId) {
      throw new NotFoundException('配方明细创建失败');
    }
    this.logger.log(`配方明细新增成功：${JSON.stringify({ id: insertedId })}`);
    await this.bitableSyncService.syncRecord('formula', insertedId);
    return { id: insertedId };
  }

  async updateFormula(
    formulaId: string,
    payload: UpdateFormulaRequest,
  ): Promise<{ id: string }> {
    const patch: Partial<typeof formulaDetailTable.$inferInsert> = {};
    if (payload.courseName !== undefined) {
      const course: CourseRow = await this.getCourseRow(payload.courseName);
      patch.courseRelated = this.buildCourseLink(course.id);
    }
    if (payload.ingredientName !== undefined) {
      patch.ingredientName = payload.ingredientName.trim();
    }
    if (payload.quantity !== undefined) {
      patch.quantity =
        payload.quantity === null ? null : String(payload.quantity);
    }
    if (payload.unit !== undefined) {
      patch.unit = payload.unit;
    }
    if (payload.ingredientCategory !== undefined) {
      patch.ingredientCategory = payload.ingredientCategory;
    }
    if (payload.remark !== undefined) {
      patch.remark = payload.remark;
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }
    patch.updatedAt = new Date();
    const updated: Array<{ id: string }> = await this.db
      .update(formulaDetailTable)
      .set(patch)
      .where(eq(formulaDetailTable.id, formulaId))
      .returning({ id: formulaDetailTable.id });
    if (updated.length === 0) {
      throw new NotFoundException(`配方明细 ${formulaId} 不存在`);
    }
    this.logger.log(`配方明细更新成功：${JSON.stringify({ id: formulaId })}`);
    await this.bitableSyncService.syncRecord('formula', formulaId);
    return { id: formulaId };
  }

  async deleteFormula(formulaId: string): Promise<{ id: string }> {
    const syncResult: BitableSyncResult =
      await this.bitableSyncService.deleteRecord('formula', formulaId);
    if (syncResult.syncStatus === 'failed') {
      throw new ConflictException(
        syncResult.message ||
          '多维表格配方明细删除失败，已中止本地删除，请稍后重试',
      );
    }
    const deleted: Array<{ id: string }> = await this.db
      .delete(formulaDetailTable)
      .where(eq(formulaDetailTable.id, formulaId))
      .returning({ id: formulaDetailTable.id });
    if (deleted.length === 0) {
      throw new NotFoundException(`配方明细 ${formulaId} 不存在`);
    }
    this.logger.log(`配方明细删除成功：${JSON.stringify({ id: formulaId })}`);
    return { id: formulaId };
  }
}
