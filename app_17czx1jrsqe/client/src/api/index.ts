import { apiGet, apiPost, apiPut, apiDelete } from './request';
import { calcCommissionByRule, parseTiersSafe } from '@shared/commission-calc';
import {
  customersApi as _customersApi,
  publicLeadsApi as _publicLeadsApi,
  invalidLeadsApi as _invalidLeadsApi,
  leadsApi as _leadsApi,
  customerContactsApi as _customerContactsApi,
  customerFollowUpsApi as _customerFollowUpsApi,
  leadFollowUpsApi as _leadFollowUpsApi,
  accountApplicationsApi as _accountApplicationsApi,
  filingsApi as _filingsApi,
  transfersApi as _transfersApi,
  adCommissionsApi as _adCommissionsApi,
  transactionsApi as _transactionsApi,
  receiptsApi as _receiptsApi,
  rechargesApi as _rechargesApi,
  refundsApi as _refundsApi,
  coinRefundsApi as _coinRefundsApi,
  rebatesApi as _rebatesApi,
  deductionsApi as _deductionsApi,
  consumptionsApi as _consumptionsApi,
  advancesApi as _advancesApi,
  incentivesApi as _incentivesApi,
  incomesApi as _incomesApi,
  expensesApi as _expensesApi,
  dailyExpensesApi as _dailyExpensesApi,
  depositsApi as _depositsApi,
  invoicesApi as _invoicesApi,
  costsApi as _costsApi,
  portAccountsApi as _portAccountsApi,
  bankAccountsApi as _bankAccountsApi,
  employeesApi as _employeesApi,
  resumesApi as _resumesApi,
  invitationsApi as _invitationsApi,
  interviewsApi as _interviewsApi,
  checkinsApi as _checkinsApi,
  attendancesApi as _attendancesApi,
  salariesApi as _salariesApi,
  performancesApi as _performancesApi,
  recruitPlansApi as _recruitPlansApi,
  departmentsApi as _departmentsApi,
  usersApi as _usersApi,
  rolesApi as _rolesApi,
  operationLogsApi as _operationLogsApi,
  loginLogsApi as _loginLogsApi,
  systemSettingsApi as _systemSettingsApi,
  assetsApi as _assetsApi,
  inventoriesApi as _inventoriesApi,
  stockInsApi as _stockInsApi,
  requisitionsApi as _requisitionsApi,
  returnsApi as _returnsApi,
  inventoryChecksApi as _inventoryChecksApi,
  videoOrdersApi as _videoOrdersApi,
  videoProjectsApi as _videoProjectsApi,
  actorsApi as _actorsApi,
  outsourcingsApi as _outsourcingsApi,
  videoCommissionsApi as _videoCommissionsApi,
  shootCostsApi as _shootCostsApi,
  venueCostsApi as _venueCostsApi,
  samplesApi as _samplesApi,
  collabTasksApi as _collabTasksApi,
  collabTaskCommentsApi as _collabTaskCommentsApi,
  contractsApi as _contractsApi,
  contractTemplatesApi as _contractTemplatesApi,
  contractCostsApi as _contractCostsApi,
  contractCommissionsApi as _contractCommissionsApi,
  paymentPlansApi as _paymentPlansApi,
  paymentRecordsApi as _paymentRecordsApi,
  purchaseReqsApi as _purchaseReqsApi,
  purchaseOrdersApi as _purchaseOrdersApi,
  purchaseDetailsApi as _purchaseDetailsApi,
  customerAccountsApi as _customerAccountsApi,
  industryRoisApi as _industryRoisApi,
  competitorsApi as _competitorsApi,
  materialsApi as _materialsApi,
  commissionRulesApi as _commissionRulesApi,
  importTasksApi as _importTasksApi,
  exportTasksApi as _exportTasksApi,
  approvalInstancesApi as _approvalInstancesApi,
  approvalStepRecordsApi as _approvalStepRecordsApi,
} from './entities';
import { getCurrentUser } from './currentUser';
// ======== 工作台（Bitable 聚合，带 snake_case → camelCase 字段映射） ========
export { dashboardApi } from './dashboard-api';

