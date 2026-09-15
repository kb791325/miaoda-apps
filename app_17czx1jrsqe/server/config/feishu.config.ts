export const FEISHU_REDIRECT_URI = 'https://saasuniversity.aiforce.cloud/app/app_17czx1jrsqe/auth/feishu/callback';

export const feishuConfig = {
  appId: process.env.FEISHU_APP_ID || 'cli_aa1e4a98577a1cbb',
  appSecret: process.env.FEISHU_APP_SECRET || 'fLONZzKKQKomKp4S4SPe4hPfJJpEYfIt',
  baseUrl: process.env.FEISHU_OPEN_URL || 'https://open.feishu.cn',
  baseToken: process.env.BASE_TOKEN || 'FzAKbTGyFaGvWUstz52cZimQnOb',
  redirectUri: FEISHU_REDIRECT_URI,
};

export const TABLE_MAP: Record<string, string> = {
  '客户管理': 'tblFbtoP1fiBJk38',
  '客户-联系人': 'tblwkajC0dvijHAg',
  '客户-跟进记录': 'tblJtG3oPJNBtjgH',
  '客户-公海客资': 'tblSOizrWE93qzQ3',
  '客户-无效客资': 'tblAjQ5ZQieXMf9H',
  '客户-线索': 'tbloYQNL2EAPKOg9',
  '客户-线索跟进': 'tblOKpn23UT60VQE',
  '广告-开户申请': 'tbl0OD5ZkDBUWKLG',
  '广告-报备': 'tblKIj4TVHGLSVN1',
  '广告-转户': 'tblqK0noqGG91RAs',
  '广告-提成': 'tblcXuGZ3pvWiGnD',
  '广告-提成规则': 'tblDrllI5VNmvlwe',
  '财务-客户流水': 'tblcTsKSQN4A2V1A',
  '财务-收款': 'tbl2hi2QsIrt5Oo5',
  '财务-充值': 'tbloVMy6ByxTePaG',
  '财务-退款': 'tbl0S5YF6rGi9TCW',
  '财务-退币': 'tblQtfxVH1xcsaoO',
  '财务-后返': 'tblXOCQWNiS19CpA',
  '财务-扣减': 'tblWhjlEKWPrnzEF',
  '财务-消耗': 'tblrAqAVeYCYkvDu',
  '财务-垫款': 'tblXf3rTwjMD3GbJ',
  '财务-激励': 'tblvqARdleUSE3Q6',
  '财务-收入': 'tblSTn764cV6D4UL',
  '财务-支出': 'tblWUyp0fyl5HVyn',
  '财务-日常费用': 'tblHUBNu1nUOGPI9',
  '财务-保证金押金': 'tblrWGO8b2dcB7qL',
  '财务-发票': 'tblFpfnjPehmD611',
  '财务-成本': 'tblggGHVP1cvxTAf',
  '财务-端口账户': 'tblCsrQWEQBgFqcw',
  '财务-银行账户': 'tblrRy8rKOIgt4lC',
  '审批-实例': 'tblKuNRN4kVOr5uE',
  '审批-步骤': 'tblWG7efEHnwQUwO',
  // ====== 人资 9 表 ======
  '人资-员工档案': 'tblsxEbrVkIVEojM',
  '人资-简历库': 'tblf0KM73YmFcTsb',
  '人资-面试邀约': 'tblCGbPKUqU8gsQ6',
  '人资-面试记录': 'tblvXrT6KHbQbyIl',
  '人资-签到记录': 'tbljj7LV7ZpCkrpT',
  '人资-考勤月度': 'tblm8cGv75YfBYcQ',
  '人资-薪酬工资': 'tbl8iuDgXxsNHsBq',
  '人资-绩效考核': 'tblGh2fnVbLYHniK',
  '人资-招聘计划': 'tbleJW4j7ticymb2',
  // ====== 系统域 6 表 ======
  '系统-部门': 'tbl1KsxGMdjUZ9Fg',
  '系统-用户': 'tbl2PlAMyGeYTeRI',
  '系统-角色': 'tblVBe8wnGwPoAXu',
  '系统-操作日志': 'tblBk8YrgOWPk3em',
  '系统-登录日志': 'tblsbKO6k9hV5Qol',
  '系统-系统设置': 'tbl9O5bW5kLuWeg8',
  // ====== 规模化批次 32 表 ======
  '行政-固定资产': 'tblJq1qzLWsiDD2H',
  '行政-库存物资': 'tblBn1SpeN2nk5Ts',
  '行政-入库记录': 'tblpa9i9flgY4mj0',
  '行政-领用记录': 'tblsQqKGIU68gkEJ',
  '行政-归还记录': 'tblklxlphZWv3bVN',
  '行政-库存盘点': 'tblMYW6BzRdwajYa',
  '视频-视频订单': 'tbl16ziSpPnki6dE',
  '视频-视频项目': 'tblXpjMsnraP58wu',
  '视频-演员达人': 'tblLgxWyxmAXVCPV',
  '视频-外协外包': 'tblBG8Q64MIsZoqX',
  '视频-视频提成': 'tblPoaOTirLt9UMC',
  '视频-拍摄成本': 'tblq7x70QQ4bVG4E',
  '视频-场地成本': 'tblXZPEokyV5Ap7R',
  '视频-样片管理': 'tblFr3TCPNwv9LeF',
  '视频-协作任务': 'tblOmfgtdAeByDwS',
  '视频-任务评论': 'tbl2FAgx7Fcq7khi',
  '合同-合同主表': 'tblrpJFD42SvGXVx',
  '合同-合同模板': 'tblLbrr7rhYbPI4o',
  '合同-合同成本': 'tblNSFQMKRxnsnxF',
  '合同-合同提成': 'tblGkIk2k3ZW3PLm',
  '合同-付款计划': 'tblCxgtIoP0DkSP9',
  '合同-付款记录': 'tblapOLkw6UAp2kD',
  '采购-采购申请': 'tbln7eRuXwB5DImk',
  '采购-采购订单': 'tblxy9bk9Gr43BCv',
  '采购-采购明细': 'tbln8EGoFm83ypbk',
  '业务-客户账户': 'tbltG7SRmEpsQdcC',
  '业务-行业ROI': 'tbl8AGVzVFWPGZog',
  '业务-竞品监控': 'tbl6X6YEe6pAtL2y',
  '业务-素材资料': 'tblYXtj1aiwr2MkA',
  '业务-提成规则': 'tblgsL3t5fcR8ZMa',
  '任务-导入任务': 'tblWxxIX7j6Qo7qU',
  '任务-导出任务': 'tblMQpczkjOdCGSE',
};

