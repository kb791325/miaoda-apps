// ---- plugin:system_operation_log_bitable_1 ----
// ============================================================
// 插件 system_operation_log_bitable_1 (系统操作日志) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface SystemOperationLogBitableOneInput {
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
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
    conjunction: string;
  };
}

/**
 * capabilityClient.load('system_operation_log_bitable_1').call<SystemOperationLogBitableOneOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"操作结果":"示例文本","操作设备":null,"对象ID":null,"LOG编号":"示例文本","变更字段":null,"变更前内容":null,"失败原因":null,"操作类型":"示例文本","操作人部门":null,"操作人":null,"操作时间":0,"变更后内容":null,"操作对象":{},"备注":null,"操作模块":"示例文本","操作IP":null}}]}
 */
export interface SystemOperationLogBitableOneOutput {
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
      '操作结果': string;
      '操作设备': unknown;
      '对象ID': unknown;
      'LOG编号': string;
      '变更字段': unknown;
      '变更前内容': unknown;
      '失败原因': unknown;
      '操作类型': string;
      '操作人部门': unknown;
      '操作人': unknown;
      '操作时间': number;
      '变更后内容': unknown;
      '操作对象': {
        text: string;
      };
      '备注': unknown;
      '操作模块': string;
      '操作IP': unknown;
    };
  }[];
}
// ---- end:system_operation_log_bitable_1 ----

// ---- plugin:feishu_multitable_crud_analysis_9 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_9 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisNineBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '备注': string;
      '设置编号': string;
      '设置项': string;
      '状态': string;
      '设置分类': string;
      '设置值': string;
      '说明': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_analysis_9').call<FeishuMultitableCrudAnalysisNineBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAnalysisNineBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuMultitableCrudAnalysisNineSearchrecordsInput {
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
 * capabilityClient.load('feishu_multitable_crud_analysis_9').call<FeishuMultitableCrudAnalysisNineSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { total, records, hasMore, ... } = result;
 * 返回值形如：
 *   {"total":0,"records":[{"id":"示例文本","record":{"创建人":[],"设置项":null,"状态":"示例文本","设置分类":"示例文本","设置值":{},"说明":null,"创建时间":0,"备注":null,"修改人":[],"设置编号":null,"修改时间":0}}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuMultitableCrudAnalysisNineSearchrecordsOutput {
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '创建人': number[];
      '设置项': unknown;
      '状态': string;
      '设置分类': string;
      '设置值': {
        text: string;
      };
      '说明': unknown;
      '创建时间': number;
      '备注': unknown;
      '修改人': number[];
      '设置编号': unknown;
      '修改时间': number;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}
// ---- end:feishu_multitable_crud_analysis_9 ----

// ---- plugin:feishu_bitable_system_operation_log_1 ----
// ============================================================
// 插件 feishu_bitable_system_operation_log_1 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableSystemOperationLogOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '对象ID': string;
      '操作结果': string;
      '操作人部门': string;
      '操作设备': string;
      '失败原因': string;
      '操作模块': string;
      '操作人': number[];
      '备注': string;
      '操作时间': number;
      '变更后内容': string;
      '变更前内容': string;
      '操作IP': string;
      '操作对象': string;
      '操作类型': string;
      '变更字段': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_system_operation_log_1').call<FeishuBitableSystemOperationLogOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableSystemOperationLogOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableSystemOperationLogOneSearchrecordsInput {
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
 * capabilityClient.load('feishu_bitable_system_operation_log_1').call<FeishuBitableSystemOperationLogOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"操作时间":0,"LOG编号":"示例文本","变更字段":null,"失败原因":null,"变更前内容":null,"变更后内容":null,"操作IP":null,"操作结果":"示例文本","操作类型":"示例文本","操作人部门":"示例文本","对象ID":null,"操作人":[],"操作对象":{},"备注":null,"操作设备":null,"操作模块":"示例文本"}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FeishuBitableSystemOperationLogOneSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '操作时间': number;
      'LOG编号': string;
      '变更字段': unknown;
      '失败原因': unknown;
      '变更前内容': unknown;
      '变更后内容': unknown;
      '操作IP': unknown;
      '操作结果': string;
      '操作类型': string;
      '操作人部门': string;
      '对象ID': unknown;
      '操作人': number[];
      '操作对象': {
        text: string;
      };
      '备注': unknown;
      '操作设备': unknown;
      '操作模块': string;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:feishu_bitable_system_operation_log_1 ----

// ---- plugin:feishu_bitable_login_log_1 ----
// ============================================================
// 插件 feishu_bitable_login_log_1 (登录日志多维表格连接) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableLoginLogOneAggregatequeryInput {
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
      operator: string;
      value: string[];
      fieldName: string;
    }[];
  };
  /** [object Object] */
  expandArrayDimension?: boolean;
  /** [object Object] */
  dimensions?: string[];
}

