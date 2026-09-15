// ---- plugin:prompt_template_effect_evaluation_1 ----
// ============================================================
// 插件 prompt_template_effect_evaluation_1 (提示词模板效果等级分类评估) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface PromptTemplateEffectEvaluationOneInput {
  /** 提示词模板的完整信息，包含模板内容、变量说明、历史使用次数、生成结果摘要等 */
  prompt_template_info: string;
}

/**
 * capabilityClient.load('prompt_template_effect_evaluation_1').call<PromptTemplateEffectEvaluationOneOutput>('aiCategorize', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { categories } = result;
 * 返回值形如：
 *   {"categories":["示例文本"]}
 */
export interface PromptTemplateEffectEvaluationOneOutput {
  /** [object Object] */
  categories: string[];
}
// ---- end:prompt_template_effect_evaluation_1 ----

// ---- plugin:short_video_script_generator_1 ----
// ============================================================
// 插件 short_video_script_generator_1 (短视频分镜脚本AI生成器) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface ShortVideoScriptGeneratorOneInput {
  /** 参考素材、核心信息或特殊要求（可选） */
  reference_material?: string;
  /** 短视频核心主题 */
  video_topic: string;
  /** 内容类型（如知识科普、产品推广、剧情故事、生活vlog等） */
  content_type: string;
  /** 总时长要求（如15秒、30秒、1分钟、3分钟等） */
  duration_requirement: string;
}

/**
 * capabilityClient.load('short_video_script_generator_1').callStream<ShortVideoScriptGeneratorOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 ShortVideoScriptGeneratorOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface ShortVideoScriptGeneratorOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:short_video_script_generator_1 ----

// ---- plugin:douyin_hot_material_analysis_1 ----
// ============================================================
// 插件 douyin_hot_material_analysis_1 (抖音爆款素材拆解分析) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface DouyinHotMaterialAnalysisOneInput {
  /** 视频文案内容 */
  video_content: string;
  /** 抖音视频链接 */
  video_url: string;
}

/**
 * capabilityClient.load('douyin_hot_material_analysis_1').call<DouyinHotMaterialAnalysisOneOutput>('textToJson', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { completion_rate_score, interaction_potential_score, score_level, ... } = result;
 * 返回值形如：
 *   {"completion_rate_score":0,"interaction_potential_score":0,"score_level":"示例文本","tags":[],"author_name":"示例文本","content_quality_score":0,"spread_potential_score":0,"comprehensive_score":0,"hook_analysis":"示例文本","video_title":"示例文本","comment_count":0,"share_count":0,"bgm_suggestion":"示例文本","content_type":"示例文本","emotion_tags":[],"platform_adaptation_score":0,"screen_description":"示例文本","like_count":0}
 */
export interface DouyinHotMaterialAnalysisOneOutput {
  /** 完播力评分，0-100整数 */
  completion_rate_score: number;
  /** 互动潜力评分，0-100整数 */
  interaction_potential_score: number;
  /** 评分等级，取值为S/A/B/C/D */
  score_level: string;
  /** 相关标签列表，5-8个最相关的抖音热门话题标签，不带#号，items schema: {tag: string(标签内容)} */
  tags: unknown[];
  /** 抖音作者昵称 */
  author_name: string;
  /** 内容质量评分，0-100整数 */
  content_quality_score: number;
  /** 传播潜力评分，0-100整数 */
  spread_potential_score: number;
  /** 综合评分，0-100整数，为五维评分的加权平均值 */
  comprehensive_score: number;
  /** 钩子分析，描述视频开头吸引用户停留的核心设计 */
  hook_analysis: string;
  /** 根据链接与文案推断的视频标题 */
  video_title: string;
  /** 估算评论数，非负整数 */
  comment_count: number;
  /** 估算分享数，非负整数 */
  share_count: number;
  /** BGM建议，给出适配视频内容的音乐风格或参考方向 */
  bgm_suggestion: string;
  /** 内容类型，只能从知识科普/产品推广/剧情故事/生活vlog/搞笑娱乐/情感共鸣/影视剪辑/好物分享中选择 */
  content_type: string;
  /** 情绪标签列表，3-5个情绪标签，可选值如治愈/搞笑/紧张/感动/励志等，items schema: {tag: string(标签内容)} */
  emotion_tags: unknown[];
  /** 平台适配评分，0-100整数 */
  platform_adaptation_score: number;
  /** 画面描述，提炼视频核心视觉元素、拍摄手法和呈现风格 */
  screen_description: string;
  /** 估算点赞数，非负整数 */
  like_count: number;
}
// ---- end:douyin_hot_material_analysis_1 ----