/**
 * 表前缀 → 写操作（新建/编辑/删除）所需角色。
 * 与前端 client/src/config/menu.tsx 的 roles 字段对齐。
 * 未匹配到前缀的表：所有登录用户均可写。
 */
export const TABLE_WRITE_ROLES: Record<string, string[]> = {
  '客户': ['admin', 'manager', 'sales'],
  '广告': ['admin', 'manager', 'sales'],
  '财务': ['admin', 'finance'],
  '人资': ['admin', 'hr'],
  '行政': ['admin', 'hr'],
  '视频': ['admin', 'manager', 'sales'],
  '合同': ['admin', 'manager', 'sales', 'finance'],
  '采购': ['admin', 'hr'],
  '系统': ['admin'],
  '审批': ['admin'],
};

/**
 * 根据 tableKey 查找写操作所需角色。
 * 按前缀匹配；未匹配到则返回空数组（所有登录用户均可写）。
 */
export function getTableWriteRoles(tableKey: string): string[] {
  for (const [prefix, roles] of Object.entries(TABLE_WRITE_ROLES)) {
    if (tableKey.startsWith(prefix)) return roles;
  }
  return [];
}

export const TABLE_KEYWORD_FIELDS: Record<string, string[]> = {
  '客户管理': ['客户名称', '联系人', '联系电话', '客户编号', '集团名称', '负责商务'],
  '客户-公海客资': ['主体名称', '客资编号', '备注', '负责人'],
  '客户-线索': ['线索名称', '公司名称', '联系人', '联系电话', '线索编号'],
  '广告-开户申请': ['申请编号', '主体名称', '集团名称', '申请人', '申请部门'],
  '广告-报备': ['报备编号', '集团名称', '主体名称', '端口', '报备人', '报备类型'],
  '广告-转户': ['转户编号', '集团名称', '主体名称', '申请人'],
  '广告-提成': ['提成编号', '商务姓名'],
  '广告-提成规则': ['规则名称', '业务类型'],
  '财务-消耗': ['客户名称', '消耗编号', '商务'],
  '财务-收款': ['客户名称', '收款编号'],
  '财务-充值': ['客户名称', '充值编号'],
  '财务-退款': ['客户名称', '退款编号'],
  '财务-退币': ['退币编号', '客户名称'],
  '财务-后返': ['后返编号', '客户名称'],
  '财务-扣减': ['扣减编号', '客户名称'],
  '财务-垫款': ['垫款编号', '客户名称'],
  '财务-激励': ['激励编号', '员工姓名'],
  '财务-收入': ['收入编号', '客户名称'],
  '财务-支出': ['支出编号', '支出事由', '申请人'],
  '财务-日常费用': ['费用编号'],
  '财务-保证金押金': ['单据编号', '客户名称'],
  '财务-发票': ['发票编号', '客户名称'],
  '财务-成本': ['成本编号', '关联对象'],
  '财务-端口账户': ['端口名称'],
  '财务-银行账户': ['银行名称', '账户名称', '账号'],
  '财务-客户流水': ['流水编号', '客户名称'],
  // ====== 人资搜索字段 ======
  '人资-员工档案': ['姓名', '工号', '岗位', '手机号'],
  '人资-简历库': ['姓名', '应聘岗位', '联系电话'],
  '人资-面试邀约': ['候选人姓名', '应聘岗位', '面试官'],
  '人资-面试记录': ['候选人姓名', '应聘岗位', '面试官'],
  '人资-签到记录': ['姓名', '岗位'],
  '人资-考勤月度': ['员工姓名', '部门', '考勤月份'],
  '人资-薪酬工资': ['员工姓名', '部门', '薪资月份'],
  '人资-绩效考核': ['员工姓名', '部门', '考核周期'],
  '人资-招聘计划': ['招聘岗位', '负责人'],
  // ====== 系统域搜索字段 ======
  '系统-部门': ['部门名称', '负责人'],
  '系统-用户': ['姓名', '登录账号', '岗位'],
  '系统-角色': ['角色名称', '角色标识'],
  '系统-操作日志': ['操作人', '操作内容', '对象业务编号', '日志编号'],
  '系统-登录日志': ['用户名', '日志编号'],
  '系统-系统设置': ['分组', '设置键'],
  // ====== 规模化批次搜索字段 ======
  '行政-固定资产': ['资产编号', '资产名称'],
  '行政-库存物资': ['物资名称', '分类'],
  '行政-入库记录': ['入库单号', '物资名称'],
  '行政-领用记录': ['领用单号', '物资名称'],
  '行政-归还记录': ['归还单号', '物资名称'],
  '行政-库存盘点': ['盘点单号', '盘点范围'],
  '视频-视频订单': ['订单编号', '集团名称', '主体名称', '负责人'],
  '视频-视频项目': ['项目名称', '关联订单', '负责人'],
  '视频-演员达人': ['姓名', '联系方式', '标签'],
  '视频-外协外包': ['外包单号', '供应商', '外包项目', '负责人'],
  '视频-视频提成': ['提成单号', '员工姓名', '部门'],
  '视频-拍摄成本': ['费用单号', '关联项目', '经办人'],
  '视频-场地成本': ['费用单号', '关联项目', '场地名称'],
  '视频-样片管理': ['样品单号', '样品名称', '关联订单', '物流单号'],
  '视频-协作任务': ['任务编号', '任务标题'],
  '视频-任务评论': ['任务ID', '评论人'],
  '合同-合同主表': ['合同编号', '合同名称'],
  '合同-合同模板': ['模板编号', '模板名称'],
  '合同-合同成本': ['费用单号', '关联合同'],
  '合同-合同提成': ['合同编号', '合同名称'],
  '合同-付款计划': ['合同ID', '期次'],
  '合同-付款记录': ['合同ID', '计划ID'],
  '采购-采购申请': ['申请单号', '申请事由'],
  '采购-采购订单': ['订单编号', '供应商', '关联申请'],
  '采购-采购明细': ['明细单号', '关联订单', '物品名称'],
  '业务-客户账户': ['账户编号', '客户名称'],
  '业务-行业ROI': ['行业名称', '备注'],
  '业务-竞品监控': ['竞品名称', '所属行业'],
  '业务-素材资料': ['素材编号', '素材名称'],
  '业务-提成规则': ['规则名称', '业务类型'],
  '任务-导入任务': ['任务编号', '任务类型'],
  '任务-导出任务': ['任务编号', '任务类型'],
  '审批-实例': ['审批标题', '实例编号', '业务单据编号', '申请人'],
  '端口管理': ['端口名称'],
};

