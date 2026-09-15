// ---- plugin:ai_diagnosis_generator_1 ----
// ============================================================
// 插件 ai_diagnosis_generator_1 (电商经营异常指标智能诊断) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiDiagnosisGeneratorOneInput {
  /** 电商经营异常指标数据，包含转化率、库存、投放ROI、退款率等相关维度的具体异常信息 */
  abnormal_indicators: string;
}

/**
 * capabilityClient.load('ai_diagnosis_generator_1').callStream<AiDiagnosisGeneratorOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 AiDiagnosisGeneratorOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface AiDiagnosisGeneratorOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:ai_diagnosis_generator_1 ----

// ---- plugin:ecommerce_business_qa_assistant_1 ----
// ============================================================
// 插件 ecommerce_business_qa_assistant_1 (电商商家经营数据对话助手) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface EcommerceBusinessQaAssistantOneInput {
  /** 当前对话的历史上下文信息，用于支持多轮对话 */
  dialog_history?: string;
  /** 电商商家提出的关于经营数据的问题 */
  user_question: string;
}

/**
 * capabilityClient.load('ecommerce_business_qa_assistant_1').callStream<EcommerceBusinessQaAssistantOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 EcommerceBusinessQaAssistantOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface EcommerceBusinessQaAssistantOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:ecommerce_business_qa_assistant_1 ----

// ---- plugin:ai_review_report_generator_1 ----
// ============================================================
// 插件 ai_review_report_generator_1 (AI 复盘报告生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================
// ---- end:ai_review_report_generator_1 ----

// ---- plugin:feishu_bitable_product_sync_reader_1 ----
// ============================================================
// 插件 feishu_bitable_product_sync_reader_1 (飞书多维表格商品数据同步读取实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableProductSyncReaderOneInput {
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
 * capabilityClient.load('feishu_bitable_product_sync_reader_1').call<FeishuBitableProductSyncReaderOneOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"客户昵称":{},"处理状态":"示例文本","咨询时间":0,"意图识别":"示例文本","处理客服":[],"咨询编号":"示例文本","联系电话":null,"订单号":null,"咨询渠道":"示例文本","咨询内容":null,"是否紧急":null,"实际回复":null}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FeishuBitableProductSyncReaderOneOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '客户昵称': {
        text: string;
      };
      '处理状态': string;
      '咨询时间': number;
      '意图识别': string;
      '处理客服': number[];
      '咨询编号': string;
      '联系电话': unknown;
      '订单号': unknown;
      '咨询渠道': string;
      '咨询内容': unknown;
      '是否紧急': unknown;
      '实际回复': unknown;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:feishu_bitable_product_sync_reader_1 ----

// ---- plugin:after_sales_ticket_bitable_writer_1 ----
// ============================================================
// 插件 after_sales_ticket_bitable_writer_1 (售后工单表写入实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AfterSalesTicketBitableWriterOneInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('after_sales_ticket_bitable_writer_1').call<AfterSalesTicketBitableWriterOneOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface AfterSalesTicketBitableWriterOneOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}
// ---- end:after_sales_ticket_bitable_writer_1 ----

// ---- plugin:data_review_bitable_writer_1 ----
// ============================================================
// 插件 data_review_bitable_writer_1 (数据复盘表写入实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface DataReviewBitableWriterOneAggregatequeryInput {
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
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
}

/**
 * capabilityClient.load('data_review_bitable_writer_1').call<DataReviewBitableWriterOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, result, hasMore } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","result":[{}],"hasMore":false}
 */
export interface DataReviewBitableWriterOneAggregatequeryOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
}

export interface DataReviewBitableWriterOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('data_review_bitable_writer_1').call<DataReviewBitableWriterOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface DataReviewBitableWriterOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface DataReviewBitableWriterOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('data_review_bitable_writer_1').call<DataReviewBitableWriterOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface DataReviewBitableWriterOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface DataReviewBitableWriterOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('data_review_bitable_writer_1').call<DataReviewBitableWriterOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface DataReviewBitableWriterOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface DataReviewBitableWriterOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('data_review_bitable_writer_1').call<DataReviewBitableWriterOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{}}
 */
export interface DataReviewBitableWriterOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {

  };
}

export interface DataReviewBitableWriterOneSearchrecordsInput {
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
 * capabilityClient.load('data_review_bitable_writer_1').call<DataReviewBitableWriterOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}]}
 */
export interface DataReviewBitableWriterOneSearchrecordsOutput {
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
// ---- end:data_review_bitable_writer_1 ----

// ---- plugin:after_sales_ticket_bitable_writer_2 ----
// ============================================================
// 插件 after_sales_ticket_bitable_writer_2 (售后工单表写入实例v2) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AfterSalesTicketBitableWriterTwoAggregatequeryInput {
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
}

