/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, integer, jsonb, numeric, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

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

export const licenseAssignment = pgTable("license_assignment", {
  id: uuid("id").primaryKey().defaultRandom(),
  licenseId: uuid("license_id").notNull(),
  assignee: userProfile("assignee").notNull(),
  deviceId: uuid("device_id"),
  assignDate: date("assign_date").notNull().default('CURRENT_DATE'),
  assigner: userProfile("assigner").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('active'),
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
  index("idx_license_assign_license").on(table.licenseId),
  // Complex index: CREATE INDEX idx_license_assign_assignee ON license_assignment USING btree (((assignee).user_id)),
  index("idx_license_assign_status").on(table.status),
]);

export const license = pgTable("license", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 300 }).notNull(),
  softwareType: varchar("software_type", { length: 50 }).notNull(),
  licenseKey: varchar("license_key", { length: 500 }),
  licenseMode: varchar("license_mode", { length: 30 }).notNull(),
  totalSeats: integer("total_seats").notNull().default(0),
  purchaseDate: date("purchase_date"),
  purchaseAmount: numeric("purchase_amount"),
  expireDate: date("expire_date").notNull(),
  supplierId: uuid("supplier_id"),
  remark: text("remark"),
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
  index("idx_license_supplier").on(table.supplierId),
  index("idx_license_expire").on(table.expireDate),
]);

export const workOrder = pgTable("work_order", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNo: varchar("order_no", { length: 50 }).notNull().unique(),
  reporter: userProfile("reporter").notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }),
  assetId: uuid("asset_id"),
  assetName: varchar("asset_name", { length: 500 }),
  problemType: varchar("problem_type", { length: 50 }).notNull(),
  urgency: varchar("urgency", { length: 20 }).notNull().default('medium'),
  description: text("description").notNull(),
  attachmentUrls: text("attachment_urls"),
  status: varchar("status", { length: 30 }).notNull().default('pending'),
  assignee: userProfile("assignee"),
  solution: text("solution"),
  resolvedAt: customTimestamptz("resolved_at", { precision: 6 }),
  satisfaction: varchar("satisfaction", { length: 20 }),
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
  uniqueIndex("work_order_order_no_key").on(table.orderNo),
  index("idx_work_order_status").on(table.status),
  // Complex index: CREATE INDEX idx_work_order_reporter ON work_order USING btree (((reporter).user_id)),
  // Complex index: CREATE INDEX idx_work_order_assignee ON work_order USING btree (((assignee).user_id)),
  index("idx_work_order_created").on(table.createdAt),
]);

