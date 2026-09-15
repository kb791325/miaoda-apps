/**
 * 财务合同域共享类型：往来账款（应收/应付）、收付款、对账单、供应商。
 * 金额字段在接口层统一为 number（服务端将 numeric 转换后返回）。
 */

export type LedgerStatus = '未结清' | '部分结清' | '已结清' | '已作废';

export const LEDGER_STATUSES: LedgerStatus[] = [
  '未结清',
  '部分结清',
  '已结清',
  '已作废',
];

export type ReceiptType = '收款' | '付款';

export type PaymentMethod = '现金' | '银行转账' | '微信' | '支付宝' | '其他';

export const PAYMENT_METHODS: PaymentMethod[] = [
  '现金',
  '银行转账',
  '微信',
  '支付宝',
  '其他',
];

export type ReconType = '客户对账' | '供应商对账';

export const RECON_TYPES: ReconType[] = ['客户对账', '供应商对账'];

export type ReconStatus = '待确认' | '已确认';

export type SupplierStatus = '合作中' | '已停用';

/* ---------------- 应收账款 ---------------- */

export interface ArReceivableItem {
  id: string;
  receivableNo: string;
  customerId: string;
  customerName: string;
  orderId: string | null;
  orderNo: string | null;
  totalAmount: number;
  receivedAmount: number;
  unpaidAmount: number;
  status: LedgerStatus;
  dueDate: string | null;
  remark: string | null;
  createdAt: string;
  overdueDays: number;
  overLimit: boolean;
}

export interface LedgerSummary {
  totalAmount: number;
  receivedAmount: number;
  unpaidAmount: number;
  openCount: number;
}

export interface ArListParams {
  customerId?: string;
  status?: string;
  dueStart?: string;
  dueEnd?: string;
  keyword?: string;
  overdue?: string;
  aging?: string;
  overLimit?: string;
  page?: number;
  pageSize?: number;
}

export interface ArListResponse {
  items: ArReceivableItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: LedgerSummary;
}

export interface UpdateArRequest {
  dueDate?: string | null;
  remark?: string;
}

export interface ArDetail extends ArReceivableItem {
  receipts: ReceiptPaymentRecord[];
}

/* ---------------- 应付账款 ---------------- */

export interface ApPayableItem {
  id: string;
  payableNo: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderNo: string | null;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  status: LedgerStatus;
  dueDate: string | null;
  remark: string | null;
  createdAt: string;
}

