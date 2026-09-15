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

export const backupRecords = pgTable("backup_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 20 }).notNull(),
  fileName: varchar("file_name", { length: 255 }),
  recordCount: integer("record_count").notNull().default(0),
  /**
   * @type { [tableName: string]: number }
   */
  tableCounts: jsonb("table_counts").notNull().default('{}'),
  operatorName: varchar("operator_name", { length: 100 }),
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
  index("idx_backup_records_created").on(table.createdAt),
]);

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  receivedQuantity: integer("received_quantity").notNull().default(0),
  unitPrice: numeric("unit_price").notNull().default('0'),
  totalPrice: numeric("total_price").notNull().default('0'),
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
  index("idx_poi_order").on(table.orderId),
  index("idx_poi_product").on(table.productId),
  foreignKey({
    columns: [table.orderId],
    foreignColumns: [purchaseOrders.id],
    name: "purchase_order_items_order_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
    name: "purchase_order_items_product_id_fkey",
  }),
]);

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNo: varchar("order_no", { length: 50 }).notNull().unique(),
  supplierId: uuid("supplier_id"),
  warehouse: varchar("warehouse", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  totalAmount: numeric("total_amount").notNull().default('0'),
  expectedDate: date("expected_date"),
  remark: text("remark"),
  transactionId: uuid("transaction_id"),
  inboundNo: varchar("inbound_no", { length: 100 }),
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
  uniqueIndex("purchase_orders_order_no_key").on(table.orderNo),
  index("idx_po_status").on(table.status),
  index("idx_po_supplier").on(table.supplierId),
  index("idx_po_created").on(table.createdAt),
  foreignKey({
    columns: [table.supplierId],
    foreignColumns: [suppliers.id],
    name: "purchase_orders_supplier_id_fkey",
  }),
]);

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  roleId: uuid("role_id").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("user_roles_user_id_role_id_key").on(table.userId, table.roleId),
  index("idx_user_roles_user_id").on(table.userId),
  index("idx_user_roles_role_id").on(table.roleId),
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
  description: text("description"),
  permissions: jsonb("permissions").notNull().default('{}'),
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
]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: uuid("target_id"),
  operator: userProfile("operator").notNull(),
  operatorName: varchar("operator_name", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  /**
   * @type { before?: Record<string,unknown>; after?: Record<string,unknown>; changes?: Record<string,unknown> }
   */
  detail: jsonb("detail").notNull().default('{}'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_audit_action").on(table.actionType),
  index("idx_audit_target").on(table.targetType, table.targetId),
  // Complex index: CREATE INDEX idx_audit_operator ON audit_logs USING btree (((operator).user_id)),
  index("idx_audit_created").on(table.createdAt),
]);

export const notificationSettings = pgTable("notification_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userProfile("user_id").notNull(),
  lowStockEnabled: boolean("low_stock_enabled").notNull().default(true),
  anomalyEnabled: boolean("anomaly_enabled").notNull().default(true),
  operationEnabled: boolean("operation_enabled").notNull().default(true),
  systemEnabled: boolean("system_enabled").notNull().default(true),
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
  // Complex index: CREATE UNIQUE INDEX notification_settings_user_key ON notification_settings USING btree (((user_id).user_id)),
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 30 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content"),
  relatedType: varchar("related_type", { length: 30 }),
  relatedId: uuid("related_id"),
  isRead: boolean("is_read").notNull().default(false),
  recipient: userProfile("recipient").notNull(),
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
  // Complex index: CREATE INDEX idx_notif_recipient ON notifications USING btree (((recipient).user_id)),
  index("idx_notif_read").on(table.isRead),
  index("idx_notif_created").on(table.createdAt),
]);

export const salesOrderItems = pgTable("sales_order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull().default('0'),
  totalPrice: numeric("total_price").notNull().default('0'),
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
  index("idx_soi_order").on(table.orderId),
  index("idx_soi_product").on(table.productId),
  foreignKey({
    columns: [table.orderId],
    foreignColumns: [salesOrders.id],
    name: "sales_order_items_order_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
    name: "sales_order_items_product_id_fkey",
  }),
]);