// ======== 客户管理（Bitable 实体版本 + 业务扩展方法） ========
// 基础 CRUD 复用 entities.ts 的 Bitable API，再扩展页面需要的特殊动作
export const customersApi = Object.assign({}, _customersApi, {
  // 客户详情页的跟进记录接口复用 customerFollowUps entity
  getFollowUps: (id: number) =>
    apiGet('/entity/客户-跟进记录', { customer_id: id, page: 1, pageSize: 100 }),
  addFollowUp: (id: number, data: any) =>
    _customerFollowUpsApi.create({ ...data, customer_id: id }),
});

export const publicLeadsApi = Object.assign({}, _publicLeadsApi, {
  claim: async (id: number) => _publicLeadsApi.update(id, { assign_status: 'assigned' } as any),
  batchClaim: async (ids: number[]) => {
    const results = await Promise.all(
      ids.map((id) => _publicLeadsApi.update(id, { assign_status: 'assigned' } as any)),
    );
    return results[0];
  },
  batchAssign: async (ids: number[], _assignedTo: number, assignedName?: string) => {
    const results = await Promise.all(
      ids.map((id) =>
        _publicLeadsApi.update(id, { assign_status: 'assigned', creator_name: assignedName || '系统' } as any),
      ),
    );
    return results[0];
  },
  autoAssign: async () => ({ code: 0, data: { count: 0 }, message: '自动分配已触发（模拟）' }),
});

export const invalidLeadsApi = Object.assign({}, _invalidLeadsApi, {
  restore: async (id: number) =>
    _invalidLeadsApi.update(id, { assign_status: 'pending' } as any),
  batchRestore: async (ids: number[]) => {
    const results = await Promise.all(
      ids.map((id) => _invalidLeadsApi.update(id, { assign_status: 'pending' } as any)),
    );
    return results[0];
  },
  markInvalid: async (id: string | number, _reason: string) =>
    _publicLeadsApi.update(id, { assign_status: 'invalid' } as any),
});

export const leadsApi = Object.assign({}, _leadsApi, {
  batchAssign: async (ids: number[], _ownerId: number, ownerName: string) => {
    const results = await Promise.all(
      ids.map((id) => _leadsApi.update(id, { owner_name: ownerName, status: 'following' } as any)),
    );
    return results[0];
  },
  getFollowUps: (id: number) =>
    apiGet('/entity/客户-线索跟进', { lead_id: id, page: 1, pageSize: 100 }),
  addFollowUp: (id: number, data: any) =>
    _leadFollowUpsApi.create({ ...data, lead_name: id }),
});

export const customerContactsApi = _customerContactsApi;
export const customerFollowUpsApi = _customerFollowUpsApi;

// ======== 广告业务（Bitable 实体版本） ========
export const accountApplicationsApi = Object.assign({}, _accountApplicationsApi, {
  submit: (id: number) => _accountApplicationsApi.update(id, { status: 'pending' } as any),
  getApprovalSteps: (_id: number) => Promise.resolve({ code: 0, data: [] }),
});
export const filingsApi = _filingsApi;
export const transfersApi = _transfersApi;
export const adCommissionsApi = _adCommissionsApi;

// ======== 财务核心 18 页（Bitable 实体版本） ========
export const transactionsApi = _transactionsApi;
export const paymentsApi = _receiptsApi;
export const receiptsApi = _receiptsApi;
export const rechargesApi = _rechargesApi;
export const refundsApi = _refundsApi;
export const consumptionsApi = _consumptionsApi;
export const advancesApi = _advancesApi;
export const invoicesApi = _invoicesApi;
export const portAccountsApi = _portAccountsApi;
export const bankAccountsApi = _bankAccountsApi;
export const costsApi = _costsApi;
export const incomesApi = _incomesApi;
export const expensesApi = _expensesApi;
export const coinRefundsApi = _coinRefundsApi;
export const rebatesApi = _rebatesApi;
export const deductionsApi = _deductionsApi;
export const incentivesApi = _incentivesApi;
export const dailyExpensesApi = _dailyExpensesApi;
export const depositsApi = _depositsApi;

