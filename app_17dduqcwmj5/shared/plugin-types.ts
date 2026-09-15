// ---- plugin:send_feishu_notification_1 ----
// ============================================================
// 插件 send_feishu_notification_1 (发送飞书业务通知) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface SendFeishuNotificationOneInput {
  /** 接收人用户ID列表 */
  receiverIds: string[];
  /** 飞书消息标题，1-50字符 */
  title: string;
  /** 飞书消息正文，支持markdown格式，不超过5000字符 */
  content: string;
}

/**
 * capabilityClient.load('send_feishu_notification_1').call<SendFeishuNotificationOneOutput>('send_feishu_message', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface SendFeishuNotificationOneOutput {
  /** [object Object] */
  success: boolean;
}
// ---- end:send_feishu_notification_1 ----

// ---- plugin:admission_content_creation_1 ----
// ============================================================
// 插件 admission_content_creation_1 (招生内容创作插件) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AdmissionContentCreationOneInput {
  /** 需要生成的内容类型（招生文案/短视频脚本/朋友圈文案/海报文案） */
  content_type: string;
  /** 课程名称 */
  course_name: string;
  /** 课程简介 */
  course_intro: string;
  /** 学费信息 */
  tuition_fee: string;
  /** 学习时长 */
  study_duration: string;
  /** 营销素材摘要 */
  marketing_material_summary?: string;
}

/**
 * capabilityClient.load('admission_content_creation_1').callStream<AdmissionContentCreationOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 AdmissionContentCreationOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface AdmissionContentCreationOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:admission_content_creation_1 ----

// ---- plugin:faq_intent_recognition_1 ----
// ============================================================
// 插件 faq_intent_recognition_1 (FAQ 意图识别) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FaqIntentRecognitionOneInput {
  /** 用户输入的咨询问题 */
  question: string;
  /** 带编号的知识库候选列表，每个元素格式为「编号. 问题：xxx；相似问：yyy；关键词：zzz」 */
  candidates: string[];
}

/**
 * capabilityClient.load('faq_intent_recognition_1').call<FaqIntentRecognitionOneOutput>('textToJson', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { matchedNo, intent } = result;
 * 返回值形如：
 *   {"matchedNo":0,"intent":"示例文本"}
 */
export interface FaqIntentRecognitionOneOutput {
  /** 命中的候选编号，未命中返回0 */
  matchedNo: number;
  /** 用户问题的意图简述 */
  intent: string;
}
// ---- end:faq_intent_recognition_1 ----

// ---- plugin:knowledge_base_answer_generation_1 ----
// ============================================================
// 插件 knowledge_base_answer_generation_1 (知识库答复生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface KnowledgeBaseAnswerGenerationOneInput {
  /** 命中条目的参考资料，每个元素格式为「问题：xxx；标准答案：yyy」 */
  search_results: string[];
  /** 用户输入的咨询问题 */
  query: string;
}

/**
 * capabilityClient.load('knowledge_base_answer_generation_1').callStream<KnowledgeBaseAnswerGenerationOneOutput>('searchSummary', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 KnowledgeBaseAnswerGenerationOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"summary":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.summary ?? ''; }
 */
export interface KnowledgeBaseAnswerGenerationOneOutput {
  /** [object Object] */
  summary: string;
}
// ---- end:knowledge_base_answer_generation_1 ----

// ---- plugin:catering_training_poster_generation_1 ----
// ============================================================
// 插件 catering_training_poster_generation_1 (餐饮培训招生宣传图片生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface CateringTrainingPosterGenerationOneInput {
  /** 餐饮培训招生内容的标题与正文描述 */
  training_content: string;
}

/**
 * capabilityClient.load('catering_training_poster_generation_1').call<CateringTrainingPosterGenerationOneOutput>('textToImage', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { images } = result;
 * 返回值形如：
 *   {"images":["示例文本"]}
 */
export interface CateringTrainingPosterGenerationOneOutput {
  /** [object Object] */
  images: string[];
}
// ---- end:catering_training_poster_generation_1 ----

// ---- plugin:admission_poster_generation_1 ----
// ============================================================
// 插件 admission_poster_generation_1 (招生宣传图片生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AdmissionPosterGenerationOneInput {
  /** 1-3张招生相关的参考图片 */
  reference_images: string[];
  /** 招生内容标题 */
  admission_title: string;
  /** 招生内容正文描述 */
  admission_content: string;
}

