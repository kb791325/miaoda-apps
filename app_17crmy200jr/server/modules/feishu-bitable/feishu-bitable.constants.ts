/**
 * 飞书多维表格直连访问常量
 * - 业务域 → base_token / table_id 映射
 * - 字段映射定义（飞书字段名 → 本地字段名）
 * - 字段元数据（类型、读写权限）
 */

export const BITABLE_BASE_TOKEN = 'GRQMbafkeaKeAjsZvN0c5SoYnYb';

export const BITABLE_TABLE_MAP: Record<string, string> = {
  expenses: 'tblXGS0Lt5tmTGgU',
  fixed_assets: 'tbla5xAVLV5WL9Nr',
  inventory_checks: 'tblkZZwu8huJu9E8',
  inventory_tasks: 'tblkZZwu8huJu9E8',
  categories: 'tblUIioGHldzYaGe',
  data: 'tbl7QRaUuK6MQ1a2',
};

export const BITABLE_PLUGIN_MAP: Record<string, string> = {
  expenses: 'feishu_bitable_expense_sync_1',
  fixed_assets: 'feishu_bitable_asset_sync_1',
  inventory_checks: 'feishu_bitable_inventory_sync_1',
  inventory_tasks: 'feishu_bitable_inventory_sync_1',
  categories: 'feishu_bitable_category_sync_1',
  data: 'feishu_bitable_data_sync_1',
};

export interface BitableFieldDef {
  feishuField: string;
  localField: string;
  bizType: string;
  readable: boolean;
  writeable: boolean;
  cascade?: boolean;
  fallbackTextFeishuField?: string;
}

export interface BitableDomainConfig {
  tableId: string;
  fields: BitableFieldDef[];
}

