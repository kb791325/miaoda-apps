/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, integer, numeric, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

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

export const expense = pgTable("expense", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseNo: varchar("expense_no", { length: 50 }).notNull().unique(),
  category: varchar("category", { length: 32 }).notNull(),
  amount: numeric("amount").notNull().default('0'),
  expenseDate: date("expense_date").notNull(),
  payer: varchar("payer", { length: 64 }),
  account: varchar("account", { length: 32 }).notNull(),
  approvalStatus: varchar("approval_status", { length: 16 }).notNull().default('待审批'),
  approver: varchar("approver", { length: 64 }),
  approvalTime: customTimestamptz("approval_time", { precision: 6 }),
  approvalRemark: varchar("approval_remark", { length: 255 }),
  remark: text("remark"),
  attachment: text("attachment"),
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
  uniqueIndex("idx_expense_no").on(table.expenseNo),
  index("idx_expense_date").on(table.expenseDate),
  index("idx_expense_status").on(table.approvalStatus),
]);

export const fundFlow = pgTable("fund_flow", {
  id: uuid("id").primaryKey().defaultRandom(),
  flowNo: varchar("flow_no", { length: 50 }).notNull().unique(),
  type: varchar("type", { length: 16 }).notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  amount: numeric("amount").notNull().default('0'),
  account: varchar("account", { length: 32 }).notNull(),
  relatedType: varchar("related_type", { length: 32 }),
  relatedId: varchar("related_id", { length: 100 }),
  partyName: varchar("party_name", { length: 100 }),
  flowDate: date("flow_date").notNull(),
  operator: varchar("operator", { length: 64 }),
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
  uniqueIndex("idx_fund_flow_no").on(table.flowNo),
  index("idx_fund_flow_date").on(table.flowDate),
  index("idx_fund_flow_account").on(table.account),
]);

export const reconciliation = pgTable("reconciliation", {
  id: uuid("id").primaryKey().defaultRandom(),
  reconNo: varchar("recon_no", { length: 50 }).notNull().unique(),
  type: varchar("type", { length: 20 }).notNull(),
  partyId: varchar("party_id", { length: 100 }).notNull(),
  partyName: varchar("party_name", { length: 255 }),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  totalAmount: numeric("total_amount").notNull().default('0'),
  receivedAmount: numeric("received_amount").notNull().default('0'),
  unpaidAmount: numeric("unpaid_amount").notNull().default('0'),
  status: varchar("status", { length: 20 }).notNull().default('待确认'),
  confirmedAt: customTimestamptz("confirmed_at", { precision: 3 }),
  shareToken: varchar("share_token", { length: 64 }).unique(),
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
  uniqueIndex("idx_reconciliation_no").on(table.reconNo),
  uniqueIndex("idx_reconciliation_token").on(table.shareToken),
  index("idx_reconciliation_party").on(table.partyId),
  index("idx_reconciliation_status").on(table.status),
]);

export const receiptPayment = pgTable("receipt_payment", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 10 }).notNull(),
  relatedId: uuid("related_id").notNull(),
  partyId: varchar("party_id", { length: 100 }).notNull(),
  orderNo: varchar("order_no", { length: 50 }),
  batchNo: varchar("batch_no", { length: 50 }),
  amount: numeric("amount").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  operator: userProfile("operator"),
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
  index("idx_receipt_payment_type").on(table.type),
  index("idx_receipt_payment_party").on(table.partyId),
  index("idx_receipt_payment_related").on(table.relatedId),
  index("idx_receipt_payment_date").on(table.paymentDate),
]);

export const apPayable = pgTable("ap_payable", {
  id: uuid("id").primaryKey().defaultRandom(),
  payableNo: varchar("payable_no", { length: 50 }).notNull().unique(),
  supplierId: uuid("supplier_id").notNull(),
  purchaseOrderNo: varchar("purchase_order_no", { length: 100 }),
  totalAmount: numeric("total_amount").notNull(),
  paidAmount: numeric("paid_amount").notNull().default('0'),
  unpaidAmount: numeric("unpaid_amount").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('未结清'),
  dueDate: date("due_date"),
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
  uniqueIndex("idx_ap_payable_no").on(table.payableNo),
  index("idx_ap_payable_supplier").on(table.supplierId),
  index("idx_ap_payable_status").on(table.status),
  index("idx_ap_payable_due").on(table.dueDate),
  foreignKey({
    columns: [table.supplierId],
    foreignColumns: [supplier.id],
    name: "ap_payable_supplier_id_fkey",
  }),
]);