// ---- plugin:ai_video_workshop_data_base_1 ----
// ============================================================
// 插件 ai_video_workshop_data_base_1 (AI视频创作工坊数据底座) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiVideoWorkshopDataBaseOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('ai_video_workshop_data_base_1').call<AiVideoWorkshopDataBaseOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface AiVideoWorkshopDataBaseOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface AiVideoWorkshopDataBaseOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('ai_video_workshop_data_base_1').call<AiVideoWorkshopDataBaseOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface AiVideoWorkshopDataBaseOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}
// ---- end:ai_video_workshop_data_base_1 ----

// ---- plugin:ai_video_creation_workshop_prompt_template_table_1 ----
// ============================================================
// 插件 ai_video_creation_workshop_prompt_template_table_1 (AI视频创作工坊-提示词模板库表) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiVideoCreationWorkshopPromptTemplateTableOneAggregatequeryInput {
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
 * capabilityClient.load('ai_video_creation_workshop_prompt_template_table_1').call<AiVideoCreationWorkshopPromptTemplateTableOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface AiVideoCreationWorkshopPromptTemplateTableOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface AiVideoCreationWorkshopPromptTemplateTableOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('ai_video_creation_workshop_prompt_template_table_1').call<AiVideoCreationWorkshopPromptTemplateTableOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface AiVideoCreationWorkshopPromptTemplateTableOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface AiVideoCreationWorkshopPromptTemplateTableOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('ai_video_creation_workshop_prompt_template_table_1').call<AiVideoCreationWorkshopPromptTemplateTableOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface AiVideoCreationWorkshopPromptTemplateTableOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface AiVideoCreationWorkshopPromptTemplateTableOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('ai_video_creation_workshop_prompt_template_table_1').call<AiVideoCreationWorkshopPromptTemplateTableOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface AiVideoCreationWorkshopPromptTemplateTableOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface AiVideoCreationWorkshopPromptTemplateTableOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('ai_video_creation_workshop_prompt_template_table_1').call<AiVideoCreationWorkshopPromptTemplateTableOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{}}
 */
export interface AiVideoCreationWorkshopPromptTemplateTableOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {

  };
}

export interface AiVideoCreationWorkshopPromptTemplateTableOneSearchrecordsInput {
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
 * capabilityClient.load('ai_video_creation_workshop_prompt_template_table_1').call<AiVideoCreationWorkshopPromptTemplateTableOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}]}
 */
export interface AiVideoCreationWorkshopPromptTemplateTableOneSearchrecordsOutput {
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
// ---- end:ai_video_creation_workshop_prompt_template_table_1 ----

// ---- plugin:ai_video_workshop_video_warehouse_1 ----
// ============================================================
// 插件 ai_video_workshop_video_warehouse_1 (AI视频创作工坊-视频成品库表) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiVideoWorkshopVideoWarehouseOneAggregatequeryInput {
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
 * capabilityClient.load('ai_video_workshop_video_warehouse_1').call<AiVideoWorkshopVideoWarehouseOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface AiVideoWorkshopVideoWarehouseOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface AiVideoWorkshopVideoWarehouseOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('ai_video_workshop_video_warehouse_1').call<AiVideoWorkshopVideoWarehouseOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface AiVideoWorkshopVideoWarehouseOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface AiVideoWorkshopVideoWarehouseOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('ai_video_workshop_video_warehouse_1').call<AiVideoWorkshopVideoWarehouseOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface AiVideoWorkshopVideoWarehouseOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface AiVideoWorkshopVideoWarehouseOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('ai_video_workshop_video_warehouse_1').call<AiVideoWorkshopVideoWarehouseOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface AiVideoWorkshopVideoWarehouseOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface AiVideoWorkshopVideoWarehouseOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('ai_video_workshop_video_warehouse_1').call<AiVideoWorkshopVideoWarehouseOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{}}
 */
export interface AiVideoWorkshopVideoWarehouseOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {

  };
}

export interface AiVideoWorkshopVideoWarehouseOneSearchrecordsInput {
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
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
}

/**
 * capabilityClient.load('ai_video_workshop_video_warehouse_1').call<AiVideoWorkshopVideoWarehouseOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}],"hasMore":false}
 */