// ==================== 审批流程引擎（数据落「审批-实例 / 审批-步骤」多维表）====================
const APR_TYPE_TO_ZH: Record<string, string> = {
  account_open: '开户', filing: '报备', transfer: '转户', contract: '合同',
  purchase: '采购', purchase_requisition: '采购', refund: '退款',
  expense: '支出', advance: '支出', reimbursement: '报销',
};
const APR_ZH_TO_TYPE: Record<string, string> = {
  开户: 'account_open', 报备: 'filing', 转户: 'transfer', 合同: 'contract',
  采购: 'purchase', 退款: 'refund', 支出: 'expense', 报销: 'reimbursement',
};
const APR_INST_CODE: Record<string, string> = {
  待审批: 'pending', 审批中: 'current', 已通过: 'approved', 已驳回: 'rejected', 已撤回: 'withdrawn',
};
const aprList = (r: any): any[] => ((r && r.data && (r.data.list || r.data.items)) || []);
const aprId = (x: any) => (x ? x.id ?? x.record_id : undefined);
const aprISO = (v: any) => (v == null || v === '' ? '' : typeof v === 'number' ? new Date(v).toISOString() : String(v));

export const approvalsApi: any = {
  // 发起审批：建实例 + 首个审批步骤（单级流转，多级时按步骤顺序推进）
  async submit(data: { businessType: string; businessId: number | string; title?: string }) {
    const zh = APR_TYPE_TO_ZH[data.businessType] || data.businessType;
    const bizNo = String(data.businessId);
    const exist = aprList(await _approvalInstancesApi.list({ pageSize: 500 }));
    const dup = exist.find((x: any) => x.business_type === zh && x.business_no === bizNo
      && (x.status === '待审批' || x.status === '审批中'));
    if (dup) return { code: 0, message: '审批已存在', data: dup };
    const me = getCurrentUser();
    const no = `AP${Date.now().toString().slice(-8)}`;
    const inst = await _approvalInstancesApi.create({
      instance_no: no, business_type: zh, business_no: bizNo, title: data.title || `${zh}审批`,
      applicant: me?.name || '当前用户', apply_time: Date.now(), current_node: '审批', status: '审批中',
    });
    await _approvalStepRecordsApi.create({
      step_no: `${no}-S1`, instance_no: no, step_order: 1, step_name: '审批', approve_mode: '逐级',
      approver: me?.role === 'admin' ? '管理员' : '审批人', approver_role: me?.role || 'admin', status: '待审批',
    });
    return inst;
  },
  // 待办/已办/我发起的：调用后端聚合接口
  async todo(params: any = {}) {
    const status = params?.status || 'pending';
    const res = await apiGet<any>('/approvals/todo', { status });
    return res;
  },
  // 按业务单据取实例 + 步骤（instance.status / steps[].status 均为中文，供页面 SERVER_STEP_STATUS 映射）
  async getByBusiness(businessType: string, businessId: number | string) {
    const zh = APR_TYPE_TO_ZH[businessType] || businessType;
    const r = await _approvalInstancesApi.list({ pageSize: 500 });
    const it = aprList(r).filter((x: any) => x.business_type === zh && x.business_no === String(businessId))
      .sort((a: any, b: any) => (b.apply_time || 0) - (a.apply_time || 0))[0];
    if (!it) return { code: 0, data: { instance: null, steps: [] } };
    const sr = await _approvalStepRecordsApi.list({ pageSize: 500 });
    const ss = aprList(sr).filter((x: any) => x.instance_no === it.instance_no)
      .sort((a: any, b: any) => a.step_order - b.step_order);
    const instance = { ...it, id: aprId(it) };
    const steps = ss.map((x: any, idx: number) => ({
      id: aprId(x) ?? idx, step_name: x.step_name, approver_name: x.approver,
      status: x.status, approved_at: aprISO(x.approve_time), comment: x.comment,
    }));
    return { code: 0, data: { instance, steps } };
  },
  async getSteps(instanceId: number | string) {
    const it = (await _approvalInstancesApi.get(instanceId))?.data;
    if (!it) return { code: 0, data: [] };
    const sr = await _approvalStepRecordsApi.list({ pageSize: 500 });
    const ss = aprList(sr).filter((x: any) => x.instance_no === it.instance_no)
      .sort((a: any, b: any) => a.step_order - b.step_order);
    return { code: 0, data: ss };
  },
  approve(instanceId: number | string, comment?: string) { return aprAdvance(instanceId, true, comment); },
  reject(instanceId: number | string, comment?: string) { return aprAdvance(instanceId, false, comment); },
  // 按业务类型集合 + 业务键集合（记录 id / 单号）取实例与步骤，兼容前端/后端两种建实例来源
  async getBusinessFlow(businessTypes: string[], businessKeys: (number | string)[]) {
    const keys = businessKeys.filter((k) => k !== undefined && k !== null && k !== '').map(String);
    if (keys.length === 0) return { code: 0, data: { instance: null, steps: [] } };
    const r = await _approvalInstancesApi.list({ pageSize: 500 });
    const it = aprList(r)
      .filter((x: any) => businessTypes.includes(x.business_type) && keys.includes(String(x.business_no)))
      .sort((a: any, b: any) => (b.apply_time || 0) - (a.apply_time || 0))[0];
    if (!it) return { code: 0, data: { instance: null, steps: [] } };
    const sr = await _approvalStepRecordsApi.list({ pageSize: 500 });
    const ss = aprList(sr).filter((x: any) => x.instance_no === it.instance_no)
      .sort((a: any, b: any) => a.step_order - b.step_order);
    const instance = { ...it, id: aprId(it) };
    const steps = ss.map((x: any, idx: number) => ({
      id: aprId(x) ?? idx, step_name: x.step_name, approver_name: x.approver,
      status: x.status, approved_at: aprISO(x.approve_time), comment: x.comment,
    }));
    return { code: 0, data: { instance, steps } };
  },
};