/**
 * capabilityClient.load('after_sales_ticket_bitable_writer_2').call<AfterSalesTicketBitableWriterTwoAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface AfterSalesTicketBitableWriterTwoAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface AfterSalesTicketBitableWriterTwoBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '工单编号'?: string;
      '商品SKU'?: string;
      '处理状态'?: string;
      '退款金额'?: number;
      '备注'?: string;
      '完成时间'?: number;
      '订单号'?: string;
      '问题描述'?: string;
      '售后类型'?: string;
      '处理建议'?: string;
      '是否差评'?: boolean;
    };
  }[];
}

/**
 * capabilityClient.load('after_sales_ticket_bitable_writer_2').call<AfterSalesTicketBitableWriterTwoBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface AfterSalesTicketBitableWriterTwoBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface AfterSalesTicketBitableWriterTwoBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '商品SKU'?: string;
      '问题描述'?: string;
      '售后类型'?: string;
      '处理建议'?: string;
      '处理状态'?: string;
      '是否差评'?: boolean;
      '工单编号'?: string;
      '订单号'?: string;
      '完成时间'?: number;
      '退款金额'?: number;
      '备注'?: string;
    };
  }[];
}

/**
 * capabilityClient.load('after_sales_ticket_bitable_writer_2').call<AfterSalesTicketBitableWriterTwoBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface AfterSalesTicketBitableWriterTwoBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface AfterSalesTicketBitableWriterTwoDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('after_sales_ticket_bitable_writer_2').call<AfterSalesTicketBitableWriterTwoDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface AfterSalesTicketBitableWriterTwoDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface AfterSalesTicketBitableWriterTwoGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('after_sales_ticket_bitable_writer_2').call<AfterSalesTicketBitableWriterTwoGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"问题描述":null,"售后类型":"示例文本","处理建议":null,"退款金额":0,"备注":null,"工单编号":{"text":"示例文本"},"订单号":null,"商品SKU":null,"处理状态":"示例文本","是否差评":null,"完成时间":0}}
 */
export interface AfterSalesTicketBitableWriterTwoGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '问题描述'?: unknown;
    '售后类型'?: string;
    '处理建议'?: unknown;
    '退款金额'?: number;
    '备注'?: unknown;
    '工单编号'?: {
      text: string;
    };
    '订单号'?: unknown;
    '商品SKU'?: unknown;
    '处理状态'?: string;
    '是否差评'?: unknown;
    '完成时间'?: number;
  };
}

export interface AfterSalesTicketBitableWriterTwoSearchrecordsInput {
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
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
}

/**
 * capabilityClient.load('after_sales_ticket_bitable_writer_2').call<AfterSalesTicketBitableWriterTwoSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"备注":null,"商品SKU":null,"处理建议":null,"退款金额":0,"售后类型":"示例文本","处理状态":"示例文本","是否差评":null,"完成时间":0,"工单编号":{},"订单号":null,"问题描述":null}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface AfterSalesTicketBitableWriterTwoSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '备注'?: unknown;
      '商品SKU'?: unknown;
      '处理建议'?: unknown;
      '退款金额'?: number;
      '售后类型'?: string;
      '处理状态'?: string;
      '是否差评'?: unknown;
      '完成时间'?: number;
      '工单编号'?: {
        text: string;
      };
      '订单号'?: unknown;
      '问题描述'?: unknown;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:after_sales_ticket_bitable_writer_2 ----

// ---- plugin:product_inventory_bitable_writer_2 ----
// ============================================================
// 插件 product_inventory_bitable_writer_2 (商品库存表写入实例v2) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface ProductInventoryBitableWriterTwoAggregatequeryInput {
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
}

/**
 * capabilityClient.load('product_inventory_bitable_writer_2').call<ProductInventoryBitableWriterTwoAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface ProductInventoryBitableWriterTwoAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface ProductInventoryBitableWriterTwoBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      'SKU编码'?: string;
      '商品分类'?: string;
      '当前库存'?: number;
      '安全库存'?: number;
      '近7天退货量'?: number;
      '商品名称'?: string;
      '近7天销量'?: number;
      '补货建议'?: string;
      '备注'?: string;
    };
  }[];
}

/**
 * capabilityClient.load('product_inventory_bitable_writer_2').call<ProductInventoryBitableWriterTwoBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface ProductInventoryBitableWriterTwoBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface ProductInventoryBitableWriterTwoBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      'SKU编码'?: string;
      '当前库存'?: number;
      '安全库存'?: number;
      '近7天退货量'?: number;
      '补货建议'?: string;
      '备注'?: string;
      '商品名称'?: string;
      '商品分类'?: string;
      '近7天销量'?: number;
    };
  }[];
}

/**
 * capabilityClient.load('product_inventory_bitable_writer_2').call<ProductInventoryBitableWriterTwoBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface ProductInventoryBitableWriterTwoBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface ProductInventoryBitableWriterTwoDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('product_inventory_bitable_writer_2').call<ProductInventoryBitableWriterTwoDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface ProductInventoryBitableWriterTwoDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface ProductInventoryBitableWriterTwoGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('product_inventory_bitable_writer_2').call<ProductInventoryBitableWriterTwoGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"当前库存":0,"近7天退货量":0,"SKU编码":{"text":"示例文本"},"商品名称":null,"商品分类":"示例文本","备注":null,"安全库存":0,"近7天销量":0,"补货建议":null}}
 */
export interface ProductInventoryBitableWriterTwoGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '当前库存'?: number;
    '近7天退货量'?: number;
    'SKU编码'?: {
      text: string;
    };
    '商品名称'?: unknown;
    '商品分类'?: string;
    '备注'?: unknown;
    '安全库存'?: number;
    '近7天销量'?: number;
    '补货建议'?: unknown;
  };
}

export interface ProductInventoryBitableWriterTwoSearchrecordsInput {
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
  /** [object Object] */
  pageSize?: number;
}

/**
 * capabilityClient.load('product_inventory_bitable_writer_2').call<ProductInventoryBitableWriterTwoSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"商品分类":"示例文本","安全库存":0,"近7天销量":0,"近7天退货量":0,"补货建议":null,"SKU编码":{},"商品名称":null,"当前库存":0,"备注":null}}]}
 */
export interface ProductInventoryBitableWriterTwoSearchrecordsOutput {
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
      '商品分类'?: string;
      '安全库存'?: number;
      '近7天销量'?: number;
      '近7天退货量'?: number;
      '补货建议'?: unknown;
      'SKU编码'?: {
        text: string;
      };
      '商品名称'?: unknown;
      '当前库存'?: number;
      '备注'?: unknown;
    };
  }[];
}
// ---- end:product_inventory_bitable_writer_2 ----

// ---- plugin:data_review_bitable_writer_2 ----
// ============================================================
// 插件 data_review_bitable_writer_2 (数据复盘表写入实例v2) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface DataReviewBitableWriterTwoAggregatequeryInput {
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
 * capabilityClient.load('data_review_bitable_writer_2').call<DataReviewBitableWriterTwoAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface DataReviewBitableWriterTwoAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface DataReviewBitableWriterTwoBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '差评数'?: number;
      '售后工单量'?: number;
      '退款金额'?: number;
      '平均响应时长'?: number;
      'TOP问题类型'?: string;
      '平均解决时长'?: number;
      '负面情绪数'?: number;
      '咨询总量'?: number;
      '备注'?: string;
      '统计日期'?: number;
      '紧急工单量'?: number;
      '退款单数'?: number;
    };
  }[];
}

/**
 * capabilityClient.load('data_review_bitable_writer_2').call<DataReviewBitableWriterTwoBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface DataReviewBitableWriterTwoBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface DataReviewBitableWriterTwoBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '统计日期'?: number;
      '紧急工单量'?: number;
      '平均解决时长'?: number;
      '差评数'?: number;
      '备注'?: string;
      '负面情绪数'?: number;
      '咨询总量'?: number;
      '售后工单量'?: number;
      '退款单数'?: number;
      '退款金额'?: number;
      'TOP问题类型'?: string;
      '平均响应时长'?: number;
    };
  }[];
}

/**
 * capabilityClient.load('data_review_bitable_writer_2').call<DataReviewBitableWriterTwoBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface DataReviewBitableWriterTwoBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface DataReviewBitableWriterTwoDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('data_review_bitable_writer_2').call<DataReviewBitableWriterTwoDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface DataReviewBitableWriterTwoDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface DataReviewBitableWriterTwoGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('data_review_bitable_writer_2').call<DataReviewBitableWriterTwoGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"统计日期":0,"平均响应时长":0,"咨询总量":0,"备注":null,"售后工单量":0,"紧急工单量":0,"退款单数":0,"退款金额":0,"TOP问题类型":{"text":"示例文本"},"平均解决时长":0,"差评数":0,"负面情绪数":0}}
 */
export interface DataReviewBitableWriterTwoGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '统计日期'?: number;
    '平均响应时长'?: number;
    '咨询总量'?: number;
    '备注'?: unknown;
    '售后工单量'?: number;
    '紧急工单量'?: number;
    '退款单数'?: number;
    '退款金额'?: number;
    'TOP问题类型'?: {
      text: string;
    };
    '平均解决时长'?: number;
    '差评数'?: number;
    '负面情绪数'?: number;
  };
}

export interface DataReviewBitableWriterTwoSearchrecordsInput {
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
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc?: boolean;
  }[];
}

/**
 * capabilityClient.load('data_review_bitable_writer_2').call<DataReviewBitableWriterTwoSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"TOP问题类型":{},"平均解决时长":0,"负面情绪数":0,"统计日期":0,"售后工单量":0,"紧急工单量":0,"差评数":0,"咨询总量":0,"备注":null,"退款单数":0,"退款金额":0,"平均响应时长":0}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface DataReviewBitableWriterTwoSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      'TOP问题类型'?: {
        text: string;
      };
      '平均解决时长'?: number;
      '负面情绪数'?: number;
      '统计日期'?: number;
      '售后工单量'?: number;
      '紧急工单量'?: number;
      '差评数'?: number;
      '咨询总量'?: number;
      '备注'?: unknown;
      '退款单数'?: number;
      '退款金额'?: number;
      '平均响应时长'?: number;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:data_review_bitable_writer_2 ----