// ---- plugin:bitable_order_1 ----
// ============================================================
// 插件 bitable_order_1 (订单表实例 bitable_order) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableOrderOneInput {
  /** [object Object] */
  records: {
    record: {
      '收货地址': string;
      '快递单号': string;
      '客户': unknown;
      '下单时间': number;
      '数量': number;
      '订单状态': string;
      '支付状态': string;
      '备注': string;
      '商品': unknown;
      '订单号': string;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_order_1').call<BitableOrderOneOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableOrderOneOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}
// ---- end:bitable_order_1 ----

// ---- plugin:bitable_product_1 ----
// ============================================================
// 插件 bitable_product_1 (商品库存表) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableProductOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '备注'?: string;
      '商品名称'?: string;
      'SKU编码'?: string;
      '商品分类'?: string;
      '品牌'?: string;
      '采购单价'?: number;
      '安全库存预警值'?: number;
      '供应商'?: string;
      '规格型号'?: string;
      '销售单价'?: number;
      '总库存数量'?: number;
      '仓库位置'?: string;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_product_1').call<BitableProductOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableProductOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableProductOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '仓库位置'?: string;
      '备注'?: string;
      '商品名称'?: string;
      '商品分类'?: string;
      '品牌'?: string;
      '安全库存预警值'?: number;
      '总库存数量'?: number;
      '供应商'?: string;
      'SKU编码'?: string;
      '规格型号'?: string;
      '采购单价'?: number;
      '销售单价'?: number;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_product_1').call<BitableProductOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableProductOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableProductOneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      value?: string[];
      fieldName: string;
      operator: string;
    }[];
  };
}

/**
 * capabilityClient.load('bitable_product_1').call<BitableProductOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"仓库位置":null,"待发货占用":{},"库存状态":null,"SKU编码":null,"品牌":null,"规格型号":null,"备注":null,"可用库存":null,"商品分类":"示例文本","销售单价":0,"安全库存预警值":0,"供应商":null,"商品名称":{},"采购单价":0,"总库存数量":0}}]}
 */
export interface BitableProductOneSearchrecordsOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '仓库位置'?: unknown;
      '待发货占用'?: {
        bizType: string;
        value?: unknown;
      };
      '库存状态'?: unknown;
      'SKU编码'?: unknown;
      '品牌'?: unknown;
      '规格型号'?: unknown;
      '备注'?: unknown;
      '可用库存'?: unknown;
      '商品分类'?: string;
      '销售单价'?: number;
      '安全库存预警值'?: number;
      '供应商'?: unknown;
      '商品名称'?: {
        text: string;
      };
      '采购单价'?: number;
      '总库存数量'?: number;
    };
  }[];
}
// ---- end:bitable_product_1 ----

// ---- plugin:bitable_customer_1 ----
// ============================================================
// 插件 bitable_customer_1 (飞书多维表格客户表实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableCustomerOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '客户姓名'?: string;
      '联系电话'?: string;
      '收货地址'?: string;
      '微信号'?: string;
      '客户来源'?: string;
      '客户等级'?: string;
      '备注'?: string;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_customer_1').call<BitableCustomerOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableCustomerOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableCustomerOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('bitable_customer_1').call<BitableCustomerOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { record, id } = result;
 * 返回值形如：
 *   {"record":{"客户等级":"示例文本","备注":null,"联系电话":null,"收货地址":null,"微信号":null,"累计消费金额":null,"客户姓名":{"text":"示例文本"},"客户来源":"示例文本","累计订单数":{"bizType":"Text","value":null}},"id":"示例文本"}
 */
export interface BitableCustomerOneGetrecordOutput {
  /** [object Object] */
  record?: {
    '客户等级'?: string;
    '备注'?: unknown;
    '联系电话'?: unknown;
    '收货地址'?: unknown;
    '微信号'?: unknown;
    '累计消费金额'?: unknown;
    '客户姓名'?: {
      text: string;
    };
    '客户来源'?: string;
    '累计订单数'?: {
      bizType: string;
      value?: unknown;
    };
  };
  /** [object Object] */
  id: string;
}