export const salesOrders = pgTable("sales_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNo: varchar("order_no", { length: 50 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 200 }).notNull(),
  customerContact: varchar("customer_contact", { length: 100 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  warehouse: varchar("warehouse", { length: 50 }).notNull(),
  totalAmount: numeric("total_amount").notNull().default('0'),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  expectedShipDate: date("expected_ship_date"),
  remark: text("remark"),
  transactionId: uuid("transaction_id"),
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
  uniqueIndex("sales_orders_order_no_key").on(table.orderNo),
  index("idx_so_status").on(table.status),
  index("idx_so_created").on(table.createdAt),
  index("idx_so_warehouse").on(table.warehouse),
]);

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  contactPerson: varchar("contact_person", { length: 50 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  address: varchar("address", { length: 300 }),
  mainCategory: varchar("main_category", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default('active'),
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
  uniqueIndex("suppliers_code_key").on(table.code),
  index("idx_suppliers_status").on(table.status),
]);

export const syncLog = pgTable("sync_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  domain: varchar("domain", { length: 50 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  action: varchar("action", { length: 20 }).notNull(),
  recordId: uuid("record_id"),
  status: varchar("status", { length: 20 }).notNull(),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms").default(0),
  /**
   * @type { recordId?: string; changes?: Record<string,unknown> }
   */
  payload: jsonb("payload"),
  retryCount: integer("retry_count").notNull().default(0),
  nextRetryAt: customTimestamptz("next_retry_at", { precision: 3 }),
  progress: integer("progress").notNull().default(0),
  insertCount: integer("insert_count").notNull().default(0),
  updateCount: integer("update_count").notNull().default(0),
  skipCount: integer("skip_count").notNull().default(0),
  taskId: varchar("task_id", { length: 64 }),
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
  index("idx_sync_log_domain").on(table.domain),
  index("idx_sync_log_created").on(table.createdAt),
  index("idx_sync_log_status").on(table.status),
  index("idx_sync_log_next_retry").on(table.nextRetryAt),
  index("idx_sync_log_task_id").on(table.taskId),
]);

export const syncConfig = pgTable("sync_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  domain: varchar("domain", { length: 50 }).notNull().unique(),
  feishuAppToken: varchar("feishu_app_token", { length: 64 }).notNull(),
  tableId: varchar("table_id", { length: 64 }).notNull(),
  tableName: varchar("table_name", { length: 100 }).notNull(),
  enabled: boolean("enabled").notNull().default(false),
  autoRealtime: boolean("auto_realtime").notNull().default(false),
  bidirectional: boolean("bidirectional").notNull().default(false),
  lastSyncedAt: customTimestamptz("last_synced_at", { precision: 3 }),
  status: varchar("status", { length: 20 }).notNull().default('unconfigured'),
  errorMessage: text("error_message"),
  /**
   * @type { fieldMap?: Record<string,string>; lastSyncCursor?: string; recordMap?: Record<string,string>; lastBidirectionalSyncAt?: string }
   */
  extra: jsonb("extra"),
  pollIntervalMin: integer("poll_interval_min").notNull().default(5),
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
  uniqueIndex("sync_config_domain_key").on(table.domain),
]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 200 }),
  sortOrder: integer("sort_order").notNull().default(0),
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
  uniqueIndex("categories_name_key").on(table.name),
  index("idx_categories_sort").on(table.sortOrder),
]);

export const inventoryCheckItems = pgTable("inventory_check_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  checkId: uuid("check_id").notNull(),
  productId: uuid("product_id").notNull(),
  location: varchar("location", { length: 50 }),
  systemQuantity: integer("system_quantity").notNull().default(0),
  actualQuantity: integer("actual_quantity").default(0),
  difference: integer("difference").default(0),
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
  index("idx_ici_check").on(table.checkId),
  foreignKey({
    columns: [table.checkId],
    foreignColumns: [inventoryChecks.id],
    name: "inventory_check_items_check_id_fkey",
  }),
  foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
    name: "inventory_check_items_product_id_fkey",
  }),
]);

export const inventoryChecks = pgTable("inventory_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  warehouse: varchar("warehouse", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  checkDate: customTimestamptz("check_date", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  checkNo: varchar("check_no", { length: 50 }).unique(),
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
  index("idx_ic_warehouse").on(table.warehouse),
  uniqueIndex("idx_inventory_checks_check_no").on(table.checkNo),
]);