// 解析审批实例：优先按实例 id 直取；业务页传业务记录 id/单号时按 business_no 兜底
async function resolveApprovalInstance(id: number | string) {
  const direct = (await _approvalInstancesApi.get(id))?.data;
  if (direct) return direct;
  const key = String(id);
  const list = aprList(await _approvalInstancesApi.list({ pageSize: 500 }))
    .filter((x: any) => x.business_no === key)
    .sort((a: any, b: any) => (b.apply_time || 0) - (a.apply_time || 0));
  return list.find((x: any) => x.status === '待审批' || x.status === '审批中') || list[0] || null;
}

// 审批推进：走后端 /approvals/advance，由后端统一回写业务单据状态并落操作日志
async function aprAdvance(id: number | string, pass: boolean, comment?: string) {
  const inst = await resolveApprovalInstance(id);
  if (!inst) return { code: 404, message: '未找到对应审批实例' };
  const me = getCurrentUser();
  const res = await apiPost<any>('/approvals/advance', {
    instanceId: String(aprId(inst)),
    action: pass ? 'approve' : 'reject',
    comment: comment || '',
    operatorName: me?.name || '',
    operatorRole: me?.role || '',
  });
  if (res.code !== 0) return { code: res.code || 500, message: res.message || '审批推进失败' };
  return { code: 0, data: res.data };
}

// 用户
export const usersApi: any = _usersApi;

// 采购申请（状态中文直存，审批走后端审批模块触发业务回写）
export const purchaseReqsApi: any = {
  ..._purchaseReqsApi,
  submit(id: number | string) {
    return apiPost<any>('/approvals/submit', { recordId: String(id), businessType: '采购申请' });
  },
  approve(id: number | string, action: string, comment?: string) {
    return aprAdvance(id, action === 'approve', comment);
  },
  reject(id: number | string, comment?: string) {
    return aprAdvance(id, false, comment);
  },
  // 审批通过后生成采购订单，并把申请置为已采购
  async generateOrder(id: number | string) {
    const g = await _purchaseReqsApi.get(id);
    const rq = g.data || {};
    await _purchaseOrdersApi.create({
      order_no: `PO${Date.now().toString().slice(-6)}`,
      related_req: rq.req_no || '',
      supplier: '',
      amount: Number(rq.total_amount) || 0,
      status: 'pending',
      remark: rq.reason || '',
    });
    const u = await _purchaseReqsApi.update(id, { generated_order: 1, status: '已采购' });
    return { code: 0, message: 'ok', data: u.data };
  },
};

// 员工档案（人资管理）
export const employeesApi: any = _employeesApi;

// 固定资产
export const assetsApi: any = _assetsApi;

// 库存物资
export const inventoriesApi: any = _inventoriesApi;

// 入库记录
export const stockInsApi: any = _stockInsApi;

// 领用记录
export const requisitionsApi: any = {
  ..._requisitionsApi,
  confirm(id: number | string, action: string) {
    return _requisitionsApi.update(id, { status: action === 'reject' ? 'rejected' : 'confirmed' });
  },
};

// 归还记录
export const returnsApi: any = {
  ..._returnsApi,
  confirm(id: number | string) {
    return _returnsApi.update(id, { status: 'confirmed' });
  },
};

// 盘点记录
export const inventoryChecksApi: any = {
  ..._inventoryChecksApi,
  complete(id: number | string, remark?: string) {
    return _inventoryChecksApi.update(id, { status: 'completed', remark: remark || '盘点结束，账实核对完成' });
  },
};

