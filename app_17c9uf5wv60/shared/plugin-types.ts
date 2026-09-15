// ---- plugin:stock_query_text_to_json_1 ----
// ============================================================
// 插件 stock_query_text_to_json_1 (库存查询文本解析) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface StockQueryTextToJsonOneInput {
  /** 用户输入的自然语言库存查询文本 */
  query_text: string;
}

/**
 * capabilityClient.load('stock_query_text_to_json_1').call<StockQueryTextToJsonOneOutput>('textToJson', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { brand, numericValue, warehouse, ... } = result;
 * 返回值形如：
 *   {"brand":"示例文本","numericValue":"示例文本","warehouse":"示例文本","keyword":"示例文本","sortField":"示例文本","sortOrder":"示例文本","limit":"示例文本","queryType":"示例文本","operator":"示例文本","category":"示例文本"}
 */
export interface StockQueryTextToJsonOneOutput {
  /** 品牌名称，无相关内容时为空字符串 */
  brand: string;
  /** 数值阈值，无相关内容时为空字符串 */
  numericValue: string;
  /** 仓库名称，无相关内容时为空字符串 */
  warehouse: string;
  /** 搜索关键词，无相关内容时为空字符串 */
  keyword: string;
  /** 排序字段，可选值：quantity/price/value，无相关内容时为空字符串 */
  sortField: string;
  /** 排序方向，可选值：asc/desc，无相关内容时为空字符串 */
  sortOrder: string;
  /** 返回条数限制，无相关内容时为空字符串 */
  limit: string;
  /** 查询类型，可选值：stock_comparison/price_comparison/warehouse_filter/sort_by/category_search/brand_search/keyword_search/list_all/warning */
  queryType: string;
  /** 比较运算符，可选值：gt/lt/eq/gte/lte，无相关内容时为空字符串 */
  operator: string;
  /** 品类名称，无相关内容时为空字符串 */
  category: string;
}
// ---- end:stock_query_text_to_json_1 ----

// ---- plugin:feishu_bitable_product_sync_1 ----
// ============================================================
// 插件 feishu_bitable_product_sync_1 (飞书多维表格商品数据同步) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableProductSyncOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '商品状态': string;
      '更新时间': number;
      '商品ID': string;
      '商品名称': string;
      '商品价格': number;
      '库存数量': number;
      '商品分类': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_product_sync_1').call<FeishuBitableProductSyncOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableProductSyncOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableProductSyncOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '商品ID': string;
      '商品名称': string;
      '商品价格': number;
      '库存数量': number;
      '商品分类': string;
      '商品状态': string;
      '更新时间': number;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_product_sync_1').call<FeishuBitableProductSyncOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableProductSyncOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableProductSyncOneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    desc: boolean;
    fieldName: string;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
}

/**
 * capabilityClient.load('feishu_bitable_product_sync_1').call<FeishuBitableProductSyncOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"更新时间":0,"商品ID":{},"商品价格":0,"创建时间":0,"商品状态":"示例文本","商品名称":null,"库存数量":0,"商品分类":null}}]}
 */
export interface FeishuBitableProductSyncOneSearchrecordsOutput {
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
      '更新时间': number;
      '商品ID': {
        text: string;
      };
      '商品价格': number;
      '创建时间': number;
      '商品状态': string;
      '商品名称': unknown;
      '库存数量': number;
      '商品分类': unknown;
    };
  }[];
}
// ---- end:feishu_bitable_product_sync_1 ----

// ---- plugin:feishu_bitable_inventory_record_sync_1 ----
// ============================================================
// 插件 feishu_bitable_inventory_record_sync_1 (飞书多维表格盘点记录同步) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableInventoryRecordSyncOneAggregatequeryInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
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
    alias: string;
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_inventory_record_sync_1').call<FeishuBitableInventoryRecordSyncOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, result, hasMore } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","result":[{}],"hasMore":false}
 */
export interface FeishuBitableInventoryRecordSyncOneAggregatequeryOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
}

export interface FeishuBitableInventoryRecordSyncOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_inventory_record_sync_1').call<FeishuBitableInventoryRecordSyncOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableInventoryRecordSyncOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableInventoryRecordSyncOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_inventory_record_sync_1').call<FeishuBitableInventoryRecordSyncOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableInventoryRecordSyncOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableInventoryRecordSyncOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_inventory_record_sync_1').call<FeishuBitableInventoryRecordSyncOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableInventoryRecordSyncOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableInventoryRecordSyncOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_inventory_record_sync_1').call<FeishuBitableInventoryRecordSyncOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{}}
 */
export interface FeishuBitableInventoryRecordSyncOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {

  };
}

export interface FeishuBitableInventoryRecordSyncOneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
}

/**
 * capabilityClient.load('feishu_bitable_inventory_record_sync_1').call<FeishuBitableInventoryRecordSyncOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { total, records, hasMore, ... } = result;
 * 返回值形如：
 *   {"total":0,"records":[{"id":"示例文本","record":{}}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuBitableInventoryRecordSyncOneSearchrecordsOutput {
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
// ---- end:feishu_bitable_inventory_record_sync_1 ----

// ---- plugin:feishu_bitable_allocation_sync_1 ----
// ============================================================
// 插件 feishu_bitable_allocation_sync_1 (飞书多维表格调拨记录同步插件) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableAllocationSyncOneAggregatequeryInput {
  /** [object Object] */
  measures?: {
    fieldName: string;
    aggregation: string;
    alias: string;
  }[];
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
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
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_1').call<FeishuBitableAllocationSyncOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuBitableAllocationSyncOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface FeishuBitableAllocationSyncOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_1').call<FeishuBitableAllocationSyncOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableAllocationSyncOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableAllocationSyncOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_1').call<FeishuBitableAllocationSyncOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableAllocationSyncOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableAllocationSyncOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_1').call<FeishuBitableAllocationSyncOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableAllocationSyncOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableAllocationSyncOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_1').call<FeishuBitableAllocationSyncOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{}}
 */
export interface FeishuBitableAllocationSyncOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {

  };
}

export interface FeishuBitableAllocationSyncOneSearchrecordsInput {
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_1').call<FeishuBitableAllocationSyncOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { total, records, hasMore, ... } = result;
 * 返回值形如：
 *   {"total":0,"records":[{"id":"示例文本","record":{}}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuBitableAllocationSyncOneSearchrecordsOutput {
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
// ---- end:feishu_bitable_allocation_sync_1 ----

// ---- plugin:feishu_bitable_inventory_sync_1 ----
// ============================================================
// 插件 feishu_bitable_inventory_sync_1 (飞书多维表格出入库记录同步) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableInventorySyncOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_inventory_sync_1').call<FeishuBitableInventorySyncOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableInventorySyncOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableInventorySyncOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_inventory_sync_1').call<FeishuBitableInventorySyncOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableInventorySyncOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableInventorySyncOneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
}

/**
 * capabilityClient.load('feishu_bitable_inventory_sync_1').call<FeishuBitableInventorySyncOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}],"hasMore":false}
 */
export interface FeishuBitableInventorySyncOneSearchrecordsOutput {
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
// ---- end:feishu_bitable_inventory_sync_1 ----

// ---- plugin:feishu_bitable_warehouse_stock_sync_1 ----
// ============================================================
// 插件 feishu_bitable_warehouse_stock_sync_1 (飞书多维表格仓库库存同步) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableWarehouseStockSyncOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_1').call<FeishuBitableWarehouseStockSyncOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableWarehouseStockSyncOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableWarehouseStockSyncOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_1').call<FeishuBitableWarehouseStockSyncOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableWarehouseStockSyncOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableWarehouseStockSyncOneSearchrecordsInput {
  /** [object Object] */
  filter?: {
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
    conjunction: string;
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_1').call<FeishuBitableWarehouseStockSyncOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}]}
 */
export interface FeishuBitableWarehouseStockSyncOneSearchrecordsOutput {
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

    };
  }[];
}
// ---- end:feishu_bitable_warehouse_stock_sync_1 ----

// ---- plugin:feishu_bitable_product_sync_v2_1 ----
// ============================================================
// 插件 feishu_bitable_product_sync_v2_1 (飞书多维表格商品同步V2) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableProductSyncV2OneInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
}

/**
 * capabilityClient.load('feishu_bitable_product_sync_v2_1').call<FeishuBitableProductSyncV2OneOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"商品名称":null,"品类":"示例文本","单位":null,"安全库存":0,"参考单价":0,"商品编码":{}}}],"hasMore":false}
 */
export interface FeishuBitableProductSyncV2OneOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '商品名称': unknown;
      '品类': string;
      '单位': unknown;
      '安全库存': number;
      '参考单价': number;
      '商品编码': {
        text: string;
      };
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
}
// ---- end:feishu_bitable_product_sync_v2_1 ----

// ---- plugin:feishu_bitable_warehouse_stock_sync_v2_1 ----
// ============================================================
// 插件 feishu_bitable_warehouse_stock_sync_v2_1 (飞书多维表格仓库库存同步插件实例 v2) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableWarehouseStockSyncV2OneAggregatequeryInput {
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    alias: string;
    fieldName: string;
    aggregation: string;
  }[];
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_v2_1').call<FeishuBitableWarehouseStockSyncV2OneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuBitableWarehouseStockSyncV2OneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface FeishuBitableWarehouseStockSyncV2OneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '最后更新时间': number;
      '商品名称': string;
      SKU: string;
      '仓库': string;
      '当前库存': number;
      '安全库存': number;
      '库存状态': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_v2_1').call<FeishuBitableWarehouseStockSyncV2OneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableWarehouseStockSyncV2OneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableWarehouseStockSyncV2OneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '当前库存': number;
      '安全库存': number;
      '库存状态': string;
      '最后更新时间': number;
      '商品名称': string;
      SKU: string;
      '仓库': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_v2_1').call<FeishuBitableWarehouseStockSyncV2OneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableWarehouseStockSyncV2OneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableWarehouseStockSyncV2OneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_v2_1').call<FeishuBitableWarehouseStockSyncV2OneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableWarehouseStockSyncV2OneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableWarehouseStockSyncV2OneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_v2_1').call<FeishuBitableWarehouseStockSyncV2OneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"商品名称":{"text":"示例文本"},"SKU":null,"仓库":"示例文本","当前库存":0,"安全库存":0,"库存状态":"示例文本","最后更新时间":0}}
 */
