export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  pageToken?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  keyword?: string;
  [key: string]: any;
}

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  phone?: string;
  email?: string;
  department: string;
  position: string;
  role: 'admin' | 'manager' | 'sales' | 'finance' | 'hr' | 'admin_staff';
  data_scope: 'all' | 'department' | 'self';
  status: string;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore?: boolean;
  nextPageToken?: string;
}

// 客户
export interface Customer {
  id: number;
  customer_no: string;
  customer_name: string;
  group_name: string;
  primary_industry: string;
  secondary_industry: string;
  level: string;
  owner_id: number;
  department: string;
  status: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  remark?: string;
  creator_id?: number;
  created_at: string;
  updated_at: string;
}

// 公海客资
export interface PublicLead {
  id: number;
  lead_no: string;
  entity_name: string;
  lead_level: string;
  primary_industry: string;
  secondary_industry: string;
  assign_status: string;
  assigned_to?: number;
  assigned_name?: string;
  pool_reason?: string;
  remark?: string;
  source?: string;
  creator_id?: number;
  created_at: string;
  updated_at: string;
}

export interface UserItem {
  id: number;
  username: string;
  name: string;
  phone: string;
  email: string;
  department: string;
  position: string;
  role: string;
  data_scope?: string;
  avatar?: string;
  status?: string;
}

// 线索
export interface Lead {
  id: number;
  lead_no: string;
  lead_name: string;
  company_name?: string;
  source?: string;
  status: string;
  owner_id?: number;
  phone?: string;
  email?: string;
  remark?: string;
  last_follow_at?: string;
  creator_id?: number;
  created_at: string;
  updated_at: string;
}

export interface FollowUp {
  id: number;
  content?: string;
  follow_type?: string;
  next_follow_at?: string;
  creator_id?: number;
  creator_name?: string;
  created_at: string;
}

// 开户申请
export interface AccountApplication {
  id: number;
  apply_no: string;
  group_name?: string;
  entity_name?: string;
  port?: string;
  industry?: string;
  apply_amount: number;
  status: string;
  applicant_id?: number;
  applicant_department?: string;
  remark?: string;
  current_approver_id?: number;
  approved_at?: string;
  reject_step?: 'manager' | 'finance' | 'gm';
  reject_reason?: string;
  created_at: string;
  updated_at: string;
}