// ==================== 视频业务 ====================
export const videoOrdersApi: any = {
  ..._videoOrdersApi,
  async batchStatus(ids: Array<number | string>, status: string) {
    await Promise.all(ids.map((id) => _videoOrdersApi.update(id, { status })));
    return { code: 0, message: 'ok', data: null };
  },
};

export const videoProjectsApi: any = _videoProjectsApi;

export const actorsApi: any = _actorsApi;

export const outsourcingsApi: any = _outsourcingsApi;

export const videoCommissionsApi: any = _videoCommissionsApi;

export const shootCostsApi: any = _shootCostsApi;

export const venueCostsApi: any = _venueCostsApi;

export const samplesApi: any = {
  ..._samplesApi,
  flow(id: number | string, action: 'send' | 'apply_return' | 'return') {
    const map = { send: 'sent', apply_return: 'pending_return', return: 'returned' } as const;
    return _samplesApi.update(id, { mail_status: map[action] });
  },
};

// ==================== 合同模板 / 合同费用 ====================
export const contractTemplatesApi: any = _contractTemplatesApi;

export const contractCostsApi: any = _contractCostsApi;

export const contractsApi: any = {
  ..._contractsApi,
  // 合同状态中文直存：通过→已生效，驳回→回到待审批
  approve(id: number | string, action: string) {
    return _contractsApi.update(id, { status: action === 'approve' ? '已生效' : '待审批' });
  },
  remind(id: number | string) {
    return _contractsApi.update(id, { last_remind_at: new Date().toISOString().slice(0, 10) });
  },
  // 申请提成：写入合同提成表并标记合同含提成
  async applyCommission(id: number | string, payload: { rate: number; remark?: string }) {
    const g = await _contractsApi.get(id);
    const c = g.data || {};
    const rate = Number(payload.rate) || 0;
    await _contractCommissionsApi.create({
      contract_no: c.contract_no || '',
      contract_name: c.name || '',
      owner: c.owner || '',
      rate,
      amount: Number(((Number(c.amount) || 0) * rate / 100).toFixed(2)),
      remark: payload.remark || '',
      status: '待发放',
    });
    await _contractsApi.update(id, { has_commission: 1 });
    return { code: 0, message: 'ok', data: null };
  },
};

export const contractCommissionsApi: any = _contractCommissionsApi;

export const collabTasksApi: any = {
  ..._collabTasksApi,
  // 任务评论走「视频-任务评论」子表
  async comments(taskId: number | string) {
    const r = await _collabTaskCommentsApi.list({ task_id: taskId, pageSize: 500 });
    return { code: 0, message: 'ok', data: (r.data && r.data.list) || [] };
  },
  async addComment(taskId: number | string, content: string, author?: string) {
    const r = await _collabTaskCommentsApi.create({ task_id: taskId, author: author || '未知用户', content });
    return { code: 0, message: 'ok', data: r.data };
  },
};

// ==================== 采购订单 / 采购详情 ====================
export const purchaseOrdersApi: any = _purchaseOrdersApi;

export const purchaseDetailsApi: any = {
  ..._purchaseDetailsApi,
  // 确认收货（入库单由页面联动 stockInsApi.create 生成）
  receive(id: number | string) {
    return _purchaseDetailsApi.update(id, { receive_status: 'received' });
  },
};

// ==================== 人资 ====================
export const resumesApi: any = _resumesApi;

export const invitationsApi: any = {
  ..._invitationsApi,
  // 邀约确认：更新邀约状态（code 由实体工厂转中文写入多维表）
  confirm(id: number | string, status: string, remark?: string) {
    return _invitationsApi.update(id, { status, ...(remark ? { remark } : {}) });
  },
};

export const interviewsApi: any = {
  ..._interviewsApi,
  // 提交面试评价
  evaluate(id: number | string, data: any) {
    return _interviewsApi.update(id, {
      score: Number(data.score) || 0,
      evaluation: data.evaluation || '',
      suggestion: data.suggestion || '',
      status: data.status || 'passed',
    });
  },
  // 安排下一轮：基于当前记录复制一条下一轮面试
  async arrangeNext(id: number | string, data: any) {
    const cur = await _interviewsApi.get(id);
    const current = cur.data || {};
    const roundMap: Record<string, string> = { '初面': '复试', '复试': '终面' };
    const nextRound = roundMap[current.round] || '复试';
    return _interviewsApi.create({
      candidate_name: current.candidate_name,
      position: current.position,
      round: nextRound,
      interviewer_name: data.interviewer_name || '',
      interview_time: data.interview_time || '',
      interview_mode: data.interview_mode || 'onsite',
      status: 'pending',
      score: 0,
      evaluation: '',
      suggestion: '',
    });
  },
};