export interface FeishuBitableWarehouseStockSyncV2OneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '商品名称': {
      text: string;
    };
    SKU: unknown;
    '仓库': string;
    '当前库存': number;
    '安全库存': number;
    '库存状态': string;
    '最后更新时间': number;
  };
}

export interface FeishuBitableWarehouseStockSyncV2OneSearchrecordsInput {
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  pageToken?: string;
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_v2_1').call<FeishuBitableWarehouseStockSyncV2OneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"商品名称":{},"SKU":null,"仓库":"示例文本","当前库存":0,"安全库存":0,"库存状态":"示例文本","最后更新时间":0}}]}
 */
export interface FeishuBitableWarehouseStockSyncV2OneSearchrecordsOutput {
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
      '商品名称': {
        text: string;
      };
      SKU: unknown;
      '仓库': string;
      '当前库存': number;
      '安全库存': number;
      '库存状态': string;
      '最后更新时间': number;
    };
  }[];
}
// ---- end:feishu_bitable_warehouse_stock_sync_v2_1 ----

// ---- plugin:feishu_bitable_inventory_record_sync_v2_1 ----
// ============================================================
// 插件 feishu_bitable_inventory_record_sync_v2_1 (飞书多维表格盘点记录同步插件实例 v2) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableInventoryRecordSyncV2OneAggregatequeryInput {
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    alias: string;
    fieldName: string;
    aggregation: string;
  }[];
  /** [object Object] */
  pageToken?: string;
}

/**
 * capabilityClient.load('feishu_bitable_inventory_record_sync_v2_1').call<FeishuBitableInventoryRecordSyncV2OneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuBitableInventoryRecordSyncV2OneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface FeishuBitableInventoryRecordSyncV2OneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '盘点单号': string;
      '盘点人': string;
      '差异数': number;
      '仓库': string;
      '状态': string;
      '盘点时间': number;
      '商品数': number;
      '备注': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_inventory_record_sync_v2_1').call<FeishuBitableInventoryRecordSyncV2OneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableInventoryRecordSyncV2OneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableInventoryRecordSyncV2OneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '差异数': number;
      '盘点时间': number;
      '商品数': number;
      '仓库': string;
      '状态': string;
      '备注': string;
      '盘点单号': string;
      '盘点人': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_inventory_record_sync_v2_1').call<FeishuBitableInventoryRecordSyncV2OneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableInventoryRecordSyncV2OneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableInventoryRecordSyncV2OneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_inventory_record_sync_v2_1').call<FeishuBitableInventoryRecordSyncV2OneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableInventoryRecordSyncV2OneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableInventoryRecordSyncV2OneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_inventory_record_sync_v2_1').call<FeishuBitableInventoryRecordSyncV2OneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"盘点单号":{"text":"示例文本"},"仓库":"示例文本","状态":"示例文本","商品数":0,"盘点人":null,"盘点时间":0,"差异数":0,"备注":null}}
 */
