/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { bigint, date, index, jsonb, numeric, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const marketingContentInbox = pgTable("marketing_content_inbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id", { length: 255 }).unique(),
  // Synced field: auto-synced, do not modify or delete
  contentTitle: varchar("content_title", { length: 255 }),
  // Synced field: auto-synced, do not modify or delete
  contentType: varchar("content_type", { length: 50 }),
  // Synced field: auto-synced, do not modify or delete
  body: text("body"),
  // Synced field: auto-synced, do not modify or delete
  status: varchar("status", { length: 50 }),
  // Synced field: auto-synced, do not modify or delete
  scheduleDate: date("schedule_date"),
  // Synced field: auto-synced, do not modify or delete
  publishPlatform: varchar("publish_platform", { length: 255 }),
  // Synced field: auto-synced, do not modify or delete
  likeCount: bigint("like_count", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  conversionCount: bigint("conversion_count", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  posterImages: text("poster_images"),
  // Synced field: auto-synced, do not modify or delete
  attachmentList: text("attachment_list"),
  // Synced field: auto-synced, do not modify or delete
  rejectReason: text("reject_reason"),
  /**
   * @type { link_record_ids: string[] }
   */
  // Synced field: auto-synced, do not modify or delete
  relatedCourses: jsonb("related_courses"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("marketing_content_inbox_base_record_id_key").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const graduationRecordTable = pgTable("graduation_record_table", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  graduationCertNo: text("graduation_cert_no").unique(),
  /**
   * 关联学员
   */
  // Synced field: auto-synced, do not modify or delete
  relatedStudent: jsonb("related_student"),
  /**
   * 关联课程
   */
  // Synced field: auto-synced, do not modify or delete
  relatedCourse: jsonb("related_course"),
  // Synced field: auto-synced, do not modify or delete
  trainingStartDate: date("training_start_date"),
  // Synced field: auto-synced, do not modify or delete
  trainingEndDate: date("training_end_date"),
  // Synced field: auto-synced, do not modify or delete
  totalClassHours: numeric("total_class_hours"),
  // Synced field: auto-synced, do not modify or delete
  attendanceHours: numeric("attendance_hours"),
  // Synced field: auto-synced, do not modify or delete
  attendanceRate: numeric("attendance_rate"),
  // Synced field: auto-synced, do not modify or delete
  practicalEvaluation: text("practical_evaluation"),
  // Synced field: auto-synced, do not modify or delete
  theoreticalEvaluation: text("theoretical_evaluation"),
  // Synced field: auto-synced, do not modify or delete
  graduationDate: date("graduation_date"),
  // Synced field: auto-synced, do not modify or delete
  certificateIssuanceStatus: text("certificate_issuance_status"),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875414117830727").on(table.id),
  uniqueIndex("unq_1875414117830759").on(table.baseRecordId),
  uniqueIndex("unq_graduation_cert_no").on(table.graduationCertNo),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const leaveApplicationTable = pgTable("leave_application_table", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  leaveReason: text("leave_reason"),
  /**
   * 关联学员
   */
  // Synced field: auto-synced, do not modify or delete
  relatedStudent: jsonb("related_student"),
  /**
   * 关联排期
   */
  // Synced field: auto-synced, do not modify or delete
  relatedSchedule: jsonb("related_schedule"),
  // Synced field: auto-synced, do not modify or delete
  leaveType: text("leave_type"),
  // Synced field: auto-synced, do not modify or delete
  applyTime: customTimestamptz("apply_time", { precision: 6 }),
  // Synced field: auto-synced, do not modify or delete
  approvalStatus: text("approval_status"),
  // Synced field: auto-synced, do not modify or delete
  approvalRemark: text("approval_remark"),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875385158039578").on(table.id),
  uniqueIndex("unq_1875385158039610").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const followUpRecordTable = pgTable("follow_up_record_table", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  followUpContent: text("follow_up_content"),
  /**
   * 关联线索
   */
  // Synced field: auto-synced, do not modify or delete
  relatedClue: jsonb("related_clue"),
  // Synced field: auto-synced, do not modify or delete
  followUpMethod: text("follow_up_method"),
  // Synced field: auto-synced, do not modify or delete
  followUpTime: customTimestamptz("follow_up_time", { precision: 6 }),
  // Synced field: auto-synced, do not modify or delete
  nextFollowUpPlan: text("next_follow_up_plan"),
  // Synced field: auto-synced, do not modify or delete
  follower: userProfile("follower"),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875413735411731").on(table.id),
  uniqueIndex("unq_1875413735411763").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const enrollmentLeadTable = pgTable("enrollment_lead_table", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  clueName: text("clue_name"),
  // Synced field: auto-synced, do not modify or delete
  phoneNumber: text("phone_number"),
  // Synced field: auto-synced, do not modify or delete
  sourceChannel: text("source_channel"),
  /**
   * 意向课程
   */
  // Synced field: auto-synced, do not modify or delete
  intendedCourse: jsonb("intended_course"),
  // Synced field: auto-synced, do not modify or delete
  intentionDegree: text("intention_degree"),
  // Synced field: auto-synced, do not modify or delete
  clueStatus: text("clue_status"),
  // Synced field: auto-synced, do not modify or delete
  personInCharge: userProfile("person_in_charge"),
  // Synced field: auto-synced, do not modify or delete
  firstConsultTime: customTimestamptz("first_consult_time", { precision: 6 }),
  // Synced field: auto-synced, do not modify or delete
  nextFollowTime: customTimestamptz("next_follow_time", { precision: 6 }),
  // Synced field: auto-synced, do not modify or delete
  remark: text("remark"),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875384756569099").on(table.id),
  uniqueIndex("unq_1875384756569131").on(table.baseRecordId),
]);

export const courseCategory = pgTable("course_category", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("unq_course_category_name").on(table.name),
]);

export const faqMiss = pgTable("faq_miss", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  status: varchar("status", { length: 255 }).notNull().default('pending'),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const marketingContent = pgTable("marketing_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  courseId: uuid("course_id"),
  contentType: varchar("content_type", { length: 255 }).notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 255 }).notNull().default('pending_review'),
  scheduleDate: date("schedule_date"),
  rejectReason: text("reject_reason"),
  publishPlatform: varchar("publish_platform", { length: 255 }),
  likeCount: bigint("like_count", { mode: 'number' }),
  conversionCount: bigint("conversion_count", { mode: 'number' }),
  /**
   * @type string[]
   */
  posterImages: jsonb("poster_images"),
  /**
   * @type { name: string; url: string }[]
   */
  attachments: jsonb("attachments"),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  baseRecordId: varchar("base_record_id", { length: 255 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const contentMaterialLibrary = pgTable("content_material_library", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  materialTitle: text("material_title"),
  // Synced field: auto-synced, do not modify or delete
  materialType: text("material_type"),
  /**
   * 关联课程
   */
  // Synced field: auto-synced, do not modify or delete
  relatedCourse: jsonb("related_course"),
  // Synced field: auto-synced, do not modify or delete
  coreContent: text("core_content"),
  // Synced field: auto-synced, do not modify or delete
  applicablePlatform: text("applicable_platform").array(),
  // Synced field: auto-synced, do not modify or delete
  tag: text("tag").array(),
  // Synced field: auto-synced, do not modify or delete
  status: text("status"),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875324886780979").on(table.id),
  uniqueIndex("unq_1875324886782099").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const faqKnowledgeBase = pgTable("faq_knowledge_base", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  appQuestion: text("app_question"),
  // Synced field: auto-synced, do not modify or delete
  standardAnswer: text("standard_answer"),
  // Synced field: auto-synced, do not modify or delete
  appCategory: text("app_category"),
  // Synced field: auto-synced, do not modify or delete
  appKeyword: text("app_keyword").array(),
  // Synced field: auto-synced, do not modify or delete
  similarQuestion: text("similar_question"),
  // Synced field: auto-synced, do not modify or delete
  appStatus: text("app_status"),
  // Synced field: auto-synced, do not modify or delete
  updateTime: customTimestamptz("update_time", { precision: 6 }),
  // Synced field: auto-synced, do not modify or delete
  hitCount: bigint("hit_count", { mode: 'number' }),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875324866574440").on(table.id),
  uniqueIndex("unq_1875324886775811").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const equipmentToolTable = pgTable("equipment_tool_table", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  /**
   * 所属课程
   */
  // Synced field: auto-synced, do not modify or delete
  courseAffiliation: jsonb("course_affiliation"),
  // Synced field: auto-synced, do not modify or delete
  equipmentToolName: text("equipment_tool_name"),
  // Synced field: auto-synced, do not modify or delete
  specification: text("specification"),
  // Synced field: auto-synced, do not modify or delete
  quantity: bigint("quantity", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  remark: text("remark"),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875324866570248").on(table.id),
  uniqueIndex("unq_1875324866570280").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const processFlowTable = pgTable("process_flow_table", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  /**
   * 所属课程
   */
  // Synced field: auto-synced, do not modify or delete
  course: jsonb("course"),
  // Synced field: auto-synced, do not modify or delete
  stepNo: bigint("step_no", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  stepName: text("step_name"),
  // Synced field: auto-synced, do not modify or delete
  operationDesc: text("operation_desc"),
  // Synced field: auto-synced, do not modify or delete
  keyControlPoint: text("key_control_point"),
  // Synced field: auto-synced, do not modify or delete
  estimatedDuration: text("estimated_duration"),
  // Synced field: auto-synced, do not modify or delete
  operationVideo: text("operation_video").array(),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875324866564104").on(table.id),
  uniqueIndex("unq_1875324866564136").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const formulaDetailTable = pgTable("formula_detail_table", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  /**
   * 所属课程
   */
  // Synced field: auto-synced, do not modify or delete
  courseRelated: jsonb("course_related"),
  // Synced field: auto-synced, do not modify or delete
  ingredientName: text("ingredient_name"),
  // Synced field: auto-synced, do not modify or delete
  quantity: numeric("quantity"),
  // Synced field: auto-synced, do not modify or delete
  unit: text("unit"),
  // Synced field: auto-synced, do not modify or delete
  ingredientCategory: text("ingredient_category"),
  // Synced field: auto-synced, do not modify or delete
  remark: text("remark"),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875324866559000").on(table.id),
  uniqueIndex("unq_1875324866559032").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const attendanceRecordTable = pgTable("attendance_record_table", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  /**
   * 学员
   */
  // Synced field: auto-synced, do not modify or delete
  appStudent: jsonb("app_student"),
  /**
   * 课程排期
   */
  // Synced field: auto-synced, do not modify or delete
  courseSchedule: jsonb("course_schedule"),
  // Synced field: auto-synced, do not modify or delete
  attendanceStatus: text("attendance_status"),
  // Synced field: auto-synced, do not modify or delete
  remark: text("remark"),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875324866554888").on(table.id),
  uniqueIndex("unq_1875324866554920").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const courseScheduleTable = pgTable("course_schedule_table", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  scheduleName: text("schedule_name"),
  /**
   * 课程名称
   */
  // Synced field: auto-synced, do not modify or delete
  courseName: jsonb("course_name"),
  // Synced field: auto-synced, do not modify or delete
  classDate: date("class_date"),
  // Synced field: auto-synced, do not modify or delete
  startTime: text("start_time"),
  // Synced field: auto-synced, do not modify or delete
  endTime: text("end_time"),
  // Synced field: auto-synced, do not modify or delete
  lecturer: userProfile("lecturer"),
  // Synced field: auto-synced, do not modify or delete
  classroom: text("classroom"),
  // Synced field: auto-synced, do not modify or delete
  enrollmentCapacity: bigint("enrollment_capacity", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  registeredCount: bigint("registered_count", { mode: 'number' }),
  // Synced field: auto-synced, do not modify or delete
  remainingQuota: bigint("remaining_quota", { mode: 'number' }),
  /**
   * 报名学员
   */
  // Synced field: auto-synced, do not modify or delete
  enrollStudent: jsonb("enroll_student"),
  // Synced field: auto-synced, do not modify or delete
  appStatus: text("app_status"),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875324866546744").on(table.id),
  uniqueIndex("unq_1875324866548760").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const courseGeneralTable = pgTable("course_general_table", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  courseName: text("course_name"),
  // Synced field: auto-synced, do not modify or delete
  courseCategory: text("course_category"),
  // Synced field: auto-synced, do not modify or delete
  difficultyLevel: text("difficulty_level"),
  // Synced field: auto-synced, do not modify or delete
  studyDuration: text("study_duration"),
  // Synced field: auto-synced, do not modify or delete
  tuitionFee: numeric("tuition_fee"),
  // Synced field: auto-synced, do not modify or delete
  courseIntro: text("course_intro"),
  // Synced field: auto-synced, do not modify or delete
  productImage: text("product_image").array(),
  // Synced field: auto-synced, do not modify or delete
  status: text("status"),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875324866541672").on(table.id),
  uniqueIndex("unq_1875324866542664").on(table.baseRecordId),
]);

// Synced table: data is auto-synced from external source. Do not rename or delete this table.
export const studentRegistrationTable = pgTable("student_registration_table", {
  id: uuid("id").primaryKey().unique().defaultRandom(),
  // Synced field: auto-synced, do not modify or delete
  baseRecordId: varchar("base_record_id").unique(),
  // Synced field: auto-synced, do not modify or delete
  studentName: text("student_name"),
  // Synced field: auto-synced, do not modify or delete
  contactPhone: text("contact_phone"),
  // Synced field: auto-synced, do not modify or delete
  wechatId: text("wechat_id"),
  // Synced field: auto-synced, do not modify or delete
  sourceChannel: text("source_channel"),
  // Synced field: auto-synced, do not modify or delete
  enrollmentDate: date("enrollment_date"),
  // Synced field: auto-synced, do not modify or delete
  paymentStatus: text("payment_status"),
  // Synced field: auto-synced, do not modify or delete
  paymentAmount: numeric("payment_amount"),
  // Synced field: auto-synced, do not modify or delete
  studyProgress: text("study_progress"),
  // Synced field: auto-synced, do not modify or delete
  graduationDate: date("graduation_date"),
  // Synced field: auto-synced, do not modify or delete
  remark: text("remark"),
  /**
   * 报名课程
   */
  // Synced field: auto-synced, do not modify or delete
  enrollCourse: jsonb("enroll_course"),
  // Synced field: auto-synced, do not modify or delete
  learningManager: text("learning_manager"),
  managerProfile: userProfile("manager_profile"),
  bitableRecordId: varchar("bitable_record_id", { length: 255 }),
  syncStatus: varchar("sync_status", { length: 32 }).notNull().default('not_synced'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by"),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 6 }).notNull().default(sql`now()`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by"),
}, (table) => [
  uniqueIndex("unq_1875324852948051").on(table.id),
  uniqueIndex("unq_1875324852948083").on(table.baseRecordId),
]);

// table aliases
export const attendanceRecordTableTable = attendanceRecordTable;
export const contentMaterialLibraryTable = contentMaterialLibrary;
export const courseCategoryTable = courseCategory;
export const courseGeneralTableTable = courseGeneralTable;
export const courseScheduleTableTable = courseScheduleTable;
export const enrollmentLeadTableTable = enrollmentLeadTable;
export const equipmentToolTableTable = equipmentToolTable;
export const faqKnowledgeBaseTable = faqKnowledgeBase;
export const faqMissTable = faqMiss;
export const followUpRecordTableTable = followUpRecordTable;
export const formulaDetailTableTable = formulaDetailTable;
export const graduationRecordTableTable = graduationRecordTable;
export const leaveApplicationTableTable = leaveApplicationTable;
export const marketingContentTable = marketingContent;
export const marketingContentInboxTable = marketingContentInbox;
export const processFlowTableTable = processFlowTable;
export const studentRegistrationTableTable = studentRegistrationTable;
