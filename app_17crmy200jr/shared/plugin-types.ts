// ---- plugin:feishu_bitable_expense_sync_1 ----
// ============================================================
// 插件 feishu_bitable_expense_sync_1 (飞书多维表格支出同步实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableExpenseSyncOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_expense_sync_1').call<FeishuBitableExpenseSyncOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableExpenseSyncOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableExpenseSyncOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_expense_sync_1').call<FeishuBitableExpenseSyncOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableExpenseSyncOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableExpenseSyncOneSearchrecordsInput {
  /** [object Object] */
  sort?: {
    desc: boolean;
    fieldName: string;
  }[];
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
}

/**
 * capabilityClient.load('feishu_bitable_expense_sync_1').call<FeishuBitableExpenseSyncOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}]}
 */
export interface FeishuBitableExpenseSyncOneSearchrecordsOutput {
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
// ---- end:feishu_bitable_expense_sync_1 ----

// ---- plugin:feishu_bitable_category_sync_1 ----
// ============================================================
// 插件 feishu_bitable_category_sync_1 (飞书多维表格类目同步实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableCategorySyncOneInput {
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
 * capabilityClient.load('feishu_bitable_category_sync_1').call<FeishuBitableCategorySyncOneOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}],"hasMore":false}
 */
export interface FeishuBitableCategorySyncOneOutput {
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
// ---- end:feishu_bitable_category_sync_1 ----

// ---- plugin:feishu_bitable_asset_sync_1 ----
// ============================================================
// 插件 feishu_bitable_asset_sync_1 (飞书多维表格资产同步实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableAssetSyncOneAggregatequeryInput {
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
  /** [object Object] */
  expandArrayDimension?: boolean;
}

/**
 * capabilityClient.load('feishu_bitable_asset_sync_1').call<FeishuBitableAssetSyncOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuBitableAssetSyncOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface FeishuBitableAssetSyncOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_asset_sync_1').call<FeishuBitableAssetSyncOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableAssetSyncOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableAssetSyncOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_asset_sync_1').call<FeishuBitableAssetSyncOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableAssetSyncOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableAssetSyncOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_asset_sync_1').call<FeishuBitableAssetSyncOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableAssetSyncOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableAssetSyncOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_asset_sync_1').call<FeishuBitableAssetSyncOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{}}
 */
export interface FeishuBitableAssetSyncOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {

  };
}

export interface FeishuBitableAssetSyncOneSearchrecordsInput {
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
 * capabilityClient.load('feishu_bitable_asset_sync_1').call<FeishuBitableAssetSyncOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}]}
 */
export interface FeishuBitableAssetSyncOneSearchrecordsOutput {
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
// ---- end:feishu_bitable_asset_sync_1 ----

// ---- plugin:feishu_bitable_data_sync_1 ----
// ============================================================
// 插件 feishu_bitable_data_sync_1 (飞书多维表格数据同步实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableDataSyncOneInput {
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
 * capabilityClient.load('feishu_bitable_data_sync_1').call<FeishuBitableDataSyncOneOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FeishuBitableDataSyncOneOutput {
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
  /** [object Object] */
  total?: number;
}
// ---- end:feishu_bitable_data_sync_1 ----

// ---- plugin:feishu_bitable_inventory_sync_1 ----
// ============================================================
// 插件 feishu_bitable_inventory_sync_1 (飞书多维表格资产盘点同步实例) 的类型定义
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
      operator: string;
      value: string[];
      fieldName: string;
    }[];
  };
}

/**
 * capabilityClient.load('feishu_bitable_inventory_sync_1').call<FeishuBitableInventorySyncOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FeishuBitableInventorySyncOneSearchrecordsOutput {
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
  /** [object Object] */
  total?: number;
}
// ---- end:feishu_bitable_inventory_sync_1 ----