/**
 * capabilityClient.load('admission_poster_generation_1').call<AdmissionPosterGenerationOneOutput>('imageToImage', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { images } = result;
 * 返回值形如：
 *   {"images":["示例文本"]}
 */
export interface AdmissionPosterGenerationOneOutput {
  /** [object Object] */
  images: string[];
}
// ---- end:admission_poster_generation_1 ----

// ---- plugin:marketing_material_doc_parser_1 ----
// ============================================================
// 插件 marketing_material_doc_parser_1 (营销材料文档解析) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface MarketingMaterialDocParserOneInput {
  /** 待解析的单个文档文件 */
  file: string[];
}

/**
 * capabilityClient.load('marketing_material_doc_parser_1').call<MarketingMaterialDocParserOneOutput>('parseDocToMarkdown', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { content } = result;
 * 返回值形如：
 *   {"content":"示例文本"}
 */
export interface MarketingMaterialDocParserOneOutput {
  /** [object Object] */
  content: string;
}
// ---- end:marketing_material_doc_parser_1 ----

// ---- plugin:marketing_image_understanding_1 ----
// ============================================================
// 插件 marketing_image_understanding_1 (营销材料图片理解) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface MarketingImageUnderstandingOneInput {
  /** 关于图片的查询问题 */
  question: string;
  /** 待分析的营销图片 */
  image: string[];
}

/**
 * capabilityClient.load('marketing_image_understanding_1').callStream<MarketingImageUnderstandingOneOutput>('imageUnderstanding', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 MarketingImageUnderstandingOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","reasoningContent":"","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface MarketingImageUnderstandingOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  reasoningContent?: string;
  /** [object Object] */
  response?: string;
}
// ---- end:marketing_image_understanding_1 ----

// ---- plugin:feishu_bitable_batch_add_records_1 ----
// ============================================================
// 插件 feishu_bitable_batch_add_records_1 (批量新增记录到飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================
// ---- end:feishu_bitable_batch_add_records_1 ----

// ---- plugin:bitable_record_add_1 ----
// ============================================================
// 插件 bitable_record_add_1 (批量新增多维表格记录) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================
// ---- end:bitable_record_add_1 ----

// ---- plugin:bitable_student_sync_1 ----
// ============================================================
// 插件 bitable_student_sync_1 (学员登记表回写) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableStudentSyncOneAggregatequeryInput {
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
    aggregation: string;
    alias: string;
    fieldName: string;
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
 * capabilityClient.load('bitable_student_sync_1').call<BitableStudentSyncOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, result, hasMore } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","result":[{}],"hasMore":false}
 */
export interface BitableStudentSyncOneAggregatequeryOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
}

export interface BitableStudentSyncOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('bitable_student_sync_1').call<BitableStudentSyncOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableStudentSyncOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableStudentSyncOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('bitable_student_sync_1').call<BitableStudentSyncOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableStudentSyncOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableStudentSyncOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('bitable_student_sync_1').call<BitableStudentSyncOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface BitableStudentSyncOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface BitableStudentSyncOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('bitable_student_sync_1').call<BitableStudentSyncOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{}}
 */
export interface BitableStudentSyncOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {

  };
}

export interface BitableStudentSyncOneSearchrecordsInput {
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
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
}

/**
 * capabilityClient.load('bitable_student_sync_1').call<BitableStudentSyncOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}]}
 */
export interface BitableStudentSyncOneSearchrecordsOutput {
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
// ---- end:bitable_student_sync_1 ----

// ---- plugin:bitable_schedule_sync_1 ----
// ============================================================
// 插件 bitable_schedule_sync_1 (课程排期表回写) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableScheduleSyncOneAggregatequeryInput {
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
 * capabilityClient.load('bitable_schedule_sync_1').call<BitableScheduleSyncOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface BitableScheduleSyncOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface BitableScheduleSyncOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('bitable_schedule_sync_1').call<BitableScheduleSyncOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableScheduleSyncOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableScheduleSyncOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('bitable_schedule_sync_1').call<BitableScheduleSyncOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableScheduleSyncOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableScheduleSyncOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('bitable_schedule_sync_1').call<BitableScheduleSyncOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface BitableScheduleSyncOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface BitableScheduleSyncOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('bitable_schedule_sync_1').call<BitableScheduleSyncOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{}}
 */
export interface BitableScheduleSyncOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {

  };
}