export const transfers = pgTable("transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  transferNo: varchar("transfer_no", { length: 50 }).notNull().unique(),
  productId: uuid("product_id").notNull(),
  sourceWarehouse: varchar("source_warehouse", { length: 50 }).notNull(),
  targetWarehouse: varchar("target_warehouse", { length: 50 }).notNull(),
  quantity: integer("quantity").notNull(),
  remark: text("remark"),
  transferDate: customTimestamptz("transfer_date", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
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
  index("idx_tr_product").on(table.productId),
  uniqueIndex("transfers_transfer_no_key").on(table.transferNo),
  foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
    name: "transfers_product_id_fkey",
  }),
]);

export const stockTransactions = pgTable("stock_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull(),
  warehouse: varchar("warehouse", { length: 50 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  subType: varchar("sub_type", { length: 50 }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").default('0'),
  totalAmount: numeric("total_amount").default('0'),
  orderNo: varchar("order_no", { length: 100 }),
  operator: varchar("operator", { length: 100 }),
  supplier: varchar("supplier", { length: 200 }),
  remark: text("remark"),
  transactionDate: customTimestamptz("transaction_date", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
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
  index("idx_st_product").on(table.productId),
  index("idx_st_warehouse").on(table.warehouse),
  index("idx_st_date").on(table.transactionDate),
  index("idx_st_order_no").on(table.orderNo),
  index("idx_st_supplier").on(table.supplier),
  index("idx_st_type_date").on(table.type, table.transactionDate),
  foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
    name: "stock_transactions_product_id_fkey",
  }),
]);

export const warehouseInventory = pgTable("warehouse_inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull(),
  warehouse: varchar("warehouse", { length: 50 }).notNull(),
  quantity: integer("quantity").notNull().default(0),
  stockValue: numeric("stock_value").notNull().default('0'),
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
  index("idx_wi_product").on(table.productId),
  index("idx_wi_warehouse").on(table.warehouse),
  uniqueIndex("idx_wi_prod_wh").on(table.productId, table.warehouse),
  foreignKey({
    columns: [table.productId],
    foreignColumns: [products.id],
    name: "warehouse_inventory_product_id_fkey",
  }),
]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  spec: varchar("spec", { length: 200 }),
  unit: varchar("unit", { length: 20 }).notNull(),
  safetyStock: integer("safety_stock").notNull().default(0),
  unitPrice: numeric("unit_price").notNull().default('0'),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  deletedAt: customTimestamptz("deleted_at", { precision: 3 }),
  deletedBy: userProfile("deleted_by"),
  supplierId: uuid("supplier_id"),
  imageUrl: text("image_url"),
  baseUnit: varchar("base_unit", { length: 20 }).notNull().default('件'),
  salesUnit: varchar("sales_unit", { length: 20 }),
  conversionRatio: numeric("conversion_ratio"),
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
  index("idx_products_supplier").on(table.supplierId),
  index("idx_products_status").on(table.status),
  index("idx_products_category").on(table.category),
  foreignKey({
    columns: [table.supplierId],
    foreignColumns: [suppliers.id],
    name: "products_supplier_id_fkey",
  }).onDelete("set null"),
]);

// table aliases
export const auditLogsTable = auditLogs;
export const backupRecordsTable = backupRecords;
export const categoriesTable = categories;
export const inventoryCheckItemsTable = inventoryCheckItems;
export const inventoryChecksTable = inventoryChecks;
export const notificationSettingsTable = notificationSettings;
export const notificationsTable = notifications;
export const productsTable = products;
export const purchaseOrderItemsTable = purchaseOrderItems;
export const purchaseOrdersTable = purchaseOrders;
export const rolesTable = roles;
export const salesOrderItemsTable = salesOrderItems;
export const salesOrdersTable = salesOrders;
export const stockTransactionsTable = stockTransactions;
export const suppliersTable = suppliers;
export const syncConfigTable = syncConfig;
export const syncLogTable = syncLog;
export const transfersTable = transfers;
export const userRolesTable = userRoles;
export const warehouseInventoryTable = warehouseInventory;
