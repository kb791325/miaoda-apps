/**
 * feishu-bitable 插件实例 ID 常量
 * 实例由 plugin_instance 工具创建（平台分配的实际 ID），
 * 各业务模块服务端通过 BitableClient / CapabilityService 调用，禁止散落硬编码。
 */
export const CAPABILITY_INSTANCE_IDS = {
  order: 'bitable_order_v2',
  /** 订单表财务字段同步（费用总金额/成本总金额/利润/订单总金额/利润率读写） */
  orderFinance: 'bitable_order_finance_sync_v2_1',
  product: 'bitable_product_1',
  customer: 'bitable_customer_1',
  /** 库存变动表 */
  stockChange: 'bitable_stock_change_1',
  /** 库存变动表关联字段维护（关联订单/关联发货单链接读写） */
  stockChangeLink: 'bitable_stock_change_link_maintain_1',
  syncFollowUp: 'bitable_follow_up_record_sync_1',
  syncShipment: 'bitable_shipping_invoice_sync_1',
  syncShipmentItem: 'bitable_shipping_detail_2',
  syncCustomer: 'bitable_customer_crm_sync_1',
  /** 客户表「跟进记录」反向关联维护（既有实例快照不含该字段） */
  customerFollowUpLink: 'bitable_customer_reverse_link_maintain_1',
} as const;

/** Base appToken，用于需要引用同一 Base 的场景 */
export const BITABLE_APP_TOKEN = 'Xz5cb7g4xah3AvslcbdcBuZznMe';

/** 同步目标表 table_id（跟进记录 / 发货单 / 发货明细 / 客户） */
export const SYNC_BASE_TABLE_IDS = {
  followUp: 'tblBIy9zMMHo539k',
  shipment: 'tbluBL1QrKdtIJnh',
  shipmentItem: 'tblhB0yTogllKFpK',
  customer: 'tbl9qtdri9POmNkz',
} as const;
