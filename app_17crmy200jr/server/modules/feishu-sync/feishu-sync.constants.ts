/**
 * 飞书同步常量定义
 * - 业务域与飞书多维表格 base_token / table_id 的映射
 * - 默认字段映射（fallback，优先读取数据库配置）
 */

/** 支持的同步业务域 */
export const SYNC_DOMAINS = [
  'expenses',
  'fixed_assets',
  'inventory_checks',
  'categories',
  'data',
] as const;

export type SyncDomain = (typeof SYNC_DOMAINS)[number];

/** 飞书多维表格各业务域插件实例ID */
export const DOMAIN_PLUGIN_ID_MAP: Record<SyncDomain, string> = {
  expenses: 'feishu_bitable_expense_sync_1',
  fixed_assets: 'feishu_bitable_asset_sync_1',
  inventory_checks: 'feishu_bitable_inventory_sync_1',
  categories: 'feishu_bitable_category_sync_1',
  data: 'feishu_bitable_data_sync_1',
};

export const FEISHU_BITABLE_PLUGIN_ID = 'feishu_bitable';

/** 业务域 → 飞书多维表格 base_token */
export const DOMAIN_BASE_TOKEN_MAP: Record<SyncDomain, string> = {
  expenses: 'GRQMbafkeaKeAjsZvN0c5SoYnYb',
  fixed_assets: 'GRQMbafkeaKeAjsZvN0c5SoYnYb',
  inventory_checks: 'GRQMbafkeaKeAjsZvN0c5SoYnYb',
  categories: 'GRQMbafkeaKeAjsZvN0c5SoYnYb',
  data: 'GRQMbafkeaKeAjsZvN0c5SoYnYb',
};

/** 业务域 → 飞书多维表格 table_id */
export const DOMAIN_TABLE_ID_MAP: Record<SyncDomain, string> = {
  expenses: 'tblXGS0Lt5tmTGgU',
  fixed_assets: 'tbla5xAVLV5WL9Nr',
  inventory_checks: 'tblkZZwu8huJu9E8',
  categories: 'tblUIioGHldzYaGe',
  data: 'tbl7QRaUuK6MQ1a2',
};

/** 业务域 → （飞书字段名 → 本地字段名）映射表 */
export const DOMAIN_FIELD_NAME_MAP: Record<SyncDomain, Record<string, string>> = {
  categories: {
    '一级类目': 'category_l1',
    '二级类目': 'category_l2',
  },
  expenses: {
    '支出日期': 'expense_date',
    '支出金额': 'amount',
    '一级类目': 'category_l1',
    '二级类目': 'category_l2',
    '付费主体': 'payer_entity',
    '使用楼层': 'floor',
    '部门': 'department',
    '采购申请部门': 'purchase_department',
    '经办人': 'handler',
    '支出说明': 'description',
    '发票': 'invoice_url',
    '购买截图': 'screenshot_url',
    '年度': 'year',
    '月份': 'month',
    '季度': 'quarter',
  },
  fixed_assets: {
    '资产名称': 'asset_name',
    '资产类型': 'asset_type',
    '采购日期': 'purchase_date',
    '采购金额': 'purchase_amount',
    '采购申请部门': 'purchase_department',
    '付费主体': 'payer_entity',
    '使用楼层': 'floor',
    '经办人': 'handler',
    '资产类目': 'asset_category',
  },
  inventory_checks: {
    '盘点单号': 'check_no',
    '盘点年度': 'check_year',
    '盘点月份': 'check_month',
    '盘点日期': 'check_date',
    '盘点人': 'checker',
    '归属人': 'owner',
    '资产名称': 'asset_name',
    '账面数量': 'book_quantity',
    '实盘数量': 'actual_quantity',
    '差异数量': 'difference',
    '盘点状态': 'status',
    '备注': 'remark',
  },
  data: {
    '数据名称': 'data_name',
    '数据类型': 'data_type',
    '数据值': 'data_value',
    '数据单位': 'data_unit',
    '统计日期': 'stat_date',
    '所属类目': 'category',
    '备注': 'remark',
  },
};

/** 业务域默认唯一键 */
export const DOMAIN_DEFAULT_UNIQUE_KEY: Record<SyncDomain, string> = {
  categories: 'category_l1,category_l2',
  expenses: 'feishu_record_id',
  fixed_assets: 'feishu_record_id',
  inventory_checks: 'feishu_record_id',
  data: 'feishu_record_id',
};

/** 同步方向 */
export type SyncDirection = 'pull' | 'push' | 'bidirectional';

/** 同步状态 */
export type SyncStatus = 'success' | 'failed' | 'syncing';

/** 单次批量写入上限（飞书多维表格限制 500） */
export const BATCH_WRITE_LIMIT = 500;

/** 单次拉取分页大小 */
export const PULL_PAGE_SIZE = 500;

/** 飞书多维表格字段配置 */
interface BitableField {
  id: string;
  name: string;
  type: number;
  bizType: string;
  readable: boolean;
  writeable: boolean;
}