export const arReceivable = pgTable("ar_receivable", {
  id: uuid("id").primaryKey().defaultRandom(),
  receivableNo: varchar("receivable_no", { length: 50 }).notNull().unique(),
  customerId: varchar("customer_id", { length: 100 }).notNull(),
  orderId: varchar("order_id", { length: 100 }),
  orderNo: varchar("order_no", { length: 50 }),
  totalAmount: numeric("total_amount").notNull(),
  receivedAmount: numeric("received_amount").notNull().default('0'),
  unpaidAmount: numeric("unpaid_amount").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('未结清'),
  dueDate: date("due_date"),
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
  uniqueIndex("idx_ar_receivable_no").on(table.receivableNo),
  index("idx_ar_receivable_customer").on(table.customerId),
  index("idx_ar_receivable_order").on(table.orderId),
  index("idx_ar_receivable_status").on(table.status),
  index("idx_ar_receivable_due").on(table.dueDate),
]);

export const supplier = pgTable("supplier", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierNo: varchar("supplier_no", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  contactPerson: varchar("contact_person", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  paymentTerms: varchar("payment_terms", { length: 100 }),
  creditLimit: numeric("credit_limit").notNull().default('0'),
  status: varchar("status", { length: 20 }).notNull().default('合作中'),
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
  uniqueIndex("idx_supplier_no").on(table.supplierNo),
  index("idx_supplier_status").on(table.status),
]);

export const reminderSetting = pgTable("reminder_setting", {
  id: uuid("id").primaryKey().defaultRandom(),
  template: text("template").notNull(),
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

export const followUpReminder = pgTable("follow_up_reminder", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: varchar("customer_id", { length: 100 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  ownerId: varchar("owner_id", { length: 100 }),
  ownerName: varchar("owner_name", { length: 100 }).notNull(),
  receiverId: varchar("receiver_id", { length: 100 }),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('sent'),
  errorMessage: text("error_message"),
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
  index("idx_follow_up_reminder_customer").on(table.customerId),
  index("idx_follow_up_reminder_status").on(table.status),
]);

export const opLog = pgTable("op_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 32 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  entityName: varchar("entity_name", { length: 255 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  detail: text("detail").notNull(),
  beforeValue: text("before_value"),
  afterValue: text("after_value"),
  operator: userProfile("operator").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
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
  index("idx_op_log_entity").on(table.entityType, table.entityId),
  index("idx_op_log_created").on(table.createdAt),
]);

export const orderCostSnapshot = pgTable("order_cost_snapshot", {
  orderId: varchar("order_id", { length: 100 }).primaryKey(),
  productId: varchar("product_id", { length: 100 }).notNull(),
  costPrice: numeric("cost_price").notNull().default('0'),
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
  index("idx_order_cost_snapshot_product").on(table.productId),
]);

export const orderOwner = pgTable("order_owner", {
  orderId: varchar("order_id", { length: 100 }).primaryKey(),
  ownerUserId: varchar("owner_user_id", { length: 100 }).notNull(),
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
  index("idx_order_owner_user").on(table.ownerUserId),
]);

export const appPermission = pgTable("app_permission", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
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
  uniqueIndex("idx_app_permission_code").on(table.code),
]);

export const appUser = pgTable("app_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  roleId: uuid("role_id").notNull(),
  phone: varchar("phone", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default('启用'),
  feishuUserId: varchar("feishu_user_id", { length: 64 }).unique(),
  authType: varchar("auth_type", { length: 20 }).notNull().default('password'),
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
  uniqueIndex("idx_app_user_username").on(table.username),
  index("idx_app_user_role_id").on(table.roleId),
  uniqueIndex("idx_app_user_feishu_user_id").on(table.feishuUserId),
  foreignKey({
    columns: [table.roleId],
    foreignColumns: [appRole.id],
    name: "app_user_role_id_fkey",
  }),
]);

export const appRole = pgTable("app_role", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  isSystem: boolean("is_system").notNull().default(false),
  permissions: text("permissions").array().notNull().default([]),
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
  uniqueIndex("idx_app_role_code").on(table.code),
]);

export const orderFee = pgTable("order_fee", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: varchar("order_id", { length: 100 }).notNull(),
  feeTypeId: uuid("fee_type_id").notNull(),
  feeTypeName: varchar("fee_type_name", { length: 50 }).notNull(),
  amount: numeric("amount").notNull(),
  isChargeCustomer: boolean("is_charge_customer").notNull().default(true),
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
  index("idx_order_fee_order_id").on(table.orderId),
  index("idx_order_fee_fee_type_id").on(table.feeTypeId),
]);