export const supplier = pgTable("supplier", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  contactPerson: varchar("contact_person", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 200 }),
  address: varchar("address", { length: 500 }),
  businessScope: varchar("business_scope", { length: 200 }),
  remark: text("remark"),
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

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  downloadUrl: text("download_url").notNull(),
  fileCategory: varchar("file_category", { length: 50 }).notNull().default('other'),
  relatedType: varchar("related_type", { length: 50 }).notNull(),
  relatedId: uuid("related_id").notNull(),
  uploaderId: varchar("uploader_id", { length: 100 }).notNull(),
  uploaderName: varchar("uploader_name", { length: 200 }).notNull(),
  description: text("description"),
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
  index("idx_attachments_related").on(table.relatedType, table.relatedId),
  index("idx_attachments_uploader").on(table.uploaderId),
  index("idx_attachments_category").on(table.fileCategory),
  index("idx_attachments_created").on(table.createdAt),
]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  traceId: varchar("trace_id", { length: 50 }).notNull(),
  userId: varchar("user_id", { length: 100 }).notNull(),
  userName: varchar("user_name", { length: 200 }).notNull(),
  userDepartment: varchar("user_department", { length: 200 }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  targetType: varchar("target_type", { length: 100 }).notNull(),
  targetId: varchar("target_id", { length: 100 }),
  targetName: varchar("target_name", { length: 500 }),
  description: text("description"),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  changedFields: jsonb("changed_fields"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  requestMethod: varchar("request_method", { length: 10 }),
  requestPath: varchar("request_path", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default('success'),
  errorMessage: text("error_message"),
  duration: integer("duration").notNull().default(0),
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
  index("idx_audit_logs_trace").on(table.traceId),
  index("idx_audit_logs_user").on(table.userId),
  index("idx_audit_logs_module").on(table.module),
  index("idx_audit_logs_action").on(table.action),
  index("idx_audit_logs_target").on(table.targetType, table.targetId),
  index("idx_audit_logs_status").on(table.status),
  index("idx_audit_logs_created").on(table.createdAt),
]);

export const assetReservations = pgTable("asset_reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationNo: varchar("reservation_no", { length: 50 }).notNull().unique(),
  assetId: uuid("asset_id").notNull(),
  assetName: varchar("asset_name", { length: 500 }).notNull(),
  assetCode: varchar("asset_code", { length: 100 }).notNull(),
  requester: userProfile("requester").notNull(),
  requesterName: varchar("requester_name", { length: 200 }).notNull(),
  requesterDepartment: varchar("requester_department", { length: 200 }).notNull(),
  approver: userProfile("approver"),
  approverName: varchar("approver_name", { length: 200 }),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  purpose: text("purpose").notNull(),
  expectedBorrowDate: date("expected_borrow_date").notNull(),
  expectedReturnDate: date("expected_return_date").notNull(),
  actualBorrowDate: date("actual_borrow_date"),
  actualReturnDate: date("actual_return_date"),
  approvalRemark: text("approval_remark"),
  rejectReason: text("reject_reason"),
  returnRemark: text("return_remark"),
  approvedAt: customTimestamptz("approved_at", { precision: 6 }),
  borrowedAt: customTimestamptz("borrowed_at", { precision: 6 }),
  returnedAt: customTimestamptz("returned_at", { precision: 6 }),
  assetType: varchar("asset_type", { length: 100 }).notNull(),
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
  uniqueIndex("idx_asset_reservations_no").on(table.reservationNo),
  index("idx_asset_reservations_status").on(table.status),
  index("idx_asset_reservations_asset").on(table.assetId),
  // Complex index: CREATE INDEX idx_asset_reservations_requester ON asset_reservations USING btree (((requester).user_id)),
  // Complex index: CREATE INDEX idx_asset_reservations_approver ON asset_reservations USING btree (((approver).user_id)),
  index("idx_asset_reservations_expected_borrow").on(table.expectedBorrowDate),
  index("idx_asset_reservations_created").on(table.createdAt),
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 100 }).notNull(),
  notificationType: varchar("notification_type", { length: 30 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content"),
  relatedType: varchar("related_type", { length: 30 }),
  relatedId: uuid("related_id"),
  isRead: boolean("is_read").default(false),
  priority: varchar("priority", { length: 20 }).default('normal'),
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
  index("idx_notifications_user").on(table.userId),
  index("idx_notifications_type").on(table.notificationType),
  index("idx_notifications_read").on(table.isRead),
  index("idx_notifications_created").on(table.createdAt),
]);

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 100 }).notNull(),
  roleId: uuid("role_id").notNull(),
  isActive: boolean("is_active").default(true),
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
  uniqueIndex("idx_user_roles_unique").on(table.userId, table.roleId),
  index("idx_user_roles_user").on(table.userId),
  index("idx_user_roles_role").on(table.roleId),
  foreignKey({
    columns: [table.roleId],
    foreignColumns: [roles.id],
    name: "user_roles_role_id_fkey",
  }).onDelete("cascade"),
]);

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleCode: varchar("role_code", { length: 50 }).notNull().unique(),
  roleName: varchar("role_name", { length: 100 }).notNull(),
  roleDescription: varchar("role_description", { length: 500 }),
  isSystem: boolean("is_system").default(false),
  isActive: boolean("is_active").default(true),
  /**
   * @type { expenses?: boolean; fixedAssets?: boolean; inventory?: boolean; categories?: boolean; reports?: boolean; settings?: boolean; budget?: boolean; roles?: boolean; audit?: boolean; notifications?: boolean }
   */
  menuPermissions: jsonb("menu_permissions").default('{}'),
  /**
   * @type { expenses?: "personal" | "department" | "all"; fixedAssets?: "personal" | "department" | "all"; inventory?: "personal" | "department" | "all" }
   */
  dataPermissions: jsonb("data_permissions").default('{}'),
  /**
   * @type { expenses?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean; approve?: boolean; export?: boolean; import?: boolean }; fixedAssets?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean; approve?: boolean; export?: boolean; import?: boolean }; inventory?: { view?: boolean; create?: boolean; edit?: boolean; delete?: boolean; export?: boolean } }
   */
  operationPermissions: jsonb("operation_permissions").default('{}'),
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
  uniqueIndex("roles_role_code_key").on(table.roleCode),
  index("idx_roles_code").on(table.roleCode),
  index("idx_roles_active").on(table.isActive),
]);