export const checkinsApi: any = {
  ..._checkinsApi,
  // 现场签到：按预约时间判定是否迟到
  async register(id: number | string, data: any) {
    const cur = await _checkinsApi.get(id);
    const item = cur.data || {};
    const now = new Date();
    const appt = item.appointment_time ? new Date(String(item.appointment_time).replace(' ', 'T')).getTime() : 0;
    const isLate = appt && now.getTime() - appt > 10 * 60 * 1000;
    const pad = (n: number) => String(n).padStart(2, '0');
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    return _checkinsApi.update(id, {
      checkin_time: data.checkin_time || nowStr,
      checkin_method: data.checkin_method || '前台扫码',
      status: isLate ? 'late' : 'checked_in',
      ...(data.remark ? { remark: data.remark } : {}),
    });
  },
  markAbsent(id: number | string, remark?: string) {
    return _checkinsApi.update(id, { status: 'absent', remark: remark || '未按时到场' });
  },
  // 当日签到统计（前端聚合）
  async stats(date?: string) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const target = date || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const res = await _checkinsApi.list({ pageSize: 500 });
    const all = (res.data?.list || []) as any[];
    const list = all.filter((c) => String(c.appointment_time || '').slice(0, 10) === target);
    const total = list.length;
    const checked = list.filter((c) => c.status === 'checked_in').length;
    const absent = list.filter((c) => c.status === 'absent').length;
    const late = list.filter((c) => c.status === 'late').length;
    const pending = list.filter((c) => c.status === 'pending').length;
    return { code: 0, message: 'ok', data: { date: target, total, checked, absent, late, pending } };
  },
};

export const performancesApi: any = _performancesApi;

export const salariesApi: any = _salariesApi;

export const attendancesApi: any = _attendancesApi;

export const recruitPlansApi: any = {
  ..._recruitPlansApi,
  // 招聘计划统计（前端聚合）
  async stats() {
    const res = await _recruitPlansApi.list({ pageSize: 500 });
    const list = (res.data?.list || []) as any[];
    const total = list.length;
    const recruiting = list.filter((r) => r.status === 'recruiting').length;
    const completed = list.filter((r) => r.status === 'completed').length;
    const totalHeadcount = list.reduce((s, r) => s + (Number(r.headcount) || 0), 0);
    const totalOnboarded = list.reduce((s, r) => s + (Number(r.onboarded ?? r.hired_count) || 0), 0);
    const completionRate = totalHeadcount > 0 ? +(totalOnboarded / totalHeadcount * 100).toFixed(1) : 0;
    return { code: 0, message: 'ok', data: { total, recruiting, completed, completionRate, totalHeadcount, totalOnboarded, thisMonthOnboard: totalOnboarded } };
  },
};

// ==================== 系统管理 ====================
export const customerAccountsApi: any = _customerAccountsApi;

export const operationLogsApi: any = _operationLogsApi;

export const loginLogsApi: any = _loginLogsApi;

// ==================== 任务中心 ====================
export const importTasksApi: any = _importTasksApi;

export const exportTasksApi: any = _exportTasksApi;

// ==================== 业务支持 ====================
export const industryRoisApi: any = _industryRoisApi;

export const competitorsApi: any = _competitorsApi;

export const materialsApi: any = {
  ..._materialsApi,
  create(data: Record<string, any>) {
    return _materialsApi.create(normMaterial(data));
  },
  update(id: number | string, data: Record<string, any>) {
    return _materialsApi.update(id, normMaterial(data));
  },
};
function normMaterial(data: Record<string, any>): Record<string, any> {
  const b = { ...data };
  if ('conversion_rate' in b && !('conversion' in b)) {
    b.conversion = b.conversion_rate;
    delete b.conversion_rate;
  }
  return b;
}

// ==================== 系统管理：组织架构 / 角色权限 / 系统设置 ====================
export const departmentsApi: any = _departmentsApi;