export const feeType = pgTable("fee_type", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  isDefault: boolean("is_default").notNull().default(false),
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
  uniqueIndex("idx_fee_type_name").on(table.name),
]);

export const syncMapping = pgTable("sync_mapping", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 32 }).notNull(),
  localId: varchar("local_id", { length: 100 }).notNull(),
  baseTableId: varchar("base_table_id", { length: 32 }).notNull(),
  baseRecordId: varchar("base_record_id", { length: 64 }).notNull(),
  lastSyncedAt: customTimestamptz("last_synced_at", { precision: 3 }),
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
  uniqueIndex("idx_sync_mapping_local").on(table.entityType, table.localId),
  uniqueIndex("idx_sync_mapping_base").on(table.entityType, table.baseRecordId),
]);

export const inventoryFlow = pgTable("inventory_flow", {
  id: uuid("id").primaryKey().defaultRandom(),
  flowNo: varchar("flow_no", { length: 50 }).notNull().unique(),
  productId: varchar("product_id", { length: 100 }).notNull(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  changeDirection: varchar("change_direction", { length: 10 }).notNull(),
  businessType: varchar("business_type", { length: 20 }).notNull(),
  quantity: integer("quantity").notNull(),
  stockBefore: integer("stock_before").notNull(),
  stockAfter: integer("stock_after").notNull(),
  orderNo: varchar("order_no", { length: 50 }).notNull(),
  shipmentNo: varchar("shipment_no", { length: 50 }).notNull(),
  operator: userProfile("operator").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  operatedAt: customTimestamptz("operated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  remark: text("remark").notNull(),
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
  uniqueIndex("idx_inventory_flow_no").on(table.flowNo),
  index("idx_inventory_flow_product").on(table.productId),
  index("idx_inventory_flow_biz").on(table.businessType),
  index("idx_inventory_flow_time").on(table.operatedAt),
]);

export const productProfile = pgTable("product_profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: varchar("product_id", { length: 100 }).notNull().unique(),
  costPrice: numeric("cost_price").notNull().default('0'),
  imageUrl: text("image_url"),
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
  uniqueIndex("idx_product_profile_product_id").on(table.productId),
]);

export const shipmentItem = pgTable("shipment_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipmentId: uuid("shipment_id").notNull(),
  orderItemId: varchar("order_item_id", { length: 100 }).notNull(),
  requiredProductId: varchar("required_product_id", { length: 100 }).notNull(),
  requiredProductName: varchar("required_product_name", { length: 255 }).notNull(),
  requiredModel: varchar("required_model", { length: 255 }).notNull(),
  requiredQuantity: integer("required_quantity").notNull().default(1),
  actualProductId: varchar("actual_product_id", { length: 100 }).notNull(),
  actualProductName: varchar("actual_product_name", { length: 255 }).notNull(),
  actualModel: varchar("actual_model", { length: 255 }).notNull(),
  shipQuantity: integer("ship_quantity").notNull().default(1),
  modelMatch: boolean("model_match").notNull().default(true),
  detailNo: varchar("detail_no", { length: 50 }).unique(),
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
  index("idx_shipment_item_shipment_id").on(table.shipmentId),
  uniqueIndex("idx_shipment_item_detail_no").on(table.detailNo),
  foreignKey({
    columns: [table.shipmentId],
    foreignColumns: [shipment.id],
    name: "shipment_item_shipment_id_fkey",
  }).onDelete("cascade"),
]);