export interface BitableScheduleSyncOneSearchrecordsInput {
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
 * capabilityClient.load('bitable_schedule_sync_1').call<BitableScheduleSyncOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}]}
 */
export interface BitableScheduleSyncOneSearchrecordsOutput {
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
// ---- end:bitable_schedule_sync_1 ----

// ---- plugin:bitable_attendance_sync_1 ----
// ============================================================
// 插件 bitable_attendance_sync_1 (考勤记录表回写) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableAttendanceSyncOneInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('bitable_attendance_sync_1').call<BitableAttendanceSyncOneOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableAttendanceSyncOneOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}
// ---- end:bitable_attendance_sync_1 ----

// ---- plugin:bitable_attendance_sync_2 ----
// ============================================================
// 插件 bitable_attendance_sync_2 (bitable-attendance-sync-2) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableAttendanceSyncTwoInput {
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
 * capabilityClient.load('bitable_attendance_sync_2').call<BitableAttendanceSyncTwoOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"学员":null,"课程排期":null,"出勤状态":"示例文本","备注":{}}}],"hasMore":false}
 */
export interface BitableAttendanceSyncTwoOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '学员': unknown;
      '课程排期': unknown;
      '出勤状态': string;
      '备注': {
        text: string;
      };
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
}
// ---- end:bitable_attendance_sync_2 ----

// ---- plugin:bitable_student_sync_2 ----
// ============================================================
// 插件 bitable_student_sync_2 (bitable-student-sync-2) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableStudentSyncTwoInput {
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
 * capabilityClient.load('bitable_student_sync_2').call<BitableStudentSyncTwoOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"record":{"微信号":null,"报名日期":0,"缴费金额":0,"学习进度":"示例文本","结业日期":0,"报名课程":null,"学员姓名":{},"联系电话":"示例文本","备注":null,"来源渠道":"示例文本","缴费状态":"示例文本"},"id":"示例文本"}]}
 */
export interface BitableStudentSyncTwoOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    record: {
      '微信号': unknown;
      '报名日期': number;
      '缴费金额': number;
      '学习进度': string;
      '结业日期': number;
      '报名课程': unknown;
      '学员姓名': {
        text: string;
      };
      '联系电话': string;
      '备注': unknown;
      '来源渠道': string;
      '缴费状态': string;
    };
    id: string;
  }[];
}
// ---- end:bitable_student_sync_2 ----

// ---- plugin:bitable_schedule_sync_2 ----
// ============================================================
// 插件 bitable_schedule_sync_2 (课程排期表同步) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BitableScheduleSyncTwoBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '剩余名额': number;
      '报名学员': unknown;
      '开始时间': string;
      '授课讲师': number[];
      '招生容量': number;
      '结束时间': string;
      '教室场地': string;
      '已报名人数': number;
      '状态': string;
      '排期名称': string;
      '课程名称': unknown;
      '上课日期': number;
    };
  }[];
}

/**
 * capabilityClient.load('bitable_schedule_sync_2').call<BitableScheduleSyncTwoBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface BitableScheduleSyncTwoBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface BitableScheduleSyncTwoSearchrecordsInput {
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
 * capabilityClient.load('bitable_schedule_sync_2').call<BitableScheduleSyncTwoSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"上课日期":0,"开始时间":null,"授课讲师":[],"已报名人数":0,"剩余名额":0,"报名学员":null,"排期名称":{},"课程名称":null,"结束时间":null,"教室场地":"示例文本","招生容量":0,"状态":"示例文本"}}]}
 */
export interface BitableScheduleSyncTwoSearchrecordsOutput {
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
      '上课日期': number;
      '开始时间': unknown;
      '授课讲师': number[];
      '已报名人数': number;
      '剩余名额': number;
      '报名学员': unknown;
      '排期名称': {
        text: string;
      };
      '课程名称': unknown;
      '结束时间': unknown;
      '教室场地': string;
      '招生容量': number;
      '状态': string;
    };
  }[];
}
// ---- end:bitable_schedule_sync_2 ----

// ---- plugin:faq_knowledge_base_writeback_1 ----
// ============================================================
// 插件 faq_knowledge_base_writeback_1 (FAQ知识库回写) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FaqKnowledgeBaseWritebackOneAggregatequeryInput {
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
    aggregation: string;
    alias: string;
    fieldName: string;
  }[];
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
}