TABLE_MAP['端口管理'] = TABLE_MAP['财务-端口账户'];

export function getTableId(tableKey: string): string {
  const id = TABLE_MAP[tableKey];
  if (!id) {
    throw new Error(`未知逻辑表: ${tableKey}`);
  }
  return id;
}

export function getKeywordFields(tableKey: string): string[] {
  return TABLE_KEYWORD_FIELDS[tableKey] || ['名称', '客户名称', '主体名称'];
}

/** 数字字段关键字搜索：当 keyword 可解析为数字时，额外用 is 运算符匹配这些字段 */
export const TABLE_KEYWORD_NUMERIC_FIELDS: Record<string, string[]> = {
  '广告-开户申请': ['申请金额'],
  '广告-报备': ['报备金额'],
  '财务-收款': ['收款金额'],
  '财务-充值': ['充值金额'],
  '财务-退款': ['退款金额'],
  '财务-退币': ['退币金额'],
  '财务-后返': ['后返金额'],
  '财务-扣减': ['扣减金额'],
  '财务-消耗': ['消耗金额'],
  '财务-垫款': ['垫款金额'],
  '财务-收入': ['收入金额'],
  '财务-支出': ['支出金额'],
  '财务-发票': ['发票金额'],
  '财务-成本': ['成本金额'],
  '财务-保证金押金': ['金额'],
  '采购-采购申请': ['预计金额'],
  '采购-采购订单': ['订单金额'],
};