export const shipment = pgTable("shipment", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipNo: varchar("ship_no", { length: 50 }).notNull().unique(),
  orderId: varchar("order_id", { length: 100 }).notNull(),
  orderNo: varchar("order_no", { length: 50 }).notNull(),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  shipStatus: varchar("ship_status", { length: 20 }).notNull().default('待发货'),
  outboundTime: customTimestamptz("outbound_time", { precision: 3 }),
  signTime: customTimestamptz("sign_time", { precision: 3 }),
  shipper: userProfile("shipper").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  hasModelDiff: boolean("has_model_diff").notNull().default(false),
  stockStatus: varchar("stock_status", { length: 20 }).notNull().default('none'),
  remark: text("remark").notNull(),
  installAddress: text("install_address").notNull(),
  truckDriver: text("truck_driver"),
  installContact: varchar("install_contact", { length: 100 }),
  installPhone: varchar("install_phone", { length: 50 }),
  appointmentTime: customTimestamptz("appointment_time", { precision: 3 }),
  installerId: userProfile("installer_id"),
  installStartTime: customTimestamptz("install_start_time", { precision: 3 }),
  installCompleteTime: customTimestamptz("install_complete_time", { precision: 3 }),
  installFee: numeric("install_fee"),
  installRemark: text("install_remark"),
  acceptancePhotos: text("acceptance_photos").array(),
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
  uniqueIndex("idx_shipment_ship_no").on(table.shipNo),
  index("idx_shipment_status").on(table.shipStatus),
  index("idx_shipment_model_diff").on(table.hasModelDiff),
  index("idx_shipment_order_id").on(table.orderId),
]);

export const followUp = pgTable("follow_up", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: varchar("customer_id", { length: 100 }).notNull(),
  follower: userProfile("follower"),
  followUpAt: customTimestamptz("follow_up_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  method: varchar("method", { length: 20 }).notNull().default('电话'),
  content: text("content").notNull(),
  intent: varchar("intent", { length: 20 }).notNull(),
  demandProduct: varchar("demand_product", { length: 255 }).notNull(),
  budget: numeric("budget"),
  nextFollowUpAt: customTimestamptz("next_follow_up_at", { precision: 3 }),
  stageChange: varchar("stage_change", { length: 50 }).notNull(),
  followNo: varchar("follow_no", { length: 50 }).unique(),
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
  index("idx_follow_up_customer_id").on(table.customerId),
  index("idx_follow_up_at").on(table.followUpAt),
  uniqueIndex("idx_follow_up_follow_no").on(table.followNo),
]);

export const customerCrm = pgTable("customer_crm", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: varchar("customer_id", { length: 100 }).notNull().unique(),
  grade: varchar("grade", { length: 20 }).notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  salesStage: varchar("sales_stage", { length: 50 }).notNull().default('线索'),
  owner: userProfile("owner"),
  firstContactAt: customTimestamptz("first_contact_at", { precision: 3 }),
  expectedDealAt: customTimestamptz("expected_deal_at", { precision: 3 }),
  nextFollowUpAt: customTimestamptz("next_follow_up_at", { precision: 3 }),
  lastFollowUpAt: customTimestamptz("last_follow_up_at", { precision: 3 }),
  creditLimit: numeric("credit_limit").notNull().default('0'),
  creditWarningRatio: integer("credit_warning_ratio").notNull().default(80),
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
  uniqueIndex("idx_customer_crm_customer_id").on(table.customerId),
]);

// table aliases
export const apPayableTable = apPayable;
export const appPermissionTable = appPermission;
export const appRoleTable = appRole;
export const appUserTable = appUser;
export const arReceivableTable = arReceivable;
export const customerCrmTable = customerCrm;
export const expenseTable = expense;
export const feeTypeTable = feeType;
export const followUpTable = followUp;
export const followUpReminderTable = followUpReminder;
export const fundFlowTable = fundFlow;
export const inventoryFlowTable = inventoryFlow;
export const opLogTable = opLog;
export const orderCostSnapshotTable = orderCostSnapshot;
export const orderFeeTable = orderFee;
export const orderOwnerTable = orderOwner;
export const productProfileTable = productProfile;
export const receiptPaymentTable = receiptPayment;
export const reconciliationTable = reconciliation;
export const reminderSettingTable = reminderSetting;
export const shipmentTable = shipment;
export const shipmentItemTable = shipmentItem;
export const supplierTable = supplier;
export const syncMappingTable = syncMapping;