export interface AiVideoWorkshopVideoWarehouseOneSearchrecordsOutput {
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
// ---- end:ai_video_workshop_video_warehouse_1 ----

// ---- plugin:ai_video_workshop_character_asset_base_1 ----
// ============================================================
// 插件 ai_video_workshop_character_asset_base_1 (AI视频创作工坊-角色资产库表) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiVideoWorkshopCharacterAssetBaseOneAggregatequeryInput {
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
 * capabilityClient.load('ai_video_workshop_character_asset_base_1').call<AiVideoWorkshopCharacterAssetBaseOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, result, hasMore } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","result":[{}],"hasMore":false}
 */
export interface AiVideoWorkshopCharacterAssetBaseOneAggregatequeryOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
}

export interface AiVideoWorkshopCharacterAssetBaseOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('ai_video_workshop_character_asset_base_1').call<AiVideoWorkshopCharacterAssetBaseOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface AiVideoWorkshopCharacterAssetBaseOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface AiVideoWorkshopCharacterAssetBaseOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('ai_video_workshop_character_asset_base_1').call<AiVideoWorkshopCharacterAssetBaseOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface AiVideoWorkshopCharacterAssetBaseOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface AiVideoWorkshopCharacterAssetBaseOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('ai_video_workshop_character_asset_base_1').call<AiVideoWorkshopCharacterAssetBaseOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface AiVideoWorkshopCharacterAssetBaseOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface AiVideoWorkshopCharacterAssetBaseOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('ai_video_workshop_character_asset_base_1').call<AiVideoWorkshopCharacterAssetBaseOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{}}
 */
export interface AiVideoWorkshopCharacterAssetBaseOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {

  };
}

export interface AiVideoWorkshopCharacterAssetBaseOneSearchrecordsInput {
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
 * capabilityClient.load('ai_video_workshop_character_asset_base_1').call<AiVideoWorkshopCharacterAssetBaseOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}]}
 */
export interface AiVideoWorkshopCharacterAssetBaseOneSearchrecordsOutput {
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
// ---- end:ai_video_workshop_character_asset_base_1 ----

// ---- plugin:ai_video_creation_workshop_generation_task_table_1 ----
// ============================================================
// 插件 ai_video_creation_workshop_generation_task_table_1 (AI视频创作工坊-生成任务表) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiVideoCreationWorkshopGenerationTaskTableOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('ai_video_creation_workshop_generation_task_table_1').call<AiVideoCreationWorkshopGenerationTaskTableOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface AiVideoCreationWorkshopGenerationTaskTableOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface AiVideoCreationWorkshopGenerationTaskTableOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {

    };
  }[];
}

/**
 * capabilityClient.load('ai_video_creation_workshop_generation_task_table_1').call<AiVideoCreationWorkshopGenerationTaskTableOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface AiVideoCreationWorkshopGenerationTaskTableOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface AiVideoCreationWorkshopGenerationTaskTableOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('ai_video_creation_workshop_generation_task_table_1').call<AiVideoCreationWorkshopGenerationTaskTableOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface AiVideoCreationWorkshopGenerationTaskTableOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface AiVideoCreationWorkshopGenerationTaskTableOneSearchrecordsInput {
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
 * capabilityClient.load('ai_video_creation_workshop_generation_task_table_1').call<AiVideoCreationWorkshopGenerationTaskTableOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{}}]}
 */
export interface AiVideoCreationWorkshopGenerationTaskTableOneSearchrecordsOutput {
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
// ---- end:ai_video_creation_workshop_generation_task_table_1 ----

// ---- plugin:ai_video_creation_workshop_tts_dubbing_synthesis_1 ----
// ============================================================
// 插件 ai_video_creation_workshop_tts_dubbing_synthesis_1 (AI视频创作工坊-TTS配音合成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiVideoCreationWorkshopTtsDubbingSynthesisOneInput {
  /** 语速选择，可选值：1.0（正常）、1.2（快1.2倍）、1.5（快1.5倍）、2.0（快2倍）、0.8（慢0.8倍）、0.5（慢0.5倍）、0.2（慢0.2倍） */
  speed_ratio?: string;
  /** 音量选择，可选值：1.0（正常）、1.2（高1.2倍）、1.5（高1.5倍）、2.0（高2倍）、0.8（低0.8倍）、0.5（低0.5倍） */
  volume_ratio?: string;
  /** 分镜脚本台词文本，最多支持3000个字符 */
  script_text: string;
  /** 音色选择，可选值：zh_female_qingxinnvsheng_mars_bigtts（女声）、zh_male_qingshuangnanda_mars_bigtts（男声），支持扩展覆盖温柔女声、活力女声、沉稳男声、青年男声、磁性旁白、可爱童声等中文音色 */
  voice_type?: string;
}

