/**
 * 第一批切真实接口的模块：字段映射配置 + API 实例
 * 所有 API 都走 /api/entity/<逻辑表名>，Bitable 中文字段 ↔ 前端 snake_case 双向映射。
 *
 * 包含：
 *  - 客户管理（公海客资 / 无效客资 / 线索 / 客户档案 / 联系人 / 跟进记录 / 线索跟进）
 *  - 广告业务（开户申请 / 报备 / 转户 / 提成 / 提成规则）
 *  - 财务核心 18 张表
 */

import { createEntityApi, type FieldMap } from './entity-factory';

// ============== 客户管理 ==============

// 客户档案（客户管理）
const customerFM: FieldMap = {
  idField: 'record_id',
  fields: {
    customer_no: '客户编号',
    customer_name: '客户名称',
    group_name: '集团名称',
    primary_industry: '一级行业',
    secondary_industry: '二级行业',
    level: '客户等级',
    status: '客户状态',
    owner_name: '负责商务',
    department: '所属部门',
    contact_name: '联系人',
    contact_phone: '联系电话',
    email: '邮箱',
    address: '地址',
    total_recharge: '累计充值',
    total_consume: '累计消耗',
    remark: '备注',
    created_at: '创建时间',
    updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: {
    active: '合作中',
    pending: '待激活',
    frozen: '已冻结',
  },
  noGenerators: { customer_no: 'CU' },
  readonly: ['created_at', 'updated_at', 'total_recharge', 'total_consume'],
};

export const customersApi = createEntityApi('客户管理', customerFM);

// 公海客资
const publicLeadFM: FieldMap = {
  idField: 'record_id',
  fields: {
    lead_no: '客资编号',
    entity_name: '主体名称',
    lead_level: '客资分层',
    primary_industry: '一级行业',
    secondary_industry: '二级行业',
    assign_status: '分配状态',
    creator_name: '创建人',
    source: '客资来源',
    pool_time: '调入公海时间',
    owner_name: '负责人',
    remark: '备注',
    created_at: '创建时间',
  },
  statusField: 'assign_status',
  statusMap: {
    pending: '待分配',
    assigned: '已分配',
  },
  noGenerators: { lead_no: 'LD' },
  readonly: ['created_at'],
};

export const publicLeadsApi = createEntityApi('客户-公海客资', publicLeadFM);

// 无效客资
const invalidLeadFM: FieldMap = {
  ...publicLeadFM,
  fields: {
    ...publicLeadFM.fields,
    invalid_reason: '无效原因',
    invalid_at: '标记无效时间',
  },
};

export const invalidLeadsApi = createEntityApi('客户-无效客资', invalidLeadFM);

// 线索
const leadFM: FieldMap = {
  idField: 'record_id',
  fields: {
    lead_no: '线索编号',
    lead_name: '线索名称',
    company_name: '公司名称',
    source: '线索来源',
    status: '跟进状态',
    owner_name: '负责人',
    phone: '联系电话',
    remark: '需求描述',
    last_follow_at: '最近跟进时间',
    contact_name: '联系人',
    requirement: '需求描述',
    creator_name: '创建人',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    pending: '待跟进',
    following: '跟进中',
    converted: '已转化',
    lost: '已流失',
  },
  noGenerators: { lead_no: 'LD' },
  readonly: ['created_at'],
};

export const leadsApi = createEntityApi('客户-线索', leadFM);

// 客户联系人
const contactFM: FieldMap = {
  idField: 'record_id',
  fields: {
    customer_name: '所属客户',
    contact_name: '联系人姓名',
    position: '职务',
    phone: '手机',
    email: '邮箱',
    is_primary: '是否主要联系人',
    remark: '备注',
    created_at: '创建时间',
  },
  readonly: ['created_at'],
};

export const customerContactsApi = createEntityApi('客户-联系人', contactFM);

// 客户跟进记录
const followUpFM: FieldMap = {
  idField: 'record_id',
  fields: {
    customer_name: '所属客户',
    follow_subject: '跟进主题',
    follow_type: '跟进方式',
    follow_content: '跟进内容',
    follower: '跟进人',
    next_follow_at: '下次跟进时间',
    created_at: '创建时间',
  },
  readonly: ['created_at'],
};

export const customerFollowUpsApi = createEntityApi('客户-跟进记录', followUpFM);

// 线索跟进记录
const leadFollowUpFM: FieldMap = {
  idField: 'record_id',
  fields: {
    lead_name: '所属线索',
    follow_subject: '跟进主题',
    follow_type: '跟进方式',
    follow_content: '跟进内容',
    follower: '跟进人',
    next_follow_at: '下次跟进时间',
    created_at: '创建时间',
  },
  readonly: ['created_at'],
};

export const leadFollowUpsApi = createEntityApi('客户-线索跟进', leadFollowUpFM);

// ============== 广告业务 ==============

// 开户申请
const accountAppFM: FieldMap = {
  idField: 'record_id',
  fields: {
    apply_no: '申请编号',
    group_name: '集团名称',
    entity_name: '主体名称',
    port: '端口',
    industry: '行业',
    apply_amount: '申请金额',
    status: '状态',
    applicant: '申请人',
    apply_dept: '申请部门',
    current_approver: '当前审批人',
    remark: '备注',
    created_at: '创建时间',
    updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: {
    pending: '待审批',
    approving: '审批中',
    approved: '已通过',
    rejected: '已驳回',
    opened: '已开户',
  },
  noGenerators: { apply_no: 'KH' },
  readonly: ['created_at', 'updated_at'],
};

export const accountApplicationsApi = createEntityApi('广告-开户申请', accountAppFM);

// 报备
const filingFM: FieldMap = {
  idField: 'record_id',
  fields: {
    filing_no: '报备编号',
    group_name: '集团名称',
    entity_name: '主体名称',
    port: '端口',
    filing_type: '报备类型',
    filing_amount: '报备金额',
    status: '状态',
    filer: '报备人',
    remark: '备注',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    pending: '待报备',
    filing: '报备中',
    success: '报备成功',
    failed: '报备失败',
  },
  noGenerators: { filing_no: 'BB' },
  readonly: ['created_at'],
};

export const filingsApi = createEntityApi('广告-报备', filingFM);

// 转户
const transferFM: FieldMap = {
  idField: 'record_id',
  fields: {
    transfer_no: '转户编号',
    group_name: '集团名称',
    entity_name: '主体名称',
    from_port: '转出端口',
    to_port: '转入端口',
    transfer_amount: '转户金额',
    status: '状态',
    applicant: '申请人',
    remark: '备注',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    pending: '待审批',
    approving: '审批中',
    success: '已完成',
    failed: '已驳回',
  },
  noGenerators: { transfer_no: 'ZH' },
  readonly: ['created_at'],
};

export const transfersApi = createEntityApi('广告-转户', transferFM);

// 广告提成
const adCommissionFM: FieldMap = {
  idField: 'record_id',
  fields: {
    commission_no: '提成编号',
    sales_name: '商务姓名',
    department: '所属部门',
    performance_amount: '业绩金额',
    commission_ratio: '提成比例',
    commission_amount: '提成金额',
    settle_month: '结算月份',
    grant_time: '发放时间',
    remark: '备注',
    status: '状态',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    pending: '待结算',
    settled: '已结算',
    paid: '已发放',
  },
  noGenerators: { commission_no: 'TC' },
  readonly: ['created_at'],
};

export const adCommissionsApi = createEntityApi('广告-提成', adCommissionFM);


// ============== 财务核心 18 表 ==============

// 客户流水
const transactionFM: FieldMap = {
  idField: 'record_id',
  fields: {
    serial_no: '流水编号',
    customer_name: '客户名称',
    entity_name: '主体名称',
    tx_type: '交易类型',
    income_amount: '收入金额',
    expense_amount: '支出金额',
    balance: '账户余额',
    remark: '备注',
    created_at: '交易时间',
  },
  noGenerators: { serial_no: 'LS' },
  readonly: ['created_at'],
};
export const transactionsApi = createEntityApi('财务-客户流水', transactionFM);

// 收款管理
const receiptFM: FieldMap = {
  idField: 'record_id',
  fields: {
    receipt_no: '收款编号',
    customer_name: '客户名称',
    receipt_amount: '收款金额',
    receipt_method: '收款方式',
    receipt_account: '收款账户',
    status: '状态',
    receiver: '收款人',
    remark: '备注',
    created_at: '收款时间',
  },
  statusField: 'status',
  statusMap: {
    pending: '待确认',
    confirmed: '已确认',
    written_off: '已核销',
  },
  noGenerators: { receipt_no: 'SK' },
  readonly: ['created_at'],
};
export const receiptsApi = createEntityApi('财务-收款', receiptFM);

// 充值管理
const rechargeFM: FieldMap = {
  idField: 'record_id',
  fields: {
    recharge_no: '充值编号',
    customer_name: '客户名称',
    entity_name: '主体名称',
    port: '端口',
    recharge_amount: '充值金额',
    grant_amount: '赠款金额',
    actual_amount: '到账金额',
    operator: '操作人',
    status: '状态',
    remark: '备注',
    recharged_at: '充值时间',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    pending: 'pending',
    arrived: 'arrived',
    failed: 'failed',
  },
  noGenerators: { recharge_no: 'CZ' },
  readonly: ['created_at'],
};
export const rechargesApi = createEntityApi('财务-充值', rechargeFM);

// 退款管理
const refundFM: FieldMap = {
  idField: 'record_id',
  fields: {
    refund_no: '退款编号',
    customer_name: '客户名称',
    refund_amount: '退款金额',
    refund_reason: '退款原因',
    refund_method: '退款方式',
    status: '状态',
    applicant: '申请人',
    approver: '审批人',
    approval_comment: '审批意见',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    pending_approval: '待审批',
    pending: '待审批',
    approving: '审批中',
    refunded: '已退款',
    success: '已退款',
    rejected: '已驳回',
  },
  noGenerators: { refund_no: 'TK' },
  readonly: ['created_at'],
};
export const refundsApi = createEntityApi('财务-退款', refundFM);

// 退币管理
const coinRefundFM: FieldMap = {
  idField: 'record_id',
  fields: {
    coin_refund_no: '退币编号',
    customer_name: '客户名称',
    port: '端口',
    coin_amount: '退币金额',
    coin_reason: '退币原因',
    entity_name: '主体名称',
    status: '状态',
    applicant: '申请人',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    pending_approval: '待审批',
    pending: '待审批',
    refunded: '已退币',
    success: '已退币',
    rejected: '已驳回',
  },
  noGenerators: { coin_refund_no: 'TB' },
  readonly: ['created_at'],
};
export const coinRefundsApi = createEntityApi('财务-退币', coinRefundFM);

// 后返管理
const rebateFM: FieldMap = {
  idField: 'record_id',
  fields: {
    rebate_no: '后返编号',
    customer_name: '客户名称',
    port: '端口',
    rebate_amount: '返点金额',
    rebate_ratio: '返点比例',
    settle_month: '返点周期',
    remark: '备注',
    status: '状态',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    pending: '待确认',
    confirmed: '已确认',
    success: '已确认',
    settled: '已结算',
  },
  noGenerators: { rebate_no: 'HF' },
  readonly: ['created_at'],
};
export const rebatesApi = createEntityApi('财务-后返', rebateFM);

// 扣减管理
const deductionFM: FieldMap = {
  idField: 'record_id',
  fields: {
    deduction_no: '扣减编号',
    customer_name: '客户名称',
    deduction_amount: '扣减金额',
    deduction_reason: '扣减原因',
    entity_name: '主体名称',
    port: '端口',
    deduction_type: '扣减类型',
    status: '状态',
    operator: '操作人',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    pending: '待处理',
    completed: '已扣减',
    done: '已扣减',
  },
  noGenerators: { deduction_no: 'KJ' },
  readonly: ['created_at'],
};
export const deductionsApi = createEntityApi('财务-扣减', deductionFM);

// 消耗管理
const consumptionFM: FieldMap = {
  idField: 'record_id',
  fields: {
    consume_no: '消耗编号',
    customer_name: '客户名称',
    port: '端口',
    department: '部门',
    sales_name: '商务',
    consume_amount: '消耗金额',
    cash_consume: '现金消耗',
    grant_consume: '赠款消耗',
    consume_date: '消耗日期',
    created_at: '创建时间',
  },
  noGenerators: { consume_no: 'XH' },
  readonly: ['created_at'],
};
export const consumptionsApi = createEntityApi('财务-消耗', consumptionFM);

// 垫款管理
const advanceFM: FieldMap = {
  idField: 'record_id',
  fields: {
    advance_no: '垫款编号',
    customer_name: '客户名称',
    advance_amount: '垫款金额',
    returned_amount: '已回款金额',
    advance_reason: '垫款原因',
    advance_date: '垫款日期',
    expected_return_date: '预计回款日期',
    status: '状态',
    owner_name: '负责人',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    unpaid: '未回款',
    partial: '部分回款',
    paid: '已回款',
  },
  noGenerators: { advance_no: 'DK' },
  readonly: ['created_at'],
};
export const advancesApi = createEntityApi('财务-垫款', advanceFM);

// 激励管理
const incentiveFM: FieldMap = {
  idField: 'record_id',
  fields: {
    incentive_no: '激励编号',
    incentive_amount: '激励金额',
    incentive_type: '激励类型',
    employee_name: '员工姓名',
    department: '所属部门',
    reason: '激励事由',
    status: '状态',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    pending: '待发放',
    issued: '已发放',
  },
  noGenerators: { incentive_no: 'JL' },
  readonly: ['created_at'],
};
export const incentivesApi = createEntityApi('财务-激励', incentiveFM);

// 收入管理
const incomeFM: FieldMap = {
  idField: 'record_id',
  fields: {
    income_no: '收入编号',
    income_type: '收入类型',
    customer_name: '客户名称',
    amount: '收入金额',
    receipt_status: '收款状态',
    income_date: '收入日期',
    remark: '备注',
    created_at: '创建时间',
  },
  statusField: 'receipt_status',
  statusMap: {
    pending: '待收款',
    received: '已收款',
  },
  noGenerators: { income_no: 'SR' },
  readonly: ['created_at'],
};
export const incomesApi = createEntityApi('财务-收入', incomeFM);

// 支出管理
const expenseFM: FieldMap = {
  idField: 'record_id',
  fields: {
    expense_no: '支出编号',
    expense_type: '支出类型',
    expense_reason: '支出事由',
    amount: '支出金额',
    approver: '审批人',
    applicant: '申请人',
    approval_status: '审批状态',
    expense_date: '支出日期',
    remark: '备注',
    created_at: '创建时间',
  },
  statusField: 'approval_status',
  statusMap: {
    pending: '待审批',
    approving: '审批中',
    approved: '已通过',
    rejected: '已驳回',
    paid: '已支付',
  },
  noGenerators: { expense_no: 'FY' },
  readonly: ['created_at'],
};
export const expensesApi = createEntityApi('财务-支出', expenseFM);

// 日常费用
const dailyExpenseFM: FieldMap = {
  idField: 'record_id',
  fields: {
    expense_no: '费用编号',
    expense_type: '费用类型',
    amount: '费用金额',
    applicant: '申请人',
    department: '所属部门',
    status: '状态',
    expense_date: '发生日期',
    remark: '备注',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    pending: '待报销',
    approved: '已审批',
    reimbursed: '已报销',
  },
  noGenerators: { expense_no: 'FY' },
  readonly: ['created_at'],
};
export const dailyExpensesApi = createEntityApi('财务-日常费用', dailyExpenseFM);

// 保证金押金
const depositFM: FieldMap = {
  idField: 'record_id',
  fields: {
    deposit_no: '单据编号',
    customer_name: '客户名称',
    deposit_type: '类型',
    deposit_amount: '金额',
    status: '状态',
    paid_date: '缴纳日期',
    refund_date: '预计退还日期',
    remark: '备注',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    paid: '已缴纳',
    frozen: '已冻结',
    refunded: '已退还',
  },
  noGenerators: { deposit_no: 'BZ' },
  readonly: ['created_at'],
};
export const depositsApi = createEntityApi('财务-保证金押金', depositFM);

// 发票管理
const invoiceFM: FieldMap = {
  idField: 'record_id',
  fields: {
    invoice_no: '发票编号',
    customer_name: '客户名称',
    invoice_type: '发票类型',
    invoice_amount: '发票金额',
    tax_rate: '税率',
    tax_amount: '税额',
    title: '发票抬头',
    tax_no: '税号',
    operator: '操作人',
    status: '状态',
    invoice_date: '开票日期',
    remark: '备注',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    pending: '待开票',
    issued: '已开票',
    mailed: '已寄出',
    received: '已收票',
  },
  noGenerators: { invoice_no: 'FP' },
  readonly: ['created_at'],
};
export const invoicesApi = createEntityApi('财务-发票', invoiceFM);

// 成本管理
const costFM: FieldMap = {
  idField: 'record_id',
  fields: {
    cost_no: '成本编号',
    cost_type: '成本类型',
    related_customer: '关联对象',
    amount: '成本金额',
    department: '所属部门',
    occur_date: '发生日期',
    remark: '备注',
    created_at: '创建时间',
  },
  noGenerators: { cost_no: 'CB' },
  readonly: ['created_at'],
};
export const costsApi = createEntityApi('财务-成本', costFM);

// 端口账户
const portAccountFM: FieldMap = {
  idField: 'record_id',
  fields: {
    port_no: '端口编号',
    port_name: '端口名称',
    port_type: '端口类型',
    balance: '账户余额',
    grant_balance: '赠款余额',
    total_consume: '累计消耗',
    total_recharge: '累计充值',
    status: '状态',
    updated_at: '更新时间',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    active: '正常',
    disabled: '停用',
  },
  noGenerators: { port_no: 'PT' },
  readonly: ['created_at', 'updated_at'],
};
export const portAccountsApi = createEntityApi('财务-端口账户', portAccountFM);

// 银行账户
const bankAccountFM: FieldMap = {
  idField: 'record_id',
  fields: {
    account_no: '账户编号',
    bank_name: '银行名称',
    account_name: '账户名称',
    account_number: '账号',
    account_type: '账户类型',
    balance: '账户余额',
    status: '状态',
    updated_at: '更新时间',
    created_at: '创建时间',
  },
  statusField: 'status',
  statusMap: {
    active: '正常',
    disabled: '停用',
  },
  readonly: ['account_no', 'created_at', 'updated_at'],
};
export const bankAccountsApi = createEntityApi('财务-银行账户', bankAccountFM);

// ============================================================
// 人资 9 表（Bitable 实体，snake_case ↔ 中文双向映射）
// ============================================================
// 员工档案
const employeeFM: FieldMap = {
  idField: 'record_id',
  fields: {
    employee_no: '工号', name: '姓名', gender: '性别', department: '所属部门', position: '岗位',
    phone: '手机号', email: '邮箱', join_date: '入职日期', contract_expire_date: '合同到期日',
    address: '居住地址', leave_date: '离职日期', status: '员工状态', perf_std: '绩效工资标准',
    created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { active: '在职', probation: '试用', resigned: '离职' },
  readonly: ['created_at', 'updated_at'],
};
export const employeesApi = createEntityApi('人资-员工档案', employeeFM);
// 简历库
const resumeFM: FieldMap = {
  idField: 'record_id',
  fields: {
    resume_no: '简历编号', name: '姓名', position: '应聘岗位', education: '学历', work_years: '工作年限',
    source: '简历来源', status: '简历状态', phone: '联系电话', remark: '备注',
    attachment: '简历附件',
    created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { pending_review: '待筛选', invited: '已邀约', interviewing: '面试中', hired: '已录用', rejected: '已拒绝' },
  readonly: ['created_at', 'updated_at'],
};
export const resumesApi = createEntityApi('人资-简历库', resumeFM);
// 面试邀约
const invitationFM: FieldMap = {
  idField: 'record_id',
  fields: {
    invitation_no: '邀约编号', candidate_name: '候选人姓名', position: '应聘岗位', phone: '手机号',
    channel: '邀约渠道', interviewer_name: '面试官', interview_time: '邀约时间', interview_mode: '面试形式',
    location: '面试地点', status: '邀约状态', remark: '备注',
    created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { pending_confirm: '待确认', accepted: '已接受', declined: '已拒绝', expired: '已过期' },
  enumMaps: {
    interview_mode: { onsite: '现场', video: '视频', phone: '电话' },
  },
  readonly: ['created_at', 'updated_at'],
};
export const invitationsApi = createEntityApi('人资-面试邀约', invitationFM);
// 面试记录
const interviewFM: FieldMap = {
  idField: 'record_id',
  fields: {
    interview_no: '面试编号', candidate_name: '候选人姓名', position: '应聘岗位', round: '面试轮次',
    interviewer_name: '面试官', interview_time: '面试时间', interview_mode: '面试形式', score: '面试评分',
    status: '面试状态', evaluation: '面试评价', suggestion: '面试建议', remark: '备注',
    created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { pending: '待评价', passed: '通过', failed: '不通过', hired: '已录用', hold: '待定' },
  enumMaps: {
    interview_mode: { onsite: '现场', video: '视频', phone: '电话' },
  },
  readonly: ['created_at', 'updated_at'],
};
export const interviewsApi = createEntityApi('人资-面试记录', interviewFM);
// 签到记录
const checkinFM: FieldMap = {
  idField: 'record_id',
  fields: {
    checkin_no: '签到编号', candidate_name: '姓名', position: '岗位', checkin_type: '签到类型',
    appointment_time: '预约时间', checkin_time: '实际签到时间', checkin_method: '签到方式',
    status: '签到状态', remark: '备注', created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { pending: '待签到', checked_in: '已签到', late: '迟到', absent: '未到' },
  enumMaps: {
    checkin_type: { interview: '面试签到', onboard: '入职签到' },
  },
  readonly: ['created_at', 'updated_at'],
};
export const checkinsApi = createEntityApi('人资-签到记录', checkinFM);
// 考勤月度
const attendanceFM: FieldMap = {
  idField: 'record_id',
  fields: {
    attendance_no: '考勤编号', employee_name: '员工姓名', department: '部门', attend_month: '考勤月份',
    work_days: '出勤天数', late_count: '迟到次数', early_count: '早退次数', leave_days: '请假天数',
    overtime_hours: '加班时长', remark: '备注', created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
};
export const attendancesApi = createEntityApi('人资-考勤月度', attendanceFM);
// 薪酬工资
const salaryFM: FieldMap = {
  idField: 'record_id',
  fields: {
    salary_no: '工资编号', employee_name: '员工姓名', emp_name: '员工姓名', department: '部门',
    base_salary: '基本工资', commission: '提成', perf_salary: '绩效工资', subsidy: '补贴', deduction: '扣款',
    gross_salary: '应发工资', social_deduction: '社保扣款', fund: '公积金',
    taxable_income: '应纳税所得额', tax: '个税',
    actual_salary: '实发工资', salary_month: '薪资月份', status: '发放状态', remark: '备注',
    perf_level: '绩效等级', perf_coefficient: '绩效系数',
    created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
};
export const salariesApi = createEntityApi('人资-薪酬工资', salaryFM);
// 绩效考核
const performanceFM: FieldMap = {
  idField: 'record_id',
  fields: {
    performance_no: '绩效编号', employee_name: '员工姓名', department: '部门', period: '考核周期',
    mode: '考核模式', score: '考核得分', grade: '绩效等级', status: '绩效状态', remark: '备注',
    indicator_detail: '指标明细', total_score: '综合得分',
    result_score: '结果分', manage_score: '管理分', add_score: '增值加分', minus_score: '制约扣分',
    self_score: '自评分', superior_score: '上级评分', attend_days: '出勤天数',
    metric_detail: '指标明细', perf_std_snapshot: '绩效工资标准快照', calc_perf_salary: '核算绩效工资',
    base_salary_snapshot: '基本工资快照', commission_snapshot: '提成快照',
    created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { pending: '待确认', confirmed: '已确认' },
  readonly: ['created_at', 'updated_at'],
};
export const performancesApi = createEntityApi('人资-绩效考核', performanceFM);
// 招聘计划
const recruitPlanFM: FieldMap = {
  idField: 'record_id',
  fields: {
    plan_no: '计划编号', position: '招聘岗位', department: '所属部门', headcount: '需求人数',
    hired_count: '已到岗人数', onboarded: '已到岗人数', recruiting: '在招人数', urgency: '优先级',
    expected_date: '期望到岗时间', plan_date: '期望到岗时间', owner_name: '负责人', status: '计划状态',
    remark: '备注', created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { recruiting: '招聘中', completed: '已完成', paused: '已暂停', cancelled: '已取消' },
  enumMaps: {
    urgency: { high: '高', medium: '中', low: '低' },
  },
  readonly: ['created_at', 'updated_at'],
};
export const recruitPlansApi = createEntityApi('人资-招聘计划', recruitPlanFM);

// ============================================================
// 系统域 6 表（Bitable 实体，snake_case ↔ 中文双向映射）
// ============================================================
// 部门
const departmentFM: FieldMap = {
  idField: 'record_id',
  fields: {
    dept_code: '部门编号', name: '部门名称', parent_id: '上级部门', leader: '负责人',
    phone: '联系电话', sort: '排序', status: '状态',
    created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { active: '启用', disabled: '禁用' },
  readonly: ['created_at', 'updated_at'],
};
export const departmentsApi = createEntityApi('系统-部门', departmentFM);
// 用户（登录账号 / 负责人下拉来源）
const userFM: FieldMap = {
  idField: 'record_id',
  fields: {
    username: '登录账号', name: '姓名', phone: '手机号', email: '邮箱', department: '所属部门',
    position: '岗位', role: '角色', data_scope: '数据范围', status: '状态',
    created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { active: '启用', disabled: '禁用' },
  readonly: ['created_at', 'updated_at'],
};
export const usersApi = createEntityApi('系统-用户', userFM);
// 角色（menu_ids / field_permissions 为 JSON 文本，由 index 包装层序列化）
const roleFM: FieldMap = {
  idField: 'record_id',
  fields: {
    role_key: '角色标识', name: '角色名称', description: '描述', data_scope: '数据范围',
    menu_ids: '菜单权限', field_permissions: '字段权限', is_system: '系统内置',
    member_count: '成员数',
    created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'is_system',
  statusMap: { 1: '系统内置', 0: '自定义' },
  readonly: ['created_at', 'updated_at'],
};
export const rolesApi = createEntityApi('系统-角色', roleFM);
// 操作日志（只读列表为主）
const operationLogFM: FieldMap = {
  idField: 'record_id',
  fields: {
    log_no: '日志编号', operator_name: '操作人', operator_id: '操作人标识', department: '所属部门',
    role: '角色', module: '模块', op_type: '操作类型', object_type: '对象类型', object_no: '对象业务编号',
    op_content: '操作内容', result: '结果', fail_reason: '失败原因', ip: 'IP地址', browser: '浏览器',
    trace_id: '链路ID', operated_at: '操作时间', created_at: '创建时间',
  },
  readonly: ['created_at'],
};
export const operationLogsApi = createEntityApi('系统-操作日志', operationLogFM);
// 登录日志
const loginLogFM: FieldMap = {
  idField: 'record_id',
  fields: {
    log_no: '日志编号', username: '用户名', user_id: '用户标识', login_mode: '登录方式', ip: 'IP地址',
    location: '登录地点', browser: '浏览器', os: '操作系统', device: '设备', status: '登录状态',
    fail_reason: '失败原因', session_id: '会话标识', remark: '备注', login_at: '登录时间',
    created_at: '创建时间',
  },
  readonly: ['created_at'],
};
export const loginLogsApi = createEntityApi('系统-登录日志', loginLogFM);
// 系统设置（键值，按分组读写，getGroup/saveGroup 由 index 包装层实现）
const systemSettingFM: FieldMap = {
  idField: 'record_id',
  fields: {
    group_key: '分组', setting_key: '设置键', setting_value: '设置值',
    created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
};
export const systemSettingsApi = createEntityApi('系统-系统设置', systemSettingFM);

// ============================================================
// 规模化批次 32 表（行政/视频/合同/采购/业务/任务）snake↔中文双向映射
// ============================================================
const assetsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    asset_no: '资产编号', asset_name: '资产名称', category: '类别', spec: '规格型号',
    amount: '购入金额', department: '使用部门', user_name: '使用人', status: '资产状态',
    purchase_date: '购入日期', created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { in_use: '使用中', idle: '闲置', maintenance: '维修中', scrapped: '已报废' },
  readonly: ['created_at', 'updated_at'],
};
export const assetsApi = createEntityApi('行政-固定资产', assetsFM);
const inventoriesFM: FieldMap = {
  idField: 'record_id',
  fields: {
    material_name: '物资名称', category: '分类', unit: '单位', stock_quantity: '库存数量',
    warning_quantity: '预警阈值', location: '存放位置', remark: '备注', created_at: '创建时间',
    updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
};
export const inventoriesApi = createEntityApi('行政-库存物资', inventoriesFM);
const stockInsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    stock_in_no: '入库单号', material_name: '物资名称', category: '分类', quantity: '入库数量',
    unit_price: '单价', total_amount: '总金额', supplier: '供应商', in_date: '入库日期',
    operator_name: '经办人', created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
};
export const stockInsApi = createEntityApi('行政-入库记录', stockInsFM);
const requisitionsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    requisition_no: '领用单号', material_name: '物资名称', quantity: '领用数量', applicant_name: '领用人',
    department: '部门', purpose: '用途', apply_date: '申请日期', status: '状态',
    created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { pending: '待确认', confirmed: '已确认', rejected: '已驳回' },
  readonly: ['created_at', 'updated_at'],
};
export const requisitionsApi = createEntityApi('行政-领用记录', requisitionsFM);
const returnsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    return_no: '归还单号', material_name: '物资名称', quantity: '归还数量', returner_name: '归还人',
    department: '部门', return_date: '归还日期', condition: '物品状态', status: '状态',
    created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { pending: '待确认', confirmed: '已确认' },
  readonly: ['created_at', 'updated_at'],
};
export const returnsApi = createEntityApi('行政-归还记录', returnsFM);
const inventoryChecksFM: FieldMap = {
  idField: 'record_id',
  fields: {
    check_no: '盘点单号', check_date: '盘点日期', check_range: '盘点范围', checker_name: '盘点人',
    system_count: '系统数量', actual_count: '实盘数量', diff_count: '差异数量', status: '状态',
    remark: '备注', created_at: '创建时间', updated_at: '更新时间',
    check_detail: '盘点明细', range_type: '盘点范围类型', warehouse: '仓库', category: '分类',
    gain_count: '盘盈项数', loss_count: '盘亏项数',
  },
  statusField: 'status',
  statusMap: { in_progress: '盘点中', completed: '已完成' },
  readonly: ['created_at', 'updated_at'],
};
export const inventoryChecksApi = createEntityApi('行政-库存盘点', inventoryChecksFM);
const videoOrdersFM: FieldMap = {
  idField: 'record_id',
  fields: {
    order_no: '订单编号', group_name: '集团名称', subject_name: '主体名称', video_type: '视频类型',
    amount: '订单金额', status: '状态', owner_name: '负责人', remark: '备注',
    created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { pending: '待审批', shooting: '拍摄中', post: '后期中', completed: '已完成', rejected: '已驳回' },
  readonly: ['created_at', 'updated_at'],
};
export const videoOrdersApi = createEntityApi('视频-视频订单', videoOrdersFM);
const videoProjectsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    project_name: '项目名称', related_order: '关联订单', progress: '项目进度', owner_name: '负责人',
    deadline: '截止日期', status: '状态', remark: '备注', created_at: '创建时间',
    updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { not_started: '未开始', in_progress: '进行中', completed: '已完成' },
  readonly: ['created_at', 'updated_at'],
};
export const videoProjectsApi = createEntityApi('视频-视频项目', videoProjectsFM);
const actorsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    name: '姓名', phone: '联系方式', fans: '粉丝量', price: '报价',
    schedule_status: '档期状态', tags: '标签', remark: '备注', created_at: '创建时间',
    updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
  enumMaps: {
    schedule_status: { free: '可预约', booked: '已约满' },
  },
};
export const actorsApi = createEntityApi('视频-演员达人', actorsFM);
const outsourcingsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    outsource_no: '外包单号', supplier: '供应商', project_name: '外包项目', amount: '外包费用',
    settle_status: '结算状态', owner_name: '负责人', remark: '备注', created_at: '创建时间',
    updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
  enumMaps: {
    settle_status: { pending: '待结算', settled: '已结算', partial: '部分结算' },
  },
};
export const outsourcingsApi = createEntityApi('视频-外协外包', outsourcingsFM);
const videoCommissionsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    commission_no: '提成单号', employee_name: '员工姓名', department: '部门', performance: '业绩金额',
    commission_rate: '提成比例', commission_amount: '提成金额', settle_month: '结算月份', status: '提成状态',
    remark: '备注', created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { pending: '待结算', settled: '已结算', paid: '已发放' },
  readonly: ['created_at', 'updated_at'],
};
export const videoCommissionsApi = createEntityApi('视频-视频提成', videoCommissionsFM);
const shootCostsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    cost_no: '费用单号', related_project: '关联项目', cost_type: '费用类型', amount: '金额',
    occur_date: '发生日期', reimburse_status: '报销状态', owner_name: '经办人', remark: '备注',
    created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
  enumMaps: {
    reimburse_status: { pending: '待报销', reimbursed: '已报销', booked: '已入账' },
  },
};
export const shootCostsApi = createEntityApi('视频-拍摄成本', shootCostsFM);
const venueCostsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    cost_no: '费用单号', related_project: '关联项目', location_name: '场地名称', amount: '金额',
    start_date: '开始日期', end_date: '结束日期', reimburse_status: '报销状态', remark: '备注',
    created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
  enumMaps: {
    reimburse_status: { pending: '待报销', reimbursed: '已报销', booked: '已入账' },
  },
};
export const venueCostsApi = createEntityApi('视频-场地成本', venueCostsFM);
const samplesFM: FieldMap = {
  idField: 'record_id',
  fields: {
    sample_no: '样品单号', sample_name: '样品名称', related_order: '关联订单', mail_status: '邮寄状态',
    tracking_no: '物流单号', send_date: '寄出日期', return_date: '归还日期', remark: '备注',
    created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
  enumMaps: {
    mail_status: { pending_send: '待寄出', sent: '已寄出', pending_return: '待归还', returned: '已归还', lost: '已丢失' },
  },
};
export const samplesApi = createEntityApi('视频-样片管理', samplesFM);
const collabTasksFM: FieldMap = {
  idField: 'record_id',
  fields: {
    task_no: '任务编号', title: '任务标题', owner: '负责人', collaborators: '协作人',
    deadline: '截止日期', priority: '优先级', progress: '进度', status: '状态',
    description: '任务描述', created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
};
export const collabTasksApi = createEntityApi('视频-协作任务', collabTasksFM);
const collabTaskCommentsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    task_id: '任务ID', author: '评论人', content: '评论内容', created_at: '创建时间',
  },
  readonly: ['created_at'],
};
export const collabTaskCommentsApi = createEntityApi('视频-任务评论', collabTaskCommentsFM);
const contractsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    contract_no: '合同编号', name: '合同名称', subject_name: '主体名称', type: '合同类型',
    amount: '合同金额', sign_date: '签订日期', end_date: '到期日期', status: '合同状态',
    owner: '负责人', remark: '备注', last_remind_at: '最近提醒时间', has_commission: '含提成',
    created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
};
export const contractsApi = createEntityApi('合同-合同主表', contractsFM);
const contractTemplatesFM: FieldMap = {
  idField: 'record_id',
  fields: {
    template_no: '模板编号', template_name: '模板名称', contract_type: '合同类型', status: '状态',
    remark: '备注', created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { active: '启用', inactive: '停用' },
  readonly: ['created_at', 'updated_at'],
};
export const contractTemplatesApi = createEntityApi('合同-合同模板', contractTemplatesFM);
const contractCostsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    cost_no: '费用单号', related_contract: '关联合同', cost_type: '费用类型', amount: '金额',
    plan_date: '计划日期', pay_status: '付款状态', remark: '备注', created_at: '创建时间',
    updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
  enumMaps: {
    pay_status: { pending: '待支付', paid: '已支付' },
  },
};
export const contractCostsApi = createEntityApi('合同-合同成本', contractCostsFM);
const contractCommissionsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    contract_no: '合同编号', contract_name: '合同名称', owner: '负责人', rate: '提成比例',
    amount: '提成金额', remark: '备注', status: '状态', created_at: '创建时间',
    updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
};
export const contractCommissionsApi = createEntityApi('合同-合同提成', contractCommissionsFM);
const paymentPlansFM: FieldMap = {
  idField: 'record_id',
  fields: {
    contract_id: '合同ID', term: '期次', plan_amount: '计划金额', paid_amount: '已付金额',
    plan_date: '计划日期', status: '状态', created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
};
export const paymentPlansApi = createEntityApi('合同-付款计划', paymentPlansFM);
const paymentRecordsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    contract_id: '合同ID', plan_id: '计划ID', amount: '付款金额', pay_date: '付款日期',
    pay_method: '付款方式', remark: '备注', created_at: '创建时间',
  },
  readonly: ['created_at'],
};
export const paymentRecordsApi = createEntityApi('合同-付款记录', paymentRecordsFM);
const purchaseRequisitionsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    req_no: '申请单号', reason: '申请事由', applicant_id: '申请人ID', applicant_name: '申请人',
    department: '部门', items: '采购明细', total_amount: '预计金额', expected_date: '期望日期',
    remark: '备注', status: '状态', reject_step: '驳回环节', reject_reason: '驳回原因',
    generated_order: '已生成订单', approved_at: '审批时间', created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { pending_approval: '待审批', approving: '审批中', approved: '已通过', rejected: '已驳回', purchased: '已采购' },
  readonly: ['created_at', 'updated_at'],
};
export const purchaseReqsApi = createEntityApi('采购-采购申请', purchaseRequisitionsFM);
const purchaseOrdersFM: FieldMap = {
  idField: 'record_id',
  fields: {
    order_no: '订单编号', related_req: '关联申请', supplier: '供应商', amount: '订单金额',
    status: '订单状态', remark: '备注', created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { pending: '待发货', in_delivery: '配送中', delivered: '已送达', cancelled: '已取消' },
  readonly: ['created_at', 'updated_at'],
};
export const purchaseOrdersApi = createEntityApi('采购-采购订单', purchaseOrdersFM);
const purchaseDetailsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    detail_no: '明细单号', related_order: '关联订单', item_name: '物品名称', spec: '规格',
    quantity: '数量', unit_price: '单价', amount: '金额', receive_status: '收货状态',
    remark: '备注', created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
  enumMaps: {
    receive_status: { pending: '待收货', received: '已收货' },
  },
};
export const purchaseDetailsApi = createEntityApi('采购-采购明细', purchaseDetailsFM);
const customerAccountsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    account_no: '账户编号', customer_name: '客户名称', login_account: '登录账号', contact_name: '联系人',
    status: '状态', last_login_at: '最近登录', remark: '备注', created_at: '创建时间',
    updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { active: '正常', disabled: '已禁用' },
  readonly: ['created_at', 'updated_at'],
};
export const customerAccountsApi = createEntityApi('业务-客户账户', customerAccountsFM);
const industryRoisFM: FieldMap = {
  idField: 'record_id',
  fields: {
    industry_name: '行业名称', platform: '平台', roi_base: 'ROI基准', avg_cpc: '平均CPC',
    avg_cvr: '平均CVR', remark: '备注', created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
};
export const industryRoisApi = createEntityApi('业务-行业ROI', industryRoisFM);
const competitorsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    competitor_name: '竞品名称', industry: '所属行业', platform: '平台', estimated_cost: '预估消耗',
    mom_change: '环比变化', monitor_status: '监控状态', remark: '备注', created_at: '创建时间',
    updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
  enumMaps: {
    monitor_status: { monitoring: '监控中', paused: '已暂停' },
  },
};
export const competitorsApi = createEntityApi('业务-竞品监控', competitorsFM);
const materialsFM: FieldMap = {
  idField: 'record_id',
  fields: {
    material_no: '素材编号', material_name: '素材名称', material_type: '素材类型', customer_name: '客户名称',
    platform: '平台', exposure: '曝光量', clicks: '点击量', conversion: '转化率',
    tags: '标签', remark: '备注', material_file: '素材文件', video_cover: '视频封面',
    created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
  enumMaps: {
    material_type: { image: '图片', video: '视频' },
  },
};
export const materialsApi = createEntityApi('业务-素材资料', materialsFM);
const commissionRulesFM: FieldMap = {
  idField: 'record_id',
  fields: {
    rule_name: '规则名称', biz_type: '业务类型', calc_mode: '计算方式', base_type: '基数类型',
    tiers: '阶梯配置', applicable_dept: '适用部门', status: '是否启用',
    created_at: '创建时间', updated_at: '更新时间',
  },
  readonly: ['created_at', 'updated_at'],
};
export const commissionRulesApi = createEntityApi('业务-提成规则', commissionRulesFM);
const importTasksFM: FieldMap = {
  idField: 'record_id',
  fields: {
    task_no: '任务编号', task_type: '任务类型', file_name: '文件名', total_rows: '总条数',
    success_rows: '成功数', fail_rows: '失败数', fail_detail: '失败明细', doc_file: '原文档', status: '状态', created_at: '创建时间',
    updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { processing: '处理中', completed: '已完成', failed: '失败' },
  readonly: ['created_at', 'updated_at'],
};
export const importTasksApi = createEntityApi('任务-导入任务', importTasksFM);
const exportTasksFM: FieldMap = {
  idField: 'record_id',
  fields: {
    task_no: '任务编号', task_type: '任务类型', conditions: '导出条件', file_name: '文件名',
    row_count: '导出行数', fail_reason: '失败原因', status: '状态', created_at: '创建时间', updated_at: '更新时间',
  },
  statusField: 'status',
  statusMap: { processing: '处理中', completed: '已完成', failed: '失败' },
  readonly: ['created_at', 'updated_at'],
};
export const exportTasksApi = createEntityApi('任务-导出任务', exportTasksFM);

// ============== 审批流程 2 表（中文状态直存，流程组合逻辑在 index.approvalsApi）==============
const approvalInstanceFM: FieldMap = {
  idField: 'record_id',
  fields: {
    instance_no: '实例编号',
    business_type: '业务类型',
    business_no: '业务单据编号',
    title: '审批标题',
    applicant: '申请人',
    apply_time: '申请时间',
    current_node: '当前节点',
    status: '状态',
    finish_time: '完成时间',
  },
};
export const approvalInstancesApi = createEntityApi('审批-实例', approvalInstanceFM);

const approvalStepRecordFM: FieldMap = {
  idField: 'record_id',
  fields: {
    step_no: '步骤编号',
    instance_no: '实例编号',
    step_order: '节点序号',
    step_name: '节点名称',
    approve_mode: '审批方式',
    approver: '审批人',
    approver_role: '审批人角色',
    status: '状态',
    comment: '审批意见',
    approve_time: '审批时间',
  },
};
export const approvalStepRecordsApi = createEntityApi('审批-步骤', approvalStepRecordFM);