export function getKeywordNumericFields(tableKey: string): string[] {
  return TABLE_KEYWORD_NUMERIC_FIELDS[tableKey] || [];
}

/** 日期字段白名单：date=纯日期(YYYY-MM-DD), datetime=含时间(YYYY-MM-DD HH:mm:ss) */
export const TABLE_DATE_FIELDS: Record<string, { date: string[]; datetime: string[] }> = {
  '客户管理': { date: [], datetime: ['创建时间', '更新时间'] },
  '客户-公海客资': { date: [], datetime: ['调入公海时间', '创建时间'] },
  '客户-无效客资': { date: [], datetime: ['调入公海时间', '标记无效时间', '创建时间'] },
  '客户-线索': { date: [], datetime: ['最近跟进时间', '创建时间'] },
  '客户-联系人': { date: [], datetime: ['创建时间'] },
  '客户-跟进记录': { date: [], datetime: ['下次跟进时间', '创建时间'] },
  '客户-线索跟进': { date: [], datetime: ['下次跟进时间', '创建时间'] },
  '广告-开户申请': { date: [], datetime: ['创建时间', '更新时间'] },
  '广告-报备': { date: [], datetime: ['创建时间'] },
  '广告-转户': { date: [], datetime: ['创建时间'] },
  '广告-提成': { date: [], datetime: ['发放时间', '创建时间'] },
  '财务-客户流水': { date: [], datetime: ['交易时间'] },
  '财务-收款': { date: [], datetime: ['收款时间'] },
  '财务-充值': { date: [], datetime: ['充值时间'] },
  '财务-退款': { date: [], datetime: ['创建时间'] },
  '财务-退币': { date: [], datetime: ['创建时间'] },
  '财务-后返': { date: [], datetime: ['创建时间'] },
  '财务-扣减': { date: [], datetime: ['创建时间'] },
  '财务-消耗': { date: ['消耗日期'], datetime: ['创建时间'] },
  '财务-垫款': { date: ['垫款日期', '预计回款日期'], datetime: ['创建时间'] },
  '财务-激励': { date: [], datetime: ['创建时间'] },
  '财务-收入': { date: ['收入日期'], datetime: ['创建时间'] },
  '财务-支出': { date: ['支出日期'], datetime: ['创建时间'] },
  '财务-日常费用': { date: ['发生日期'], datetime: ['创建时间'] },
  '财务-保证金押金': { date: ['缴纳日期', '预计退还日期'], datetime: ['创建时间'] },
  '财务-发票': { date: ['开票日期'], datetime: ['创建时间'] },
  '财务-成本': { date: ['发生日期'], datetime: ['创建时间'] },
  '财务-端口账户': { date: [], datetime: ['创建时间', '更新时间'] },
  '财务-银行账户': { date: [], datetime: ['创建时间', '更新时间'] },
  '审批-实例': { date: [], datetime: ['申请时间', '完成时间'] },
  '审批-步骤': { date: [], datetime: ['审批时间'] },
  '人资-员工档案': { date: ['入职日期', '合同到期日', '离职日期'], datetime: ['创建时间', '更新时间'] },
  '人资-简历库': { date: [], datetime: ['创建时间', '更新时间'] },
  '人资-面试邀约': { date: [], datetime: ['邀约时间', '创建时间', '更新时间'] },
  '人资-面试记录': { date: [], datetime: ['面试时间', '创建时间', '更新时间'] },
  '人资-签到记录': { date: [], datetime: ['预约时间', '实际签到时间', '创建时间', '更新时间'] },
  '人资-考勤月度': { date: [], datetime: ['创建时间', '更新时间'] },
  '人资-薪酬工资': { date: [], datetime: ['创建时间', '更新时间'] },
  '人资-绩效考核': { date: [], datetime: ['创建时间', '更新时间'] },
  '人资-招聘计划': { date: ['期望到岗时间'], datetime: ['创建时间', '更新时间'] },
  '系统-部门': { date: [], datetime: ['创建时间', '更新时间'] },
  '系统-用户': { date: [], datetime: ['创建时间', '更新时间'] },
  '系统-角色': { date: [], datetime: ['创建时间', '更新时间'] },
  '系统-操作日志': { date: [], datetime: ['操作时间'] },
  '系统-登录日志': { date: [], datetime: ['登录时间'] },
  '系统-系统设置': { date: [], datetime: ['创建时间', '更新时间'] },
  '行政-固定资产': { date: ['购入日期'], datetime: ['创建时间', '更新时间'] },
  '行政-库存物资': { date: [], datetime: ['创建时间', '更新时间'] },
  '行政-入库记录': { date: ['入库日期'], datetime: ['创建时间', '更新时间'] },
  '行政-领用记录': { date: ['申请日期'], datetime: ['创建时间', '更新时间'] },
  '行政-归还记录': { date: ['归还日期'], datetime: ['创建时间', '更新时间'] },
  '行政-库存盘点': { date: ['盘点日期'], datetime: ['创建时间', '更新时间'] },
  '视频-视频订单': { date: [], datetime: ['创建时间', '更新时间'] },
  '视频-视频项目': { date: ['截止日期'], datetime: ['创建时间', '更新时间'] },
  '视频-演员达人': { date: [], datetime: ['创建时间', '更新时间'] },
  '视频-外协外包': { date: [], datetime: ['创建时间', '更新时间'] },
  '视频-视频提成': { date: [], datetime: ['创建时间', '更新时间'] },
  '视频-拍摄成本': { date: ['发生日期'], datetime: ['创建时间', '更新时间'] },
  '视频-场地成本': { date: ['开始日期', '结束日期'], datetime: ['创建时间', '更新时间'] },
  '视频-样片管理': { date: ['寄出日期', '归还日期'], datetime: ['创建时间', '更新时间'] },
  '视频-协作任务': { date: ['截止日期'], datetime: ['创建时间', '更新时间'] },
  '视频-任务评论': { date: [], datetime: ['创建时间'] },
  '合同-合同主表': { date: ['签订日期', '到期日期'], datetime: ['最近提醒时间', '创建时间', '更新时间'] },
  '合同-合同模板': { date: [], datetime: ['创建时间', '更新时间'] },
  '合同-合同成本': { date: ['计划日期'], datetime: ['创建时间', '更新时间'] },
  '合同-合同提成': { date: [], datetime: ['创建时间', '更新时间'] },
  '合同-付款计划': { date: ['计划日期'], datetime: ['创建时间', '更新时间'] },
  '合同-付款记录': { date: ['付款日期'], datetime: ['创建时间'] },
  '采购-采购申请': { date: ['期望日期'], datetime: ['审批时间', '创建时间', '更新时间'] },
  '采购-采购订单': { date: [], datetime: ['创建时间', '更新时间'] },
  '采购-采购明细': { date: [], datetime: ['创建时间', '更新时间'] },
  '业务-客户账户': { date: [], datetime: ['最近登录', '创建时间', '更新时间'] },
  '业务-行业ROI': { date: [], datetime: ['创建时间', '更新时间'] },
  '业务-竞品监控': { date: [], datetime: ['创建时间', '更新时间'] },
  '业务-素材资料': { date: [], datetime: ['创建时间', '更新时间'] },
  '业务-提成规则': { date: [], datetime: ['创建时间', '更新时间'] },
  '任务-导入任务': { date: [], datetime: ['创建时间', '更新时间'] },
  '任务-导出任务': { date: [], datetime: ['创建时间', '更新时间'] },
};

/**
 * 以 JSON 字符串形式存入 Bitable 文本字段的对象数组字段（写入 stringify / 读取 parse）。
 * 仅登记已确认 Bitable 侧为文本类型的字段，避免误序列化。
 */
export const TABLE_JSON_TEXT_FIELDS: Record<string, string[]> = {
  '采购-采购申请': ['采购明细'],
  '行政-库存盘点': ['盘点明细'],
};