/**
 * capabilityClient.load('feishu_bitable_login_log_1').call<FeishuBitableLoginLogOneAggregatequeryOutput>('aggregateQuery', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { result, hasMore, pageToken } = result;
 * 返回值形如：
 *   {"result":[{}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuBitableLoginLogOneAggregatequeryOutput {
  /** [object Object] */
  result: {

  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}

export interface FeishuBitableLoginLogOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '失败原因': string;
      '操作系统': string;
      '登录时间': number;
      '登录状态': string;
      '浏览器': string;
      '登录设备': string;
      '备注': string;
      '用户': number[];
      '登录IP': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_login_log_1').call<FeishuBitableLoginLogOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableLoginLogOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableLoginLogOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '备注': string;
      '用户': number[];
      '登录时间': number;
      '登录IP': string;
      '浏览器': string;
      '失败原因': string;
      '操作系统': string;
      '登录状态': string;
      '登录设备': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_login_log_1').call<FeishuBitableLoginLogOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableLoginLogOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableLoginLogOneDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_bitable_login_log_1').call<FeishuBitableLoginLogOneDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuBitableLoginLogOneDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuBitableLoginLogOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_bitable_login_log_1').call<FeishuBitableLoginLogOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"登录IP":{"text":"示例文本"},"浏览器":null,"登录时间":0,"用户":[0],"登录状态":"示例文本","失败原因":null,"操作系统":null,"登录设备":null,"备注":null,"DL编号":"示例文本"}}
 */
export interface FeishuBitableLoginLogOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '登录IP': {
      text: string;
    };
    '浏览器': unknown;
    '登录时间': number;
    '用户': number[];
    '登录状态': string;
    '失败原因': unknown;
    '操作系统': unknown;
    '登录设备': unknown;
    '备注': unknown;
    'DL编号': string;
  };
}

export interface FeishuBitableLoginLogOneSearchrecordsInput {
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
 * capabilityClient.load('feishu_bitable_login_log_1').call<FeishuBitableLoginLogOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"DL编号":"示例文本","登录时间":0,"操作系统":null,"登录设备":null,"备注":null,"用户":[],"登录状态":"示例文本","登录IP":{},"浏览器":null,"失败原因":null}}]}
 */
export interface FeishuBitableLoginLogOneSearchrecordsOutput {
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
      'DL编号': string;
      '登录时间': number;
      '操作系统': unknown;
      '登录设备': unknown;
      '备注': unknown;
      '用户': number[];
      '登录状态': string;
      '登录IP': {
        text: string;
      };
      '浏览器': unknown;
      '失败原因': unknown;
    };
  }[];
}
// ---- end:feishu_bitable_login_log_1 ----

// ---- plugin:feishu_bitable_role_permission_1 ----
// ============================================================
// 插件 feishu_bitable_role_permission_1 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableRolePermissionOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '操作IP': string;
      '操作结果': string;
      '操作模块': string;
      '变更后内容': string;
      '变更字段': string;
      '操作人部门': string;
      '操作设备': string;
      '失败原因': string;
      '备注': string;
      '操作时间': number;
      '对象ID': string;
      '变更前内容': string;
      '操作人': number[];
      '操作类型': string;
      '操作对象': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_role_permission_1').call<FeishuBitableRolePermissionOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableRolePermissionOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableRolePermissionOneSearchrecordsInput {
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
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
    conjunction: string;
  };
}

/**
 * capabilityClient.load('feishu_bitable_role_permission_1').call<FeishuBitableRolePermissionOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"操作人部门":"示例文本","操作对象":{},"变更前内容":null,"变更后内容":null,"LOG编号":"示例文本","操作时间":0,"操作类型":"示例文本","变更字段":null,"操作IP":null,"失败原因":null,"操作模块":"示例文本","对象ID":null,"操作结果":"示例文本","修改人":[],"备注":null,"操作人":[],"操作设备":null,"创建时间":0,"修改时间":0,"创建人":[]}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FeishuBitableRolePermissionOneSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '操作人部门': string;
      '操作对象': {
        text: string;
      };
      '变更前内容': unknown;
      '变更后内容': unknown;
      'LOG编号': string;
      '操作时间': number;
      '操作类型': string;
      '变更字段': unknown;
      '操作IP': unknown;
      '失败原因': unknown;
      '操作模块': string;
      '对象ID': unknown;
      '操作结果': string;
      '修改人': number[];
      '备注': unknown;
      '操作人': number[];
      '操作设备': unknown;
      '创建时间': number;
      '修改时间': number;
      '创建人': number[];
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:feishu_bitable_role_permission_1 ----

// ---- plugin:feishu_bitable_management_crud_analysis_72 ----
// ============================================================
// 插件 feishu_bitable_management_crud_analysis_72 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableManagementCrudAnalysisSevenTwoBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '角色编号': string;
      '角色名称': string;
      '角色描述': string;
      '菜单权限': string;
      '数据权限范围': string;
      '状态': string;
      '备注': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_management_crud_analysis_72').call<FeishuBitableManagementCrudAnalysisSevenTwoBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableManagementCrudAnalysisSevenTwoBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableManagementCrudAnalysisSevenTwoSearchrecordsInput {
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
 * capabilityClient.load('feishu_bitable_management_crud_analysis_72').call<FeishuBitableManagementCrudAnalysisSevenTwoSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"record":{"状态":"示例文本","创建时间":0,"创建人":[],"角色编号":{},"角色名称":null,"菜单权限":null,"修改人":[],"备注":null,"角色描述":null,"数据权限范围":"示例文本","修改时间":0},"id":"示例文本"}]}
 */
