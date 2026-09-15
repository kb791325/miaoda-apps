export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  brand: string;
  spec: string;
  unit: string;
  safetyStock: number;
  unitPrice: number;
  status: string;
  shelfStatus: string;
  stockStatus?: string;
  imageUrl?: string | null;
  baseUnit: string;
  salesUnit?: string | null;
  conversionRatio?: number | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseInventoryItem {
  warehouse: string;
  quantity: number;
  stockValue: number;
}

export interface ProductWithInventory extends Product {
  inventory: WarehouseInventoryItem[];
  totalQuantity: number;
  totalValue: number;
}

export interface KpiStats {
  totalSku: number;
  totalStock: number;
  totalValue: number;
  warningCount: number;
}

export interface WarehouseDistribution {
  warehouse: string;
  quantity: number;
}

export interface CategoryTurnover {
  category: string;
  turnoverDays: number;
}

export interface WarningItem {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  currentStock: number;
  safetyStock: number;
  gap: number;
  unitPrice: number;
  score: number;
  level: string;
  issues: string;
}

export interface DailyTrend {
  date: string;
  inbound: number;
  outbound: number;
}

export interface CategoryValue {
  category: string;
  value: number;
}

export interface TopValueItem {
  id: string;
  name: string;
  code: string;
  category: string;
  totalValue: number;
  totalQuantity: number;
}

export interface DashboardStats {
  kpi: KpiStats;
  warehouseDistribution: WarehouseDistribution[];
  categoryTurnover: CategoryTurnover[];
  warningList: WarningItem[];
  dailyTrend: DailyTrend[];
  categoryValue: CategoryValue[];
  topValue: TopValueItem[];
}

export interface StockTransaction {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  warehouse: string;
  type: string;
  subType: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  orderNo: string;
  operator: string;
  supplier: string;
  remark: string;
  transactionDate: string;
  createdAt: string;
}

export interface Transfer {
  id: string;
  transferNo: string;
  productId: string;
  productName: string;
  productCode: string;
  sourceWarehouse: string;
  targetWarehouse: string;
  quantity: number;
  remark: string;
  transferDate: string;
  createdAt: string;
}

export interface InventoryCheck {
  id: string;
  checkNo: string;
  warehouse: string;
  status: string;
  checkDate: string;
  createdAt: string;
}

export interface InventoryCheckItem {
  id: string;
  checkId: string;
  productId: string;
  productName: string;
  productCode: string;
  location: string;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  remark: string;
}

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  status?: string;
  keyword?: string;
  maxStock?: number;
  sortBy?: string;
}