// 采购申请
interface PurchaseItem {
  name: string;
  spec?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PurchaseRequisition {
  id: number;
  req_no: string;
  reason: string;
  applicant_id?: number;
  applicant_name: string;
  department: string;
  items: PurchaseItem[];
  total_amount: number;
  expected_date?: string;
  remark?: string;
  status: string;
  current_step?: number;
  reject_step?: string;
  reject_reason?: string;
  generated_order?: boolean | number;
  created_at: string;
  updated_at: string;
}

// 报备
export interface Filing {
  id: number;
  filing_no: string;
  group_name?: string;
  entity_name?: string;
  port?: string;
  filing_type?: string;
  filing_amount: number;
  status: string;
  filer_id?: number;
  created_at: string;
  updated_at: string;
}

// 转户
export interface Transfer {
  id: number;
  transfer_no: string;
  group_name?: string;
  entity_name?: string;
  from_port?: string;
  to_port?: string;
  transfer_amount: number;
  status: string;
  applicant_id?: number;
  created_at: string;
  updated_at: string;
}

// 提成
export interface AdCommission {
  id: number;
  commission_no: string;
  sales_id?: number;
  sales_name: string;
  department?: string;
  performance_amount: number;
  commission_ratio: number;
  commission_amount: number;
  settle_month: string;
  status: string;
  created_at: string;
}

// 客户流水
export interface CustomerTransaction {
  _id: string;
  id: number;
  serial_no: string;
  customer_id?: number;
  customer_name: string;
  entity_name: string;
  tx_type: string;
  income_amount: number;
  expense_amount: number;
  balance: number;
  remark?: string;
  created_at: string;
}

// 收款
export interface Payment {
  id: number;
  receipt_no: string;
  customer_id?: number;
  customer_name: string;
  receipt_amount: number;
  receipt_method?: string;
  receipt_account?: string;
  status: string;
  remark?: string;
  created_at: string;
}

// 充值
export interface Recharge {
  id: number;
  recharge_no: string;
  customer_id?: number;
  customer_name: string;
  entity_name: string;
  port?: string;
  recharge_amount: number;
  bonus_amount: number;
  arrived_amount: number;
  status: string;
  operator_id?: number;
  recharged_at?: string;
  created_at: string;
}

// 退款
export interface Refund {
  id: number;
  refund_no: string;
  customer_id?: number;
  customer_name: string;
  refund_amount: number;
  refund_reason?: string;
  refund_method?: string;
  status: string;
  applicant_id?: number;
  approver_id?: number;
  approve_comment?: string;
  approved_at?: string;
  created_at: string;
}

// 消耗
export interface Consumption {
  id: number;
  consume_no: string;
  customer_id?: number;
  customer_name: string;
  port?: string;
  department?: string;
  sales_id?: number;
  sales_name: string;
  consume_amount: number;
  grant_consume: number;
  cash_consume: number;
  consume_date: string;
  created_at: string;
}

// 垫款
export interface Advance {
  id: number;
  advance_no: string;
  customer_id?: number;
  customer_name: string;
  advance_amount: number;
  advance_reason?: string;
  advance_date?: string;
  expected_return_date?: string;
  status: string;
  returned_amount: number;
  owner_id?: number;
  created_at: string;
}

// 发票
export interface Invoice {
  id: number;
  invoice_no: string;
  customer_id?: number;
  customer_name: string;
  invoice_type: string;
  invoice_amount: number;
  tax_rate: number;
  tax_amount: number;
  title?: string;
  tax_number?: string;
  status: string;
  invoice_date?: string;
  operator_id?: number;
  created_at: string;
}

// 端口账户
export interface PortAccount {
  id: number;
  port_name: string;
  port_type: string;
  balance: number;
  grant_balance: number;
  total_consume: number;
  total_recharge: number;
  status: string;
  updated_at: string;
}

// 银行账户
export interface BankAccount {
  _id: string;
  id: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  account_type: string;
  balance: number;
  status: string;
  updated_at: string;
}

// 成本
export interface Cost {
  _id: string;
  id: number;
  cost_type: string;
  related_customer?: string;
  amount: number;
  department?: string;
  occur_date?: string;
  remark?: string;
  creator_id?: number;
  created_at: string;
}

// 收入
export interface Income {
  _id: string;
  id: number;
  income_type: string;
  customer_name: string;
  amount: number;
  receipt_status: string;
  income_date?: string;
  remark?: string;
  creator_id?: number;
  created_at: string;
}

// 支出
export interface Expense {
  _id: string;
  id: number;
  expense_no?: string;
  expense_type: string;
  expense_reason?: string;
  amount: number;
  applicant_id?: number;
  applicant?: string;
  approval_status: string;
  approver_id?: number;
  expense_date?: string;
  remark?: string;
  created_at: string;
}

// 审批
export interface ApprovalStep {
  id: number;
  instance_id: number;
  step_order: number;
  step_name: string;
  approver_id?: number;
  approver_name?: string;
  status: string;
  comment?: string;
  approved_at?: string;
  created_at: string;
}

export interface TodoItem extends ApprovalStep {
  business_type: string;
  business_id: number;
  title: string;
  applicant_id: number;
  applicant_name: string;
  instance_status: string;
  current_step: number;
  instance_created_at: string;
  amount?: number;
  is_initiated_by_me?: boolean;
  my_action?: 'approved' | 'rejected' | null;
  my_comment?: string | null;
  my_operated_at?: string | null;
  approval_steps?: ApprovalStep[];
}

// 工作台
export interface DashboardSummary {
  yesterdayConsume: number;
  yesterdayBonus: number;
  weekConsume: number;
  monthConsume: number;
  newOpenThisMonth: number;
  dayGrowth: number;
  weekGrowth: number;
  monthGrowth: number;
  newOpenGrowth: number;
  updateTime: string;
}

export interface DashboardRealtime {
  categories: Record<string, number>;
  total: number;
  updateTime: string;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface DashboardCharts {
  groupPie: ChartData[];
  salesBar: ChartData[];
  portPie: ChartData[];
  deptPie: ChartData[];
  portProfit: ChartData[];
  trendLine: { date: string; value: number }[];
  timeDimension: string;
}

export interface RankItem {
  rank: number;
  name: string;
  total_consume?: number;
  [key: string]: any;
}

export interface DashboardRankings {
  salesRank: RankItem[];
  groupRank: RankItem[];
  portRank: RankItem[];
  industryRank: RankItem[];
  newOpenRank: RankItem[];
}

export interface TargetItem {
  department: string;
  yearTarget: number;
  yearDone: number;
  yearRate: number;
  monthTarget: number;
  monthDone: number;
  monthRate: number;
}

export interface PerformanceItem {
  id: number;
  name: string;
  department: string;
  position: string;
  score: number;
  level: string;
  taskCount: number;
  confirmedCount: number;
}

// 员工档案（人资管理）
export interface Employee {
  id: number;
  employee_no: string;
  name: string;
  gender?: string;
  department?: string;
  position?: string;
  phone?: string;
  email?: string;
  join_date?: string;
  contract_expire_date?: string;
  address?: string;
  perf_std?: number | null;
  status: string;
  created_at?: string;
}

// 固定资产
export interface Asset {
  id: number;
  asset_no: string;
  asset_name: string;
  category?: string;
  spec?: string;
  amount: number;
  department?: string;
  user_name?: string;
  status: string;
  purchase_date?: string;
  created_at?: string;
}

// 库存物资
export interface Inventory {
  id: number;
  material_name: string;
  category?: string;
  unit?: string;
  stock_quantity: number;
  warning_quantity: number;
  location?: string;
  remark?: string;
  created_at?: string;
}

// 入库记录
export interface StockIn {
  id: number;
  stock_in_no: string;
  material_name: string;
  category?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  supplier?: string;
  in_date?: string;
  operator_name?: string;
  created_at?: string;
}

// 领用记录
export interface Requisition {
  id: number;
  requisition_no: string;
  material_name: string;
  quantity: number;
  applicant_name?: string;
  department?: string;
  purpose?: string;
  apply_date?: string;
  status: string;
  created_at?: string;
}

// 归还记录（避开 DOM 的 Return 命名）
export interface ReturnRecord {
  id: number;
  return_no: string;
  material_name: string;
  quantity: number;
  returner_name?: string;
  department?: string;
  return_date?: string;
  condition?: string;
  status: string;
  created_at?: string;
}

// 盘点记录
export interface InventoryCheck {
  id: number;
  check_no: string;
  check_date?: string;
  check_range?: string;
  checker_name?: string;
  system_count: number;
  actual_count: number;
  diff_count: number;
  status: string;
  remark?: string;
  created_at?: string;
}

export interface DashboardPerformance {
  avgScore: number;
  totalEmployees: number;
  totalTasks: number;
  totalConfirmed: number;
  pendingCount: number;
  perfList: PerformanceItem[];
}