export interface FeishuBitableManagementCrudAnalysisSevenTwoSearchrecordsOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    record: {
      '状态': string;
      '创建时间': number;
      '创建人': number[];
      '角色编号': {
        text: string;
      };
      '角色名称': unknown;
      '菜单权限': unknown;
      '修改人': number[];
      '备注': unknown;
      '角色描述': unknown;
      '数据权限范围': string;
      '修改时间': number;
    };
    id: string;
  }[];
}
// ---- end:feishu_bitable_management_crud_analysis_72 ----

// ---- plugin:feishu_bitable_management_crud_analysis_71 ----
// ============================================================
// 插件 feishu_bitable_management_crud_analysis_71 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuBitableManagementCrudAnalysisSevenOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '用户': number[];
      '登录时间': number;
      '登录设备': string;
      '浏览器': string;
      '登录IP': string;
      '登录状态': string;
      '失败原因': string;
      '操作系统': string;
      '备注': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_bitable_management_crud_analysis_71').call<FeishuBitableManagementCrudAnalysisSevenOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuBitableManagementCrudAnalysisSevenOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuBitableManagementCrudAnalysisSevenOneSearchrecordsInput {
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
 * capabilityClient.load('feishu_bitable_management_crud_analysis_71').call<FeishuBitableManagementCrudAnalysisSevenOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"record":{"用户":[],"登录IP":{},"登录设备":null,"登录状态":"示例文本","修改时间":0,"创建人":[],"备注":null,"DL编号":"示例文本","登录时间":0,"失败原因":null,"浏览器":null,"操作系统":null,"创建时间":0,"修改人":[]},"id":"示例文本"}]}
 */
export interface FeishuBitableManagementCrudAnalysisSevenOneSearchrecordsOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    record: {
      '用户': number[];
      '登录IP': {
        text: string;
      };
      '登录设备': unknown;
      '登录状态': string;
      '修改时间': number;
      '创建人': number[];
      '备注': unknown;
      'DL编号': string;
      '登录时间': number;
      '失败原因': unknown;
      '浏览器': unknown;
      '操作系统': unknown;
      '创建时间': number;
      '修改人': number[];
    };
    id: string;
  }[];
}
// ---- end:feishu_bitable_management_crud_analysis_71 ----

// ---- plugin:feishu_multitable_crud_analysis_13 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_13 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisOneThreeInput {
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
  /** [object Object] */
  pageToken?: string;
}

/**
 * capabilityClient.load('feishu_multitable_crud_analysis_13').call<FeishuMultitableCrudAnalysisOneThreeOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"决策角色":"示例文本","创建人":[],"生日":0,"邮箱":null,"所属客户":null,"修改时间":0,"创建时间":0,"LX编号":"示例文本","QQ":null,"姓名":{},"手机号":null,"备注":null,"沟通偏好":[],"是否主要联系人":null,"职位":null,"修改人":[],"个人备注":null,"性别":"示例文本","微信":null}}]}
 */
export interface FeishuMultitableCrudAnalysisOneThreeOutput {
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
      '决策角色': string;
      '创建人': number[];
      '生日': number;
      '邮箱': unknown;
      '所属客户': unknown;
      '修改时间': number;
      '创建时间': number;
      'LX编号': string;
      QQ: unknown;
      '姓名': {
        text: string;
      };
      '手机号': unknown;
      '备注': unknown;
      '沟通偏好': string[];
      '是否主要联系人': unknown;
      '职位': unknown;
      '修改人': number[];
      '个人备注': unknown;
      '性别': string;
      '微信': unknown;
    };
  }[];
}
// ---- end:feishu_multitable_crud_analysis_13 ----

// ---- plugin:feishu_multitable_crud_analysis_2 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_2 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisTwoInput {
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
    desc: boolean;
    fieldName: string;
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_analysis_2').call<FeishuMultitableCrudAnalysisTwoOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"当前余额":0,"累计充值":0,"累计消耗":0,"关联客户ID":null,"账户名称":null,"账户状态":"示例文本","所属部门":"示例文本","余额预警阈值":0,"创建时间":0,"创建人":[],"账户ID":{},"投放端口":"示例文本","账户类型":"示例文本","修改人":[],"昨日消耗":0,"负责优化师":[],"开户时间":0,"修改时间":0,"备注":null,"赠款余额":0,"账户密码":null,"账户链接":{}}}]}
 */