export interface FeishuBitableInventoryRecordSyncV2OneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '盘点单号': {
      text: string;
    };
    '仓库': string;
    '状态': string;
    '商品数': number;
    '盘点人': unknown;
    '盘点时间': number;
    '差异数': number;
    '备注': unknown;
  };
}

export interface FeishuBitableInventoryRecordSyncV2OneSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      value: string[];
      fieldName: string;
      operator: string;
    }[];
  };
}

/**
 * capabilityClient.load('feishu_bitable_inventory_record_sync_v2_1').call<FeishuBitableInventoryRecordSyncV2OneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"仓库":"示例文本","状态":"示例文本","盘点时间":0,"商品数":0,"盘点单号":{},"盘点人":null,"差异数":0,"备注":null}}]}
 */
export interface FeishuBitableInventoryRecordSyncV2OneSearchrecordsOutput {
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
      '仓库': string;
      '状态': string;
      '盘点时间': number;
      '商品数': number;
      '盘点单号': {
        text: string;
      };
      '盘点人': unknown;
      '差异数': number;
      '备注': unknown;
    };
  }[];
}
// ---- end:feishu_bitable_inventory_record_sync_v2_1 ----

// ---- plugin:feishu_bitable_in_out_record_sync_v2_1 ----
// ============================================================
// 插件 feishu_bitable_in_out_record_sync_v2_1 (飞书多维表格出入库记录同步插件实例 v2) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableInOutRecordSyncV2OneInput {
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_in_out_record_sync_v2_1').call<FeishuBitableInOutRecordSyncV2OneOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"商品名":null,"金额":0,"记录编号":{},"类型":"示例文本","数量":0,"操作人":null,"操作时间":0,"类型细分":"示例文本","仓库":"示例文本"}}]}
 */
export interface FeishuBitableInOutRecordSyncV2OneOutput {
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
      '商品名': unknown;
      '金额': number;
      '记录编号': {
        text: string;
      };
      '类型': string;
      '数量': number;
      '操作人': unknown;
      '操作时间': number;
      '类型细分': string;
      '仓库': string;
    };
  }[];
}
// ---- end:feishu_bitable_in_out_record_sync_v2_1 ----

// ---- plugin:feishu_bitable_allocation_sync_v2_2 ----
// ============================================================
// 插件 feishu_bitable_allocation_sync_v2_2 (飞书多维表格调拨记录同步插件实例 v2) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableAllocationSyncV2TwoAggregatequeryInput {
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
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
    alias: string;
  }[];
  /** [object Object] */
  pageToken?: string;
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_v2_2').call<FeishuBitableAllocationSyncV2TwoAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuBitableAllocationSyncV2TwoAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface FeishuBitableAllocationSyncV2TwoBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '商品名': string;
      '源仓库': string;
      '目标仓库': string;
      '数量': number;
      '调拨时间': number;
      '调拨单号': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_v2_2').call<FeishuBitableAllocationSyncV2TwoBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableAllocationSyncV2TwoBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableAllocationSyncV2TwoBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '调拨单号': string;
      '商品名': string;
      '源仓库': string;
      '目标仓库': string;
      '数量': number;
      '调拨时间': number;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_v2_2').call<FeishuBitableAllocationSyncV2TwoBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableAllocationSyncV2TwoBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableAllocationSyncV2TwoDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_v2_2').call<FeishuBitableAllocationSyncV2TwoDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableAllocationSyncV2TwoDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableAllocationSyncV2TwoGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_v2_2').call<FeishuBitableAllocationSyncV2TwoGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"源仓库":"示例文本","目标仓库":"示例文本","数量":0,"调拨时间":0,"调拨单号":{"text":"示例文本"},"商品名":null}}
 */
export interface FeishuBitableAllocationSyncV2TwoGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '源仓库': string;
    '目标仓库': string;
    '数量': number;
    '调拨时间': number;
    '调拨单号': {
      text: string;
    };
    '商品名': unknown;
  };
}

export interface FeishuBitableAllocationSyncV2TwoSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_v2_2').call<FeishuBitableAllocationSyncV2TwoSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"商品名":null,"源仓库":"示例文本","目标仓库":"示例文本","数量":0,"调拨时间":0,"调拨单号":{}}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FeishuBitableAllocationSyncV2TwoSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '商品名': unknown;
      '源仓库': string;
      '目标仓库': string;
      '数量': number;
      '调拨时间': number;
      '调拨单号': {
        text: string;
      };
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:feishu_bitable_allocation_sync_v2_2 ----