export interface ApListParams {
  supplierId?: string;
  status?: string;
  dueStart?: string;
  dueEnd?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface ApListResponse {
  items: ApPayableItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: LedgerSummary;
}

export interface CreateApRequest {
  supplierId: string;
  purchaseOrderNo?: string;
  totalAmount: number;
  dueDate?: string;
  remark?: string;
}

export interface UpdateApRequest {
  dueDate?: string | null;
  remark?: string;
}

export interface ApDetail extends ApPayableItem {
  payments: ReceiptPaymentRecord[];
}

/* ---------------- 收付款记录 ---------------- */

export interface ReceiptPaymentRecord {
  id: string;
  type: ReceiptType;
  relatedId: string;
  relatedNo: string;
  partyId: string;
  partyName: string;
  orderNo: string | null;
  batchNo: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  operatorName: string;
  remark: string | null;
  createdAt: string;
}

export interface ReceiptDetail extends ReceiptPaymentRecord {
  relatedStatus: LedgerStatus | null;
  relatedTotalAmount: number | null;
  relatedReceivedAmount: number | null;
  relatedUnpaidAmount: number | null;
}

export interface CreateReceiptItem {
  relatedId: string;
  amount: number;
}

export interface CreateReceiptRequest {
  type: ReceiptType;
  partyId: string;
  items: CreateReceiptItem[];
  paymentMethod: PaymentMethod;
  paymentDate: string;
  remark?: string;
}

export interface CreateReceiptResponse {
  successCount: number;
  batchNo: string;
  totalAmount: number;
}

export interface ReceiptListParams {
  type?: string;
  partyId?: string;
  paymentMethod?: string;
  dateStart?: string;
  dateEnd?: string;
  page?: number;
  pageSize?: number;
}

export interface ReceiptListResponse {
  items: ReceiptPaymentRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalAmount: number;
}

/* ---------------- 对账单 ---------------- */

export interface ReconciliationItem {
  id: string;
  reconNo: string;
  type: ReconType;
  partyId: string;
  partyName: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  receivedAmount: number;
  unpaidAmount: number;
  status: ReconStatus;
  confirmedAt: string | null;
  remark: string | null;
  createdAt: string;
}

export interface ReconListParams {
  type?: string;
  status?: string;
  periodStart?: string;
  periodEnd?: string;
  page?: number;
  pageSize?: number;
}

export interface ReconListResponse {
  items: ReconciliationItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReconLedgerRow {
  ledgerNo: string;
  orderNo: string;
  totalAmount: number;
  settledAmount: number;
  unpaidAmount: number;
  status: LedgerStatus;
  createdAt: string;
}

export interface ReconPreviewRequest {
  type: ReconType;
  partyId: string;
  periodStart: string;
  periodEnd: string;
}

export interface ReconPreviewResponse {
  partyName: string;
  totalAmount: number;
  receivedAmount: number;
  unpaidAmount: number;
  ledgerRows: ReconLedgerRow[];
  paymentRows: ReceiptPaymentRecord[];
}

export interface ReconciliationDetail extends ReconciliationItem {
  shareToken: string | null;
  ledgerRows: ReconLedgerRow[];
  paymentRows: ReceiptPaymentRecord[];
}

export interface ReconShareView {
  reconNo: string;
  type: ReconType;
  partyName: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  receivedAmount: number;
  unpaidAmount: number;
  status: ReconStatus;
  confirmedAt: string | null;
  ledgerRows: ReconLedgerRow[];
  paymentRows: ReceiptPaymentRecord[];
}

/* ---------------- 供应商 ---------------- */

export interface SupplierItem {
  id: string;
  supplierNo: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  paymentTerms: string | null;
  creditLimit: number;
  status: SupplierStatus;
  remark: string | null;
  createdAt: string;
}

export interface CreateSupplierRequest {
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  creditLimit?: number;
  remark?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  paymentTerms?: string;
  creditLimit?: number;
  remark?: string;
}

export interface SupplierListParams {
  status?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface SupplierListResponse {
  items: SupplierItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SupplierDetail extends SupplierItem {
  payableSummary: LedgerSummary;
  payables: ApPayableItem[];
}

export interface SupplierOption {
  id: string;
  name: string;
}

/* ---------------- 资金流水 ---------------- */

export type FundFlowType = '收入' | '支出' | '转账';

export const FUND_FLOW_TYPES: FundFlowType[] = ['收入', '支出', '转账'];

export type FundFlowCategory =
  | '销售收款'
  | '采购付款'
  | '费用支出'
  | '其他收入'
  | '其他支出';

export const FUND_FLOW_CATEGORIES: FundFlowCategory[] = [
  '销售收款',
  '采购付款',
  '费用支出',
  '其他收入',
  '其他支出',
];

export type FundAccount = '现金' | '银行账户' | '微信' | '支付宝';

export const FUND_ACCOUNTS: FundAccount[] = [
  '现金',
  '银行账户',
  '微信',
  '支付宝',
];

export interface FundFlowItem {
  id: string;
  flowNo: string;
  type: FundFlowType;
  category: FundFlowCategory;
  amount: number;
  account: FundAccount;
  relatedType: string | null;
  relatedId: string | null;
  partyName: string | null;
  flowDate: string;
  operatorName: string;
  remark: string | null;
  createdAt: string;
}

export interface FundFlowListParams {
  account?: string;
  type?: string;
  category?: string;
  dateStart?: string;
  dateEnd?: string;
  page?: number;
  pageSize?: number;
}

export interface FundFlowSummary {
  openingBalance: number;
  incomeAmount: number;
  expenseAmount: number;
  closingBalance: number;
}

export interface FundFlowListResponse {
  items: FundFlowItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: FundFlowSummary;
}

export interface CreateFundFlowRequest {
  category: FundFlowCategory;
  amount: number;
  account: FundAccount;
  flowDate: string;
  partyName?: string;
  remark?: string;
}

/* ---------------- 独立费用管理 ---------------- */

export type ExpenseCategory =
  | '房租'
  | '水电'
  | '工资'
  | '办公费'
  | '差旅费'
  | '营销费'
  | '其他';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  '房租',
  '水电',
  '工资',
  '办公费',
  '差旅费',
  '营销费',
  '其他',
];

export type ExpenseApprovalStatus = '待审批' | '已审批' | '已驳回';

export const EXPENSE_APPROVAL_STATUSES: ExpenseApprovalStatus[] = [
  '待审批',
  '已审批',
  '已驳回',
];

export interface ExpenseItem {
  id: string;
  expenseNo: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  payerId: string | null;
  payerName: string;
  account: FundAccount;
  approvalStatus: ExpenseApprovalStatus;
  approverName: string | null;
  approvalTime: string | null;
  approvalRemark: string | null;
  remark: string | null;
  attachmentUrl: string | null;
  createdAt: string;
}

export interface ExpenseSummary {
  totalAmount: number;
  approvedAmount: number;
  pendingCount: number;
}

export interface ExpenseListParams {
  category?: string;
  approvalStatus?: string;
  dateStart?: string;
  dateEnd?: string;
  page?: number;
  pageSize?: number;
}

export interface ExpenseListResponse {
  items: ExpenseItem[];
  total: number;
  page: number;
  pageSize: number;
  summary: ExpenseSummary;
}

export interface CreateExpenseRequest {
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  payerId?: string;
  account: FundAccount;
  remark?: string;
  attachmentUrl?: string;
}

export interface UpdateExpenseRequest {
  category?: ExpenseCategory;
  amount?: number;
  expenseDate?: string;
  payerId?: string;
  account?: FundAccount;
  remark?: string;
  attachmentUrl?: string;
}

export interface ApproveExpenseRequest {
  approve: boolean;
  remark?: string;
}

/* ---------------- 信用额度与逾期 ---------------- */

export interface CustomerCreditView {
  creditLimit: number;
  warningRatio: number;
  unpaidAmount: number;
  usedRatio: number;
  remaining: number;
  overLimit: boolean;
  warning: boolean;
}

export interface UpdateCustomerCreditRequest {
  creditLimit?: number;
  warningRatio?: number;
}

export type AgingBucket = '0-30' | '31-60' | '61-90' | '90+';

export interface AgingBucketStat {
  bucket: AgingBucket;
  amount: number;
  count: number;
}

export interface OverdueSummary {
  overdueAmount: number;
  overdueCount: number;
  buckets: AgingBucketStat[];
}