export interface FeishuMultitableCrudAnalysisTwoOutput {
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
      '当前余额': number;
      '累计充值': number;
      '累计消耗': number;
      '关联客户ID': unknown;
      '账户名称': unknown;
      '账户状态': string;
      '所属部门': string;
      '余额预警阈值': number;
      '创建时间': number;
      '创建人': number[];
      '账户ID': {
        text: string;
      };
      '投放端口': string;
      '账户类型': string;
      '修改人': number[];
      '昨日消耗': number;
      '负责优化师': number[];
      '开户时间': number;
      '修改时间': number;
      '备注': unknown;
      '赠款余额': number;
      '账户密码': unknown;
      '账户链接': {
        link: string;
        text: string;
      };
    };
  }[];
}
// ---- end:feishu_multitable_crud_analysis_2 ----

// ---- plugin:feishu_multitable_crud_analysis_26 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_26 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisTwoSixInput {
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
    desc: boolean;
    fieldName: string;
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_analysis_26').call<FeishuMultitableCrudAnalysisTwoSixOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"创建人":[],"备注":null,"修改人":[],"联系电话":{},"CDF编号":"示例文本","创建时间":0,"场地地址":null,"结算日期":0,"所属视频项目":null,"经办人":[],"总费用":0,"日租金":0,"押金金额":0,"场地名称":null,"租赁天数":0,"修改时间":0,"租赁日期":0,"结算状态":"示例文本","场地联系人":null}}],"hasMore":false}
 */
export interface FeishuMultitableCrudAnalysisTwoSixOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '创建人': number[];
      '备注': unknown;
      '修改人': number[];
      '联系电话': {
        text: string;
      };
      'CDF编号': string;
      '创建时间': number;
      '场地地址': unknown;
      '结算日期': number;
      '所属视频项目': unknown;
      '经办人': number[];
      '总费用': number;
      '日租金': number;
      '押金金额': number;
      '场地名称': unknown;
      '租赁天数': number;
      '修改时间': number;
      '租赁日期': number;
      '结算状态': string;
      '场地联系人': unknown;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
}
// ---- end:feishu_multitable_crud_analysis_26 ----

// ---- plugin:feishu_multitable_crud_analysis_25 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_25 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisTwoFiveInput {
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
 * capabilityClient.load('feishu_multitable_crud_analysis_25').call<FeishuMultitableCrudAnalysisTwoFiveOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"PSF编号":"示例文本","经办人":[],"备注":{},"修改时间":0,"发生日期":0,"费用金额":0,"所属视频项目":null,"创建人":[],"修改人":[],"费用说明":null,"创建时间":0,"报销状态":"示例文本","费用类型":"示例文本"}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FeishuMultitableCrudAnalysisTwoFiveOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      'PSF编号': string;
      '经办人': number[];
      '备注': {
        text: string;
      };
      '修改时间': number;
      '发生日期': number;
      '费用金额': number;
      '所属视频项目': unknown;
      '创建人': number[];
      '修改人': number[];
      '费用说明': unknown;
      '创建时间': number;
      '报销状态': string;
      '费用类型': string;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:feishu_multitable_crud_analysis_25 ----

// ---- plugin:feishu_multitable_crud_analysis_14 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_14 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisOneFourInput {
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
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_analysis_14').call<FeishuMultitableCrudAnalysisOneFourOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"record":{"沟通内容":null,"客户反馈":null,"修改时间":0,"意向度":"示例文本","联系人":null,"创建人":[],"跟进时间":0,"跟进人":[],"跟进结果":"示例文本","创建时间":0,"跟进方式":"示例文本","所属客户":null,"GJ编号":"示例文本","备注":{},"附件":[],"下一步计划":null,"修改人":[],"下次跟进时间":0},"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAnalysisOneFourOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    record: {
      '沟通内容': unknown;
      '客户反馈': unknown;
      '修改时间': number;
      '意向度': string;
      '联系人': unknown;
      '创建人': number[];
      '跟进时间': number;
      '跟进人': number[];
      '跟进结果': string;
      '创建时间': number;
      '跟进方式': string;
      '所属客户': unknown;
      'GJ编号': string;
      '备注': {
        text: string;
      };
      '附件': {
        name: string;
        size: number;
        tmpUrl: string;
        type: string;
      }[];
      '下一步计划': unknown;
      '修改人': number[];
      '下次跟进时间': number;
    };
    id: string;
  }[];
}
// ---- end:feishu_multitable_crud_analysis_14 ----

// ---- plugin:feishu_multitable_crud_analysis_16 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_16 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisOneSixInput {
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
 * capabilityClient.load('feishu_multitable_crud_analysis_16').call<FeishuMultitableCrudAnalysisOneSixOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"消耗金额":0,"转化数":0,"返点比例":0,"创建时间":0,"消耗日期":0,"备注":null,"所属客户":null,"点击数":0,"对账状态":"示例文本","现金消耗":0,"展示数":0,"修改人":[],"XH编号":"示例文本","数据来源":"示例文本","赠款消耗":0,"修改时间":0,"对账时间":0,"对账人":[],"差异说明":{},"创建人":[]}}]}
 */