export const BITABLE_DOMAINS: Record<string, BitableDomainConfig> = {
  expenses: {
    tableId: 'tblXGS0Lt5tmTGgU',
    fields: [
      { feishuField: '支出日期', localField: 'expense_date', bizType: 'DateTime', readable: true, writeable: true },
      { feishuField: '支出金额', localField: 'amount', bizType: 'Currency', readable: true, writeable: true },
      { feishuField: '一级类目', localField: 'category_l1', bizType: 'SingleSelect', readable: true, writeable: true, cascade: true, fallbackTextFeishuField: '一级类目（文本）' },
      { feishuField: '二级类目', localField: 'category_l2', bizType: 'SingleSelect', readable: true, writeable: true, cascade: true, fallbackTextFeishuField: '二级类目（文本）' },
      { feishuField: '付费主体', localField: 'payer_entity', bizType: 'SingleSelect', readable: true, writeable: true },
      { feishuField: '使用楼层', localField: 'floor', bizType: 'SingleSelect', readable: true, writeable: true },
      { feishuField: '部门', localField: 'department', bizType: 'Text', readable: true, writeable: true },
      { feishuField: '采购申请部门', localField: 'purchase_department', bizType: 'Text', readable: true, writeable: true },
      { feishuField: '经办人', localField: 'handler', bizType: 'User', readable: true, writeable: true },
      { feishuField: '支出说明', localField: 'description', bizType: 'Text', readable: true, writeable: true },
      { feishuField: '发票', localField: 'invoice_url', bizType: 'Attachment', readable: true, writeable: true },
      { feishuField: '购买截屏', localField: 'screenshot_url', bizType: 'Attachment', readable: true, writeable: true },
      { feishuField: '年度', localField: 'year', bizType: 'Formula', readable: true, writeable: false },
      { feishuField: '月份', localField: 'month', bizType: 'Formula', readable: true, writeable: false },
      { feishuField: '季度', localField: 'quarter', bizType: 'Formula', readable: true, writeable: false },
    ],
  },
  fixed_assets: {
    tableId: 'tbla5xAVLV5WL9Nr',
    fields: [
      { feishuField: '资产名称', localField: 'asset_name', bizType: 'Text', readable: true, writeable: true },
      { feishuField: '资产类型', localField: 'asset_type', bizType: 'SingleSelect', readable: true, writeable: true },
      { feishuField: '采购日期', localField: 'purchase_date', bizType: 'DateTime', readable: true, writeable: true },
      { feishuField: '采购金额', localField: 'purchase_amount', bizType: 'Currency', readable: true, writeable: true },
      { feishuField: '采购申请部门', localField: 'purchase_department', bizType: 'Text', readable: true, writeable: true },
      { feishuField: '付费主体', localField: 'payer_entity', bizType: 'Text', readable: true, writeable: true },
      { feishuField: '使用楼层', localField: 'floor', bizType: 'Text', readable: true, writeable: true },
      { feishuField: '经办人', localField: 'handler', bizType: 'User', readable: true, writeable: true },
      { feishuField: '资产类目', localField: 'asset_category', bizType: 'Text', readable: true, writeable: true },
      { feishuField: '归属人', localField: 'owner', bizType: 'User', readable: true, writeable: true },
      { feishuField: '当前库存', localField: 'current_stock', bizType: 'Number', readable: true, writeable: true },
      { feishuField: '资产状态', localField: 'asset_status', bizType: 'SingleSelect', readable: true, writeable: true },
    ],
  },
  inventory_checks: {
    tableId: 'tblkZZwu8huJu9E8',
    fields: [
      { feishuField: '盘点单号', localField: 'check_no', bizType: 'Text', readable: true, writeable: true },
      { feishuField: '盘点年度', localField: 'check_year', bizType: 'Number', readable: true, writeable: true },
      { feishuField: '盘点月份', localField: 'check_month', bizType: 'SingleSelect', readable: true, writeable: true },
      { feishuField: '盘点日期', localField: 'check_date', bizType: 'DateTime', readable: true, writeable: true },
      { feishuField: '盘点人', localField: 'checker', bizType: 'User', readable: true, writeable: true },
      { feishuField: '归属人', localField: 'owner', bizType: 'Lookup', readable: true, writeable: false },
      { feishuField: '资产名称', localField: 'asset_name', bizType: 'Lookup', readable: true, writeable: false },
      { feishuField: '账面数量', localField: 'book_quantity', bizType: 'Number', readable: true, writeable: true },
      { feishuField: '实盘数量', localField: 'actual_quantity', bizType: 'Number', readable: true, writeable: true },
      { feishuField: '差异数量', localField: 'difference', bizType: 'Formula', readable: true, writeable: false },
      { feishuField: '盘点状态', localField: 'status', bizType: 'SingleSelect', readable: true, writeable: true },
      { feishuField: '备注', localField: 'remark', bizType: 'Text', readable: true, writeable: true },
    ],
  },
  inventory_tasks: {
    tableId: 'tblkZZwu8huJu9E8',
    fields: [
      { feishuField: '盘点单号', localField: 'check_no', bizType: 'Text', readable: true, writeable: true },
      { feishuField: '盘点年度', localField: 'check_year', bizType: 'Number', readable: true, writeable: true },
      { feishuField: '盘点月份', localField: 'check_month', bizType: 'SingleSelect', readable: true, writeable: true },
      { feishuField: '盘点日期', localField: 'check_date', bizType: 'DateTime', readable: true, writeable: true },
      { feishuField: '盘点人', localField: 'checker', bizType: 'User', readable: true, writeable: true },
      { feishuField: '归属人', localField: 'owner', bizType: 'Lookup', readable: true, writeable: false },
      { feishuField: '资产名称', localField: 'asset_name', bizType: 'Lookup', readable: true, writeable: false },
      { feishuField: '账面数量', localField: 'book_quantity', bizType: 'Number', readable: true, writeable: true },
      { feishuField: '实盘数量', localField: 'actual_quantity', bizType: 'Number', readable: true, writeable: true },
      { feishuField: '差异数量', localField: 'difference', bizType: 'Formula', readable: true, writeable: false },
      { feishuField: '盘点状态', localField: 'status', bizType: 'SingleSelect', readable: true, writeable: true },
      { feishuField: '备注', localField: 'remark', bizType: 'Text', readable: true, writeable: true },
    ],
  },
  categories: {
    tableId: 'tblUIioGHldzYaGe',
    fields: [
      { feishuField: '一级类目', localField: 'category_l1', bizType: 'SingleSelect', readable: true, writeable: true, cascade: true, fallbackTextFeishuField: '一级类目（文本）' },
      { feishuField: '二级类目', localField: 'category_l2', bizType: 'SingleSelect', readable: true, writeable: true, cascade: true, fallbackTextFeishuField: '二级类目（文本）' },
    ],
  },
  data: {
    tableId: 'tbl7QRaUuK6MQ1a2',
    fields: [
      { feishuField: '数据名称', localField: 'data_name', bizType: 'Text', readable: true, writeable: true },
      { feishuField: '数据类型', localField: 'data_type', bizType: 'SingleSelect', readable: true, writeable: true },
      { feishuField: '数据值', localField: 'data_value', bizType: 'Number', readable: true, writeable: true },
      { feishuField: '数据单位', localField: 'data_unit', bizType: 'Text', readable: true, writeable: true },
      { feishuField: '统计日期', localField: 'stat_date', bizType: 'DateTime', readable: true, writeable: true },
      { feishuField: '所属类目', localField: 'category', bizType: 'Text', readable: true, writeable: true },
      { feishuField: '备注', localField: 'remark', bizType: 'Text', readable: true, writeable: true },
    ],
  },
};

export const PULL_PAGE_SIZE = 500;
export const BATCH_WRITE_LIMIT = 500;