/**
 * capabilityClient.load('faq_knowledge_base_writeback_1').call<FaqKnowledgeBaseWritebackOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FaqKnowledgeBaseWritebackOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface FaqKnowledgeBaseWritebackOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '状态': string;
      '更新时间': number;
      '命中次数': number;
      '关键词': string;
      '标准答案': string;
      '分类': string;
      '相似问法': string;
      '问题': string;
    };
  }[];
}

/**
 * capabilityClient.load('faq_knowledge_base_writeback_1').call<FaqKnowledgeBaseWritebackOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FaqKnowledgeBaseWritebackOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FaqKnowledgeBaseWritebackOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '问题': string;
      '分类': string;
      '相似问法': string;
      '标准答案': string;
      '关键词': string;
      '状态': string;
      '更新时间': number;
      '命中次数': number;
    };
  }[];
}

/**
 * capabilityClient.load('faq_knowledge_base_writeback_1').call<FaqKnowledgeBaseWritebackOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FaqKnowledgeBaseWritebackOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FaqKnowledgeBaseWritebackOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('faq_knowledge_base_writeback_1').call<FaqKnowledgeBaseWritebackOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FaqKnowledgeBaseWritebackOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FaqKnowledgeBaseWritebackOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('faq_knowledge_base_writeback_1').call<FaqKnowledgeBaseWritebackOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"命中次数":0,"标准答案":null,"相似问法":null,"状态":null,"更新时间":0,"问题":{"text":"示例文本"},"分类":null,"关键词":null}}
 */
export interface FaqKnowledgeBaseWritebackOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '命中次数': number;
    '标准答案': unknown;
    '相似问法': unknown;
    '状态': unknown;
    '更新时间': number;
    '问题': {
      text: string;
    };
    '分类': unknown;
    '关键词': unknown;
  };
}

export interface FaqKnowledgeBaseWritebackOneSearchrecordsInput {
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
 * capabilityClient.load('faq_knowledge_base_writeback_1').call<FaqKnowledgeBaseWritebackOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"命中次数":0,"问题":{},"标准答案":null,"相似问法":null,"状态":null,"更新时间":0,"分类":null,"关键词":null}}]}
 */
export interface FaqKnowledgeBaseWritebackOneSearchrecordsOutput {
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
      '命中次数': number;
      '问题': {
        text: string;
      };
      '标准答案': unknown;
      '相似问法': unknown;
      '状态': unknown;
      '更新时间': number;
      '分类': unknown;
      '关键词': unknown;
    };
  }[];
}
// ---- end:faq_knowledge_base_writeback_1 ----

// ---- plugin:course_sheet_writeback_1 ----
// ============================================================
// 插件 course_sheet_writeback_1 (课程总表回写) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface CourseSheetWritebackOneAggregatequeryInput {
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
  expandArrayDimension?: boolean;
}

/**
 * capabilityClient.load('course_sheet_writeback_1').call<CourseSheetWritebackOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface CourseSheetWritebackOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface CourseSheetWritebackOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '课程名称': string;
      '课程分类': string;
      '课程简介': string;
      '成品图': string;
      '难度等级': string;
      '学习时长': string;
      '学费': number;
      '状态': string;
    };
  }[];
}

/**
 * capabilityClient.load('course_sheet_writeback_1').call<CourseSheetWritebackOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface CourseSheetWritebackOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface CourseSheetWritebackOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '课程分类': string;
      '学费': number;
      '成品图': string;
      '状态': string;
      '课程名称': string;
      '难度等级': string;
      '学习时长': string;
      '课程简介': string;
    };
  }[];
}

/**
 * capabilityClient.load('course_sheet_writeback_1').call<CourseSheetWritebackOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface CourseSheetWritebackOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface CourseSheetWritebackOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('course_sheet_writeback_1').call<CourseSheetWritebackOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface CourseSheetWritebackOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface CourseSheetWritebackOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('course_sheet_writeback_1').call<CourseSheetWritebackOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"课程名称":{"text":"示例文本"},"课程分类":null,"课程简介":null,"状态":null,"难度等级":null,"学习时长":null,"学费":0,"成品图":null}}
 */
export interface CourseSheetWritebackOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '课程名称': {
      text: string;
    };
    '课程分类': unknown;
    '课程简介': unknown;
    '状态': unknown;
    '难度等级': unknown;
    '学习时长': unknown;
    '学费': number;
    '成品图': unknown;
  };
}