export interface FeishuMultitableCrudAnalysisOneSixOutput {
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
      '消耗金额': number;
      '转化数': number;
      '返点比例': number;
      '创建时间': number;
      '消耗日期': number;
      '备注': unknown;
      '所属客户': unknown;
      '点击数': number;
      '对账状态': string;
      '现金消耗': number;
      '展示数': number;
      '修改人': number[];
      'XH编号': string;
      '数据来源': string;
      '赠款消耗': number;
      '修改时间': number;
      '对账时间': number;
      '对账人': number[];
      '差异说明': {
        text: string;
      };
      '创建人': number[];
    };
  }[];
}
// ---- end:feishu_multitable_crud_analysis_16 ----

// ---- plugin:feishu_multitable_crud_analysis_28 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_28 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisTwoEightInput {
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
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
    conjunction: string;
  };
}

/**
 * capabilityClient.load('feishu_multitable_crud_analysis_28').call<FeishuMultitableCrudAnalysisTwoEightOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"费用类型":"示例文本","修改时间":0,"创建人":[],"计划付款日期":0,"备注":{},"银行流水号":null,"HTF编号":"示例文本","所属合同":null,"创建时间":0,"修改人":[],"付款说明":null,"实际付款日期":0,"经办人":[],"付款状态":"示例文本","费用金额":0}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FeishuMultitableCrudAnalysisTwoEightOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '费用类型': string;
      '修改时间': number;
      '创建人': number[];
      '计划付款日期': number;
      '备注': {
        text: string;
      };
      '银行流水号': unknown;
      'HTF编号': string;
      '所属合同': unknown;
      '创建时间': number;
      '修改人': number[];
      '付款说明': unknown;
      '实际付款日期': number;
      '经办人': number[];
      '付款状态': string;
      '费用金额': number;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:feishu_multitable_crud_analysis_28 ----

// ---- plugin:feishu_multitable_crud_analysis_4 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_4 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisFourInput {
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
 * capabilityClient.load('feishu_multitable_crud_analysis_4').call<FeishuMultitableCrudAnalysisFourOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 * 返回值形如：
 *   {"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"合同金额":0,"修改人":[],"HT编号":"示例文本","所属客户":null,"备注":null,"审批人":[],"生效日期":0,"审批意见":null,"到期日期":0,"合同状态":"示例文本","合同编号":null,"申请提成按钮":{},"归档日期":0,"创建人":[],"一键提醒按钮":null,"补充协议":[],"所属部门":"示例文本","签订日期":0,"合同类型":"示例文本","税率":0,"创建时间":0,"提成状态":"示例文本","成本金额":0,"提成金额":0,"合同名称":null,"提交审批按钮":null,"审批时间":0,"合同文件":[],"修改时间":0,"盖章日期":0}}],"hasMore":false}
 */
export interface FeishuMultitableCrudAnalysisFourOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '合同金额': number;
      '修改人': number[];
      'HT编号': string;
      '所属客户': unknown;
      '备注': unknown;
      '审批人': number[];
      '生效日期': number;
      '审批意见': unknown;
      '到期日期': number;
      '合同状态': string;
      '合同编号': unknown;
      '申请提成按钮': {
        text: string;
      };
      '归档日期': number;
      '创建人': number[];
      '一键提醒按钮': unknown;
      '补充协议': unknown[];
      '所属部门': string;
      '签订日期': number;
      '合同类型': string;
      '税率': number;
      '创建时间': number;
      '提成状态': string;
      '成本金额': number;
      '提成金额': number;
      '合同名称': unknown;
      '提交审批按钮': unknown;
      '审批时间': number;
      '合同文件': {
        type: string;
        name: string;
        size: number;
        tmpUrl: string;
      }[];
      '修改时间': number;
      '盖章日期': number;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
}
// ---- end:feishu_multitable_crud_analysis_4 ----

// ---- plugin:feishu_multitable_crud_analysis_56 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_56 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisFiveSixInput {
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
 * capabilityClient.load('feishu_multitable_crud_analysis_56').call<FeishuMultitableCrudAnalysisFiveSixOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"record":{"供应商":null,"RK编号":"示例文本","所属采购单":null,"创建人":[],"物品名称":null,"创建时间":0,"修改人":[],"入库日期":0,"单价":0,"入库人":[],"规格型号":null,"修改时间":0,"入库类型":"示例文本","备注":{},"金额":0,"数量":0},"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAnalysisFiveSixOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    record: {
      '供应商': unknown;
      'RK编号': string;
      '所属采购单': unknown;
      '创建人': number[];
      '物品名称': unknown;
      '创建时间': number;
      '修改人': number[];
      '入库日期': number;
      '单价': number;
      '入库人': number[];
      '规格型号': unknown;
      '修改时间': number;
      '入库类型': string;
      '备注': {
        text: string;
      };
      '金额': number;
      '数量': number;
    };
    id: string;
  }[];
}
// ---- end:feishu_multitable_crud_analysis_56 ----