export const budgetAdjustments = pgTable("budget_adjustments", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetId: uuid("budget_id").notNull(),
  oldAmount: numeric("old_amount").notNull(),
  newAmount: numeric("new_amount").notNull(),
  adjustReason: text("adjust_reason"),
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
  index("idx_budget_adj_budget").on(table.budgetId),
  index("idx_budget_adj_created").on(table.createdAt),
]);

export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  budgetYear: integer("budget_year").notNull(),
  budgetMonth: varchar("budget_month", { length: 10 }).notNull(),
  department: varchar("department", { length: 200 }).notNull(),
  budgetAmount: numeric("budget_amount").notNull().default('0'),
  usedAmount: numeric("used_amount").notNull().default('0'),
  isOverridden: boolean("is_overridden").default(false),
  remark: text("remark"),
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
  uniqueIndex("idx_budgets_unique").on(table.budgetYear, table.budgetMonth, table.department),
  index("idx_budgets_year").on(table.budgetYear),
  index("idx_budgets_department").on(table.department),
]);

export const assetOperationRecords = pgTable("asset_operation_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").notNull(),
  operationType: varchar("operation_type", { length: 30 }).notNull(),
  fromStatus: varchar("from_status", { length: 30 }),
  toStatus: varchar("to_status", { length: 30 }),
  operator: userProfile("operator"),
  targetUser: userProfile("target_user"),
  targetDepartment: varchar("target_department", { length: 200 }),
  targetFloor: varchar("target_floor", { length: 100 }),
  startDate: date("start_date"),
  expectedDate: date("expected_date"),
  actualDate: date("actual_date"),
  reason: text("reason"),
  remark: text("remark"),
  cost: numeric("cost").default('0'),
  vendor: varchar("vendor", { length: 200 }),
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
  index("idx_asset_ops_asset").on(table.assetId),
  index("idx_asset_ops_type").on(table.operationType),
  index("idx_asset_ops_created").on(table.createdAt),
]);

export const approvalRecords = pgTable("approval_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseId: uuid("expense_id").notNull(),
  approvalNode: varchar("approval_node", { length: 50 }).notNull(),
  approvalAction: varchar("approval_action", { length: 20 }).notNull(),
  approver: userProfile("approver"),
  remark: text("remark"),
  approvalTime: customTimestamptz("approval_time", { precision: 3 }),
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
  index("idx_approval_records_expense").on(table.expenseId),
  index("idx_approval_records_node").on(table.approvalNode),
  index("idx_approval_records_time").on(table.approvalTime),
]);

export const dataRecords = pgTable("data_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  dataName: varchar("data_name", { length: 200 }),
  dataType: varchar("data_type", { length: 50 }),
  dataValue: numeric("data_value"),
  dataUnit: varchar("data_unit", { length: 50 }),
  statDate: date("stat_date"),
  category: varchar("category", { length: 200 }),
  remark: text("remark"),
  feishuRecordId: varchar("feishu_record_id", { length: 100 }).unique(),
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
  uniqueIndex("data_records_feishu_record_id_key").on(table.feishuRecordId),
  index("idx_data_records_type").on(table.dataType),
  index("idx_data_records_date").on(table.statDate),
]);

export const operationLogs = pgTable("operation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  operator: userProfile("operator"),
  operationType: varchar("operation_type", { length: 50 }),
  targetType: varchar("target_type", { length: 50 }),
  targetId: uuid("target_id"),
  content: text("content"),
  ipAddress: varchar("ip_address", { length: 50 }),
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
  index("idx_operation_logs_type").on(table.operationType, table.targetType),
  index("idx_operation_logs_created").on(table.createdAt),
  index("idx_operation_logs_operator").on(table.operator),
]);

export const approvalFlows = pgTable("approval_flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  flowType: varchar("flow_type", { length: 50 }).notNull().unique(),
  flowName: varchar("flow_name", { length: 100 }).notNull(),
  /**
   * @type { nodeKey: string; nodeName: string; approverType: string; approverValue: string[]; order: number }[]
   */
  nodeConfig: jsonb("node_config"),
  isActive: boolean("is_active").default(true),
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
  uniqueIndex("approval_flows_flow_type_key").on(table.flowType),
]);