export interface BitableCustomerOneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      fieldName: string;
      operator: string;
      value?: string[];
    }[];
  };
}

/**
 * capabilityClient.load('bitable_customer_1').call<BitableCustomerOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"客户姓名":{},"联系电话":null,"微信号":null,"客户等级":"示例文本","备注":null,"累计订单数":{},"累计消费金额":null,"收货地址":null,"客户来源":"示例文本"}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface BitableCustomerOneSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '客户姓名'?: {
        text: string;
      };
      '联系电话'?: unknown;
      '微信号'?: unknown;
      '客户等级'?: string;
      '备注'?: unknown;
      '累计订单数'?: {
        bizType: string;
        value?: unknown;
      };
      '累计消费金额'?: unknown;
      '收货地址'?: unknown;
      '客户来源'?: string;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:bitable_customer_1 ----

// ---- plugin:bitable_stock_change_1 ----
// ============================================================
// 插件 bitable_stock_change_1 (库存变动表) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableStockChangeOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '变动编号'?: string;
      '商品'?: unknown;
      '变动类型'?: string;
      '变动数量'?: number;
      '变动时间'?: number;
      '备注'?: string;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_stock_change_1').call<BitableStockChangeOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableStockChangeOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableStockChangeOneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      fieldName: string;
      operator: string;
      value?: string[];
    }[];
  };
}

/**
 * capabilityClient.load('bitable_stock_change_1').call<BitableStockChangeOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"变动编号":{},"商品":null,"变动类型":"示例文本","变动数量":0,"变动时间":0,"备注":null}}]}
 */
export interface BitableStockChangeOneSearchrecordsOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '变动编号'?: {
        text: string;
      };
      '商品'?: unknown;
      '变动类型'?: string;
      '变动数量'?: number;
      '变动时间'?: number;
      '备注'?: unknown;
    };
  }[];
}
// ---- end:bitable_stock_change_1 ----

// ---- plugin:bitable_order_v2 ----
// ============================================================
// 插件 bitable_order_v2 (订单表实例v2) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableOrderV2BatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '订单号': string;
      '来源平台': string;
      '物流公司': string;
      '收货地址': string;
      '发货时间': number;
      '下单时间': number;
      '数量': number;
      '订单状态': string;
      '支付状态': string;
      '快递单号': string;
      '备注': string;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_order_v2').call<BitableOrderV2BatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableOrderV2BatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableOrderV2SearchrecordsInput {
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conditions: {
      operator: string;
      value: string[];
      fieldName: string;
    }[];
    conjunction: string;
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
}

/**
 * capabilityClient.load('bitable_order_v2').call<BitableOrderV2SearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"订单号":{},"快递单号":null,"SKU编码":null,"销售单价":null,"支付状态":"示例文本","收货地址":null,"备注":null,"发货时间":0,"下单时间":0,"数量":0,"订单状态":"示例文本","商品名称":null,"来源平台":"示例文本","物流公司":"示例文本","客户电话":{},"订单金额":null}}]}
 */
export interface BitableOrderV2SearchrecordsOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '订单号': {
        text: string;
      };
      '快递单号': unknown;
      'SKU编码': unknown;
      '销售单价': unknown;
      '支付状态': string;
      '收货地址': unknown;
      '备注': unknown;
      '发货时间': number;
      '下单时间': number;
      '数量': number;
      '订单状态': string;
      '商品名称': unknown;
      '来源平台': string;
      '物流公司': string;
      '客户电话': {
        bizType: string;
        value: unknown;
      };
      '订单金额': unknown;
    };
  }[];
}
// ---- end:bitable_order_v2 ----

// ---- plugin:bitable_invoice_sync_1 ----
// ============================================================
// 插件 bitable_invoice_sync_1 (发货单表读写实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableInvoiceSyncOneAggregatequeryInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      fieldName: string;
      operator: string;
      value?: string[];
    }[];
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    alias?: string;
    fieldName: string;
    aggregation: string;
  }[];
}