// ---- plugin:feishu_multitable_crud_analysis_20 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_20 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisTwoZeroInput {
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
 * capabilityClient.load('feishu_multitable_crud_analysis_20').call<FeishuMultitableCrudAnalysisTwoZeroOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { total, records, hasMore, ... } = result;
 * 返回值形如：
 *   {"total":0,"records":[{"id":"示例文本","record":{"实际交付日期":0,"创建时间":0,"下单日期":0,"订单名称":{},"客户反馈":null,"修改人":[],"修改时间":0,"创建人":[],"视频类型":"示例文本","SP编号":"示例文本","订单状态":"示例文本","订单金额":0,"视频时长":"示例文本","项目经理":[],"所属部门":"示例文本","要求交付日期":0,"参考素材":[],"修改次数":0,"需求描述":null,"视频数量":0,"备注":null,"交付物":[],"成本预算":0,"所属视频项目":null,"所属合同":null}}],"hasMore":false,"pageToken":"示例文本"}
 */
export interface FeishuMultitableCrudAnalysisTwoZeroOutput {
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '实际交付日期': number;
      '创建时间': number;
      '下单日期': number;
      '订单名称': {
        text: string;
      };
      '客户反馈': unknown;
      '修改人': number[];
      '修改时间': number;
      '创建人': number[];
      '视频类型': string;
      'SP编号': string;
      '订单状态': string;
      '订单金额': number;
      '视频时长': string;
      '项目经理': number[];
      '所属部门': string;
      '要求交付日期': number;
      '参考素材': unknown[];
      '修改次数': number;
      '需求描述': unknown;
      '视频数量': number;
      '备注': unknown;
      '交付物': {
        name: string;
        size: number;
        tmpUrl: string;
        type: string;
      }[];
      '成本预算': number;
      '所属视频项目': unknown;
      '所属合同': unknown;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
}
// ---- end:feishu_multitable_crud_analysis_20 ----

// ---- plugin:feishu_multitable_crud_analysis_1 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_1 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisOneBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '负责商务': number[];
      '所属部门': string;
      '开票抬头': string;
      '注册地址': string;
      '客户简介': string;
      '客户等级': string;
      '一级行业': string;
      '二级行业': string;
      '银行账号': string;
      '备注': string;
      '客户简称': string;
      '客户来源': string;
      '签约日期': number;
      '客户标签': string[];
      '协作商务': number[];
      '开户银行': string;
      '税号': string;
      '客户官网': {
        text: string;
        link: string;
      };
      '客户名称': string;
      '主体名称': string;
      '客户状态': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_analysis_1').call<FeishuMultitableCrudAnalysisOneBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAnalysisOneBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuMultitableCrudAnalysisOneBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '客户名称': string;
      '客户简称': string;
      '主体名称': string;
      '客户等级': string;
      '客户标签': string[];
      '负责商务': number[];
      '所属部门': string;
      '客户来源': string;
      '二级行业': string;
      '协作商务': number[];
      '签约日期': number;
      '税号': string;
      '开户银行': string;
      '银行账号': string;
      '客户官网': {
        text: string;
        link: string;
      };
      '客户状态': string;
      '一级行业': string;
      '开票抬头': string;
      '客户简介': string;
      '备注': string;
      '注册地址': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_analysis_1').call<FeishuMultitableCrudAnalysisOneBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAnalysisOneBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuMultitableCrudAnalysisOneGetrecordInput {
  /** [object Object] */
  recordID: string;
}

/**
 * capabilityClient.load('feishu_multitable_crud_analysis_1').call<FeishuMultitableCrudAnalysisOneGetrecordOutput>('getRecord', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { id, record } = result;
 * 返回值形如：
 *   {"id":"示例文本","record":{"客户标签":["示例文本"],"协作商务":[0],"税号":null,"银行账号":null,"签约日期":0,"客户名称":{"text":"示例文本"},"客户简称":null,"二级行业":"示例文本","修改时间":0,"创建人":[0],"修改人":[0],"客户状态":"示例文本","一级行业":"示例文本","注册地址":null,"客户官网":{"text":"示例文本","link":"示例文本"},"客户简介":null,"营业执照":[{"size":0,"tmpUrl":"示例文本","type":"示例文本","name":"示例文本"}],"其他资质":[null],"创建时间":0,"主体名称":null,"客户等级":"示例文本","负责商务":[0],"开户银行":null,"备注":null,"KH编号":"示例文本","所属部门":"示例文本","客户来源":"示例文本","开票抬头":null}}
 */
export interface FeishuMultitableCrudAnalysisOneGetrecordOutput {
  /** [object Object] */
  id: string;
  /** [object Object] */
  record?: {
    '客户标签': string[];
    '协作商务': number[];
    '税号': unknown;
    '银行账号': unknown;
    '签约日期': number;
    '客户名称': {
      text: string;
    };
    '客户简称': unknown;
    '二级行业': string;
    '修改时间': number;
    '创建人': number[];
    '修改人': number[];
    '客户状态': string;
    '一级行业': string;
    '注册地址': unknown;
    '客户官网': {
      text: string;
      link: string;
    };
    '客户简介': unknown;
    '营业执照': {
      size: number;
      tmpUrl: string;
      type: string;
      name: string;
    }[];
    '其他资质': unknown[];
    '创建时间': number;
    '主体名称': unknown;
    '客户等级': string;
    '负责商务': number[];
    '开户银行': unknown;
    '备注': unknown;
    'KH编号': string;
    '所属部门': string;
    '客户来源': string;
    '开票抬头': unknown;
  };
}