export const feishuSyncLogs = pgTable("feishu_sync_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  domain: varchar("domain", { length: 50 }).notNull(),
  syncType: varchar("sync_type", { length: 20 }),
  direction: varchar("direction", { length: 10 }),
  status: varchar("status", { length: 20 }),
  recordCount: integer("record_count").default(0),
  errorMessage: text("error_message"),
  syncStartedAt: customTimestamptz("sync_started_at", { precision: 6 }),
  syncFinishedAt: customTimestamptz("sync_finished_at", { precision: 6 }),
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
  index("idx_feishu_sync_logs_domain").on(table.domain),
  index("idx_feishu_sync_logs_status").on(table.status),
  index("idx_feishu_sync_logs_started").on(table.syncStartedAt),
]);

export const feishuSyncConfigs = pgTable("feishu_sync_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  domain: varchar("domain", { length: 50 }).notNull().unique(),
  baseToken: varchar("base_token", { length: 100 }),
  tableId: varchar("table_id", { length: 100 }),
  syncDirection: varchar("sync_direction", { length: 20 }).default('bidirectional'),
  /**
   * @type { source: string; target: string }[]
   */
  fieldMapping: jsonb("field_mapping"),
  uniqueKey: varchar("unique_key", { length: 100 }),
  isEnabled: boolean("is_enabled").default(false),
  lastSyncTime: customTimestamptz("last_sync_time", { precision: 6 }),
  lastSyncStatus: varchar("last_sync_status", { length: 20 }),
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
  uniqueIndex("feishu_sync_configs_domain_key").on(table.domain),
]);

export const inventoryChecks = pgTable("inventory_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  checkNo: varchar("check_no", { length: 50 }),
  checkTaskId: uuid("check_task_id"),
  checkYear: integer("check_year"),
  checkMonth: varchar("check_month", { length: 10 }),
  checkDate: date("check_date"),
  checker: userProfile("checker"),
  owner: userProfile("owner"),
  assetId: uuid("asset_id"),
  assetName: varchar("asset_name", { length: 500 }),
  assetType: varchar("asset_type", { length: 50 }),
  bookQuantity: integer("book_quantity").notNull().default(0),
  actualQuantity: integer("actual_quantity"),
  difference: integer("difference"),
  status: varchar("status", { length: 20 }).default('unchecked'),
  remark: text("remark"),
  feishuRecordId: varchar("feishu_record_id", { length: 100 }).unique(),
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
  index("idx_inventory_checks_task").on(table.checkTaskId),
  index("idx_inventory_checks_asset").on(table.assetId),
  index("idx_inventory_checks_status").on(table.status),
  index("idx_inventory_checks_no").on(table.checkNo),
  uniqueIndex("idx_inventory_checks_feishu_record_id").on(table.feishuRecordId),
  index("idx_inventory_checks_checker").on(table.checker),
  index("idx_inventory_checks_owner").on(table.owner),
  foreignKey({
    columns: [table.checkTaskId],
    foreignColumns: [inventoryTasks.id],
    name: "inventory_checks_check_task_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.assetId],
    foreignColumns: [fixedAssets.id],
    name: "inventory_checks_asset_id_fkey",
  }).onDelete("set null"),
]);

export const inventoryTasks = pgTable("inventory_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskNo: varchar("task_no", { length: 50 }).notNull().unique(),
  checkYear: integer("check_year").notNull(),
  checkMonth: varchar("check_month", { length: 10 }).notNull(),
  status: varchar("status", { length: 20 }).default('pending'),
  scopeType: varchar("scope_type", { length: 20 }),
  /**
   * @type string[]
   */
  scopeValue: jsonb("scope_value"),
  progress: integer("progress").default(0),
  totalCount: integer("total_count").default(0),
  checkedCount: integer("checked_count").default(0),
  abnormalCount: integer("abnormal_count").default(0),
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
  uniqueIndex("inventory_tasks_task_no_key").on(table.taskNo),
  index("idx_inventory_tasks_status").on(table.status),
  index("idx_inventory_tasks_year_month").on(table.checkYear, table.checkMonth),
]);

