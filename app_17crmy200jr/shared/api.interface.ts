export type AssetStatus =
  | 'in_stock'
  | 'in_use'
  | 'idle'
  | 'repairing'
  | 'transferring'
  | 'scrapped';

export type AssetOperationType =
  | 'borrow'
  | 'return'
  | 'transfer'
  | 'repair_start'
  | 'repair_complete'
  | 'scrap'
  | 'status_change';

export interface AssetOperationRecord {
  id: string;
  assetId: string;
  operationType: AssetOperationType;
  fromStatus?: AssetStatus;
  toStatus?: AssetStatus;
  operatorId: string;
  targetUserId?: string;
  targetDepartment?: string;
  targetFloor?: string;
  startDate?: string;
  expectedDate?: string;
  actualDate?: string;
  reason?: string;
  remark?: string;
  cost?: number;
  vendor?: string;
  createdAt: string;
}

export type AssetType = string;

export type InventoryTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'abnormal';

export type InventoryCheckStatus =
  | 'unchecked'
  | 'pending'
  | 'checked'
  | 'confirmed'
  | 'abnormal';

export type ScopeType =
  | 'all'
  | 'department'
  | 'owner'
  | 'floor'
  | 'asset_type';

export type SyncDirection = 'bidirectional' | 'push' | 'pull';

export type SyncStatus = 'success' | 'failed' | 'syncing';

export interface PagedResponse<T> {
  items: T[];
  total: number;
}

export interface BatchOperationResult {
  successCount: number;
  failedCount: number;
  failedItems: Array<{ id: string; reason: string }>;
}

export interface UserProfileDto {
  userId: string;
  name: string;
}

export interface CategoryItem {
  id: string;
  categoryL1: string;
  categoryL2: string;
  sortOrder: number;
}

export interface CategoryL1Item {
  id: string;
  categoryL1: string;
  childCount: number;
}

export interface CategoryOption {
  categoryL1: string;
  children: Array<{ categoryL2: string }>;
}

export interface ExpenseItem {
  id: string;
  expenseDate: string;
  amount: number;
  categoryL1: string;
  categoryL2: string;
  payerEntity: string;
  floor: string;
  department: string;
  handler: string;
  description: string;
  invoiceUrl: string;
  screenshotUrl: string;
}