export interface FeishuMultitableCrudAnalysisOneSearchrecordsInput {
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
 * capabilityClient.load('feishu_multitable_crud_analysis_1').call<FeishuMultitableCrudAnalysisOneSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"客户简称":null,"客户标签":[],"所属部门":"示例文本","创建人":[],"修改人":[],"税号":null,"注册地址":null,"营业执照":[],"KH编号":"示例文本","客户名称":{},"主体名称":null,"一级行业":"示例文本","开票抬头":null,"创建时间":0,"备注":null,"客户等级":"示例文本","负责商务":[],"客户来源":"示例文本","开户银行":null,"其他资质":[],"客户官网":{},"客户简介":null,"修改时间":0,"客户状态":"示例文本","二级行业":"示例文本","协作商务":[],"签约日期":0,"银行账号":null}}]}
 */
export interface FeishuMultitableCrudAnalysisOneSearchrecordsOutput {
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
      '客户简称': unknown;
      '客户标签': string[];
      '所属部门': string;
      '创建人': number[];
      '修改人': number[];
      '税号': unknown;
      '注册地址': unknown;
      '营业执照': {
        tmpUrl: string;
        type: string;
        name: string;
        size: number;
      }[];
      'KH编号': string;
      '客户名称': {
        text: string;
      };
      '主体名称': unknown;
      '一级行业': string;
      '开票抬头': unknown;
      '创建时间': number;
      '备注': unknown;
      '客户等级': string;
      '负责商务': number[];
      '客户来源': string;
      '开户银行': unknown;
      '其他资质': unknown[];
      '客户官网': {
        text: string;
        link: string;
      };
      '客户简介': unknown;
      '修改时间': number;
      '客户状态': string;
      '二级行业': string;
      '协作商务': number[];
      '签约日期': number;
      '银行账号': unknown;
    };
  }[];
}
// ---- end:feishu_multitable_crud_analysis_1 ----

// ---- plugin:feishu_multitable_crud_analysis_3 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_3 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisThreeInput {
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
 * capabilityClient.load('feishu_multitable_crud_analysis_3').call<FeishuMultitableCrudAnalysisThreeOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"后期费用":0,"摄像师":[],"实际结束日期":0,"拍摄费用":0,"修改人":[],"备注":{},"场地费用":0,"脚本文件":[],"计划结束日期":0,"计划开始日期":0,"创建时间":0,"拍摄完成":null,"导演":[],"实际开始日期":0,"风险提示":null,"项目经理":[],"项目进度":0,"创建人":[],"初剪完成":null,"项目阶段":"示例文本","脚本完成":null,"项目预算":0,"外包费用":0,"项目状态":"示例文本","修改时间":0,"其他费用":0,"剪辑师":[],"客户确认":null,"成片文件":[],"演员费用":0,"项目名称":null,"XM编号":"示例文本","精剪完成":null,"素材文件":[]}}]}
 */
export interface FeishuMultitableCrudAnalysisThreeOutput {
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
      '后期费用': number;
      '摄像师': number[];
      '实际结束日期': number;
      '拍摄费用': number;
      '修改人': number[];
      '备注': {
        text: string;
      };
      '场地费用': number;
      '脚本文件': {
        name: string;
        size: number;
        tmpUrl: string;
        type: string;
      }[];
      '计划结束日期': number;
      '计划开始日期': number;
      '创建时间': number;
      '拍摄完成': unknown;
      '导演': number[];
      '实际开始日期': number;
      '风险提示': unknown;
      '项目经理': number[];
      '项目进度': number;
      '创建人': number[];
      '初剪完成': unknown;
      '项目阶段': string;
      '脚本完成': unknown;
      '项目预算': number;
      '外包费用': number;
      '项目状态': string;
      '修改时间': number;
      '其他费用': number;
      '剪辑师': number[];
      '客户确认': unknown;
      '成片文件': unknown[];
      '演员费用': number;
      '项目名称': unknown;
      'XM编号': string;
      '精剪完成': unknown;
      '素材文件': unknown[];
    };
  }[];
}
// ---- end:feishu_multitable_crud_analysis_3 ----