export const fixedAssets = pgTable("fixed_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetName: varchar("asset_name", { length: 500 }),
  assetType: varchar("asset_type", { length: 50 }),
  assetCategory: varchar("asset_category", { length: 200 }),
  purchaseDate: date("purchase_date"),
  purchaseAmount: numeric("purchase_amount").default('0'),
  purchaseDepartment: varchar("purchase_department", { length: 200 }),
  payerEntity: varchar("payer_entity", { length: 200 }),
  floor: varchar("floor", { length: 100 }),
  handler: userProfile("handler"),
  owner: userProfile("owner"),
  lastCheckDate: date("last_check_date"),
  safetyStock: integer("safety_stock").default(0),
  currentStock: integer("current_stock").default(0),
  feishuRecordId: varchar("feishu_record_id", { length: 100 }).unique(),
  assetStatus: varchar("asset_status", { length: 30 }).default('in_stock'),
  currentOwnerUserProfile: userProfile("current_owner_user_profile"),
  expectedReturnDate: date("expected_return_date"),
  originalValue: numeric("original_value").default('0'),
  accumulatedDepreciation: numeric("accumulated_depreciation").default('0'),
  monthlyDepreciation: numeric("monthly_depreciation").default('0'),
  depreciationMonths: integer("depreciation_months").default(36),
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
  index("idx_fixed_assets_type").on(table.assetType),
  index("idx_fixed_assets_stock").on(table.currentStock, table.safetyStock),
  uniqueIndex("idx_fixed_assets_feishu_record_id").on(table.feishuRecordId),
  index("idx_fixed_assets_floor").on(table.floor),
  index("idx_fixed_assets_status").on(table.assetStatus),
  index("idx_fixed_assets_owner").on(table.owner),
]);

export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseDate: date("expense_date"),
  amount: numeric("amount"),
  description: text("description"),
  categoryL1: varchar("category_l1", { length: 100 }),
  categoryL2: varchar("category_l2", { length: 100 }),
  payerEntity: varchar("payer_entity", { length: 200 }),
  floor: varchar("floor", { length: 100 }),
  department: varchar("department", { length: 200 }),
  purchaseDepartment: varchar("purchase_department", { length: 200 }),
  handler: userProfile("handler"),
  approvalStatus: varchar("approval_status", { length: 20 }).default('draft'),
  invoiceUrl: text("invoice_url"),
  screenshotUrl: text("screenshot_url"),
  year: integer("year"),
  month: integer("month"),
  quarter: integer("quarter"),
  feishuRecordId: varchar("feishu_record_id", { length: 100 }).unique(),
  currentNode: varchar("current_node", { length: 50 }).default('draft'),
  departmentApprover: userProfile("department_approver"),
  financeApprover: userProfile("finance_approver"),
  gmApprover: userProfile("gm_approver"),
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
  index("idx_expenses_date").on(table.expenseDate),
  index("idx_expenses_category").on(table.categoryL1, table.categoryL2),
  index("idx_expenses_status").on(table.approvalStatus),
  index("idx_expenses_year_month").on(table.year, table.month),
  uniqueIndex("idx_expenses_feishu_record_id").on(table.feishuRecordId),
  index("idx_expenses_current_node").on(table.currentNode),
  index("idx_expenses_handler").on(table.handler),
  index("idx_expenses_dept_approver").on(table.departmentApprover),
  index("idx_expenses_finance_approver").on(table.financeApprover),
]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryL1: varchar("category_l1", { length: 100 }).notNull(),
  categoryL2: varchar("category_l2", { length: 100 }).notNull(),
  sortOrder: integer("sort_order").default(0),
  feishuRecordId: varchar("feishu_record_id", { length: 100 }),
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
  uniqueIndex("idx_categories_unique").on(table.categoryL1, table.categoryL2),
]);

// table aliases
export const approvalFlowsTable = approvalFlows;
export const approvalRecordsTable = approvalRecords;
export const assetOperationRecordsTable = assetOperationRecords;
export const assetReservationsTable = assetReservations;
export const attachmentsTable = attachments;
export const auditLogsTable = auditLogs;
export const budgetAdjustmentsTable = budgetAdjustments;
export const budgetsTable = budgets;
export const categoriesTable = categories;
export const dataRecordsTable = dataRecords;
export const expensesTable = expenses;
export const feishuSyncConfigsTable = feishuSyncConfigs;
export const feishuSyncLogsTable = feishuSyncLogs;
export const fixedAssetsTable = fixedAssets;
export const inventoryChecksTable = inventoryChecks;
export const inventoryTasksTable = inventoryTasks;
export const licenseTable = license;
export const licenseAssignmentTable = licenseAssignment;
export const notificationsTable = notifications;
export const operationLogsTable = operationLogs;
export const rolesTable = roles;
export const supplierTable = supplier;
export const userRolesTable = userRoles;
export const workOrderTable = workOrder;
