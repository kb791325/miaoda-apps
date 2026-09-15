/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, foreignKey, index, integer, jsonb, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

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

export const reSouCi = pgTable("热搜词", {
  id: uuid("id").primaryKey().defaultRandom(),
  paiMing: integer("排名").notNull().default(0),
  ci: varchar("词", { length: 255 }).notNull().unique(),
  reDuZhi: integer("热度值").notNull().default(0),
  biaoQie: varchar("标签", { length: 64 }),
  sentenceId: varchar("sentence_id", { length: 128 }),
  groupId: varchar("group_id", { length: 128 }),
  caiJiShiJian: customTimestamptz("采集时间", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
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
  index("idx_热搜词_排名").on(table.paiMing),
  uniqueIndex("idx_热搜词_词").on(table.ci),
]);

export const baoKuanJiYin = pgTable("爆款基因", {
  id: uuid("id").primaryKey().defaultRandom(),
  geneType: varchar("gene_type", { length: 32 }).notNull(),
  content: text("content").notNull(),
  effectScore: integer("effect_score").default(0),
  sourceVideoId: uuid("source_video_id"),
  isFavorite: boolean("is_favorite").default(false),
  useCount: integer("use_count").default(0),
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
  index("idx_爆款基因_type").on(table.geneType),
  index("idx_爆款基因_favorite").on(table.isFavorite),
  foreignKey({
    columns: [table.sourceVideoId],
    foreignColumns: [shiPinJiLu.id],
    name: "viral_genes_source_video_id_fkey",
  }).onDelete("set null"),
]);

export const shiPinZhiZuo = pgTable("视频制作", {
  id: uuid("id").primaryKey().defaultRandom(),
  scriptId: uuid("script_id"),
  characterRef: text("character_ref"),
  /**
   * @type { shots: { id: number; imageUrl: string }[] }
   */
  storyboardImages: jsonb("storyboard_images").default('{}'),
  /**
   * @type { shots: { id: number; videoUrl: string }[] }
   */
  videoClips: jsonb("video_clips").default('{}'),
  /**
   * @type { voiceType: string; speed: number; audioUrl: string }
   */
  voiceover: jsonb("voiceover").default('{}'),
  /**
   * @type { style: string; volume: number; audioUrl: string }
   */
  bgmConfig: jsonb("bgm_config").default('{}'),
  finalVideoUrl: text("final_video_url"),
  status: varchar("status", { length: 32 }).default('pending'),
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
  foreignKey({
    columns: [table.scriptId],
    foreignColumns: [jiaoBenXiangMu.id],
    name: "video_productions_script_id_fkey",
  }).onDelete("set null"),
]);

export const jiaoBenXiangMu = pgTable("脚本项目", {
  id: uuid("id").primaryKey().defaultRandom(),
  topic: varchar("topic", { length: 255 }),
  category: varchar("category", { length: 64 }),
  targetDuration: integer("target_duration").default(30),
  referenceVideoIds: uuid("reference_video_ids").array().default([]),
  viralSummary: text("viral_summary"),
  /**
   * @type { feasibilityScore: number; audience: string; hookDirections: string[] }
   */
  topicEval: jsonb("topic_eval").default('{}'),
  /**
   * @type { hook: string; body: string; cta: string; emotionPlan: string }
   */
  outline: jsonb("outline").default('{}'),
  fullCopy: text("full_copy"),
  /**
   * @type { shots: { id: number; duration: number; scene: string; line: string; camera: string; sound: string; subtitle: string; prompt: string }[] }
   */
  storyboard: jsonb("storyboard").default('{}'),
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
  index("idx_脚本项目_category").on(table.category),
]);

export const shiPinJiLu = pgTable("视频记录", {
  id: uuid("id").primaryKey().defaultRandom(),
  awemeId: varchar("aweme_id", { length: 64 }).notNull().unique(),
  title: text("title"),
  authorUid: varchar("author_uid", { length: 64 }),
  authorNickname: varchar("author_nickname", { length: 255 }),
  authorAvatar: text("author_avatar"),
  followerCount: integer("follower_count").default(0),
  coverUrl: text("cover_url"),
  videoUrl: text("video_url"),
  duration: integer("duration").default(0),
  publishTime: customTimestamptz("publish_time", { precision: 3 }),
  diggCount: integer("digg_count").default(0),
  commentCount: integer("comment_count").default(0),
  shareCount: integer("share_count").default(0),
  collectCount: integer("collect_count").default(0),
  playCount: integer("play_count").default(0),
  hashtags: text("hashtags").array().default([]),
  taskId: uuid("task_id"),
  category: varchar("category", { length: 64 }),
  overallScore: integer("overall_score"),
  grade: varchar("grade", { length: 8 }),
  /**
   * @type { hook: number; retention: number; emotion: number; editing: number; visual: number; copywriting: number; engagement: number; completion: number }
   */
  eightDimScores: jsonb("eight_dim_scores").default('{}'),
  /**
   * @type { hookAnalysis: string; emotionCurve: { time: number; value: number }[]; retentionNodes: { time: number; description: string }[]; copyStructure: string; replicableElements: string[]; editingRhythm: string; visualStyle: string }
   */
  analyzeDetail: jsonb("analyze_detail").default('{}'),
  transcript: text("transcript"),
  /**
   * @type { topComments: string[]; clusters: { name: string; count: number }[] }
   */
  commentAnalysis: jsonb("comment_analysis").default('{}'),
  /**
   * @type { selectionCriteria: string; copyTemplate: string; editingParams: string; publishStrategy: string }
   */
  remakeSop: jsonb("remake_sop").default('{}'),
  analyzeStatus: varchar("analyze_status", { length: 32 }).default('pending'),
  analyzedAt: customTimestamptz("analyzed_at", { precision: 3 }),
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
  uniqueIndex("idx_视频记录_aweme_id_key").on(table.awemeId),
  index("idx_视频记录_task_id").on(table.taskId),
  index("idx_视频记录_aweme_id").on(table.awemeId),
  index("idx_视频记录_analyze_status").on(table.analyzeStatus),
  index("idx_视频记录_grade").on(table.grade),
  foreignKey({
    columns: [table.taskId],
    foreignColumns: [souSuoRenWu.id],
    name: "videos_task_id_fkey",
  }).onDelete("set null"),
]);

export const souSuoRenWu = pgTable("搜索任务", {
  id: uuid("id").primaryKey().defaultRandom(),
  searchMode: varchar("search_mode", { length: 32 }).notNull().default('keyword'),
  keyword: varchar("keyword", { length: 255 }),
  sortType: varchar("sort_type", { length: 32 }).default('0'),
  timeFilter: varchar("time_filter", { length: 32 }),
  durationFilter: varchar("duration_filter", { length: 32 }),
  category: varchar("category", { length: 64 }),
  targetCount: integer("target_count").default(20),
  minLikes: integer("min_likes").default(0),
  status: varchar("status", { length: 32 }).default('pending'),
  resultCount: integer("result_count").default(0),
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
  index("idx_搜索任务_status").on(table.status),
]);

// table aliases
export const baoKuanJiYinTable = baoKuanJiYin;
export const jiaoBenXiangMuTable = jiaoBenXiangMu;
export const reSouCiTable = reSouCi;
export const shiPinJiLuTable = shiPinJiLu;
export const shiPinZhiZuoTable = shiPinZhiZuo;
export const souSuoRenWuTable = souSuoRenWu;