export interface ProductListResponse {
  items: ProductWithInventory[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface CategoryListResponse {
  items: Category[];
  total: number;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  sortOrder?: number;
}

export interface CreateProductRequest {
  code: string;
  name: string;
  category: string;
  brand?: string;
  spec?: string;
  unit: string;
  safetyStock: number;
  unitPrice: number;
  imageUrl?: string;
  baseUnit?: string;
  salesUnit?: string;
  conversionRatio?: number;
  initialInventory?: { warehouse: string; quantity: number }[];
}

export interface UpdateProductRequest {
  code?: string;
  name?: string;
  category?: string;
  brand?: string;
  spec?: string;
  unit?: string;
  safetyStock?: number;
  unitPrice?: number;
  status?: string;
  imageUrl?: string | null;
  baseUnit?: string;
  salesUnit?: string | null;
  conversionRatio?: number | null;
}

export interface BatchImportItem {
  code: string;
  name: string;
  category: string;
  brand?: string;
  spec?: string;
  unit: string;
  safetyStock: number;
  unitPrice: number;
  initialQuantity?: number;
  warehouse?: string;
  remark?: string;
}

export interface BatchImportFailure {
  row: number;
  code?: string;
  reason: string;
}

export interface BatchImportResult {
  successCount: number;
  failCount: number;
  failures: BatchImportFailure[];
}

export interface BulkIdsRequest {
  ids: string[];
}

export interface BulkCategoryRequest {
  ids: string[];
  category: string;
}

export interface BulkShelfRequest {
  ids: string[];
  onShelf: boolean;
}

export interface BulkOperationResponse {
  successCount: number;
}

export interface InboundRequest {
  productId: string;
  warehouse: string;
  quantity: number;
  unitPrice: number;
  operator: string;
  subType?: string;
  orderNo?: string;
  remark?: string;
}

export interface InboundResponse {
  success: boolean;
  docNo: string;
}

export interface OutboundRequest {
  productId: string;
  warehouse: string;
  quantity: number;
  subType: string;
  orderNo?: string;
  operator: string;
  remark?: string;
  confirm?: boolean;
}

export interface OutboundResponse {
  success: boolean;
  warning: boolean;
  docNo?: string;
  transactionId?: string;
}

export interface TransferRequest {
  productId: string;
  sourceWarehouse: string;
  targetWarehouse: string;
  quantity: number;
  remark?: string;
}

export interface TransferResponse {
  success: boolean;
  docNo: string;
}

export interface UndoRequest {
  action: 'outbound' | 'product_delete';
  targetId: string;
}

export interface UndoResponse {
  success: boolean;
  message: string;
}

export interface BackupRecord {
  id: string;
  type: 'export' | 'restore';
  fileName?: string | null;
  recordCount: number;
  tableCounts: Record<string, number>;
  operatorName?: string | null;
  createdAt: string;
}

export interface BackupExportResponse {
  backupId: string;
  exportedAt: string;
  data: Record<string, Record<string, unknown>[]>;
}

export interface RestoreRequest {
  payload: Record<string, Record<string, unknown>[]>;
  fileName?: string;
}

export interface RestoreResponse {
  success: boolean;
  backupId: string;
  tableCounts: Record<string, number>;
}

export interface InventoryCheckListParams {
  page?: number;
  pageSize?: number;
  warehouse?: string;
}

export interface InventoryCheckListResponse {
  items: (InventoryCheck & {
    itemCount: number;
  })[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ArchivedProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  brand: string;
  spec: string;
  unit: string;
  safetyStock: number;
  unitPrice: number;
  status: string;
  deletedAt: string;
  deletedBy: string;
  createdAt: string;
  updatedAt: string;
  inventory: WarehouseInventoryItem[];
  totalQuantity: number;
  totalValue: number;
  transactionCount: number;
  transferCount: number;
  inventoryCheckCount: number;
}

export interface ArchivedProductDetail extends ArchivedProduct {
  transactions: StockTransaction[];
  transfers: Transfer[];
  inventoryChecks: {
    check: InventoryCheck;
    items: InventoryCheckItem[];
  }[];
}

export interface ArchivedProductListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface ArchivedProductListResponse {
  items: ArchivedProduct[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateInventoryCheckRequest {
  warehouse: string;
}

export interface SubmitInventoryCheckRequest {
  items: {
    id: string;
    actualQuantity: number;
    remark?: string;
  }[];
}

export interface TransactionListParams {
  page?: number;
  pageSize?: number;
  type?: string;
}

export interface TransactionListResponse {
  items: StockTransaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WarehouseStock {
  productId: string;
  warehouse: string;
  quantity: number;
}

export interface ReplenishmentSuggestion {
  productId: string;
  productName: string;
  currentStock: number;
  safetyStock: number;
  suggestedQuantity: number;
}

export interface SalesPrediction {
  productId: string;
  productName: string;
  avgDailySales: number;
  predictedSales: number;
  currentStock: number;
  sellableDays: number;
  risk: string;
}

export interface HealthScore {
  productId: string;
  productName: string;
  score: number;
  level: string;
  issues: string;
}

export interface TransferSuggestion {
  productId: string;
  productName: string;
  sourceWarehouse: string;
  targetWarehouse: string;
  quantity: number;
}

export interface AnomalyItem {
  type: string;
  productName: string;
  severity: string;
  description: string;
}

// ====== Sync Module Types ======

export type SyncResult = {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  insertCount?: number;
  updateCount?: number;
  deleteCount?: number;
  errorMessage?: string;
};

export interface PushOneRequest {
  recordId: string;
  action: 'create' | 'update' | 'delete';
}

export type SyncDomain = 'products' | 'transactions' | 'transfers' | 'inventory_checks' | 'warehouse_inventory';

export type SyncStatus = 'unconfigured' | 'pending' | 'configured' | 'syncing' | 'normal' | 'error';

export interface SyncConfig {
  id: string;
  domain: SyncDomain;
  feishuAppToken: string;
  tableId: string;
  tableName: string;
  enabled: boolean;
  autoRealtime: boolean;
  bidirectional: boolean;
  pollIntervalMin: number;
  lastSyncedAt?: string | null;
  status: SyncStatus;
  errorMessage?: string | null;
  extra?: {
    fieldMap?: Record<string, string>;
    feishuAppId?: string;
    feishuAppSecret?: string;
    recordMap?: Record<string, string>;
    lastSyncCursor?: string;
    lastBidirectionalSyncAt?: string;
  } | null;
}

export interface SaveSyncConfigRequest {
  feishuAppToken: string;
  tableId?: string;
  tableName: string;
  enabled: boolean;
  autoRealtime: boolean;
  bidirectional: boolean;
  pollIntervalMin?: number;
  extra?: {
    fieldMap?: Record<string, string>;
    feishuAppId?: string;
    feishuAppSecret?: string;
  };
}

export interface SyncTaskStatus {
  taskId: string;
  status: string;
  progress: number;
  insertCount: number;
  updateCount: number;
  skipCount: number;
  errorMessage?: string;
  durationMs?: number;
}

export interface FeishuFieldInfo {
  fieldName: string;
  fieldType: string;
  description?: string;
}

export interface SmartMatchResult {
  localField: string;
  feishuField: string;
  confidence: 'high' | 'medium' | 'low';
}

export type SyncStats = Record<string, {
  lastSyncedAt: string | null;
  successCount: number;
  failCount: number;
  status: string;
}>;

export interface SyncLog {
  id: string;
  domain: SyncDomain;
  direction: 'push' | 'pull' | 'bi';
  action: string;
  recordId?: string | null;
  status: string;
  errorMessage?: string | null;
  durationMs: number;
  payload?: Record<string, unknown> | null;
  retryCount: number;
  progress: number;
  insertCount: number;
  updateCount: number;
  skipCount: number;
  taskId?: string | null;
  createdAt: string;
}

export interface SyncLogListResponse {
  items: SyncLog[];
  total: number;
  page: number;
  pageSize: number;
}

// ========== Suppliers ==========
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  mainCategory?: string;
  status: 'active' | 'paused' | 'terminated';
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}

export interface SupplierListResponse {
  items: Supplier[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateSupplierRequest {
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  mainCategory?: string;
  status?: 'active' | 'paused' | 'terminated';
  remark?: string;
}

export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;

// Product 扩展字段（已有 Product 增加 supplierId）
export interface ProductWithSupplier extends Product {
  supplierId?: string | null;
  supplierName?: string | null;
}

export interface SupplierDetail extends Supplier {
  products: Product[];
  purchaseCount: number;
  purchaseAmount: number;
}

export interface SupplierProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

// ========== Sales Orders ==========
export type SalesOrderStatus = 'pending' | 'confirmed' | 'picking' | 'shipped' | 'completed' | 'cancelled';

export interface SalesOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName?: string;
  productCode?: string;
  productSpec?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SalesOrder {
  id: string;
  orderNo: string;
  customerName: string;
  customerContact?: string;
  customerPhone?: string;
  warehouse: string;
  totalAmount: number;
  status: SalesOrderStatus;
  expectedShipDate?: string | null;
  remark?: string;
  transactionId?: string | null;
  items?: SalesOrderItem[];
  statusHistory?: SalesOrderStatusLog[];
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
}

export interface SalesOrderStatusLog {
  status: SalesOrderStatus;
  operator?: string;
  remark?: string;
  at: string;
}

export interface SalesOrderListParams {
  page?: number;
  pageSize?: number;
  status?: SalesOrderStatus;
  keyword?: string;
  warehouse?: string;
  startDate?: string;
  endDate?: string;
}

export interface SalesOrderListResponse {
  items: SalesOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateSalesOrderItemRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateSalesOrderRequest {
  customerName: string;
  customerContact?: string;
  customerPhone?: string;
  warehouse: string;
  expectedShipDate?: string;
  remark?: string;
  items: CreateSalesOrderItemRequest[];
}

export type UpdateSalesOrderRequest = Partial<Omit<CreateSalesOrderRequest, 'items'>> & {
  items?: CreateSalesOrderItemRequest[];
};

// ========== AI Tools ==========
export interface AnomalyDetectionItem {
  productId: string;
  productName: string;
  productCode: string;
  anomalyType: 'spike' | 'drop' | 'stagnation';
  anomalyMagnitude: number;
  zScore: number;
  avgDaily: number;
  recentDaily: number;
  warehouse: string;
  suggestedAction: string;
  last30Days: { date: string; quantity: number }[];
}

export interface AnomalyDetectionResponse {
  items: AnomalyDetectionItem[];
  totalAnomalies: number;
  spikeCount: number;
  dropCount: number;
  stagnationCount: number;
  analyzedAt: string;
}

export interface HealthScoreDimension {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface HealthScoreResponse {
  overallScore: number;
  rating: 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'danger';
  dimensions: HealthScoreDimension[];
  suggestions: string[];
  calculatedAt: string;
}

export interface ReplenishmentItem {
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  warehouse: string;
  currentStock: number;
  safetyStock: number;
  avgDailySales: number;
  purchaseCycleDays: number;
  suggestedQuantity: number;
  expectedArrivalDate: string;
  priority: 'high' | 'medium' | 'low';
  unitPrice: number;
  suggestedAmount: number;
}

export interface ReplenishmentListParams {
  warehouse?: string;
  priority?: string;
  keyword?: string;
}

export interface ReplenishmentResponse {
  items: ReplenishmentItem[];
  totalValue: number;
  totalItems: number;
  calculatedAt: string;
}

export interface SalesPredictionItem {
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  historicalData: { date: string; quantity: number }[];
  predictedData: { date: string; quantity: number; lowerBound: number; upperBound: number }[];
  trend: 'up' | 'down' | 'stable';
  confidence: number;
}

export interface SalesPredictionParams {
  productId: string;
  warehouse?: string;
  period?: 7 | 14 | 30;
}

export interface TransferSuggestionItem {
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  sourceWarehouse: string;
  sourceStock: number;
  sourceTurnoverDays: number;
  targetWarehouse: string;
  targetStock: number;
  targetTurnoverDays: number;
  suggestedQuantity: number;
  expectedBalanceEffect: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface TransferSuggestionResponse {
  items: TransferSuggestionItem[];
  totalTransferValue: number;
  calculatedAt: string;
}

export interface NaturalLanguageQueryRequest {
  query: string;
}

export type NlQueryResultType = 'table' | 'chart' | 'text' | 'kpi';

export interface NaturalLanguageQueryResponse {
  queryType: string;
  parsedIntent: string;
  resultType: NlQueryResultType;
  title: string;
  summary: string;
  tableData?: Record<string, unknown>[];
  columns?: { key: string; label: string }[];
  chartData?: { categories: string[]; series: { name: string; data: number[] }[] };
  kpiData?: { label: string; value: number | string; unit?: string }[];
}

// ========== Notifications ==========
export type NotificationType = 'low_stock' | 'anomaly' | 'operation' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content?: string;
  relatedType?: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  unreadCount: number;
}

export interface NotificationSettings {
  id: string;
  lowStockEnabled: boolean;
  anomalyEnabled: boolean;
  operationEnabled: boolean;
  systemEnabled: boolean;
}

export interface UpdateNotificationSettingsRequest {
  lowStockEnabled?: boolean;
  anomalyEnabled?: boolean;
  operationEnabled?: boolean;
  systemEnabled?: boolean;
}

// ========== Audit Logs ==========
export type AuditActionType =
  | 'create' | 'update' | 'delete' | 'archive' | 'restore'
  | 'inbound' | 'outbound' | 'transfer' | 'inventory_check'
  | 'order_confirm' | 'order_cancel' | 'order_ship' | 'order_complete'
  | 'login' | 'logout' | 'system';

export interface AuditLog {
  id: string;
  actionType: AuditActionType;
  targetType: string;
  targetId?: string | null;
  operator: string;
  operatorName?: string;
  ipAddress?: string;
  detail: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    changes?: Record<string, unknown>;
  };
  createdAt: string;
}

export interface AuditLogListParams {
  page?: number;
  pageSize?: number;
  actionType?: AuditActionType;
  targetType?: string;
  operator?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

// ========== Doc Numbers (单据编号) ==========
export interface InboundWithDocNo extends InboundRequest {
  docNo?: string;
}

export interface OutboundWithDocNo extends OutboundRequest {
  docNo?: string;
}

// ========== User Management ==========
export interface PlatformUser {
  userId: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  status?: 'active' | 'disabled';
  lastLoginAt?: string;
  createdAt?: string;
}

export interface UserWithRoles extends PlatformUser {
  roles: string[];
}

export interface UserListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  role?: string;
  status?: string;
}

export interface UserListResponse {
  items: UserWithRoles[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AssignRolesRequest {
  roleIds: string[];
}

// ========== Role Management ==========
export type PermissionKey = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve' | 'manage' | 'use';

export type ModulePermissions = Partial<Record<PermissionKey, boolean>>;

export type PermissionsMap = Record<string, ModulePermissions>;

export interface Role {
  id: string;
  roleCode: string;
  roleName: string;
  description?: string;
  permissions: PermissionsMap;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleListResponse {
  items: Role[];
  total: number;
}

export interface UpdateRolePermissionsRequest {
  permissions: PermissionsMap;
}

export interface AddRoleUserRequest {
  userId: string;
  userName: string;
}

export type PurchaseOrderStatus = 'pending' | 'approved' | 'received' | 'cancelled';

export interface PurchaseOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreatePurchaseOrderRequest {
  supplierId: string;
  warehouse: string;
  expectedDate?: string;
  remark?: string;
  items: PurchaseOrderItemInput[];
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName?: string;
  productCode?: string;
  productUnit?: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierId: string | null;
  supplierName?: string;
  warehouse: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  expectedDate: string | null;
  remark: string | null;
  inboundNo: string | null;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}

export interface PurchaseOrderListResponse {
  items: PurchaseOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GlobalSearchProductHit {
  id: string;
  code: string;
  name: string;
  category: string;
  shelfStatus: string;
}

export interface GlobalSearchOrderHit {
  id: string;
  orderNo: string;
  customerName: string;
  totalAmount: number;
  status: string;
}

export interface GlobalSearchSupplierHit {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  mainCategory: string;
  status: string;
}

export interface GlobalSearchResponse {
  products: GlobalSearchProductHit[];
  salesOrders: GlobalSearchOrderHit[];
  suppliers: GlobalSearchSupplierHit[];
}