/**
 * capabilityClient.load('ai_video_creation_workshop_tts_dubbing_synthesis_1').call<AiVideoCreationWorkshopTtsDubbingSynthesisOneOutput>('speechSynthesis', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { audioUrl } = result;
 * 返回值形如：
 *   {"audioUrl":"示例文本"}
 */
export interface AiVideoCreationWorkshopTtsDubbingSynthesisOneOutput {
  /** [object Object] */
  audioUrl: string;
}
// ---- end:ai_video_creation_workshop_tts_dubbing_synthesis_1 ----

// ---- plugin:ai_video_creation_workshop_storyboard_image_generator_1 ----
// ============================================================
// 插件 ai_video_creation_workshop_storyboard_image_generator_1 (AI视频创作工坊-分镜参考图生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiVideoCreationWorkshopStoryboardImageGeneratorOneInput {
  /** 分镜画面的详细描述提示词，需要包含场景、人物、动作、道具、光线、风格等关键信息 */
  storyboard_description: string;
  /** 生成图片的比例，支持的值：1:1、4:3、3:4、16:9、9:16、3:2、2:3，默认值为9:16竖屏 */
  aspect_ratio?: string;
}

/**
 * capabilityClient.load('ai_video_creation_workshop_storyboard_image_generator_1').call<AiVideoCreationWorkshopStoryboardImageGeneratorOneOutput>('textToImage', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { images } = result;
 * 返回值形如：
 *   {"images":["示例文本"]}
 */
export interface AiVideoCreationWorkshopStoryboardImageGeneratorOneOutput {
  /** [object Object] */
  images: string[];
}
// ---- end:ai_video_creation_workshop_storyboard_image_generator_1 ----

// ---- plugin:douyin_video_parsing_proxy_1 ----
// ============================================================
// 插件 douyin_video_parsing_proxy_1 (抖音视频解析代理) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface DouyinVideoParsingProxyOneInput {
  /** 用户粘贴的抖音视频链接 */
  douyin_video_url: string;
}

/**
 * capabilityClient.load('douyin_video_parsing_proxy_1').callStream<DouyinVideoParsingProxyOneOutput>('crawlWebPage', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 DouyinVideoParsingProxyOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface DouyinVideoParsingProxyOneOutput {
  /** [object Object] */
  content: string;
}
// ---- end:douyin_video_parsing_proxy_1 ----

// ---- plugin:douyin_video_parsing_proxy_backup_endpoint_1 ----
// ============================================================
// 插件 douyin_video_parsing_proxy_backup_endpoint_1 (抖音视频解析代理-备用端点) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface DouyinVideoParsingProxyBackupEndpointOneInput {
  /** 待解析的抖音视频链接 */
  douyin_video_url: string;
}

/**
 * capabilityClient.load('douyin_video_parsing_proxy_backup_endpoint_1').callStream<DouyinVideoParsingProxyBackupEndpointOneOutput>('crawlWebPage', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 DouyinVideoParsingProxyBackupEndpointOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface DouyinVideoParsingProxyBackupEndpointOneOutput {
  /** [object Object] */
  content: string;
}
// ---- end:douyin_video_parsing_proxy_backup_endpoint_1 ----

// ---- plugin:douyin_video_parsing_proxy_fallback_crawler_1 ----
// ============================================================
// 插件 douyin_video_parsing_proxy_fallback_crawler_1 (抖音视频解析兜底爬虫) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface DouyinVideoParsingProxyFallbackCrawlerOneInput {
  /** 抖音视频分享页面链接 */
  douyin_share_url: string;
}

/**
 * capabilityClient.load('douyin_video_parsing_proxy_fallback_crawler_1').callStream<DouyinVideoParsingProxyFallbackCrawlerOneOutput>('crawlWebPage', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 DouyinVideoParsingProxyFallbackCrawlerOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface DouyinVideoParsingProxyFallbackCrawlerOneOutput {
  /** [object Object] */
  content: string;
}
// ---- end:douyin_video_parsing_proxy_fallback_crawler_1 ----