// ---- plugin:feishu_bitable_in_out_record_sync_v3_1 ----
// ============================================================
// 插件 feishu_bitable_in_out_record_sync_v3_1 (飞书多维表格出入库记录同步插件实例 v3) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableInOutRecordSyncV3OneAggregatequeryInput {
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
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
    alias: string;
  }[];
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_in_out_record_sync_v3_1').call<FeishuBitableInOutRecordSyncV3OneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, result } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","result":[{}]}
 */
export interface FeishuBitableInOutRecordSyncV3OneAggregatequeryOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  result: {

  }[];
}

export interface FeishuBitableInOutRecordSyncV3OneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '记录编号': string;
      '类型细分': string;
      '操作时间': number;
      '操作人': string;
      '类型': string;
      '商品名': string;
      '仓库': string;
      '数量': number;
      '金额': number;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_in_out_record_sync_v3_1').call<FeishuBitableInOutRecordSyncV3OneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableInOutRecordSyncV3OneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableInOutRecordSyncV3OneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '类型': string;
      '类型细分': string;
      '商品名': string;
      '操作人': string;
      '操作时间': number;
      '记录编号': string;
      '仓库': string;
      '数量': number;
      '金额': number;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_in_out_record_sync_v3_1').call<FeishuBitableInOutRecordSyncV3OneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableInOutRecordSyncV3OneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableInOutRecordSyncV3OneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_in_out_record_sync_v3_1').call<FeishuBitableInOutRecordSyncV3OneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableInOutRecordSyncV3OneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableInOutRecordSyncV3OneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_in_out_record_sync_v3_1').call<FeishuBitableInOutRecordSyncV3OneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"记录编号":{"text":"示例文本"},"类型细分":"示例文本","商品名":null,"数量":0,"操作时间":0,"类型":"示例文本","仓库":"示例文本","金额":0,"操作人":null}}
 */
export interface FeishuBitableInOutRecordSyncV3OneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '记录编号': {
      text: string;
    };
    '类型细分': string;
    '商品名': unknown;
    '数量': number;
    '操作时间': number;
    '类型': string;
    '仓库': string;
    '金额': number;
    '操作人': unknown;
  };
}

export interface FeishuBitableInOutRecordSyncV3OneSearchrecordsInput {
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_in_out_record_sync_v3_1').call<FeishuBitableInOutRecordSyncV3OneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { total, records, hasMore, ... } = result;
 * 返回值形如：
 *   {"total":0,"records":[{"record":{"记录编号":{},"类型细分":"示例文本","金额":0,"操作人":null,"操作时间":0,"类型":"示例文本","商品名":null,"仓库":"示例文本","数量":0},"id":"示例文本"}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuBitableInOutRecordSyncV3OneSearchrecordsOutput {
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    record: {
      '记录编号': {
        text: string;
      };
      '类型细分': string;
      '金额': number;
      '操作人': unknown;
      '操作时间': number;
      '类型': string;
      '商品名': unknown;
      '仓库': string;
      '数量': number;
    };
    id: string;
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}
// ---- end:feishu_bitable_in_out_record_sync_v3_1 ----

// ---- plugin:feishu_bitable_inventory_record_sync_v3_1 ----
// ============================================================
// 插件 feishu_bitable_inventory_record_sync_v3_1 (飞书多维表格盘点记录同步插件实例 v3) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================
// ---- end:feishu_bitable_inventory_record_sync_v3_1 ----

// ---- plugin:feishu_bitable_allocation_sync_v3_3 ----
// ============================================================
// 插件 feishu_bitable_allocation_sync_v3_3 (飞书多维表格调拨记录同步插件实例 v3) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableAllocationSyncV3ThreeAggregatequeryInput {
  /** [object Object] */
  measures?: {
    fieldName: string;
    aggregation: string;
    alias: string;
  }[];
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_v3_3').call<FeishuBitableAllocationSyncV3ThreeAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, result, hasMore } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","result":[{}],"hasMore":false}
 */
export interface FeishuBitableAllocationSyncV3ThreeAggregatequeryOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
}

export interface FeishuBitableAllocationSyncV3ThreeBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '调拨单号': string;
      '商品名': string;
      '源仓库': string;
      '目标仓库': string;
      '数量': number;
      '调拨时间': number;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_v3_3').call<FeishuBitableAllocationSyncV3ThreeBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableAllocationSyncV3ThreeBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableAllocationSyncV3ThreeBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '调拨时间': number;
      '调拨单号': string;
      '商品名': string;
      '源仓库': string;
      '目标仓库': string;
      '数量': number;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_v3_3').call<FeishuBitableAllocationSyncV3ThreeBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableAllocationSyncV3ThreeBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableAllocationSyncV3ThreeDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_v3_3').call<FeishuBitableAllocationSyncV3ThreeDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableAllocationSyncV3ThreeDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableAllocationSyncV3ThreeGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_v3_3').call<FeishuBitableAllocationSyncV3ThreeGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"目标仓库":"示例文本","数量":0,"调拨时间":0,"调拨单号":{"text":"示例文本"},"商品名":null,"源仓库":"示例文本"}}
 */
export interface FeishuBitableAllocationSyncV3ThreeGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '目标仓库': string;
    '数量': number;
    '调拨时间': number;
    '调拨单号': {
      text: string;
    };
    '商品名': unknown;
    '源仓库': string;
  };
}