export interface CourseSheetWritebackOneSearchrecordsInput {
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
 * capabilityClient.load('course_sheet_writeback_1').call<CourseSheetWritebackOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"课程分类":null,"难度等级":null,"学费":0,"状态":null,"课程名称":{},"学习时长":null,"课程简介":null,"成品图":null}}],"hasMore":false}
 */
export interface CourseSheetWritebackOneSearchrecordsOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '课程分类': unknown;
      '难度等级': unknown;
      '学费': number;
      '状态': unknown;
      '课程名称': {
        text: string;
      };
      '学习时长': unknown;
      '课程简介': unknown;
      '成品图': unknown;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
}
// ---- end:course_sheet_writeback_1 ----

// ---- plugin:equipment_tool_table_writeback_1 ----
// ============================================================
// 插件 equipment_tool_table_writeback_1 (设备工具表回写) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface EquipmentToolTableWritebackOneAggregatequeryInput {
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
      operator: string;
      value: string[];
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
    alias: string;
    fieldName: string;
  }[];
}

/**
 * capabilityClient.load('equipment_tool_table_writeback_1').call<EquipmentToolTableWritebackOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface EquipmentToolTableWritebackOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface EquipmentToolTableWritebackOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '数量': number;
      '备注': string;
      '所属课程': unknown;
      '设备工具名称': string;
      '规格': string;
    };
  }[];
}

/**
 * capabilityClient.load('equipment_tool_table_writeback_1').call<EquipmentToolTableWritebackOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface EquipmentToolTableWritebackOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface EquipmentToolTableWritebackOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '数量': number;
      '备注': string;
      '所属课程': unknown;
      '设备工具名称': string;
      '规格': string;
    };
  }[];
}

/**
 * capabilityClient.load('equipment_tool_table_writeback_1').call<EquipmentToolTableWritebackOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface EquipmentToolTableWritebackOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface EquipmentToolTableWritebackOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('equipment_tool_table_writeback_1').call<EquipmentToolTableWritebackOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface EquipmentToolTableWritebackOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface EquipmentToolTableWritebackOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('equipment_tool_table_writeback_1').call<EquipmentToolTableWritebackOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"所属课程":null,"设备工具名称":{"text":"示例文本"},"规格":null,"数量":0,"备注":null}}
 */
export interface EquipmentToolTableWritebackOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '所属课程': unknown;
    '设备工具名称': {
      text: string;
    };
    '规格': unknown;
    '数量': number;
    '备注': unknown;
  };
}

export interface EquipmentToolTableWritebackOneSearchrecordsInput {
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
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
}

/**
 * capabilityClient.load('equipment_tool_table_writeback_1').call<EquipmentToolTableWritebackOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"所属课程":null,"设备工具名称":{},"规格":null,"数量":0,"备注":null}}]}
 */
export interface EquipmentToolTableWritebackOneSearchrecordsOutput {
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
      '所属课程': unknown;
      '设备工具名称': {
        text: string;
      };
      '规格': unknown;
      '数量': number;
      '备注': unknown;
    };
  }[];
}
// ---- end:equipment_tool_table_writeback_1 ----

// ---- plugin:content_material_library_writeback_1 ----
// ============================================================
// 插件 content_material_library_writeback_1 (内容素材库回写) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface ContentMaterialLibraryWritebackOneAggregatequeryInput {
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
 * capabilityClient.load('content_material_library_writeback_1').call<ContentMaterialLibraryWritebackOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface ContentMaterialLibraryWritebackOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface ContentMaterialLibraryWritebackOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '核心内容': string;
      '适用平台': string[];
      '标签': string[];
      '状态': string;
      '素材标题': string;
      '素材类型': string;
      '关联课程': unknown;
    };
  }[];
}

/**
 * capabilityClient.load('content_material_library_writeback_1').call<ContentMaterialLibraryWritebackOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface ContentMaterialLibraryWritebackOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface ContentMaterialLibraryWritebackOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '素材标题': string;
      '素材类型': string;
      '关联课程': unknown;
      '核心内容': string;
      '适用平台': string[];
      '标签': string[];
      '状态': string;
    };
  }[];
}

/**
 * capabilityClient.load('content_material_library_writeback_1').call<ContentMaterialLibraryWritebackOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface ContentMaterialLibraryWritebackOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface ContentMaterialLibraryWritebackOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('content_material_library_writeback_1').call<ContentMaterialLibraryWritebackOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface ContentMaterialLibraryWritebackOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface ContentMaterialLibraryWritebackOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('content_material_library_writeback_1').call<ContentMaterialLibraryWritebackOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"关联课程":null,"核心内容":null,"适用平台":["示例文本"],"标签":["示例文本"],"状态":null,"素材标题":{"text":"示例文本"},"素材类型":null}}
 */
export interface ContentMaterialLibraryWritebackOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '关联课程': unknown;
    '核心内容': unknown;
    '适用平台': string[];
    '标签': string[];
    '状态': unknown;
    '素材标题': {
      text: string;
    };
    '素材类型': unknown;
  };
}

export interface ContentMaterialLibraryWritebackOneSearchrecordsInput {
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
  /** [object Object] */
  pageToken?: string;
}

/**
 * capabilityClient.load('content_material_library_writeback_1').call<ContentMaterialLibraryWritebackOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"状态":null,"素材标题":{},"素材类型":null,"关联课程":null,"核心内容":null,"适用平台":[],"标签":[]}}]}
 */
export interface ContentMaterialLibraryWritebackOneSearchrecordsOutput {
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
      '状态': unknown;
      '素材标题': {
        text: string;
      };
      '素材类型': unknown;
      '关联课程': unknown;
      '核心内容': unknown;
      '适用平台': string[];
      '标签': string[];
    };
  }[];
}
// ---- end:content_material_library_writeback_1 ----

// ---- plugin:recipe_detail_table_writeback_1 ----
// ============================================================
// 插件 recipe_detail_table_writeback_1 (配方明细表回写) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface RecipeDetailTableWritebackOneAggregatequeryInput {
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
  /** [object Object] */
  dimensions?: string[];
}

/**
 * capabilityClient.load('recipe_detail_table_writeback_1').call<RecipeDetailTableWritebackOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface RecipeDetailTableWritebackOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface RecipeDetailTableWritebackOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '食材分类': string;
      '备注': string;
      '所属课程': unknown;
      '食材名称': string;
      '用量': number;
      '单位': string;
    };
  }[];
}

/**
 * capabilityClient.load('recipe_detail_table_writeback_1').call<RecipeDetailTableWritebackOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface RecipeDetailTableWritebackOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface RecipeDetailTableWritebackOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '所属课程': unknown;
      '食材名称': string;
      '用量': number;
      '单位': string;
      '食材分类': string;
      '备注': string;
    };
  }[];
}

/**
 * capabilityClient.load('recipe_detail_table_writeback_1').call<RecipeDetailTableWritebackOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface RecipeDetailTableWritebackOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface RecipeDetailTableWritebackOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('recipe_detail_table_writeback_1').call<RecipeDetailTableWritebackOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface RecipeDetailTableWritebackOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface RecipeDetailTableWritebackOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('recipe_detail_table_writeback_1').call<RecipeDetailTableWritebackOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"食材名称":{"text":"示例文本"},"用量":0,"单位":null,"食材分类":null,"备注":null,"所属课程":null}}
 */
export interface RecipeDetailTableWritebackOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '食材名称': {
      text: string;
    };
    '用量': number;
    '单位': unknown;
    '食材分类': unknown;
    '备注': unknown;
    '所属课程': unknown;
  };
}

export interface RecipeDetailTableWritebackOneSearchrecordsInput {
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
 * capabilityClient.load('recipe_detail_table_writeback_1').call<RecipeDetailTableWritebackOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"所属课程":null,"食材名称":{},"用量":0,"单位":null,"食材分类":null,"备注":null}}]}
 */
export interface RecipeDetailTableWritebackOneSearchrecordsOutput {
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
      '所属课程': unknown;
      '食材名称': {
        text: string;
      };
      '用量': number;
      '单位': unknown;
      '食材分类': unknown;
      '备注': unknown;
    };
  }[];
}
// ---- end:recipe_detail_table_writeback_1 ----

// ---- plugin:process_flow_table_writeback_1 ----
// ============================================================
// 插件 process_flow_table_writeback_1 (工艺流程表回写) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface ProcessFlowTableWritebackOneAggregatequeryInput {
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
}

/**
 * capabilityClient.load('process_flow_table_writeback_1').call<ProcessFlowTableWritebackOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, result } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","result":[{}]}
 */
export interface ProcessFlowTableWritebackOneAggregatequeryOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  result: {

  }[];
}

export interface ProcessFlowTableWritebackOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '预计时长': string;
      '操作视频': string;
      '所属课程': unknown;
      '步骤序号': number;
      '步骤名称': string;
      '操作描述': string;
      '关键控制点': string;
    };
  }[];
}

/**
 * capabilityClient.load('process_flow_table_writeback_1').call<ProcessFlowTableWritebackOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface ProcessFlowTableWritebackOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface ProcessFlowTableWritebackOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '所属课程': unknown;
      '步骤序号': number;
      '步骤名称': string;
      '操作描述': string;
      '关键控制点': string;
      '预计时长': string;
      '操作视频': string;
    };
  }[];
}

/**
 * capabilityClient.load('process_flow_table_writeback_1').call<ProcessFlowTableWritebackOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface ProcessFlowTableWritebackOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface ProcessFlowTableWritebackOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('process_flow_table_writeback_1').call<ProcessFlowTableWritebackOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface ProcessFlowTableWritebackOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface ProcessFlowTableWritebackOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('process_flow_table_writeback_1').call<ProcessFlowTableWritebackOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"步骤名称":{"text":"示例文本"},"操作描述":null,"关键控制点":null,"预计时长":null,"操作视频":null,"所属课程":null,"步骤序号":0}}
 */
export interface ProcessFlowTableWritebackOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '步骤名称': {
      text: string;
    };
    '操作描述': unknown;
    '关键控制点': unknown;
    '预计时长': unknown;
    '操作视频': unknown;
    '所属课程': unknown;
    '步骤序号': number;
  };
}

export interface ProcessFlowTableWritebackOneSearchrecordsInput {
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
  /** [object Object] */
  pageSize?: number;
}

/**
 * capabilityClient.load('process_flow_table_writeback_1').call<ProcessFlowTableWritebackOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"所属课程":null,"步骤序号":0,"步骤名称":{},"操作描述":null,"关键控制点":null,"预计时长":null,"操作视频":null}}],"hasMore":false}
 */
export interface ProcessFlowTableWritebackOneSearchrecordsOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '所属课程': unknown;
      '步骤序号': number;
      '步骤名称': {
        text: string;
      };
      '操作描述': unknown;
      '关键控制点': unknown;
      '预计时长': unknown;
      '操作视频': unknown;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
}
// ---- end:process_flow_table_writeback_1 ----

// ---- plugin:faq_knowledge_base_writeback_2 ----
// ============================================================
// 插件 faq_knowledge_base_writeback_2 (FAQ知识库回写 v2) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FaqKnowledgeBaseWritebackTwoAggregatequeryInput {
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
      fieldName: string;
      operator: string;
      value: string[];
    }[];
    conjunction: string;
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
 * capabilityClient.load('faq_knowledge_base_writeback_2').call<FaqKnowledgeBaseWritebackTwoAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FaqKnowledgeBaseWritebackTwoAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface FaqKnowledgeBaseWritebackTwoBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '命中次数': number;
      '分类': string;
      '关键词': string[];
      '相似问法': string;
      '状态': string;
      '更新时间': number;
      '问题': string;
      '标准答案': string;
    };
  }[];
}

/**
 * capabilityClient.load('faq_knowledge_base_writeback_2').call<FaqKnowledgeBaseWritebackTwoBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FaqKnowledgeBaseWritebackTwoBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FaqKnowledgeBaseWritebackTwoBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    record: {
      '问题': string;
      '标准答案': string;
      '分类': string;
      '关键词': string[];
      '更新时间': number;
      '命中次数': number;
      '相似问法': string;
      '状态': string;
    };
    id: string;
  }[];
}

/**
 * capabilityClient.load('faq_knowledge_base_writeback_2').call<FaqKnowledgeBaseWritebackTwoBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FaqKnowledgeBaseWritebackTwoBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FaqKnowledgeBaseWritebackTwoDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('faq_knowledge_base_writeback_2').call<FaqKnowledgeBaseWritebackTwoDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FaqKnowledgeBaseWritebackTwoDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FaqKnowledgeBaseWritebackTwoGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('faq_knowledge_base_writeback_2').call<FaqKnowledgeBaseWritebackTwoGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"命中次数":0,"问题":{"text":"示例文本"},"分类":null,"关键词":["示例文本"],"相似问法":null,"状态":null,"更新时间":0,"标准答案":null}}
 */