/**
 * capabilityClient.load('bitable_invoice_sync_1').call<BitableInvoiceSyncOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, result } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","result":[{}]}
 */
export interface BitableInvoiceSyncOneAggregatequeryOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  result: {

  }[];
}

export interface BitableInvoiceSyncOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('bitable_invoice_sync_1').call<BitableInvoiceSyncOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableInvoiceSyncOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableInvoiceSyncOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('bitable_invoice_sync_1').call<BitableInvoiceSyncOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableInvoiceSyncOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableInvoiceSyncOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('bitable_invoice_sync_1').call<BitableInvoiceSyncOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface BitableInvoiceSyncOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface BitableInvoiceSyncOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('bitable_invoice_sync_1').call<BitableInvoiceSyncOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{}}
 */
export interface BitableInvoiceSyncOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {

  };
}

export interface BitableInvoiceSyncOneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      fieldName: string;
      operator: string;
      value?: string[];
    }[];
  };
}

/**
 * capabilityClient.load('bitable_invoice_sync_1').call<BitableInvoiceSyncOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}],"hasMore":false}
 */
export interface BitableInvoiceSyncOneSearchrecordsOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
  /** [object Object] */
  hasMore: boolean;
}
// ---- end:bitable_invoice_sync_1 ----

// ---- plugin:bitable_shipping_detail_1 ----
// ============================================================
// 插件 bitable_shipping_detail_1 (飞书多维表格发货明细表读写实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableShippingDetailOneAggregatequeryInput {
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      fieldName: string;
      operator: string;
      value?: string[];
    }[];
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    fieldName: string;
    aggregation: string;
    alias?: string;
  }[];
  /** [object Object] */
  pageToken?: string;
}

/**
 * capabilityClient.load('bitable_shipping_detail_1').call<BitableShippingDetailOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface BitableShippingDetailOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface BitableShippingDetailOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('bitable_shipping_detail_1').call<BitableShippingDetailOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableShippingDetailOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableShippingDetailOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('bitable_shipping_detail_1').call<BitableShippingDetailOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableShippingDetailOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableShippingDetailOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('bitable_shipping_detail_1').call<BitableShippingDetailOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface BitableShippingDetailOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface BitableShippingDetailOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('bitable_shipping_detail_1').call<BitableShippingDetailOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{}}
 */
export interface BitableShippingDetailOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {

  };
}

export interface BitableShippingDetailOneSearchrecordsInput {
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      fieldName: string;
      operator: string;
      value?: string[];
    }[];
  };
  /** [object Object] */
  pageToken?: string;
}

/**
 * capabilityClient.load('bitable_shipping_detail_1').call<BitableShippingDetailOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { total, records, hasMore, ... } = result;
 * 返回值形如：
 *   {"total":0,"records":[{"id":"示例文本","record":{}}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface BitableShippingDetailOneSearchrecordsOutput {
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}
// ---- end:bitable_shipping_detail_1 ----

// ---- plugin:bitable_follow_up_record_1 ----
// ============================================================
// 插件 bitable_follow_up_record_1 (飞书多维表格「跟进记录表」读写实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableFollowUpRecordOneAggregatequeryInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      fieldName: string;
      operator: string;
      value?: string[];
    }[];
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    fieldName: string;
    aggregation: string;
    alias?: string;
  }[];
}

/**
 * capabilityClient.load('bitable_follow_up_record_1').call<BitableFollowUpRecordOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface BitableFollowUpRecordOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface BitableFollowUpRecordOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '客户名称'?: string;
      '跟进人'?: number[];
      '跟进时间'?: number;
      '跟进内容'?: string;
      '跟进状态'?: string;
      '下次跟进时间'?: number;
      '记录ID'?: string;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_follow_up_record_1').call<BitableFollowUpRecordOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableFollowUpRecordOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableFollowUpRecordOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '跟进时间'?: number;
      '跟进内容'?: string;
      '跟进状态'?: string;
      '下次跟进时间'?: number;
      '记录ID'?: string;
      '客户名称'?: string;
      '跟进人'?: number[];
    };
  }[];
}

/**
 * capabilityClient.load('bitable_follow_up_record_1').call<BitableFollowUpRecordOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableFollowUpRecordOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableFollowUpRecordOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('bitable_follow_up_record_1').call<BitableFollowUpRecordOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface BitableFollowUpRecordOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface BitableFollowUpRecordOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('bitable_follow_up_record_1').call<BitableFollowUpRecordOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"跟进人":[0],"跟进时间":0,"跟进状态":"示例文本","创建时间":0,"记录ID":{"text":"示例文本"},"客户名称":null,"跟进内容":null,"下次跟进时间":0,"更新时间":0}}
 */