// ---- plugin:feishu_multitable_crud_analysis_45 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_45 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisFourFiveBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '请假类型': string;
      '早退分钟': number;
      '请假时长(天)': number;
      '员工': number[];
      '考勤状态': string;
      '加班时长(小时)': number;
      '备注': string;
      '上班打卡时间': number;
      '考勤日期': number;
      '应上班时间': number;
      '数据来源': string;
      '请假原因': string;
      '应下班时间': number;
      '下班打卡时间': number;
      '异常说明': string;
      '审批人': number[];
      '迟到分钟': number;
      '审批状态': string;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_analysis_45').call<FeishuMultitableCrudAnalysisFourFiveBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAnalysisFourFiveBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuMultitableCrudAnalysisFourFiveBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '请假类型': string;
      '迟到分钟': number;
      '考勤状态': string;
      '数据来源': string;
      '请假原因': string;
      '应下班时间': number;
      '考勤日期': number;
      '员工': number[];
      '异常说明': string;
      '加班时长(小时)': number;
      '审批状态': string;
      '下班打卡时间': number;
      '上班打卡时间': number;
      '应上班时间': number;
      '备注': string;
      '请假时长(天)': number;
      '审批人': number[];
      '早退分钟': number;
    };
  }[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_analysis_45').call<FeishuMultitableCrudAnalysisFourFiveBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本"}]}
 */
export interface FeishuMultitableCrudAnalysisFourFiveBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface FeishuMultitableCrudAnalysisFourFiveDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('feishu_multitable_crud_analysis_45').call<FeishuMultitableCrudAnalysisFourFiveDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 * 返回值形如：
 *   {"success":false}
 */
export interface FeishuMultitableCrudAnalysisFourFiveDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface FeishuMultitableCrudAnalysisFourFiveSearchrecordsInput {
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
 * capabilityClient.load('feishu_multitable_crud_analysis_45').call<FeishuMultitableCrudAnalysisFourFiveSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records, hasMore, pageToken, ... } = result;
 * 返回值形如：
 *   {"records":[{"id":"示例文本","record":{"下班打卡时间":0,"数据来源":"示例文本","修改时间":0,"KQ编号":"示例文本","上班打卡时间":0,"审批状态":"示例文本","早退分钟":0,"考勤状态":"示例文本","请假原因":null,"备注":null,"迟到分钟":0,"应上班时间":0,"修改人":[],"请假时长(天)":0,"员工":[],"异常说明":{},"创建人":[],"审批人":[],"考勤日期":0,"请假类型":"示例文本","加班时长(小时)":0,"应下班时间":0,"创建时间":0}}],"hasMore":false,"pageToken":"示例文本","total":0}
 */
export interface FeishuMultitableCrudAnalysisFourFiveSearchrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '下班打卡时间': number;
      '数据来源': string;
      '修改时间': number;
      'KQ编号': string;
      '上班打卡时间': number;
      '审批状态': string;
      '早退分钟': number;
      '考勤状态': string;
      '请假原因': unknown;
      '备注': unknown;
      '迟到分钟': number;
      '应上班时间': number;
      '修改人': number[];
      '请假时长(天)': number;
      '员工': number[];
      '异常说明': {
        text: string;
      };
      '创建人': number[];
      '审批人': number[];
      '考勤日期': number;
      '请假类型': string;
      '加班时长(小时)': number;
      '应下班时间': number;
      '创建时间': number;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
}
// ---- end:feishu_multitable_crud_analysis_45 ----

// ---- plugin:feishu_multitable_crud_analysis_15 ----
// ============================================================
// 插件 feishu_multitable_crud_analysis_15 (飞书多维表格) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface FeishuMultitableCrudAnalysisOneFiveInput {
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
 * capabilityClient.load('feishu_multitable_crud_analysis_15').call<FeishuMultitableCrudAnalysisOneFiveOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 * 返回值形如：
 *   {"hasMore":false,"pageToken":"示例文本","total":0,"records":[{"id":"示例文本","record":{"行业资质":[],"创建时间":0,"实际开通时间":0,"运营审核人":[],"申请时间":0,"法人身份证":[],"申请人":[],"审批意见":{},"驳回原因":null,"审批时间":0,"营业执照":[],"投放端口":"示例文本","预计开通时间":0,"申请状态":"示例文本","KH编号":"示例文本","备注":null,"集团名称":null,"开通账户ID":null,"创建人":[],"修改人":[],"其他材料":[],"审批人":[],"所属部门":"示例文本","账户类型":"示例文本","修改时间":0}}]}
 */
export interface FeishuMultitableCrudAnalysisOneFiveOutput {
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
      '行业资质': unknown[];
      '创建时间': number;
      '实际开通时间': number;
      '运营审核人': number[];
      '申请时间': number;
      '法人身份证': unknown[];
      '申请人': number[];
      '审批意见': {
        text: string;
      };
      '驳回原因': unknown;
      '审批时间': number;
      '营业执照': unknown[];
      '投放端口': string;
      '预计开通时间': number;
      '申请状态': string;
      'KH编号': string;
      '备注': unknown;
      '集团名称': unknown;
      '开通账户ID': unknown;
      '创建人': number[];
      '修改人': number[];
      '其他材料': {
        name: string;
        size: number;
        tmpUrl: string;
        type: string;
      }[];
      '审批人': number[];
      '所属部门': string;
      '账户类型': string;
      '修改时间': number;
    };
  }[];
}
// ---- end:feishu_multitable_crud_analysis_15 ----