export const rolesApi: any = {
  ..._rolesApi,
  // 菜单/字段权限为数组/对象，落多维表文本前序列化为 JSON 字符串（读取时页面自行 JSON.parse）
  create(data: any) {
    return _rolesApi.create(serializeRole(data));
  },
  update(id: number | string, data: any) {
    return _rolesApi.update(id, serializeRole(data));
  },
};
function serializeRole(data: Record<string, any>): Record<string, any> {
  const body: Record<string, any> = { ...data };
  if (Array.isArray(body.menu_ids)) body.menu_ids = JSON.stringify(body.menu_ids);
  if (body.field_permissions && typeof body.field_permissions === 'object') {
    body.field_permissions = JSON.stringify(body.field_permissions);
  }
  return body;
}

export const settingsApi: any = {
  // 读取某分组，返回 { 设置键: 设置值 }
  async getGroup(group: string) {
    const res = await _systemSettingsApi.list({ group_key: group, pageSize: 500 });
    if (res.code !== 0) return res;
    const map: Record<string, string> = {};
    ((res.data && res.data.list) || []).forEach((r: any) => {
      if (r.setting_key) map[r.setting_key] = r.setting_value ?? '';
    });
    return { code: 0, message: 'ok', data: map };
  },
  // 保存某分组：已存在更新、新键创建、分组内被移除的键删除
  async saveGroup(group: string, data: Record<string, unknown>) {
    const res = await _systemSettingsApi.list({ group_key: group, pageSize: 500 });
    const existing = ((res.data && res.data.list) || []) as any[];
    const byKey: Record<string, any> = {};
    existing.forEach((r) => { byKey[r.setting_key] = r; });
    const tasks: Promise<any>[] = [];
    for (const [k, v] of Object.entries(data)) {
      const val = String(v ?? '');
      if (byKey[k]) tasks.push(_systemSettingsApi.update(byKey[k].id, { setting_value: val }));
      else tasks.push(_systemSettingsApi.create({ group_key: group, setting_key: k, setting_value: val }));
    }
    existing.forEach((r) => {
      if (!(r.setting_key in data)) tasks.push(_systemSettingsApi.remove(r.id));
    });
    await Promise.all(tasks);
    return { code: 0, message: 'ok', data: null };
  },
};

// ======== 提成规则 ========
export const commissionRulesApi: any = {
  ..._commissionRulesApi,
  all(params?: any) {
    return _commissionRulesApi.list(params || {});
  },
  // 依据规则阶梯 + 员工当月业绩即时试算（结果回写提成记录，不单独落表）
  async calculate(params: Record<string, any>) {
    const { biz_type, sales_name, settle_month, rule_id } = params;
    const g = await _commissionRulesApi.get(rule_id);
    const rule = g.data || {};
    let base = Number(params.base_amount) || 0;
    if (!base) {
      const isVideo = biz_type === 'video';
      const bizApi: any = isVideo ? _videoCommissionsApi : _adCommissionsApi;
      const nameField = isVideo ? 'employee_name' : 'sales_name';
      const perfField = isVideo ? 'performance' : 'performance_amount';
      const r = await bizApi.list({ [nameField]: sales_name, settle_month, pageSize: 1 });
      const row = r.data && r.data.list && r.data.list[0];
      base = Number(row && row[perfField]) || 0;
    }
    const tiers = parseTiersSafe(rule.tiers);
    const { commission, rate } = calcCommissionByRule(String(rule.calc_mode || '阶梯累进'), tiers, base);
    return { code: 0, message: 'ok', data: { base_amount: base, commission, rate, rule_name: rule.rule_name } };
  },
};

// ======== 付款计划 ========
export const paymentPlansApi: any = _paymentPlansApi;

// ======== 付款记录 ========
export const paymentRecordsApi: any = _paymentRecordsApi;

// ======== 审批节点级操作（会签/或签，落「审批-步骤」多维表）========
export const approvalStepsApi: any = {
  async stepApprove(instanceId: number | string, stepId: number | string, comment?: string) {
    await _approvalStepRecordsApi.update(stepId, { status: '已通过', comment: comment || '', approve_time: Date.now() });
    return aprAdvance(instanceId, true, comment);
  },
  async stepReject(instanceId: number | string, stepId: number | string, comment?: string) {
    await _approvalStepRecordsApi.update(stepId, { status: '已驳回', comment: comment || '', approve_time: Date.now() });
    return aprAdvance(instanceId, false, comment);
  },
};