export interface BitableFollowUpRecordOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '跟进人'?: number[];
    '跟进时间'?: number;
    '跟进状态'?: string;
    '创建时间'?: number;
    '记录ID'?: {
      text: string;
    };
    '客户名称'?: unknown;
    '跟进内容'?: unknown;
    '下次跟进时间'?: number;
    '更新时间'?: number;
  };
}

export interface BitableFollowUpRecordOneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      fieldName: string;
      operator: string;
      value?: string[];
    }[];
  };
}

/**
 * capabilityClient.load('bitable_follow_up_record_1').call<BitableFollowUpRecordOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"下次跟进时间":0,"创建时间":0,"更新时间":0,"客户名称":null,"跟进内容":null,"跟进时间":0,"跟进状态":"示例文本","记录ID":{},"跟进人":[]}}]}
 */
export interface BitableFollowUpRecordOneSearchrecordsOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '下次跟进时间'?: number;
      '创建时间'?: number;
      '更新时间'?: number;
      '客户名称'?: unknown;
      '跟进内容'?: unknown;
      '跟进时间'?: number;
      '跟进状态'?: string;
      '记录ID'?: {
        text: string;
      };
      '跟进人'?: number[];
    };
  }[];
}
// ---- end:bitable_follow_up_record_1 ----

// ---- plugin:bitable_shipping_invoice_sync_1 ----
// ============================================================
// 插件 bitable_shipping_invoice_sync_1 (飞书多维表格发货单表同步实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableShippingInvoiceSyncOneAggregatequeryInput {
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      operator: string;
      value?: string[];
      fieldName: string;
    }[];
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    aggregation: string;
    alias?: string;
    fieldName: string;
  }[];
  /** [object Object] */
  pageToken?: string;
}

/**
 * capabilityClient.load('bitable_shipping_invoice_sync_1').call<BitableShippingInvoiceSyncOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, result, hasMore } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","result":[{}],"hasMore":false}
 */
export interface BitableShippingInvoiceSyncOneAggregatequeryOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
}

export interface BitableShippingInvoiceSyncOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '发货单号'?: string;
      '关联订单'?: unknown;
      '发货状态'?: string;
      '物流公司'?: string;
      '型号核对结果'?: string;
      '发货明细'?: unknown;
      '运单号'?: string;
      '发货时间'?: number;
      '签收时间'?: number;
      '发货人'?: number[];
      '核对异常说明'?: string;
      '备注'?: string;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_shipping_invoice_sync_1').call<BitableShippingInvoiceSyncOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableShippingInvoiceSyncOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableShippingInvoiceSyncOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '发货状态'?: string;
      '运单号'?: string;
      '发货时间'?: number;
      '签收时间'?: number;
      '核对异常说明'?: string;
      '发货明细'?: unknown;
      '发货单号'?: string;
      '关联订单'?: unknown;
      '物流公司'?: string;
      '发货人'?: number[];
      '型号核对结果'?: string;
      '备注'?: string;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_shipping_invoice_sync_1').call<BitableShippingInvoiceSyncOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableShippingInvoiceSyncOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableShippingInvoiceSyncOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('bitable_shipping_invoice_sync_1').call<BitableShippingInvoiceSyncOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface BitableShippingInvoiceSyncOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface BitableShippingInvoiceSyncOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('bitable_shipping_invoice_sync_1').call<BitableShippingInvoiceSyncOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"备注":null,"发货明细":null,"创建时间":0,"发货单号":{"text":"示例文本"},"核对异常说明":null,"物流公司":"示例文本","运单号":null,"发货时间":0,"签收时间":0,"发货人":[0],"型号核对结果":"示例文本","关联订单":null,"发货状态":"示例文本"}}
 */
export interface BitableShippingInvoiceSyncOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '备注'?: unknown;
    '发货明细'?: unknown;
    '创建时间'?: number;
    '发货单号'?: {
      text: string;
    };
    '核对异常说明'?: unknown;
    '物流公司'?: string;
    '运单号'?: unknown;
    '发货时间'?: number;
    '签收时间'?: number;
    '发货人'?: number[];
    '型号核对结果'?: string;
    '关联订单'?: unknown;
    '发货状态'?: string;
  };
}

export interface BitableShippingInvoiceSyncOneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conditions?: {
      value?: string[];
      fieldName: string;
      operator: string;
    }[];
    conjunction?: string;
  };
}

/**
 * capabilityClient.load('bitable_shipping_invoice_sync_1').call<BitableShippingInvoiceSyncOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"运单号":null,"型号核对结果":"示例文本","备注":null,"发货明细":null,"创建时间":0,"发货单号":{},"发货状态":"示例文本","发货时间":0,"签收时间":0,"发货人":[],"核对异常说明":null,"关联订单":null,"物流公司":"示例文本"}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface BitableShippingInvoiceSyncOneSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '运单号'?: unknown;
      '型号核对结果'?: string;
      '备注'?: unknown;
      '发货明细'?: unknown;
      '创建时间'?: number;
      '发货单号'?: {
        text: string;
      };
      '发货状态'?: string;
      '发货时间'?: number;
      '签收时间'?: number;
      '发货人'?: number[];
      '核对异常说明'?: unknown;
      '关联订单'?: unknown;
      '物流公司'?: string;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:bitable_shipping_invoice_sync_1 ----

// ---- plugin:bitable_follow_up_record_sync_1 ----
// ============================================================
// 插件 bitable_follow_up_record_sync_1 (飞书多维表格「跟进记录表」同步实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableFollowUpRecordSyncOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '预计预算'?: number;
      '下次跟进时间'?: number;
      '跟进编号'?: string;
      '跟进人'?: number[];
      '跟进时间'?: number;
      '跟进方式'?: string;
      '客户意向度'?: string;
      '关联客户'?: unknown;
      '跟进内容'?: string;
      '需求产品'?: unknown;
      '阶段变化'?: string;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_follow_up_record_sync_1').call<BitableFollowUpRecordSyncOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableFollowUpRecordSyncOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableFollowUpRecordSyncOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '客户意向度'?: string;
      '预计预算'?: number;
      '阶段变化'?: string;
      '跟进时间'?: number;
      '跟进内容'?: string;
      '跟进方式'?: string;
      '需求产品'?: unknown;
      '下次跟进时间'?: number;
      '跟进编号'?: string;
      '关联客户'?: unknown;
      '跟进人'?: number[];
    };
  }[];
}

/**
 * capabilityClient.load('bitable_follow_up_record_sync_1').call<BitableFollowUpRecordSyncOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableFollowUpRecordSyncOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableFollowUpRecordSyncOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('bitable_follow_up_record_sync_1').call<BitableFollowUpRecordSyncOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"跟进编号":{"text":"示例文本"},"跟进方式":"示例文本","客户意向度":"示例文本","需求产品":null,"阶段变化":"示例文本","下次跟进时间":0,"创建时间":0,"关联客户":null,"跟进人":[0],"跟进时间":0,"跟进内容":null,"预计预算":0}}
 */
export interface BitableFollowUpRecordSyncOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '跟进编号'?: {
      text: string;
    };
    '跟进方式'?: string;
    '客户意向度'?: string;
    '需求产品'?: unknown;
    '阶段变化'?: string;
    '下次跟进时间'?: number;
    '创建时间'?: number;
    '关联客户'?: unknown;
    '跟进人'?: number[];
    '跟进时间'?: number;
    '跟进内容'?: unknown;
    '预计预算'?: number;
  };
}
// ---- end:bitable_follow_up_record_sync_1 ----