export interface FeishuBitableAllocationSyncV3ThreeSearchrecordsInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      value: string[];
      fieldName: string;
      operator: string;
    }[];
  };
}

/**
 * capabilityClient.load('feishu_bitable_allocation_sync_v3_3').call<FeishuBitableAllocationSyncV3ThreeSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"调拨单号":{},"商品名":null,"源仓库":"示例文本","目标仓库":"示例文本","数量":0,"调拨时间":0}}]}
 */
export interface FeishuBitableAllocationSyncV3ThreeSearchrecordsOutput {
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
      '调拨单号': {
        text: string;
      };
      '商品名': unknown;
      '源仓库': string;
      '目标仓库': string;
      '数量': number;
      '调拨时间': number;
    };
  }[];
}
// ---- end:feishu_bitable_allocation_sync_v3_3 ----

// ---- plugin:feishu_bitable_warehouse_stock_sync_v3_1 ----
// ============================================================
// 插件 feishu_bitable_warehouse_stock_sync_v3_1 (飞书多维表格仓库库存同步插件实例 v3) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableWarehouseStockSyncV3OneAggregatequeryInput {
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
  /** [object Object] */
  measures?: {
    fieldName: string;
    aggregation: string;
    alias: string;
  }[];
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_v3_1').call<FeishuBitableWarehouseStockSyncV3OneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuBitableWarehouseStockSyncV3OneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface FeishuBitableWarehouseStockSyncV3OneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '库存状态': string;
      '最后更新时间': number;
      '商品名称': string;
      SKU: string;
      '仓库': string;
      '当前库存': number;
      '安全库存': number;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_v3_1').call<FeishuBitableWarehouseStockSyncV3OneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableWarehouseStockSyncV3OneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableWarehouseStockSyncV3OneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '商品名称': string;
      SKU: string;
      '仓库': string;
      '当前库存': number;
      '安全库存': number;
      '库存状态': string;
      '最后更新时间': number;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_v3_1').call<FeishuBitableWarehouseStockSyncV3OneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableWarehouseStockSyncV3OneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableWarehouseStockSyncV3OneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_v3_1').call<FeishuBitableWarehouseStockSyncV3OneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableWarehouseStockSyncV3OneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableWarehouseStockSyncV3OneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_v3_1').call<FeishuBitableWarehouseStockSyncV3OneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"库存状态":"示例文本","最后更新时间":0,"商品名称":{"text":"示例文本"},"SKU":null,"仓库":"示例文本","当前库存":0,"安全库存":0}}
 */
export interface FeishuBitableWarehouseStockSyncV3OneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '库存状态': string;
    '最后更新时间': number;
    '商品名称': {
      text: string;
    };
    SKU: unknown;
    '仓库': string;
    '当前库存': number;
    '安全库存': number;
  };
}

export interface FeishuBitableWarehouseStockSyncV3OneSearchrecordsInput {
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      value: string[];
      fieldName: string;
      operator: string;
    }[];
  };
  /** [object Object] */
  pageToken?: string;
}

/**
 * capabilityClient.load('feishu_bitable_warehouse_stock_sync_v3_1').call<FeishuBitableWarehouseStockSyncV3OneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"商品名称":{},"SKU":null,"仓库":"示例文本","当前库存":0,"安全库存":0,"库存状态":"示例文本","最后更新时间":0}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FeishuBitableWarehouseStockSyncV3OneSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '商品名称': {
        text: string;
      };
      SKU: unknown;
      '仓库': string;
      '当前库存': number;
      '安全库存': number;
      '库存状态': string;
      '最后更新时间': number;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:feishu_bitable_warehouse_stock_sync_v3_1 ----