export interface FaqKnowledgeBaseWritebackTwoGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '命中次数': number;
    '问题': {
      text: string;
    };
    '分类': unknown;
    '关键词': string[];
    '相似问法': unknown;
    '状态': unknown;
    '更新时间': number;
    '标准答案': unknown;
  };
}

export interface FaqKnowledgeBaseWritebackTwoSearchrecordsInput {
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
 * capabilityClient.load('faq_knowledge_base_writeback_2').call<FaqKnowledgeBaseWritebackTwoSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"关键词":[],"相似问法":null,"命中次数":0,"标准答案":null,"分类":null,"更新时间":0,"问题":{},"状态":null}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FaqKnowledgeBaseWritebackTwoSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '关键词': string[];
      '相似问法': unknown;
      '命中次数': number;
      '标准答案': unknown;
      '分类': unknown;
      '更新时间': number;
      '问题': {
        text: string;
      };
      '状态': unknown;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:faq_knowledge_base_writeback_2 ----

// ---- plugin:graduation_file_bitable_writeback_1 ----
// ============================================================
// 插件 graduation_file_bitable_writeback_1 (结业档案表多维表格回写实例) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface GraduationFileBitableWritebackOneAggregatequeryInput {
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
 * capabilityClient.load('graduation_file_bitable_writeback_1').call<GraduationFileBitableWritebackOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface GraduationFileBitableWritebackOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface GraduationFileBitableWritebackOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '培训结束日期': number;
      '总课时': number;
      '出勤率': number;
      '实操评价': string;
      '发证状态': string;
      '结业证书编号': string;
      '关联课程': unknown;
      '培训开始日期': number;
      '结业日期': number;
      '关联学员': unknown;
      '出勤课时': number;
      '理论评价': string;
    };
  }[];
}

/**
 * capabilityClient.load('graduation_file_bitable_writeback_1').call<GraduationFileBitableWritebackOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface GraduationFileBitableWritebackOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface GraduationFileBitableWritebackOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '发证状态': string;
      '总课时': number;
      '出勤率': number;
      '理论评价': string;
      '培训开始日期': number;
      '培训结束日期': number;
      '出勤课时': number;
      '实操评价': string;
      '结业日期': number;
      '结业证书编号': string;
      '关联学员': unknown;
      '关联课程': unknown;
    };
  }[];
}

/**
 * capabilityClient.load('graduation_file_bitable_writeback_1').call<GraduationFileBitableWritebackOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface GraduationFileBitableWritebackOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface GraduationFileBitableWritebackOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('graduation_file_bitable_writeback_1').call<GraduationFileBitableWritebackOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface GraduationFileBitableWritebackOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface GraduationFileBitableWritebackOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('graduation_file_bitable_writeback_1').call<GraduationFileBitableWritebackOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"出勤率":0,"发证状态":"示例文本","结业证书编号":{"text":"示例文本"},"关联课程":null,"培训开始日期":0,"总课时":0,"理论评价":null,"结业日期":0,"关联学员":null,"培训结束日期":0,"出勤课时":0,"实操评价":null}}
 */
export interface GraduationFileBitableWritebackOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '出勤率': number;
    '发证状态': string;
    '结业证书编号': {
      text: string;
    };
    '关联课程': unknown;
    '培训开始日期': number;
    '总课时': number;
    '理论评价': unknown;
    '结业日期': number;
    '关联学员': unknown;
    '培训结束日期': number;
    '出勤课时': number;
    '实操评价': unknown;
  };
}

export interface GraduationFileBitableWritebackOneSearchrecordsInput {
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
 * capabilityClient.load('graduation_file_bitable_writeback_1').call<GraduationFileBitableWritebackOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"培训开始日期":0,"出勤课时":0,"出勤率":0,"实操评价":null,"结业日期":0,"结业证书编号":{},"关联学员":null,"关联课程":null,"培训结束日期":0,"总课时":0,"理论评价":null,"发证状态":"示例文本"}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface GraduationFileBitableWritebackOneSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '培训开始日期': number;
      '出勤课时': number;
      '出勤率': number;
      '实操评价': unknown;
      '结业日期': number;
      '结业证书编号': {
        text: string;
      };
      '关联学员': unknown;
      '关联课程': unknown;
      '培训结束日期': number;
      '总课时': number;
      '理论评价': unknown;
      '发证状态': string;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:graduation_file_bitable_writeback_1 ----