export interface ExpenseDetail extends ExpenseItem {
  purchaseDepartment: string;
  handlerDetail: UserProfileDto;
  year: number;
  month: number;
  quarter: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseListResponse extends PagedResponse<ExpenseItem> {
  summary: { totalAmount: number };
}

export interface ExpenseAssetLinkDto {
  assetName: string;
  assetType: AssetType;
  owner: string;
  currentStock: number;
}

export interface CreateExpenseDto {
  expenseDate: string;
  amount: number;
  description: string;
  categoryL1: string;
  categoryL2: string;
  payerEntity: string;
  floor: string;
  department: string;
  purchaseDepartment: string;
  handler: string;
  invoiceUrl?: string;
  screenshotUrl?: string;
  createAsset?: boolean;
  asset?: ExpenseAssetLinkDto;
}

export interface FixedAssetItem {
  id: string;
  assetName: string;
  assetType: AssetType;
  assetCategory: string;
  purchaseDate: string;
  purchaseAmount: number;
  owner: string;
  floor: string;
  currentStock: number;
  assetStatus: AssetStatus;
  netValue: number;
}

export interface FixedAssetDetail {
  id: string;
  assetName: string;
  assetType: AssetType;
  assetCategory: string;
  purchaseDate: string;
  purchaseAmount: number;
  purchaseDepartment: string;
  payerEntity: string;
  floor: string;
  handler: UserProfileDto;
  owner: UserProfileDto;
  lastCheckDate: string;
  currentStock: number;
  assetStatus: AssetStatus;
  expectedReturnDate?: string;
  originalValue: number;
  accumulatedDepreciation: number;
  monthlyDepreciation: number;
  netValue: number;
  depreciationMonths: number;
  operationHistory: AssetOperationRecord[];
}

export interface AssetSummary {
  totalCount: number;
  totalValue: number;
  inStockCount: number;
  inUseCount: number;
}

export interface CreateFixedAssetDto {
  assetName: string;
  assetType: AssetType;
  assetCategory: string;
  purchaseDate: string;
  purchaseAmount: number;
  purchaseDepartment: string;
  payerEntity: string;
  floor: string;
  handler: string;
  owner: string;
  currentStock: number;
}

export interface AssetUserOption {
  id: string;
  name: string;
}

export interface CheckHistoryItem {
  id: string;
  checkDate: string;
  checker: string;
  actualQuantity: number;
  difference: number;
  status: string;
  checkNo: string;
}

export interface InventoryTaskItem {
  id: string;
  taskNo: string;
  checkYear: number;
  checkMonth: string;
  checker?: string;
  status: InventoryTaskStatus;
  progress: number;
  totalCount: number;
  checkedCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface InventoryCheckItem {
  id: string;
  assetId: string;
  assetName: string;
  assetType: string;
  owner: string;
  bookQuantity: number;
  actualQuantity: number | null;
  difference: number | null;
  status: InventoryCheckStatus;
  remark: string;
  isAbnormal: boolean;
}

export interface CreateInventoryTaskDto {
  taskName?: string;
  checkYear: number;
  checkMonth: string;
  checker?: string;
  scopeType: ScopeType;
  scopeValue?: string[];
  assetType?: string;
  floor?: string;
  department?: string;
  remark?: string;
}

export interface CreateInventoryTaskResponse {
  id: string;
  taskNo: string;
  totalCount: number;
}

export interface InventoryTaskDetail extends InventoryTaskItem {
  checks?: InventoryCheckItem[];
  abnormalCount: number;
  scopeType: ScopeType;
  scopeValue?: string[];
  remark?: string;
}

export interface UpdateInventoryCheckDto {
  actualQuantity: number;
  remark?: string;
}

export interface UpdateCheckResponse {
  id: string;
  actualQuantity: number;
  difference: number;
  status: string;
  isAbnormal: boolean;
  remark: string;
}

export interface ConfirmDiffDto {
  confirmType: 'profit' | 'loss' | 'adjust';
  adjustStock?: number;
  remark?: string;
}

export interface UserSearchItem {
  id: string;
  name: string;
  avatar?: string;
  department?: string;
}

export interface UserSearchResponse {
  items: UserSearchItem[];
}

export interface ConfirmDiffResponse {
  success: boolean;
  newStock?: number;
}

export interface CompleteTaskResponse {
  success: boolean;
  checkedCount: number;
  totalCount: number;
  abnormalCount: number;
  surplusTotal: number;
  lossTotal: number;
  updatedAssetCount: number;
  unmatchedAssetCount: number;
}

export interface BatchResetChecksResponse {
  success: boolean;
  resetCount: number;
}

export interface BatchClearTasksResponse {
  success: boolean;
  deletedCount: number;
}

export interface TaskNoResponse {
  taskNo: string;
}

export interface DashboardExpenseOverview {
  monthlyTotal: number;
  monthlyCount: number;
  yearlyTotal: number;
  yearOnYearGrowth: number;
  monthOnMonthGrowth: number;
}

export interface DashboardTrendItem {
  month: string;
  amount: number;
  count: number;
}

export interface DashboardCategoryItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface DashboardEntityItem {
  entity: string;
  amount: number;
}

export interface DashboardFloorItem {
  floor: string;
  amount: number;
}

export interface DashboardDepartmentItem {
  department: string;
  amount: number;
}

export interface DashboardBudgetExecutionItem {
  month: string;
  budget: number;
  actual: number;
  executionRate: number;
}

export interface DashboardRankingItem {
  name: string;
  amount: number;
}

export interface DashboardExpenseRanking {
  byDepartment: DashboardRankingItem[];
  byCategory: DashboardRankingItem[];
  byHandler: DashboardRankingItem[];
}

export interface DashboardAssetStatusItem {
  status: string;
  count: number;
  value: number;
}

export interface DashboardAssetDepreciation {
  originalValue: number;
  accumulatedDepreciation: number;
  netValue: number;
  monthlyDepreciation: number;
}

export interface DashboardRepairAssetItem {
  id: string;
  assetName: string;
  assetType: string;
  status: string;
  repairReason?: string;
  repairDate?: string;
}

export interface DashboardAssetOverview {
  totalCount: number;
  totalValue: number;
  inStockCount: number;
  inUseCount: number;
}

//  ============================================================
//  预算
//  ============================================================

export interface DashboardInventorySummary {
  totalAssets: number;
  pendingTasks: number;
  abnormalCount: number;
  checkedRate: number;
}

export interface DashboardInventoryFloorItem {
  floor: string;
  total: number;
  checked: number;
  rate: number;
}

// ============================================================
// 盘点看板
// ============================================================

export interface InventoryOverview {
  totalAssets: number;
  checkedThisMonth: number;
  uncheckedCount: number;
  abnormalCount: number;
  completionRate: number;
  overdueCount: number;
}

export type OwnerMatrixStatus = 'checked' | 'unchecked' | 'abnormal';

export interface OwnerMatrixMonthItem {
  month: number;
  status: OwnerMatrixStatus;
  checkDate?: string;
  checker?: string;
}

export interface OwnerMatrixRow {
  ownerId: string;
  ownerName: string;
  department: string;
  assetCount: number;
  monthly: OwnerMatrixMonthItem[];
}

export interface TimelineOwner {
  ownerId: string;
  ownerName: string;
  department: string;
  assetCount: number;
  lastCheckDate: string;
  daysSinceLastCheck: number;
  nextSuggestedDate: string;
  statusLabel?: string;
  statusLevel?: 'normal' | 'warning' | 'overdue';
}

export interface StockByType {
  assetType: string;
  count: number;
  value: number;
  suggestedPurchase: number;
}

export interface StockTopOwner {
  ownerId: string;
  ownerName: string;
  count: number;
}

export interface StockOverview {
  byType: StockByType[];
  totalValue: number;
  topOwners: StockTopOwner[];
}

export interface StockTrendMonthType {
  assetType: string;
  count: number;
}

export interface StockTrendItem {
  month: string;
  byType: StockTrendMonthType[];
}

export interface AbnormalCheckItem {
  id: string;
  ownerName: string;
  assetName: string;
  assetType: string;
  bookQuantity: number;
  actualQuantity: number;
  difference: number;
  checkDate: string;
  status: string;
}

// ============================================================
// 审计日志
// ============================================================

export type AuditLogStatus = 'success' | 'failure';

export interface AuditLogItem {
  id: string;
  traceId: string;
  operator: string;
  operatorName?: string;
  department?: string;
  module: string;
  operationType: string;
  targetType: string;
  targetId: string;
  targetName?: string;
  status: AuditLogStatus;
  duration: number;
  ipAddress: string;
  userAgent?: string;
  method: string;
  path: string;
  description?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface AuditLogDetail extends AuditLogItem {
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  changedFields?: string[];
  requestParams?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
}

export interface AuditLogListParams {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  module?: string;
  operationType?: string;
  status?: AuditLogStatus;
  operator?: string;
  keyword?: string;
}

export interface AuditLogListResponse extends PagedResponse<AuditLogItem> {
  page: number;
  pageSize: number;
}

export interface AuditLogStats {
  totalOperations: number;
  successCount: number;
  failureCount: number;
  todayOperations: number;
}

export interface AuditDailySummary {
  date: string;
  total: number;
  successCount: number;
  failureCount: number;
}

export interface AuditDailySummaryResponse {
  items: AuditDailySummary[];
  summary: AuditLogStats;
}

export interface AuditModuleStat {
  module: string;
  count: number;
  successCount: number;
  failureCount: number;
}

export interface AuditUserStat {
  userId: string;
  userName: string;
  count: number;
  successCount: number;
  failureCount: number;
}

export interface AuditTrendItem {
  date: string;
  total: number;
  successCount: number;
  failureCount: number;
}

export interface AuditTypeDistribution {
  operationType: string;
  count: number;
}

export interface AuditModuleDistribution {
  module: string;
  count: number;
}

export interface AuditTopTarget {
  targetType: string;
  targetId: string;
  targetName: string;
  count: number;
}

// ============================================================
// 操作日志
// ============================================================

export interface OperationLogItem {
  id: string;
  operator: string;
  operationType: string;
  targetType: string;
  content: string;
  ipAddress: string;
  createdAt: string;
}

export interface OperationLogListResponse extends PagedResponse<OperationLogItem> {
  page: number;
  pageSize: number;
}

export interface OperationLogDetail extends OperationLogItem {
  targetId: string;
}

export interface OperationLogStatItem {
  operationType: string;
  count: number;
}

// ============================================================
// RBAC 角色与权限
// ============================================================

export interface MenuPermissions {
  expenses?: boolean;
  fixedAssets?: boolean;
  inventory?: boolean;
  categories?: boolean;
  reports?: boolean;
  settings?: boolean;
  budget?: boolean;
  roles?: boolean;
  audit?: boolean;
  notifications?: boolean;
}

export type DataScope = 'personal' | 'department' | 'all';

export interface DataPermissions {
  expenses?: DataScope;
  fixedAssets?: DataScope;
  inventory?: DataScope;
}

export interface OperationPermissionItem {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  export?: boolean;
  import?: boolean;
}

export interface OperationPermissions {
  expenses?: OperationPermissionItem;
  fixedAssets?: OperationPermissionItem;
  inventory?: Omit<OperationPermissionItem, 'import'>;
}

export interface Role {
  id: string;
  roleCode: string;
  roleName: string;
  roleDescription?: string;
  isSystem: boolean;
  isActive: boolean;
  menuPermissions: MenuPermissions;
  dataPermissions: DataPermissions;
  operationPermissions: OperationPermissions;
  createdAt: string;
  updatedAt: string;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  isActive: boolean;
}

export interface UserPermissions {
  menuPermissions: MenuPermissions;
  dataPermissions: DataPermissions;
  operationPermissions: OperationPermissions;
}

export interface RoleUserItem {
  id: string;
  userId: string;
  userName: string;
  department: string;
  email?: string;
  roleIds: string[];
  isActive: boolean;
  createdAt: string;
}

export interface RoleWithUserCount extends Role {
  userCount: number;
}

export interface UserListResponse {
  items: RoleUserItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================
// 预算管理
// ============================================================

export interface Budget {
  id: string;
  budgetYear: number;
  budgetMonth: string;
  department: string;
  budgetAmount: number;
  usedAmount: number;
  isOverridden: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAdjustment {
  id: string;
  budgetId: string;
  oldAmount: number;
  newAmount: number;
  adjustReason?: string;
  createdAt: string;
}

export interface BudgetListResponse {
  items: Budget[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BudgetExecutionItem {
  department: string;
  budgetAmount: number;
  usedAmount: number;
  remainingAmount: number;
  executionRate: number;
  status: 'normal' | 'warning' | 'overrun';
}

export interface BudgetExecutionResponse {
  items: BudgetExecutionItem[];
  totalBudget: number;
  totalUsed: number;
  overallExecutionRate: number;
}

export interface OverrunCheckResponse {
  isOverrun: boolean;
  budgetAmount: number;
  usedAmount: number;
  remainingAmount: number;
  executionRate: number;
}

export interface BudgetBatchCreateRequest {
  items: { department: string; budgetAmount: number }[];
  year: number;
  month: string;
}

// ============================================================
// 通知提醒
// ============================================================

export type NotificationType =
  | 'budget'
  | 'asset'
  | 'inventory'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  userId: string;
  notificationType: NotificationType;
  title: string;
  content?: string;
  relatedType?: string;
  relatedId?: string;
  isRead: boolean;
  priority: NotificationPriority;
  createdAt: string;
}

export interface NotificationListResponse extends PagedResponse<Notification> {
  page: number;
  pageSize: number;
  unreadCount: number;
}

export interface UnreadCountResponse {
  count: number;
}

export type SyncDomain =
  | 'expenses'
  | 'fixed_assets'
  | 'categories'
  | 'inventory_tasks'
  | 'inventory_checks'
  | 'operation_records';

export interface FeishuSyncConfigItem {
  domain: SyncDomain;
  localTableName: string;
  baseToken?: string;
  tableId?: string;
  fieldMapping?: { feishuField: string; localField: string }[];
  enabled: boolean;
  lastSyncTime?: string;
  lastSyncStatus?: 'success' | 'failed' | 'pending';
  lastSyncDirection?: 'pull' | 'push' | 'bidirectional';
}

export interface FeishuSyncLogItem {
  id: string;
  domain: SyncDomain;
  direction: 'pull' | 'push';
  syncType?: string;
  status: 'success' | 'failed' | 'partial';
  recordCount: number;
  successCount?: number;
  failedCount?: number;
  errorMessage?: string;
  startTime?: string;
  endTime?: string;
  syncStartedAt: string;
  syncFinishedAt?: string;
}

// ============================================================
// 数据统计与报表
// ============================================================

export interface ExpenseTrendItem {
  period: string;
  amount: number;
}

export interface ExpenseDimensionItem {
  name: string;
  amount: number;
  percentage: number;
}

export interface ExpenseRankingItem {
  name: string;
  amount: number;
}

export interface ExpenseAnalysisResponse {
  trend: ExpenseTrendItem[];
  dimensionBreakdown: ExpenseDimensionItem[];
  topRanking: ExpenseRankingItem[];
}

export interface AssetTypeItem {
  type: string;
  count: number;
  value: number;
}

export interface AssetValueItem {
  range: string;
  count: number;
  value: number;
}

export interface AssetFloorItem {
  floor: string;
  count: number;
  value: number;
}

export interface AssetAnalysisResponse {
  typeDistribution: AssetTypeItem[];
  valueDistribution: AssetValueItem[];
  floorDistribution: AssetFloorItem[];
}

export interface InventoryCompletionItem {
  month: string;
  rate: number;
}

export interface InventoryAbnormalItem {
  month: string;
  rate: number;
  count: number;
}

export interface InventoryDepartmentItem {
  department: string;
  completionRate: number;
}

export interface InventoryCompletionRateTrendItem {
  month: string;
  rate: number;
  total: number;
  checked: number;
}

export interface InventoryDeptCompletionItem {
  department: string;
  rate: number;
  completionRate: number;
  total: number;
  checked: number;
}

export interface InventoryAnalysisResponse {
  completionTrend: InventoryCompletionItem[];
  abnormalRate: InventoryAbnormalItem[];
  departmentRanking: InventoryDepartmentItem[];
}

export interface FrontendMetrics {
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  ttfb: number | null;
}

export interface FrontendMetricReport {
  page: string;
  metrics: FrontendMetrics;
  timestamp: string;
}

// ========== 监控告警体系 ==========

export interface PerformanceOverview {
  totalRequests: number;
  avgDurationMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  uptimeSeconds: number;
  slowRequestCount: number;
  currentQps: number;
  cacheHitRate: number | null;
}

export interface ResponseTimeStats {
  avgDurationMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxDurationMs: number;
  minDurationMs: number;
  totalRequests: number;
  bucketDistribution: { range: string; count: number }[];
}

export interface ThroughputStats {
  currentQps: number;
  peakQps: number;
  requestsLastMinute: number;
  requestsLastHour: number;
  requestsLast24h: number;
}

export interface SlowRequestItem {
  method: string;
  url: string;
  durationMs: number;
  timestamp: string;
  requestSize: number;
  responseSize: number;
}

export interface CacheStats {
  hitRate: number;
  hits: number;
  misses: number;
  totalKeys: number;
  memoryUsage: number;
}

export interface ErrorEntry {
  id: string;
  type: string;
  message: string;
  stack?: string;
  context: { method: string; url: string; userId?: string };
  count: number;
  firstSeen: string;
  lastSeen: string;
  status: ErrorStatus;
}

export type ErrorStatus = 'new' | 'acknowledged' | 'resolved' | 'ignored';

export interface ErrorStats {
  total: number;
  byStatus: Record<ErrorStatus, number>;
  byType: Record<string, number>;
  topErrors: ErrorEntry[];
  trend: { date: string; count: number }[];
}

export interface BusinessMetricsOverview {
  expenses: ExpenseMetrics;
  assets: AssetMetrics;
  inventory: InventoryMetrics;
  budget: BudgetMetrics;
  system: SystemMetrics;
  timestamp: string;
}

export interface ExpenseMetrics {
  todayAmount: number;
  monthAmount: number;
  yearAmount: number;
  todayCount: number;
  monthCount: number;
  avgAmount: number;
}

export interface AssetMetrics {
  total: number;
  inStock: number;
  inUse: number;
  repairing: number;
  scrapped: number;
  scrapRate: number;
}

export interface InventoryMetrics {
  totalTasks: number;
  completed: number;
  inProgress: number;
  completionRate: number;
  lossCount: number;
  profitCount: number;
}

export interface BudgetMetrics {
  totalBudget: number;
  usedAmount: number;
  remainingAmount: number;
  executionRate: number;
  overBudgetCount: number;
}

export interface SystemMetrics {
  apiCalls: number;
  successRate: number;
  avgResponseTimeMs: number;
  activeUsers: number;
  todayLogins: number;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
}

export interface MetricTrend {
  date: string;
  value: number;
  label: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: 'warning' | 'critical';
  category: 'performance' | 'error' | 'business' | 'system';
  condition: string;
  enabled: boolean;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'warning' | 'critical';
  message: string;
  triggeredAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  status: 'active' | 'acknowledged' | 'resolved';
  value: number;
  threshold: number;
}

export interface AlertStats {
  active: number;
  acknowledged: number;
  resolved: number;
  total: number;
  bySeverity: { warning: number; critical: number };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  checks: Record<string, { status: string; message?: string; latencyMs?: number }>;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  category: 'access' | 'error' | 'business' | 'security' | 'performance';
  message: string;
  context: { requestId?: string; userId?: string; path?: string };
  timestamp: string;
}

export interface LogQueryParams {
  startTime?: string;
  endTime?: string;
  level?: string;
  category?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  lastError: LogEntry | null;
}

// ===== Asset Reservations =====

export type ReservationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'borrowed'
  | 'returned'
  | 'cancelled';

export type ReservationOperationType =
  | 'create'
  | 'approve'
  | 'reject'
  | 'borrow'
  | 'return'
  | 'cancel';

export interface AssetReservationItem {
  id: string;
  reservationNo: string;
  assetId: string;
  assetName: string;
  assetCode: string;
  assetType: string;
  requesterId: string;
  requesterName: string;
  requesterDepartment: string;
  approverId?: string;
  approverName?: string;
  status: ReservationStatus;
  purpose: string;
  expectedBorrowDate: string;
  expectedReturnDate: string;
  actualBorrowDate?: string;
  actualReturnDate?: string;
  approvalRemark?: string;
  rejectReason?: string;
  returnRemark?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  borrowedAt?: string;
  returnedAt?: string;
}

export interface ReservationDetail extends AssetReservationItem {
  operationHistory: ReservationOperationRecord[];
}

export interface ReservationOperationRecord {
  id: string;
  reservationId: string;
  operationType: ReservationOperationType;
  operatorId: string;
  operatorName?: string;
  remark?: string;
  createdAt: string;
}

export interface CreateReservationRequest {
  assetId: string;
  assetName: string;
  assetCode: string;
  assetType?: string;
  requesterName: string;
  requesterDepartment: string;
  approver?: string;
  purpose: string;
  expectedBorrowDate: string;
  expectedReturnDate: string;
}

export interface ReservationListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
  expectedBorrowDateFrom?: string;
  expectedBorrowDateTo?: string;
}

export interface ReservationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  borrowed: number;
  returned: number;
  cancelled: number;
}

export interface UpdateAttachmentDto {
  fileCategory?: AttachmentFileType;
  description?: string;
}

// ============================================================
// 资产预约
// ============================================================

export type AttachmentFileType =
  | 'invoice'
  | 'receipt'
  | 'photo'
  | 'contract'
  | 'other';

export interface AttachmentItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileCategory: AttachmentFileType;
  downloadUrl: string;
  relatedType: string;
  relatedId: string;
  uploaderId: string;
  uploaderName: string;
  description?: string;
  createdAt: string;
}

export interface AttachmentStats {
  totalCount: number;
  totalSize: number;
  byCategory: Array<{ category: string; count: number }>;
  byRelatedType: Array<{ relatedType: string; count: number }>;
  monthUploadCount: number;
}

export interface AttachmentListParams {
  page?: number;
  pageSize?: number;
  fileCategory?: AttachmentFileType;
  relatedType?: string;
  uploaderId?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

export interface AttachmentListResponse extends PagedResponse<AttachmentItem> {
  page: number;
  pageSize: number;
}

export interface CreateAttachmentDto {
  fileName: string;
  fileSize: number;
  fileType: string;
  fileCategory: AttachmentFileType;
  downloadUrl: string;
  relatedType: string;
  relatedId: string;
  description?: string;
}

export interface UpdateAttachmentDto {
  fileCategory?: AttachmentFileType;
  description?: string;
}

// ====== 供应商管理 ======

export interface SupplierItem {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  businessScope: string;
  remark: string;
}

export interface SupplierListResponse extends PagedResponse<SupplierItem> {}

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  businessScope?: string;
  remark?: string;
}

export type UpdateSupplierDto = Partial<CreateSupplierDto>;

// ====== IT 报修工单 ======

export type WorkOrderProblemType =
  | 'hardware'
  | 'software'
  | 'network'
  | 'account'
  | 'peripheral'
  | 'other';

export type WorkOrderUrgency = 'low' | 'medium' | 'high' | 'urgent';

export type WorkOrderStatus =
  | 'pending'
  | 'processing'
  | 'waiting_confirm'
  | 'resolved'
  | 'closed';

export type WorkOrderSatisfaction = 'satisfied' | 'neutral' | 'unsatisfied';

export interface WorkOrderItem {
  id: string;
  orderNo: string;
  reporter: string;
  reporterName: string;
  problemType: WorkOrderProblemType;
  urgency: WorkOrderUrgency;
  description: string;
  status: WorkOrderStatus;
  assignee: string;
  assigneeName: string;
  createdAt: string;
}

export interface WorkOrderDetail extends WorkOrderItem {
  contactPhone: string;
  assetId: string;
  assetName: string;
  attachmentUrls: string;
  reporterDetail: UserProfileDto;
  assigneeDetail: UserProfileDto;
  solution: string;
  resolvedAt: string;
  satisfaction: WorkOrderSatisfaction;
  updatedAt: string;
}

export interface WorkOrderListResponse extends PagedResponse<WorkOrderItem> {}

export interface CreateWorkOrderDto {
  contactPhone?: string;
  assetId?: string;
  assetName?: string;
  problemType: WorkOrderProblemType;
  urgency: WorkOrderUrgency;
  description: string;
  attachmentUrls?: string;
}

export interface UpdateWorkOrderDto {
  solution: string;
  assignee?: string;
}

export interface UpdateWorkOrderStatusDto {
  status: WorkOrderStatus;
  satisfaction?: WorkOrderSatisfaction;
}

// ====== 许可证管理 ======

export type LicenseSoftwareType =
  | 'os'
  | 'office'
  | 'design'
  | 'dev_tool'
  | 'security'
  | 'other';

export type LicenseMode =
  | 'per_device'
  | 'per_user'
  | 'per_server'
  | 'subscription';

export type LicenseAssignmentStatus = 'active' | 'revoked';

export interface LicenseItem {
  id: string;
  name: string;
  softwareType: LicenseSoftwareType;
  licenseMode: LicenseMode;
  totalSeats: number;
  assignedCount: number;
  purchaseDate: string;
  purchaseAmount: number;
  expireDate: string;
  supplierName: string;
  remark: string;
}

export interface LicenseDetail extends LicenseItem {
  licenseKey: string;
  supplierId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseListResponse extends PagedResponse<LicenseItem> {}

export interface CreateLicenseDto {
  name: string;
  softwareType: LicenseSoftwareType;
  licenseKey?: string;
  licenseMode: LicenseMode;
  totalSeats: number;
  purchaseDate?: string;
  purchaseAmount?: number;
  expireDate: string;
  supplierId?: string;
  remark?: string;
}

export type UpdateLicenseDto = Partial<CreateLicenseDto>;

export interface LicenseAssignmentItem {
  id: string;
  assigneeName: string;
  deviceName: string;
  assignDate: string;
  assignerName: string;
  status: LicenseAssignmentStatus;
}

export interface CreateLicenseAssignmentDto {
  assignee: string;
  deviceId?: string;
}