// ---- plugin:bitable_shipping_detail_2 ----
// ============================================================
// 插件 bitable_shipping_detail_2 (飞书多维表格发货明细表同步实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableShippingDetailTwoAggregatequeryInput {
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      fieldName: string;
      operator: string;
      value?: string[];
    }[];
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    fieldName: string;
    aggregation: string;
    alias?: string;
  }[];
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
}

/**
 * capabilityClient.load('bitable_shipping_detail_2').call<BitableShippingDetailTwoAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface BitableShippingDetailTwoAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface BitableShippingDetailTwoBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '库存扣减状态'?: string;
      '备注'?: string;
      '明细编号'?: string;
      '关联发货单'?: unknown;
      '订单要求型号'?: string;
      '发货数量'?: number;
      '型号是否一致'?: string;
      '关联商品'?: unknown;
      '实际发货型号'?: string;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_shipping_detail_2').call<BitableShippingDetailTwoBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableShippingDetailTwoBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableShippingDetailTwoBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '订单要求型号'?: string;
      '备注'?: string;
      '实际发货型号'?: string;
      '发货数量'?: number;
      '型号是否一致'?: string;
      '库存扣减状态'?: string;
      '明细编号'?: string;
      '关联发货单'?: unknown;
      '关联商品'?: unknown;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_shipping_detail_2').call<BitableShippingDetailTwoBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableShippingDetailTwoBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableShippingDetailTwoDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('bitable_shipping_detail_2').call<BitableShippingDetailTwoDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface BitableShippingDetailTwoDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface BitableShippingDetailTwoGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('bitable_shipping_detail_2').call<BitableShippingDetailTwoGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"订单要求型号":null,"实际发货型号":null,"库存扣减状态":"示例文本","发货数量":0,"型号是否一致":"示例文本","备注":null,"明细编号":{"text":"示例文本"},"关联发货单":null,"关联商品":null}}
 */
export interface BitableShippingDetailTwoGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '订单要求型号'?: unknown;
    '实际发货型号'?: unknown;
    '库存扣减状态'?: string;
    '发货数量'?: number;
    '型号是否一致'?: string;
    '备注'?: unknown;
    '明细编号'?: {
      text: string;
    };
    '关联发货单'?: unknown;
    '关联商品'?: unknown;
  };
}

export interface BitableShippingDetailTwoSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    desc?: boolean;
    fieldName: string;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      fieldName: string;
      operator: string;
      value?: string[];
    }[];
  };
}

/**
 * capabilityClient.load('bitable_shipping_detail_2').call<BitableShippingDetailTwoSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"型号是否一致":"示例文本","实际发货型号":null,"发货数量":0,"关联商品":null,"订单要求型号":null,"库存扣减状态":"示例文本","备注":null,"明细编号":{},"关联发货单":null}}],"hasMore":false}
 */
export interface BitableShippingDetailTwoSearchrecordsOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '型号是否一致'?: string;
      '实际发货型号'?: unknown;
      '发货数量'?: number;
      '关联商品'?: unknown;
      '订单要求型号'?: unknown;
      '库存扣减状态'?: string;
      '备注'?: unknown;
      '明细编号'?: {
        text: string;
      };
      '关联发货单'?: unknown;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
}
// ---- end:bitable_shipping_detail_2 ----

// ---- plugin:bitable_customer_crm_sync_1 ----
// ============================================================
// 插件 bitable_customer_crm_sync_1 (飞书多维表格客户表CRM扩展字段同步实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableCustomerCrmSyncOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    record: {
      '客户姓名'?: string;
      '客户等级'?: string;
      '收货地址'?: string;
      '负责销售'?: number[];
      '销售阶段'?: string;
      '预计成交时间'?: number;
      '下次跟进时间'?: number;
      '客户来源'?: string;
      '联系电话'?: string;
      '微信号'?: string;
      '备注'?: string;
      '首次接触时间'?: number;
    };
    id: string;
  }[];
}