/** 飞书多维表格字段基础类型映射（bizType → type number） */
const BIZ_TYPE_TO_BASE_TYPE: Record<string, number> = {
  Text: 1,
  Email: 1,
  Barcode: 1,
  Phone: 1,
  Url: 1,
  Number: 2,
  Progress: 2,
  Currency: 2,
  Rating: 2,
  SingleSelect: 3,
  MultiSelect: 3,
  DateTime: 5,
  Checkbox: 7,
  User: 11,
  CreatedTime: 1001,
  ModifiedTime: 1002,
  CreatedUser: 1003,
  ModifiedUser: 1004,
  AutoNumber: 1005,
  Attachment: 17,
  Location: 20,
  GroupChat: 12,
  Stage: 1008,
  Object: 1010,
  SingleLink: 18,
  Lookup: 19,
  DuplexLink: 21,
  Formula: 2000,
  Button: 2002,
};

export const DOMAIN_FIELDS_MAP: Record<SyncDomain, BitableField[]> = {
  categories: [
    { id: 'fld_category_l1', name: '一级类目', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_category_l2', name: '二级类目', type: 1, bizType: 'Text', readable: true, writeable: true },
  ],
  expenses: [
    { id: 'fld_expense_date', name: '支出日期', type: 5, bizType: 'DateTime', readable: true, writeable: true },
    { id: 'fld_amount', name: '支出金额', type: 2, bizType: 'Currency', readable: true, writeable: true },
    { id: 'fld_category_l1', name: '一级类目', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_category_l2', name: '二级类目', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_payer_entity', name: '付费主体', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_floor', name: '使用楼层', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_department', name: '部门', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_purchase_dept', name: '采购申请部门', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_handler', name: '经办人', type: 11, bizType: 'User', readable: true, writeable: true },
    { id: 'fld_description', name: '支出说明', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_invoice_url', name: '发票', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_screenshot_url', name: '购买截图', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_year', name: '年度', type: 2000, bizType: 'Formula', readable: true, writeable: false },
    { id: 'fld_month', name: '月份', type: 2000, bizType: 'Formula', readable: true, writeable: false },
    { id: 'fld_quarter', name: '季度', type: 2000, bizType: 'Formula', readable: true, writeable: false },
  ],
  fixed_assets: [
    { id: 'fld_asset_name', name: '资产名称', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_asset_type', name: '资产类型', type: 3, bizType: 'SingleSelect', readable: true, writeable: true },
    { id: 'fld_purchase_date', name: '采购日期', type: 5, bizType: 'DateTime', readable: true, writeable: true },
    { id: 'fld_purchase_amount', name: '采购金额', type: 2, bizType: 'Currency', readable: true, writeable: true },
    { id: 'fld_purchase_dept', name: '采购申请部门', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_payer_entity', name: '付费主体', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_floor', name: '使用楼层', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_handler', name: '经办人', type: 1, bizType: 'User', readable: true, writeable: true },
    { id: 'fld_asset_category', name: '资产类目', type: 1, bizType: 'Text', readable: true, writeable: true },
  ],
  inventory_checks: [
    { id: 'fld_check_no', name: '盘点单号', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_check_year', name: '盘点年度', type: 2, bizType: 'Number', readable: true, writeable: true },
    { id: 'fld_check_month', name: '盘点月份', type: 3, bizType: 'SingleSelect', readable: true, writeable: true },
    { id: 'fld_check_date', name: '盘点日期', type: 5, bizType: 'DateTime', readable: true, writeable: true },
    { id: 'fld_checker', name: '盘点人', type: 11, bizType: 'User', readable: true, writeable: true },
    { id: 'fld_owner', name: '归属人', type: 19, bizType: 'Lookup', readable: true, writeable: false },
    { id: 'fld_asset_name', name: '资产名称', type: 19, bizType: 'Lookup', readable: true, writeable: false },
    { id: 'fld_book_qty', name: '账面数量', type: 2, bizType: 'Number', readable: true, writeable: true },
    { id: 'fld_actual_qty', name: '实盘数量', type: 2, bizType: 'Number', readable: true, writeable: true },
    { id: 'fld_difference', name: '差异数量', type: 2000, bizType: 'Formula', readable: true, writeable: false },
    { id: 'fld_status', name: '盘点状态', type: 3, bizType: 'SingleSelect', readable: true, writeable: true },
    { id: 'fld_remark', name: '备注', type: 1, bizType: 'Text', readable: true, writeable: true },
  ],
  data: [
    { id: 'fld_data_name', name: '数据名称', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_data_type', name: '数据类型', type: 3, bizType: 'SingleSelect', readable: true, writeable: true },
    { id: 'fld_data_value', name: '数据值', type: 2, bizType: 'Number', readable: true, writeable: true },
    { id: 'fld_data_unit', name: '数据单位', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_stat_date', name: '统计日期', type: 5, bizType: 'DateTime', readable: true, writeable: true },
    { id: 'fld_category', name: '所属类目', type: 1, bizType: 'Text', readable: true, writeable: true },
    { id: 'fld_remark', name: '备注', type: 1, bizType: 'Text', readable: true, writeable: true },
  ],
};