/**
 * capabilityClient.load('bitable_customer_crm_sync_1').call<BitableCustomerCrmSyncOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableCustomerCrmSyncOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableCustomerCrmSyncOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('bitable_customer_crm_sync_1').call<BitableCustomerCrmSyncOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"联系电话":null,"微信号":null,"收货地址":null,"备注":null,"负责销售":[0],"销售阶段":"示例文本","首次接触时间":0,"客户姓名":{"text":"示例文本"},"客户来源":"示例文本","预计成交时间":0,"下次跟进时间":0,"客户等级":"示例文本"}}
 */
export interface BitableCustomerCrmSyncOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '联系电话'?: unknown;
    '微信号'?: unknown;
    '收货地址'?: unknown;
    '备注'?: unknown;
    '负责销售'?: number[];
    '销售阶段'?: string;
    '首次接触时间'?: number;
    '客户姓名'?: {
      text: string;
    };
    '客户来源'?: string;
    '预计成交时间'?: number;
    '下次跟进时间'?: number;
    '客户等级'?: string;
  };
}

export interface BitableCustomerCrmSyncOneSearchrecordsInput {
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conditions?: {
      fieldName: string;
      operator: string;
      value?: string[];
    }[];
    conjunction?: string;
  };
  /** [object Object] */
  pageToken?: string;
}

/**
 * capabilityClient.load('bitable_customer_crm_sync_1').call<BitableCustomerCrmSyncOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"微信号":null,"收货地址":null,"负责销售":[],"销售阶段":"示例文本","客户姓名":{},"客户等级":"示例文本","客户来源":"示例文本","联系电话":null,"备注":null,"首次接触时间":0,"预计成交时间":0,"下次跟进时间":0}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface BitableCustomerCrmSyncOneSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '微信号'?: unknown;
      '收货地址'?: unknown;
      '负责销售'?: number[];
      '销售阶段'?: string;
      '客户姓名'?: {
        text: string;
      };
      '客户等级'?: string;
      '客户来源'?: string;
      '联系电话'?: unknown;
      '备注'?: unknown;
      '首次接触时间'?: number;
      '预计成交时间'?: number;
      '下次跟进时间'?: number;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:bitable_customer_crm_sync_1 ----

// ---- plugin:bitable_customer_reverse_link_maintain_1 ----
// ============================================================
// 插件 bitable_customer_reverse_link_maintain_1 (客户表反向关联维护实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableCustomerReverseLinkMaintainOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '跟进记录'?: unknown;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_customer_reverse_link_maintain_1').call<BitableCustomerReverseLinkMaintainOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableCustomerReverseLinkMaintainOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableCustomerReverseLinkMaintainOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('bitable_customer_reverse_link_maintain_1').call<BitableCustomerReverseLinkMaintainOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"跟进记录":null}}
 */
export interface BitableCustomerReverseLinkMaintainOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '跟进记录'?: unknown;
  };
}
// ---- end:bitable_customer_reverse_link_maintain_1 ----

// ---- plugin:bitable_stock_change_link_maintain_1 ----
// ============================================================
// 插件 bitable_stock_change_link_maintain_1 (库存变动表关联字段维护实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableStockChangeLinkMaintainOneAggregatequeryInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      fieldName: string;
      operator: string;
      value?: string[];
    }[];
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    fieldName: string;
    aggregation: string;
    alias?: string;
  }[];
}

/**
 * capabilityClient.load('bitable_stock_change_link_maintain_1').call<BitableStockChangeLinkMaintainOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, result } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","result":[{}]}
 */
export interface BitableStockChangeLinkMaintainOneAggregatequeryOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  result: {

  }[];
}

export interface BitableStockChangeLinkMaintainOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '关联订单'?: unknown;
      '关联发货单'?: unknown;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_stock_change_link_maintain_1').call<BitableStockChangeLinkMaintainOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableStockChangeLinkMaintainOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableStockChangeLinkMaintainOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '关联订单'?: unknown;
      '关联发货单'?: unknown;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_stock_change_link_maintain_1').call<BitableStockChangeLinkMaintainOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableStockChangeLinkMaintainOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableStockChangeLinkMaintainOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('bitable_stock_change_link_maintain_1').call<BitableStockChangeLinkMaintainOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface BitableStockChangeLinkMaintainOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface BitableStockChangeLinkMaintainOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('bitable_stock_change_link_maintain_1').call<BitableStockChangeLinkMaintainOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"变动编号":{"text":"示例文本"},"变动类型":"示例文本","备注":null,"关联订单":null,"关联发货单":null}}
 */
export interface BitableStockChangeLinkMaintainOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '变动编号'?: {
      text: string;
    };
    '变动类型'?: string;
    '备注'?: unknown;
    '关联订单'?: unknown;
    '关联发货单'?: unknown;
  };
}

export interface BitableStockChangeLinkMaintainOneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction?: string;
    conditions?: {
      operator: string;
      value?: string[];
      fieldName: string;
    }[];
  };
}

/**
 * capabilityClient.load('bitable_stock_change_link_maintain_1').call<BitableStockChangeLinkMaintainOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"备注":null,"关联订单":null,"关联发货单":null,"变动编号":{},"变动类型":"示例文本"}}]}
 */
export interface BitableStockChangeLinkMaintainOneSearchrecordsOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '备注'?: unknown;
      '关联订单'?: unknown;
      '关联发货单'?: unknown;
      '变动编号'?: {
        text: string;
      };
      '变动类型'?: string;
    };
  }[];
}
// ---- end:bitable_stock_change_link_maintain_1 ----

// ---- plugin:product_image_info_extraction_1 ----
// ============================================================
// 插件 product_image_info_extraction_1 (商品图片信息提取) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface ProductImageInfoExtractionOneInput {
  /** 待识别的商品图片（商品包装、标签、说明书照片） */
  product_image: string[];
}

/**
 * capabilityClient.load('product_image_info_extraction_1').call<ProductImageInfoExtractionOneOutput>('imageToJson', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { product_name, brand, specification_model, suggested_price } = result;
 * 返回值形如：
 *   {"product_name":"示例文本","brand":"示例文本","specification_model":"示例文本","suggested_price":0}
 */
export interface ProductImageInfoExtractionOneOutput {
  /** 图片中可识别出的商品完整名称，识别不到则为空字符串 */
  product_name: string;
  /** 商品品牌名称，识别不到则为空字符串 */
  brand: string;
  /** 商品规格或型号标识，识别不到则为空字符串 */
  specification_model: string;
  /** 图片中识别出的建议销售单价（元），识别不到则为 0 */
  suggested_price: number;
}
// ---- end:product_image_info_extraction_1 ----

// ---- plugin:bitable_order_finance_1 ----
// ============================================================
// 插件 bitable_order_finance_1 (订单表财务字段同步实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableOrderFinanceOneInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('bitable_order_finance_1').call<BitableOrderFinanceOneOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"订单号":{"text":"示例文本"},"费用总金额":0,"成本总金额":0,"利润":0,"订单总金额":0}}
 */
export interface BitableOrderFinanceOneOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '订单号'?: {
      text: string;
    };
    '费用总金额'?: number;
    '成本总金额'?: number;
    '利润'?: number;
    '订单总金额'?: number;
  };
}
// ---- end:bitable_order_finance_1 ----

// ---- plugin:follow_up_reminder_notify_1 ----
// ============================================================
// 插件 follow_up_reminder_notify_1 (客户跟进提醒通知) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FollowUpReminderNotifyOneInput {
  /** 飞书卡片标题 */
  title: string;
  /** 飞书卡片 markdown 正文 */
  content?: string;
  /** 接收提醒的 miaoda 用户 ID 数组（负责销售） */
  receiverIds: string[];
}

/**
 * capabilityClient.load('follow_up_reminder_notify_1').call<FollowUpReminderNotifyOneOutput>('send_feishu_message', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FollowUpReminderNotifyOneOutput {
  /** [object Object] */
  success: boolean;
}
// ---- end:follow_up_reminder_notify_1 ----