// EXPORTS: mockDb, mockApi, isMockMode, initMockMode

import { scopedStorage } from '@lark-apaas/client-toolkit';

/**
 * 前端 Mock 引擎
 *
 * 当后端 API 不可用时（如妙搭预览环境），自动降级到前端 mock。
 * 使用内存数据库 + localStorage 持久化，模拟真实 CRUD 行为。
 */

// ========== Mock 状态 ==========
let _mockMode = false;
export function isMockMode(): boolean {
  return _mockMode;
}
export function setMockMode(v: boolean): void {
  _mockMode = v;
}

// ========== 通用工具 ==========
function generateId(prefix: string, existing: number): string {
  return `${prefix}${String(existing + 1).padStart(4, '0')}`;
}

function parseQueryParams(params: Record<string, any>) {
  const page = Number(params.page) || 1;
  const pageSize = Number(params.page_size) || 10;
  const sortBy = params.sort_by || 'created_at';
  const sortOrder = (params.sort_order || 'desc').toLowerCase();
  const keyword = params.keyword || '';
  return { page, pageSize, sortBy, sortOrder, keyword };
}

function paginate<T>(list: T[], page: number, pageSize: number) {
  const total = list.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = list.slice(start, end);
  return { list: items, total, page, pageSize };
}

function sortList<T>(list: T[], sortBy: string, sortOrder: string): T[] {
  return [...list].sort((a: any, b: any) => {
    const av = a[sortBy];
    const bv = b[sortBy];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortOrder === 'asc' ? av - bv : bv - av;
    }
    const as = String(av);
    const bs = String(bv);
    return sortOrder === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
  });
}

function filterByFields<T>(list: T[], keyword: string, fields: string[]): T[] {
  if (!keyword) return list;
  const kw = keyword.toLowerCase();
  return list.filter((item: any) =>
    fields.some(f => {
      const v = item[f];
      return v != null && String(v).toLowerCase().includes(kw);
    })
  );
}

function filterByExact<T>(list: T[], params: Record<string, any>, fields: string[]): T[] {
  return list.filter((item: any) =>
    fields.every(f => {
      const pv = params[f];
      if (pv === undefined || pv === '' || pv === null || pv === 'all') return true;
      return String(item[f]) === String(pv);
    })
  );
}

// ========== 内存数据库 ==========
interface MockDb {
  users: any[];
  customers: any[];
  publicLeads: any[];
  leads: any[];
  accountApplications: any[];
  receipts: any[];
  transactions: any[];
  recharges: any[];
  refunds: any[];
  consumptions: any[];
  advances: any[];
  invoices: any[];
  portAccounts: any[];
  banks: any[];
  costs: any[];
  incomes: any[];
  expenses: any[];
  coinRefunds: any[];
  rebates: any[];
  deductions: any[];
  incentives: any[];
  dailyExpenses: any[];
  deposits: any[];
  filings: any[];
  transfers: any[];
  adCommissions: any[];
  contracts: any[];
  contractTemplates: any[];
  contractFees: any[];
  employees: any[];
  resumes: any[];
  performances: any[];
  salaries: any[];
  attendances: any[];
  invitations: any[];
  interviews: any[];
  checkins: any[];
  recruitPlans: any[];
  purchaseReqs: any[];
  purchaseOrders: any[];
  purchaseDetails: any[];
  assets: any[];
  inventories: any[];
  stockIns: any[];
  requisitions: any[];
  returns: any[];
  inventoryChecks: any[];
  videoOrders: any[];
  videoProjects: any[];
  actors: any[];
  outsourcings: any[];
  videoCommissions: any[];
  shootCosts: any[];
  locationCosts: any[];
  samples: any[];
  batchImports: any[];
  batchExports: any[];
  todos: any[];
  approvalInstances: any[];
  approvalSteps: any[];
  collabTasks: any[];
  customerAccounts: any[];
  operationLogs: any[];
  loginLogs: any[];
  industryRois: any[];
  competitors: any[];
  materials: any[];
  departments: any[];
  roles: any[];
  invalidLeads: any[];
  customerContacts: any[];
  customerFollowUps: any[];
  commissionRules: any[];
  paymentPlans: any[];
  paymentRecords: any[];
  settings: Record<string, any>;
}

const db: MockDb = {
  users: [],
  customers: [],
  publicLeads: [],
  leads: [],
  accountApplications: [],
  receipts: [],
  transactions: [],
  recharges: [],
  refunds: [],
  consumptions: [],
  advances: [],
  invoices: [],
  portAccounts: [],
  banks: [],
  costs: [],
  incomes: [],
  expenses: [],
  coinRefunds: [],
  rebates: [],
  deductions: [],
  incentives: [],
  dailyExpenses: [],
  deposits: [],
  filings: [],
  transfers: [],
  adCommissions: [],
  contracts: [],
  contractTemplates: [],
  contractFees: [],
  employees: [],
  resumes: [],
  performances: [],
  salaries: [],
  attendances: [],
  invitations: [],
  interviews: [],
  checkins: [],
  recruitPlans: [],
  purchaseReqs: [],
  purchaseOrders: [],
  purchaseDetails: [],
  assets: [],
  inventories: [],
  stockIns: [],
  requisitions: [],
  returns: [],
  inventoryChecks: [],
  videoOrders: [],
  videoProjects: [],
  actors: [],
  outsourcings: [],
  videoCommissions: [],
  shootCosts: [],
  locationCosts: [],
  samples: [],
  batchImports: [],
  batchExports: [],
  todos: [],
  approvalInstances: [],
  approvalSteps: [],
  collabTasks: [],
  customerAccounts: [],
  operationLogs: [],
  loginLogs: [],
  industryRois: [],
  competitors: [],
  materials: [],
  departments: [],
  roles: [],
  invalidLeads: [],
  customerContacts: [],
  customerFollowUps: [],
  commissionRules: [],
  paymentPlans: [],
  paymentRecords: [],
  settings: {},
};

export const mockDb = db;

// ========== 种子数据 ==========
function seed() {
  // 用户
  db.users = [
    { id: 1, username: 'admin', password: 'admin123', name: '系统管理员', phone: '13800000001', email: 'admin@mutang.com', department: '技术部', position: '系统管理员', role: 'admin', data_scope: 'all', avatar: '' },
    { id: 2, username: 'sales1', password: '123456', name: '张伟', phone: '13800000002', email: 'zhangwei@mutang.com', department: '商务一部', position: '高级商务', role: 'sales', data_scope: 'self', avatar: '' },
    { id: 3, username: 'sales2', password: '123456', name: '李娜', phone: '13800000003', email: 'lina@mutang.com', department: '商务一部', position: '商务经理', role: 'sales', data_scope: 'self', avatar: '' },
    { id: 4, username: 'sales3', password: '123456', name: '王强', phone: '13800000004', email: 'wangqiang@mutang.com', department: '商务二部', position: '商务', role: 'sales', data_scope: 'self', avatar: '' },
    { id: 5, username: 'finance1', password: '123456', name: '赵敏', phone: '13800000005', email: 'zhaomin@mutang.com', department: '财务部', position: '财务主管', role: 'finance', data_scope: 'all', avatar: '' },
    { id: 6, username: 'hr1', password: '123456', name: '陈静', phone: '13800000006', email: 'chenjing@mutang.com', department: '人事部', position: 'HR经理', role: 'hr', data_scope: 'all', avatar: '' },
    { id: 7, username: 'manager1', password: '123456', name: '李娜', phone: '13800000003', email: 'lina@mutang.com', department: '商务一部', position: '商务经理', role: 'manager', data_scope: 'dept_and_children', avatar: '' },
  ];

  // 端口账户
  db.portAccounts = [
    { id: 1, port_name: '巨量千川', port_type: '内部端口', balance: 5280000, bonus_balance: 356000, total_consume: 12850000, total_recharge: 18200000, status: 'active', updated_at: '2026-08-28 14:30:00' },
    { id: 2, port_name: '腾讯广告', port_type: '内部端口', balance: 3150000, bonus_balance: 180000, total_consume: 8920000, total_recharge: 12500000, status: 'active', updated_at: '2026-08-28 14:30:00' },
    { id: 3, port_name: '磁力引擎', port_type: '外部端口', balance: 1680000, bonus_balance: 0, total_consume: 3560000, total_recharge: 5240000, status: 'active', updated_at: '2026-08-28 14:30:00' },
    { id: 4, port_name: '小红书商业', port_type: '外部端口', balance: 920000, bonus_balance: 0, total_consume: 1850000, total_recharge: 2770000, status: 'active', updated_at: '2026-08-28 14:30:00' },
    { id: 5, port_name: '百度营销', port_type: '集团', balance: 2450000, bonus_balance: 120000, total_consume: 6780000, total_recharge: 9350000, status: 'active', updated_at: '2026-08-28 14:30:00' },
  ];

  // 银行账户
  db.banks = [
    { id: 1, bank_name: '中国工商银行', account_name: '郑州牧唐数智科技有限公司', account_no: '6222 **** **** 1234', account_type: '基本户', balance: 8560000, status: 'active', updated_at: '2026-08-28 12:00:00' },
    { id: 2, bank_name: '中国建设银行', account_name: '郑州牧唐数智科技有限公司', account_no: '6217 **** **** 5678', account_type: '一般户', balance: 3240000, status: 'active', updated_at: '2026-08-28 12:00:00' },
    { id: 3, bank_name: '招商银行', account_name: '郑州牧唐数智科技有限公司', account_no: '6225 **** **** 9012', account_type: '一般户', balance: 1680000, status: 'active', updated_at: '2026-08-28 12:00:00' },
  ];

  // 客户
  const customerNames = [
    '郑州优选电子科技有限公司', '河南智云教育科技有限公司', '郑州畅游网络科技有限公司',
    '河南金穗金融服务有限公司', '郑州鲜达生活服务有限公司', '河南雅居家居有限公司',
    '郑州美妍美妆有限公司', '河南鼎峰商贸有限公司', '郑州速达物流有限公司',
    '河南启航教育咨询有限公司', '郑州云帆科技有限公司', '河南优品电子商务有限公司',
    '郑州盛世文化传媒有限公司', '河南恒信金融外包有限公司', '郑州和悦本地生活服务有限公司',
  ];
  const industries = ['电商', '教育', '游戏', '金融', '本地生活', '家居', '美妆'];
  const levels = ['A', 'B', 'C', 'D'];
  const statuses = ['active', 'inactive', 'pending'];
  const salesNames = ['张伟', '李娜', '王强', '赵敏'];
  const depts = ['商务一部', '商务一部', '商务二部', '财务部'];

  for (let i = 0; i < 15; i++) {
    const level = levels[i % levels.length];
    const ind = industries[i % industries.length];
    const ownerIdx = 1 + (i % 4);
    db.customers.push({
      id: i + 1,
      customer_name: customerNames[i],
      group_name: i % 3 === 0 ? customerNames[i].replace('有限公司', '集团') : '',
      primary_industry: ind,
      secondary_industry: `${ind}服务`,
      level,
      owner_id: ownerIdx,
      owner_name: salesNames[ownerIdx - 1],
      department: depts[ownerIdx - 1],
      status: statuses[i % 3],
      contact_name: `${['张', '李', '王', '赵', '陈', '刘', '杨'][i % 7]}${['总', '经理', '主管', '总监'][i % 4]}`,
      contact_phone: `138${String(10000000 + i * 137).slice(0, 8)}`,
      contact_email: `contact${i + 1}@example.com`,
      address: `郑州市${['金水区', '二七区', '中原区', '高新区', '管城回族区'][i % 5]}${['花园路', '文化路', '科学大道', '航海路', '嵩山路'][i % 5]}${i + 1}号`,
      creator_id: 1,
      created_at: `2026-0${(i % 8) + 1}-${String((i % 27) + 1).padStart(2, '0')} 10:${String(i * 7 % 60).padStart(2, '0')}:00`,
    });
  }

  // 公海客资
  for (let i = 0; i < 20; i++) {
    db.publicLeads.push({
      id: i + 1,
      lead_id: `GH${String(i + 1).padStart(5, '0')}`,
      entity_name: `河南${['新锐', '创新', '卓越', '鼎盛', '华信', '恒达', '众合', '天成', '新世纪', '华泰'][i % 10]}${['科技', '商贸', '教育', '传媒', '金融'][i % 5]}有限公司`,
      lead_level: levels[i % 4],
      primary_industry: industries[i % 7],
      secondary_industry: `${industries[i % 7]}营销`,
      assign_status: i % 3 === 0 ? 'pending' : 'assigned',
      assigned_to: i % 3 !== 0 ? 1 + (i % 4) : null,
      assigned_name: i % 3 !== 0 ? salesNames[i % 4] : '',
      entered_at: `2026-0${((i % 7) + 1)}-${String((i % 28) + 1).padStart(2, '0')} 09:00:00`,
      creator_id: 1,
      creator_name: '系统管理员',
      created_at: `2026-0${(i % 7) + 1}-${String((i % 28) + 1).padStart(2, '0')} 09:00:00`,
      contact_name: `联系人${i + 1}`,
      contact_phone: `139${String(20000000 + i * 211).slice(0, 8)}`,
      source: ['官网咨询', '转介绍', '陌拜电话', '展会', '线上广告', '朋友推荐'][i % 6],
    });
  }

  // 线索
  for (let i = 0; i < 18; i++) {
    const status = ['pending', 'following', 'converted', 'lost'][i % 4];
    db.leads.push({
      id: i + 1,
      lead_id: `XS${String(i + 1).padStart(5, '0')}`,
      lead_name: `${['品牌推广', '新品上线', '节日营销', '新品试用', '效果投放', '品牌宣传'][i % 6]}线索-${i + 1}`,
      company_name: `郑州${['启航', '盛世', '鼎盛', '华信', '恒达'][i % 5]}${['科技', '商贸', '文化'][i % 3]}公司`,
      source: ['官网', '转介绍', '陌拜', '展会', '线上广告'][i % 5],
      status,
      owner_id: 1 + (i % 4),
      owner_name: salesNames[i % 4],
      last_follow_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')} ${String(9 + (i % 10)).padStart(2, '0')}:30:00`,
      created_at: `2026-07-${String((i % 27) + 1).padStart(2, '0')} 14:00:00`,
      contact_name: `联系人${i + 1}`,
      contact_phone: `137${String(30000000 + i * 313).slice(0, 8)}`,
    });
  }

  // 开户申请（字段/状态与页面及真实后端对齐）
  const portNames = ['巨量千川', '腾讯广告', '磁力引擎', '小红书商业'];
  const appStatuses = ['pending_approval', 'approving', 'approved', 'rejected', 'opened'];
  for (let i = 0; i < 16; i++) {
    const status = appStatuses[i % 5];
    const createdAt = `2026-08-${String((i % 27) + 1).padStart(2, '0')} 11:20:00`;
    db.accountApplications.push({
      id: i + 1,
      apply_no: `KH${String(i + 1).padStart(6, '0')}`,
      group_name: customerNames[i % 15],
      entity_name: customerNames[i % 15],
      port: portNames[i % 4],
      industry: industries[i % 7],
      apply_amount: (i + 1) * 50000 + (i % 3) * 10000,
      status,
      applicant_id: 1 + (i % 4),
      applicant_name: salesNames[i % 4],
      created_at: createdAt,
      updated_at: createdAt,
      contact_name: `联系人${i + 1}`,
      contact_phone: `136${String(40000000 + i * 419).slice(0, 8)}`,
    });
  }

  // 收款记录
  const payMethods = ['银行转账', '支付宝', '微信'];
  for (let i = 0; i < 18; i++) {
    const status = ['pending', 'confirmed', 'reconciled'][i % 3];
    db.receipts.push({
      id: i + 1,
      payment_no: `SK${String(i + 1).padStart(6, '0')}`,
      customer_id: 1 + (i % 15),
      customer_name: customerNames[i % 15],
      amount: (i + 1) * 30000 + (i % 5) * 5000,
      pay_method: payMethods[i % 3],
      bank_account: db.banks[i % 3].bank_name,
      status,
      operator_id: 5,
      operator_name: '赵敏',
      received_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')} 15:${String(i * 17 % 60).padStart(2, '0')}:00`,
      remark: i % 4 === 0 ? '预付款' : '',
    });
  }

  // 客户明细（流水）
  const txTypes = ['recharge', 'consume', 'refund', 'rebate', 'deduct'];
  for (let i = 0; i < 25; i++) {
    const type = txTypes[i % 5];
    const isIncome = type === 'recharge' || type === 'rebate';
    const isExpense = type === 'consume' || type === 'refund' || type === 'deduct';
    const amount = (i + 1) * 8000 + (i % 7) * 3000;
    db.transactions.push({
      id: i + 1,
      transaction_no: `LX${String(i + 1).padStart(8, '0')}`,
      customer_id: 1 + (i % 15),
      customer_name: customerNames[i % 15],
      entity_name: customerNames[i % 15],
      transaction_type: type,
      income_amount: isIncome ? amount : 0,
      expense_amount: isExpense ? amount : 0,
      balance: 500000 + i * 12000,
      transaction_time: `2026-08-${String((i % 27) + 1).padStart(2, '0')} ${String(9 + (i % 12)).padStart(2, '0')}:${String(i * 13 % 60).padStart(2, '0')}:00`,
      remark: `${type}交易`,
      port: portNames[i % 4],
    });
  }

  // 充值管理
  for (let i = 0; i < 16; i++) {
    const status = ['pending', 'arrived', 'failed'][i % 3];
    const amount = (i + 1) * 50000;
    db.recharges.push({
      id: i + 1,
      recharge_no: `CZ${String(i + 1).padStart(6, '0')}`,
      customer_id: 1 + (i % 15),
      customer_name: customerNames[i % 15],
      entity_name: customerNames[i % 15],
      port: portNames[i % 4],
      recharge_amount: amount,
      bonus_amount: Math.floor(amount * 0.05),
      arrived_amount: status === 'arrived' ? Math.floor(amount * 1.05) : 0,
      status,
      recharged_at: status === 'arrived' ? `2026-08-${String((i % 27) + 1).padStart(2, '0')} 10:00:00` : '',
      operator_name: '赵敏',
      created_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')} 09:00:00`,
    });
  }

  // 退款管理
  for (let i = 0; i < 12; i++) {
    const status = ['pending_approval', 'approving', 'refunded', 'rejected'][i % 4];
    db.refunds.push({
      id: i + 1,
      refund_no: `TK${String(i + 1).padStart(6, '0')}`,
      customer_id: 1 + (i % 15),
      customer_name: customerNames[i % 15],
      amount: (i + 1) * 20000,
      reason: ['账户停用', '投放结束', '业务调整', '其他'][i % 4],
      refund_method: payMethods[i % 3],
      status,
      applicant_id: 1 + (i % 4),
      applicant_name: salesNames[i % 4],
      created_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')} 16:00:00`,
    });
  }

  // 消耗管理
  for (let i = 0; i < 20; i++) {
    const amount = (i + 1) * 15000;
    db.consumptions.push({
      id: i + 1,
      consumption_no: `XH${String(i + 1).padStart(8, '0')}`,
      customer_id: 1 + (i % 15),
      customer_name: customerNames[i % 15],
      port: portNames[i % 4],
      department: depts[i % 2],
      owner_id: 1 + (i % 4),
      sales_name: salesNames[i % 4],
      consume_amount: amount,
      bonus_consume: Math.floor(amount * 0.1),
      cash_consume: Math.floor(amount * 0.9),
      consume_date: `2026-08-${String((i % 27) + 1).padStart(2, '0')}`,
      created_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')} 09:00:00`,
    });
  }

  // 垫款管理
  for (let i = 0; i < 10; i++) {
    const status = ['unreturned', 'partial', 'returned'][i % 3];
    db.advances.push({
      id: i + 1,
      advance_no: `DK${String(i + 1).padStart(6, '0')}`,
      customer_id: 1 + (i % 15),
      customer_name: customerNames[i % 15],
      amount: (i + 1) * 40000,
      reason: ['媒体垫款', '急单垫付', '客户账期'][i % 3],
      advance_date: `2026-07-${String((i % 27) + 1).padStart(2, '0')}`,
      expected_return_date: `2026-09-${String((i % 27) + 1).padStart(2, '0')}`,
      status,
      owner_name: salesNames[i % 4],
      returned_amount: status === 'returned' ? (i + 1) * 40000 : status === 'partial' ? (i + 1) * 20000 : 0,
      created_at: `2026-07-${String((i % 27) + 1).padStart(2, '0')} 10:00:00`,
    });
  }

  // 发票管理
  for (let i = 0; i < 14; i++) {
    const status = ['pending', 'issued', 'shipped', 'received'][i % 4];
    const isSpecial = i % 2 === 0;
    const amount = (i + 1) * 25000;
    db.invoices.push({
      id: i + 1,
      invoice_no: `FP${String(i + 1).padStart(6, '0')}`,
      customer_id: 1 + (i % 15),
      customer_name: customerNames[i % 15],
      invoice_type: isSpecial ? '增值税专用发票' : '增值税普通发票',
      amount,
      tax_rate: 0.06,
      tax_amount: Math.floor(amount * 0.06),
      title: customerNames[i % 15],
      tax_no: `914101${String(100000 + i * 137).slice(0, 10)}`,
      status,
      invoice_date: `2026-08-${String((i % 27) + 1).padStart(2, '0')}`,
      created_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')} 11:00:00`,
      mail_no: status === 'shipped' || status === 'received' ? `SF${String(1000000000 + i * 257).slice(0, 12)}` : '',
    });
  }

  // 成本管理
  const costTypes = ['媒体成本', '人力成本', '外包成本', '其他'];
  for (let i = 0; i < 12; i++) {
    db.costs.push({
      id: i + 1,
      cost_id: `CB${String(i + 1).padStart(6, '0')}`,
      cost_type: costTypes[i % 4],
      related_name: i % 2 === 0 ? customerNames[i % 15] : '',
      amount: (i + 1) * 18000,
      department: depts[i % 3],
      occur_date: `2026-08-${String((i % 27) + 1).padStart(2, '0')}`,
      remark: `${costTypes[i % 4]}支出`,
      created_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')} 09:00:00`,
    });
  }

  // 收入管理
  const incomeTypes = ['广告收入', '视频收入', '服务收入'];
  for (let i = 0; i < 12; i++) {
    db.incomes.push({
      id: i + 1,
      income_id: `SR${String(i + 1).padStart(6, '0')}`,
      income_type: incomeTypes[i % 3],
      customer_name: customerNames[i % 15],
      amount: (i + 1) * 35000,
      receive_status: i % 3 === 0 ? 'unreceived' : 'received',
      income_date: `2026-08-${String((i % 27) + 1).padStart(2, '0')}`,
      remark: `${incomeTypes[i % 3]}`,
      created_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')} 10:00:00`,
    });
  }

  // 支出管理
  for (let i = 0; i < 12; i++) {
    const status = ['pending_approval', 'approving', 'approved', 'rejected'][i % 4];
    db.expenses.push({
      id: i + 1,
      expense_id: `ZC${String(i + 1).padStart(6, '0')}`,
      expense_type: ['办公费用', '差旅费用', '招待费用', '其他'][i % 4],
      reason: `${['办公采购', '出差', '客户招待', '团队建设'][i % 4]}支出`,
      amount: (i + 1) * 3000,
      applicant_name: salesNames[i % 4],
      approval_status: status,
      expense_date: `2026-08-${String((i % 27) + 1).padStart(2, '0')}`,
      created_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')} 09:30:00`,
    });
  }

  // 简单填充其他列表（保证菜单点击有数据）
  const simpleFill = <K extends keyof MockDb>(key: K, count: number, prefix: string, extra: Record<string, any> = {}) => {
    for (let i = 0; i < count; i++) {
      (db[key] as any[]).push({
        id: i + 1,
        ...extra,
        created_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')} 10:00:00`,
      });
    }
  };

  // 报备
  for (let i = 0; i < 12; i++) {
    db.filings.push({
      id: i + 1,
      filing_no: `BB${String(i + 1).padStart(6, '0')}`,
      group_name: customerNames[i % 15],
      subject_name: customerNames[i % 15],
      port: portNames[i % 4],
      filing_type: ['新户报备', '续投报备'][i % 2],
      amount: (i + 1) * 20000,
      status: ['pending', 'reporting', 'reported', 'rejected'][i % 4],
      filed_by: salesNames[i % 4],
      filed_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')}`,
    });
  }

  // 转户（字段/状态与页面及真实后端对齐）
  const transferStatuses = ['pending_approval', 'approving', 'approved', 'rejected'];
  for (let i = 0; i < 8; i++) {
    const createdAt = `2026-08-${String((i % 27) + 1).padStart(2, '0')} 10:00:00`;
    db.transfers.push({
      id: i + 1,
      transfer_no: `ZH${String(i + 1).padStart(6, '0')}`,
      group_name: customerNames[i % 15],
      entity_name: customerNames[i % 15],
      from_port: portNames[i % 4],
      to_port: portNames[(i + 1) % 4],
      transfer_amount: (i + 1) * 30000,
      status: transferStatuses[i % 4],
      applicant_id: 1 + (i % 4),
      applicant_name: salesNames[i % 4],
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  // 广告提成
  for (let i = 0; i < 10; i++) {
    db.adCommissions.push({
      id: i + 1,
      commission_id: `TC${String(i + 1).padStart(6, '0')}`,
      sales_name: salesNames[i % 4],
      department: depts[i % 4],
      performance_amount: (i + 1) * 100000,
      commission_rate: 0.03 + (i % 3) * 0.01,
      commission_amount: Math.floor((i + 1) * 100000 * (0.03 + (i % 3) * 0.01)),
      settle_month: `2026-0${(i % 7) + 1}`,
      status: ['pending', 'confirmed', 'paid'][i % 3],
      created_at: `2026-0${(i % 7) + 1}-20 10:30:00`,
    });
  }

  // 合同
  const contractTypes = ['广告投放', '视频制作', '服务合同'];
  for (let i = 0; i < 15; i++) {
    const status = ['pending', 'approving', 'active', 'expired', 'terminated'][i % 5];
    db.contracts.push({
      id: i + 1,
      contract_id: `HT${String(i + 1).padStart(6, '0')}`,
      contract_name: `${customerNames[i % 15]}${contractTypes[i % 3]}合同`,
      subject_name: customerNames[i % 15],
      contract_type: contractTypes[i % 3],
      amount: (i + 1) * 80000,
      sign_date: `2026-0${(i % 7) + 1}-15`,
      expire_date: `2027-0${(i % 7) + 1}-15`,
      status,
      owner_name: salesNames[i % 4],
      created_at: `2026-0${(i % 7) + 1}-01`,
    });
  }

  // 员工
  const empNames = ['张伟', '李娜', '王强', '赵敏', '陈静', '刘洋', '杨帆', '周婷', '吴磊', '郑华', '孙丽', '钱进'];
  const empDepts = ['商务一部', '商务二部', '财务部', '人事部', '技术部', '运营部'];
  const empPositions = ['商务', '商务经理', '财务主管', 'HR经理', '前端开发', '运营专员'];
  for (let i = 0; i < 12; i++) {
    db.employees.push({
      id: i + 1,
      emp_no: `MT${String(i + 1).padStart(5, '0')}`,
      name: empNames[i % 12],
      department: empDepts[i % 6],
      position: empPositions[i % 6],
      phone: `138${String(10000000 + i * 234).slice(0, 8)}`,
      hire_date: `202${4 + (i % 3)}-${String((i % 12) + 1).padStart(2, '0')}-15`,
      status: ['在职', '试用', '离职'][i % 3],
    });
  }

  // 简历
  for (let i = 0; i < 14; i++) {
    db.resumes.push({
      id: i + 1,
      resume_id: `JL${String(i + 1).padStart(6, '0')}`,
      name: `候选人${i + 1}`,
      position: ['商务专员', '财务助理', '前端开发', '运营专员', 'HR专员'][i % 5],
      education: ['本科', '硕士', '大专'][i % 3],
      years_exp: i % 8,
      source: ['BOSS直聘', '智联招聘', '前程无忧', '内部推荐'][i % 4],
      status: ['待筛选', '已邀约', '面试中', '已录用', '已拒绝'][i % 5],
    });
  }

  // 绩效
  for (let i = 0; i < 10; i++) {
    const total = 60 + (i * 5) % 40;
    db.performances.push({
      id: i + 1,
      emp_name: empNames[i % 12],
      department: empDepts[i % 6],
      period: '2026-Q2',
      mode: ['OKR', 'KPI'][i % 2],
      total_score: total,
      grade: total >= 90 ? 'S' : total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : 'D',
      status: ['草稿', '已提交', '已确认'][i % 3],
    });
  }

  // 工资
  for (let i = 0; i < 12; i++) {
    const base = 5000 + (i % 6) * 2000;
    const perf = 2000 + (i % 5) * 1000;
    const subsidy = 500 + (i % 3) * 200;
    const deduction = 300 + (i % 4) * 100;
    db.salaries.push({
      id: i + 1,
      salary_id: `GZ${String(i + 1).padStart(6, '0')}`,
      emp_name: empNames[i % 12],
      department: empDepts[i % 6],
      base_salary: base,
      performance_salary: perf,
      subsidy,
      deduction,
      net_salary: base + perf + subsidy - deduction,
      salary_month: '2026-07',
      status: '已发放',
    });
  }

  // 考勤
  for (let i = 0; i < 12; i++) {
    db.attendances.push({
      id: i + 1,
      emp_name: empNames[i % 12],
      department: empDepts[i % 6],
      work_days: 21 + (i % 3),
      late_times: i % 5,
      early_leave_times: i % 3,
      leave_days: Math.floor(i / 4),
      overtime_hours: (i % 10) * 3,
      attendance_month: '2026-07',
    });
  }

  // 采购申请（真实审批结构）
  const purchaseReasons = ['办公耗材采购', '设备更新采购', '团建物资采购', '节日福利采购', '会议室设备升级', 'IT设备采购', '员工生日礼品', '茶水间补给'];
  const pItems = [
    [{ name: 'A4复印纸', spec: '70g 500张/包', quantity: 20, unit_price: 25, subtotal: 500 }],
    [{ name: '笔记本电脑', spec: 'MacBook Pro 14寸', quantity: 2, unit_price: 15000, subtotal: 30000 }],
    [{ name: '团建零食大礼包', spec: '混合装', quantity: 30, unit_price: 80, subtotal: 2400 }],
    [{ name: '中秋月饼礼盒', spec: '臻品礼盒', quantity: 50, unit_price: 200, subtotal: 10000 }],
    [{ name: '投影仪', spec: '4K高清', quantity: 1, unit_price: 8000, subtotal: 8000 }],
    [{ name: '显示器', spec: '27寸 4K', quantity: 3, unit_price: 2800, subtotal: 8400 }],
    [{ name: '蓝牙耳机', spec: '降噪款', quantity: 5, unit_price: 600, subtotal: 3000 }],
    [{ name: '咖啡机', spec: '全自动', quantity: 1, unit_price: 4500, subtotal: 4500 }],
  ];
  const purchaseStatuses: any[] = ['pending_approval', 'approving', 'approved', 'rejected', 'approved', 'pending_approval', 'approving', 'approved', 'rejected', 'approved'];
  for (let i = 0; i < 10; i++) {
    const items = pItems[i % pItems.length];
    const total = items.reduce((sum: number, it: any) => sum + it.subtotal, 0);
    const status = purchaseStatuses[i];
    const createdAt = `2026-08-${String((i % 27) + 1).padStart(2, '0')} 10:00:00`;
    const req: any = {
      id: i + 1,
      req_no: `CG${String(i + 1).padStart(6, '0')}`,
      reason: purchaseReasons[i % purchaseReasons.length],
      applicant_id: 1 + (i % 4),
      applicant_name: empNames[i % 4],
      department: empDepts[i % 6],
      items,
      total_amount: total,
      expected_date: `2026-09-${String((i % 20) + 1).padStart(2, '0')}`,
      remark: i % 3 === 0 ? '请尽快审批，急用' : '',
      status,
      reject_step: status === 'rejected' ? (total >= 5000 ? 'gm' : 'manager') : undefined,
      reject_reason: status === 'rejected' ? (i % 2 === 0 ? '预算不足，暂不采购' : '规格不符，请重新申请') : undefined,
      generated_order: status === 'approved' && i % 3 === 0,
      created_at: createdAt,
      updated_at: createdAt,
    };
    db.purchaseReqs.push(req);
  }

  // 资产
  for (let i = 0; i < 12; i++) {
    db.assets.push({
      id: i + 1,
      asset_id: `ZC${String(i + 1).padStart(6, '0')}`,
      asset_name: ['笔记本电脑', '显示器', '办公椅', '打印机', '会议平板'][i % 5],
      category: ['电子设备', '办公家具', '其他'][i % 3],
      spec: ['MacBook Pro 14', 'Dell 27寸', '人体工学椅', 'HP激光', '65寸平板'][i % 5],
      user: empNames[i % 12],
      location: `${i % 3 + 1}楼办公区`,
      purchase_date: `202${4 + (i % 3)}-${String((i % 12) + 1).padStart(2, '0')}-01`,
      depreciation_status: i % 3 === 0 ? '正常' : i % 3 === 1 ? '折旧中' : '已折旧完毕',
    });
  }

  // 库存
  for (let i = 0; i < 12; i++) {
    db.inventories.push({
      id: i + 1,
      item_id: `KC${String(i + 1).padStart(5, '0')}`,
      item_name: ['A4打印纸', '中性笔', '文件夹', '订书机', '便签纸', '胶带'][i % 6],
      category: '办公用品',
      spec: ['500张/包', '12支/盒', '10个/包', '1个', '100张/本', '1卷'][i % 6],
      stock_qty: 20 + (i % 5) * 10,
      unit: ['包', '盒', '个', '本', '卷'][i % 5],
      warning_threshold: 10,
      status: i % 5 === 0 ? '库存预警' : '正常',
    });
  }

  // 待办任务
  const todoConfigs = [
    // 1-5: 待处理（pending）
    { type: 'account_open', title: '开户申请', amount: 600000, status: 'pending', applicant: salesNames[0], biz: '开户申请-星辰科技集团', mode: '逐级三级' },
    { type: 'purchase', title: '采购申请', amount: 8000, status: 'pending', applicant: salesNames[1], biz: '采购申请-办公设备一批', mode: '逐级两级' },
    { type: 'contract', title: '合同审批', amount: 280000, status: 'pending', applicant: salesNames[2], biz: '合同审批-年度框架合作', mode: '会签' },
    { type: 'refund', title: '退款申请', amount: 15000, status: 'pending', applicant: salesNames[3], biz: '退款申请-客户撤单', mode: '单级' },
    { type: 'expense', title: '支出报销', amount: 3500, status: 'pending', applicant: salesNames[0], biz: '支出报销-商务招待费', mode: '或签' },
    // 6-12: 已处理（approved/rejected）
    { type: 'account_open', title: '开户申请', amount: 50000, status: 'approved', applicant: salesNames[1], biz: '开户申请-宏远传媒', mode: '单级', myAction: 'approved', myComment: '同意，资质齐全' },
    { type: 'purchase', title: '采购申请', amount: 3000, status: 'approved', applicant: salesNames[2], biz: '采购申请-办公用品', mode: '单级', myAction: 'approved', myComment: '金额小，直接通过' },
    { type: 'contract', title: '合同审批', amount: 120000, status: 'approved', applicant: salesNames[3], biz: '合同审批-补充协议', mode: '会签', myAction: 'approved', myComment: '法务已审阅，通过' },
    { type: 'refund', title: '退款申请', amount: 8000, status: 'rejected', applicant: salesNames[0], biz: '退款申请-误充值退回', mode: '单级', myAction: 'rejected', myComment: '退款理由不充分，请补充' },
    { type: 'expense', title: '支出报销', amount: 2500, status: 'approved', applicant: salesNames[1], biz: '支出报销-差旅费', mode: '或签', myAction: 'approved', myComment: '已核实，通过' },
    { type: 'account_open', title: '开户申请', amount: 180000, status: 'approved', applicant: salesNames[2], biz: '开户申请-启明科技', mode: '逐级两级', myAction: 'approved', myComment: '资料完整，审批通过' },
    { type: 'contract', title: '合同审批', amount: 450000, status: 'approved', applicant: salesNames[3], biz: '合同审批-Q4框架合同', mode: '会签', myAction: 'approved', myComment: '财务已复核，通过' },
    // 13-17: 我发起的（含待审批/已通过/已驳回混合）
    { type: 'account_open', title: '开户申请', amount: 600000, status: 'pending', applicant: '当前用户', biz: '开户申请-我发起的大额申请', mode: '逐级三级', initiated: true },
    { type: 'purchase', title: '采购申请', amount: 5500, status: 'approved', applicant: '当前用户', biz: '采购申请-我的电脑配件', mode: '单级', initiated: true },
    { type: 'refund', title: '退款申请', amount: 6000, status: 'rejected', applicant: '当前用户', biz: '退款申请-客户取消合作', mode: '单级', initiated: true, myAction: 'rejected', myComment: '需客户盖章确认' },
    { type: 'expense', title: '支出报销', amount: 1200, status: 'approved', applicant: '当前用户', biz: '支出报销-市内交通', mode: '或签', initiated: true },
    { type: 'contract', title: '合同审批', amount: 95000, status: 'approving', applicant: '当前用户', biz: '合同审批-新签客户合同', mode: '会签', initiated: true },
  ];

  // 生成审批步骤辅助函数
  function buildApprovalSteps(type: string, amount: number, status: string, mode: string): any[] {
    const now = new Date();
    const dateStr = (offset: number) => `2026-08-${String(Math.max(1, 28 - offset)).padStart(2, '0')} 14:${String((offset * 17) % 60).padStart(2, '0')}:00`;

    const submitStep = {
      id: 0, step_name: '提交申请', approver_name: '申请人', status: 'approved' as const,
      approved_at: dateStr(5), is_submit: true,
    };

    // 开户：<10万 一级；≥10万且<50万 两级；≥50万 三级
    if (type === 'account_open') {
      if (amount >= 500000) {
        return [
          submitStep,
          { id: 1, step_name: '商务经理审批', approver_name: '张经理', status: status === 'pending' ? 'current' : 'approved', approved_at: status === 'pending' ? undefined : dateStr(4), comment: '同意，客户资质良好', mode: 'single', condition_text: '金额≥50万，触发三级审批' },
          { id: 2, step_name: '财务审核', approver_name: '李财务', status: status === 'pending' ? 'pending' : (status === 'rejected' ? 'rejected' : 'approved'), approved_at: status === 'pending' || status === 'rejected' ? undefined : dateStr(3), comment: status === 'rejected' ? '账户余额不足' : '财务审核通过', mode: 'single' },
          { id: 3, step_name: '总经理审批', approver_name: '王总', status: status === 'pending' || status === 'rejected' ? 'pending' : 'approved', approved_at: status === 'approved' ? dateStr(2) : undefined, comment: status === 'approved' ? '同意' : undefined, mode: 'single' },
        ];
      }
      if (amount >= 100000) {
        return [
          submitStep,
          { id: 1, step_name: '商务经理审批', approver_name: '张经理', status: 'approved', approved_at: dateStr(4), comment: '同意', mode: 'single', condition_text: '金额≥10万，触发两级审批' },
          { id: 2, step_name: '财务审核', approver_name: '李财务', status: status === 'pending' ? 'current' : (status === 'rejected' ? 'rejected' : 'approved'), approved_at: status === 'pending' || status === 'rejected' ? undefined : dateStr(3), comment: status === 'rejected' ? '金额有异议' : '审核通过', mode: 'single' },
        ];
      }
      return [
        submitStep,
        { id: 1, step_name: '商务经理审批', approver_name: '张经理', status: status === 'pending' ? 'current' : (status === 'rejected' ? 'rejected' : 'approved'), approved_at: status === 'pending' || status === 'rejected' ? undefined : dateStr(4), comment: status === 'rejected' ? '资料不完整' : '同意，资料齐全', mode: 'single' },
      ];
    }

    // 采购：<5000 一级；≥5000 两级
    if (type === 'purchase') {
      if (amount >= 5000) {
        return [
          submitStep,
          { id: 1, step_name: '部门经理审批', approver_name: '张经理', status: status === 'pending' ? 'current' : 'approved', approved_at: status === 'pending' ? undefined : dateStr(4), comment: '需要，同意采购', mode: 'single', condition_text: '金额≥5000，触发两级审批' },
          { id: 2, step_name: '总经理审批', approver_name: '王总', status: status === 'pending' ? 'pending' : (status === 'rejected' ? 'rejected' : 'approved'), approved_at: status === 'pending' || status === 'rejected' ? undefined : dateStr(2), comment: status === 'rejected' ? '预算不足' : '同意采购', mode: 'single' },
        ];
      }
      return [
        submitStep,
        { id: 1, step_name: '部门经理审批', approver_name: '张经理', status: status === 'pending' ? 'current' : (status === 'rejected' ? 'rejected' : 'approved'), approved_at: status === 'pending' || status === 'rejected' ? undefined : dateStr(4), comment: status === 'rejected' ? '非必要支出' : '金额较小，直接通过', mode: 'single' },
      ];
    }

    // 合同：经理 → 会签（法务+财务）→ 总经理
    if (type === 'contract') {
      const countersignStatus = status === 'pending' ? 'current' : (status === 'rejected' ? 'rejected' : 'approved');
      return [
        submitStep,
        { id: 1, step_name: '商务经理审批', approver_name: '张经理', status: 'approved', approved_at: dateStr(4), comment: '合同内容基本完整', mode: 'single' },
        {
          id: 2, step_name: '法务+财务会签', approver_name: '法务/财务', status: countersignStatus, mode: 'countersign',
          sub_approvers: [
            { name: '陈法务', status: status === 'pending' ? 'approved' : 'approved', comment: '法务条款合规', approved_at: dateStr(3) },
            { name: '李财务', status: status === 'pending' ? 'pending' : (status === 'rejected' ? 'rejected' : 'approved'), comment: status === 'rejected' ? '回款条件有风险' : '财务条款无异议', approved_at: status === 'pending' || status === 'rejected' ? undefined : dateStr(3) },
          ],
        },
        { id: 3, step_name: '总经理审批', approver_name: '王总', status: status === 'pending' ? 'pending' : (status === 'rejected' ? 'pending' : 'approved'), approved_at: status === 'approved' ? dateStr(2) : undefined, comment: status === 'approved' ? '同意签署' : undefined, mode: 'single' },
      ];
    }

    // 支出：或签（财务A / 财务B 任一通过即可）
    if (type === 'expense') {
      const orSignStatus = status === 'pending' ? 'current' : (status === 'rejected' ? 'rejected' : 'approved');
      return [
        submitStep,
        {
          id: 1, step_name: '财务审批（或签）', approver_name: '财务部', status: orSignStatus, mode: 'orsign',
          sub_approvers: [
            { name: '李财务', status: status === 'approved' ? 'approved' : 'pending', comment: status === 'approved' ? '已核实，通过' : undefined, approved_at: status === 'approved' ? dateStr(3) : undefined },
            { name: '赵财务', status: status === 'rejected' ? 'rejected' : 'pending', comment: status === 'rejected' ? '票据不规范' : undefined, approved_at: status === 'rejected' ? dateStr(3) : undefined },
          ],
        },
      ];
    }

    // 退款：单级
    if (type === 'refund') {
      return [
        submitStep,
        { id: 1, step_name: '财务经理审批', approver_name: '李财务', status: status === 'pending' ? 'current' : (status === 'rejected' ? 'rejected' : 'approved'), approved_at: status === 'pending' || status === 'rejected' ? undefined : dateStr(3), comment: status === 'rejected' ? '退款理由不充分' : '同意退款', mode: 'single' },
      ];
    }

    // 其他：单级兜底
    return [
      submitStep,
      { id: 1, step_name: '主管审批', approver_name: '张经理', status: status === 'pending' ? 'current' : (status === 'rejected' ? 'rejected' : 'approved'), approved_at: status === 'pending' || status === 'rejected' ? undefined : dateStr(3), comment: status === 'rejected' ? '不同意' : '同意', mode: 'single' },
    ];
  }

  for (let i = 0; i < todoConfigs.length; i++) {
    const cfg = todoConfigs[i];
    const approval_steps = buildApprovalSteps(cfg.type, cfg.amount, cfg.status, cfg.mode);
    const lastStep = [...approval_steps].reverse().find(s => !s.is_submit);
    const currentStepIdx = approval_steps.findIndex(s => s.status === 'current' || s.status === 'pending');
    const instanceStatus = cfg.status === 'pending' ? '审批中' : cfg.status === 'approved' ? '已通过' : cfg.status === 'rejected' ? '已驳回' : '审批中';

    db.todos.push({
      id: i + 1,
      business_type: cfg.type,
      business_id: 1000 + i,
      title: cfg.biz,
      applicant_id: 1 + (i % 4),
      applicant_name: cfg.applicant,
      status: cfg.status,
      instance_status: instanceStatus,
      current_step: currentStepIdx > 0 ? currentStepIdx : 1,
      instance_created_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')} 10:${String(i * 7 % 60).padStart(2, '0')}:00`,
      step_name: lastStep?.step_name || '审批中',
      operator_name: cfg.status === 'pending' ? '' : '审批人',
      operated_at: cfg.status === 'pending' ? '' : `2026-08-${String((i % 27) + 1).padStart(2, '0')} 14:00:00`,
      remark: cfg.status === 'pending' ? '' : instanceStatus,
      amount: cfg.amount,
      is_initiated_by_me: !!cfg.initiated,
      my_action: cfg.myAction || null,
      my_comment: cfg.myComment || null,
      my_operated_at: cfg.myAction ? `2026-08-${String((i % 27) + 1).padStart(2, '0')} 14:30:00` : null,
      approval_steps,
    });
  }

  // 协作任务
  for (let i = 0; i < 10; i++) {
    db.collabTasks.push({
      id: i + 1,
      task_id: `XZ${String(i + 1).padStart(6, '0')}`,
      title: `${['Q3投放策略', '新客户对接', '月度报表', '客户复盘', '季度规划'][i % 5]}任务${i + 1}`,
      owner: salesNames[i % 4],
      collaborators: salesNames.filter((_, idx) => idx !== i % 4).slice(0, 2).join('、'),
      deadline: `2026-09-${String((i % 27) + 1).padStart(2, '0')}`,
      priority: ['高', '中', '低'][i % 3],
      progress: (i * 15) % 100,
      status: ['未开始', '进行中', '已完成'][i % 3],
    });
  }

  // 视频订单
  for (let i = 0; i < 10; i++) {
    db.videoOrders.push({
      id: i + 1,
      order_id: `SP${String(i + 1).padStart(6, '0')}`,
      group_name: customerNames[i % 15],
      subject_name: customerNames[i % 15],
      video_type: ['产品展示', '品牌宣传', '达人种草', '剧情短片'][i % 4],
      amount: (i + 1) * 15000,
      status: ['待拍摄', '拍摄中', '剪辑中', '已交付', '已验收'][i % 5],
      owner: empNames[i % 12],
      created_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')}`,
    });
  }

  // 视频项目
  for (let i = 0; i < 10; i++) {
    db.videoProjects.push({
      id: i + 1,
      project_id: `XM${String(i + 1).padStart(6, '0')}`,
      project_name: `${customerNames[i % 15]}视频项目${i + 1}`,
      related_order: `SP${String(i + 1).padStart(6, '0')}`,
      progress: (i * 12) % 100,
      owner: empNames[i % 12],
      deadline: `2026-09-${String((i % 27) + 1).padStart(2, '0')}`,
      status: ['进行中', '已完成', '暂停'][i % 3],
    });
  }

  // 演员
  const actorNames = ['林小雨', '张浩然', '王思琪', '李明轩', '陈雨萱', '刘子豪'];
  for (let i = 0; i < 8; i++) {
    db.actors.push({
      id: i + 1,
      actor_id: `YY${String(i + 1).padStart(4, '0')}`,
      name: actorNames[i % 6],
      phone: `135${String(50000000 + i * 521).slice(0, 8)}`,
      fans: (i + 1) * 50000,
      price: (i + 1) * 2000,
      schedule_status: ['有档期', '已预约', '拍摄中'][i % 3],
      tags: ['甜美女神', '阳光型男', '搞笑达人', '职场精英'][i % 4],
    });
  }

  // 其他空列表填充空状态数据（1-2条即可）
  // 退币管理（字段与页面列对齐）
  const coinReasons = ['账户销户退币', '多余充值退回', '投放策略调整退回', '合同终止退币'];
  const coinStatus = ['pending_approval', 'refunded', 'rejected'];
  for (let i = 0; i < 8; i++) {
    const created = `2026-08-${String((i % 27) + 1).padStart(2, '0')} 11:00:00`;
    db.coinRefunds.push({
      id: i + 1,
      refund_no: `TB${String(i + 1).padStart(6, '0')}`,
      customer_name: customerNames[i % 15],
      entity_name: customerNames[i % 15],
      port: portNames[i % 4],
      amount: (i + 1) * 12000 + (i % 4) * 3000,
      reason: coinReasons[i % 4],
      status: coinStatus[i % 3],
      applicant_name: salesNames[i % 4],
      created_at: created,
    });
  }

  // 后返管理（字段与页面列对齐）
  const rebateStatus = ['pending', 'confirmed', 'settled'];
  for (let i = 0; i < 8; i++) {
    const created = `2026-07-${String((i % 27) + 1).padStart(2, '0')} 10:00:00`;
    db.rebates.push({
      id: i + 1,
      rebate_no: `HF${String(i + 1).padStart(6, '0')}`,
      customer_name: customerNames[i % 15],
      port: portNames[i % 4],
      rebate_period: `2026-0${(i % 6) + 1}`,
      amount: (i + 1) * 18000 + (i % 3) * 5000,
      rate: 0.05 + (i % 4) * 0.02,
      status: rebateStatus[i % 3],
      operator_name: salesNames[i % 4],
      settled_at: i % 3 === 2 ? `2026-08-${String((i % 27) + 1).padStart(2, '0')} 15:00:00` : '',
      created_at: created,
    });
  }

  // 扣减管理（字段与页面列对齐）
  const deductTypes = ['违规扣减', '差异扣减', '政策扣减', '其他扣减'];
  const deductStatus = ['completed', 'pending'];
  for (let i = 0; i < 8; i++) {
    const created = `2026-08-${String((i % 27) + 1).padStart(2, '0')} 14:00:00`;
    db.deductions.push({
      id: i + 1,
      deduct_no: `KJ${String(i + 1).padStart(6, '0')}`,
      customer_name: customerNames[i % 15],
      entity_name: customerNames[i % 15],
      port: portNames[i % 4],
      amount: (i + 1) * 5000 + (i % 5) * 1500,
      deduct_type: deductTypes[i % 4],
      reason: `因${deductTypes[i % 4]}产生的金额调整`,
      status: deductStatus[i % 2],
      operator_name: salesNames[i % 4],
      created_at: created,
    });
  }

  // 激励管理（字段与页面列对齐）
  const incentiveTypes = ['月度冠军奖', '超额完成奖', '新客开拓奖', '团队协作奖'];
  const incentiveStatus = ['pending_approval', 'paid', 'rejected'];
  for (let i = 0; i < 8; i++) {
    const created = `2026-08-${String((i % 27) + 1).padStart(2, '0')} 09:30:00`;
    db.incentives.push({
      id: i + 1,
      incentive_no: `JL${String(i + 1).padStart(6, '0')}`,
      employee_name: empNames[i % 12],
      department: empDepts[i % 6],
      incentive_type: incentiveTypes[i % 4],
      amount: (i + 1) * 800 + (i % 3) * 500,
      reason: `${incentiveTypes[i % 4]}，表现优异`,
      status: incentiveStatus[i % 3],
      applicant_name: salesNames[i % 4],
      created_at: created,
    });
  }

  // 费用管理（字段与页面列对齐）
  const expenseTypes = ['办公耗材', '差旅费', '业务招待', '设备采购', '水电物业'];
  const expenseStatus = ['pending_approval', 'approved', 'rejected'];
  for (let i = 0; i < 8; i++) {
    const created = `2026-08-${String((i % 27) + 1).padStart(2, '0')} 16:20:00`;
    db.dailyExpenses.push({
      id: i + 1,
      expense_no: `FY${String(i + 1).padStart(6, '0')}`,
      expense_type: expenseTypes[i % 5],
      amount: (i + 1) * 600 + (i % 4) * 300,
      applicant_name: empNames[i % 12],
      department: empDepts[i % 6],
      occur_date: `2026-08-${String((i % 27) + 1).padStart(2, '0')}`,
      status: expenseStatus[i % 3],
      remark: i % 3 === 0 ? '需附发票报销' : '',
      created_at: created,
    });
  }

  // 保证金&押金（字段与页面列对齐）
  const depositTypes = ['投标保证金', '履约保证金', '押金'];
  const depositStatus = ['paid', 'refunded', 'deducted'];
  for (let i = 0; i < 8; i++) {
    const created = `2026-07-${String((i % 27) + 1).padStart(2, '0')} 10:00:00`;
    db.deposits.push({
      id: i + 1,
      deposit_no: `BZ${String(i + 1).padStart(6, '0')}`,
      customer_name: customerNames[i % 15],
      deposit_type: depositTypes[i % 3],
      amount: (i + 1) * 5000 + (i % 3) * 2000,
      pay_date: `2026-07-${String((i % 27) + 1).padStart(2, '0')}`,
      refund_date: `2026-12-${String((i % 27) + 1).padStart(2, '0')}`,
      status: depositStatus[i % 3],
      remark: i % 4 === 0 ? '合同到期后退还' : '',
      created_at: created,
    });
  }
  simpleFill('contractTemplates', 5, 'HTMB');
  // 补齐合同模板详细字段
  const tplNames = ['广告投放标准模板', '视频制作服务模板', '年度框架协议模板', '客户合作协议模板', '保密协议模板'];
  const tplTypes = ['广告投放', '视频制作', '框架协议', '合作协议', '保密协议'];
  const tplCats = ['standard', 'standard', 'framework', 'cooperation', 'nda'];
  const tplAmounts = [100000, 50000, 500000, 200000, 0];
  const tplPayments = ['按消耗结算', '分期付款', '分期付款', '一次性付款', '一次性付款'];
  const tplTerms = [
    '甲方委托乙方进行巨量千川广告投放服务，投放内容及预算以月度计划为准。结算方式按实际消耗金额结算，每月5日前核对上月消耗数据并开具发票。',
    '乙方根据甲方需求提供短视频创意策划、拍摄及后期制作服务，交付物为成片视频。制作周期以项目单为准，验收通过后付款。',
    '本协议为年度框架合作协议，合作期内所有具体项目均以补充协议形式确认。框架内项目享受优惠价格，结算按项目独立进行。',
    '甲乙双方本着平等互利的原则，就广告代理服务事宜达成合作。乙方提供开户、投放、优化、数据报表等全流程服务。',
    '双方对合作过程中知悉的对方商业秘密、客户信息、技术资料等负有保密义务。保密期限自合作开始至合作结束后3年。',
  ];
  mockDb.contractTemplates = mockDb.contractTemplates.map((t: any, i: number) => ({
    ...t,
    template_name: tplNames[i],
    contract_type: tplTypes[i],
    category: tplCats[i],
    default_amount: tplAmounts[i],
    payment_method: tplPayments[i],
    terms: tplTerms[i],
    status: 'active',
    remark: '',
    updated_at: t.created_at,
  }));
  simpleFill('contractFees', 6, 'HTFY');
  simpleFill('invitations', 6, 'YY');
  simpleFill('interviews', 6, 'MS');
  simpleFill('checkins', 8, 'QD');
  simpleFill('recruitPlans', 4, 'ZP');
  simpleFill('purchaseOrders', 5, 'CGDD');
  simpleFill('purchaseDetails', 5, 'CGMX');
  simpleFill('stockIns', 6, 'RK');
  simpleFill('requisitions', 6, 'LY');
  simpleFill('returns', 4, 'GH');
  simpleFill('inventoryChecks', 4, 'PD');
  simpleFill('outsourcings', 6, 'WB');
  simpleFill('videoCommissions', 6, 'TC');
  simpleFill('shootCosts', 6, 'PSFY');
  simpleFill('locationCosts', 6, 'CDFY');
  simpleFill('samples', 8, 'YP');
  simpleFill('batchImports', 6, 'PLDR');
  simpleFill('batchExports', 6, 'PLDC');
  simpleFill('customerAccounts', 5, 'KHZH');
  simpleFill('operationLogs', 20, 'CZRZ');
  simpleFill('loginLogs', 20, 'DLRZ');
  simpleFill('industryRois', 10, 'ROI');
  simpleFill('competitors', 8, 'JP');
  simpleFill('materials', 12, 'SC');

  // 组织架构：部门树（与后端种子一致）
  const nowStr = '2026-08-30 00:00:00';
  db.departments = [
    { id: 1, dept_code: 'D001', name: '牧唐数智', parent_id: 0, leader: '陈建国', phone: '13800000001', sort: 1, status: 'active', created_at: nowStr },
    { id: 2, dept_code: 'D002', name: '总经办', parent_id: 1, leader: '陈总', phone: '', sort: 2, status: 'active', created_at: nowStr },
    { id: 3, dept_code: 'D003', name: '商务中心', parent_id: 1, leader: '张伟', phone: '13800001001', sort: 3, status: 'active', created_at: nowStr },
    { id: 4, dept_code: 'D004', name: '商务一部', parent_id: 3, leader: '张伟', phone: '13800001002', sort: 1, status: 'active', created_at: nowStr },
    { id: 5, dept_code: 'D005', name: '商务二部', parent_id: 3, leader: '赵磊', phone: '13800001003', sort: 2, status: 'active', created_at: nowStr },
    { id: 6, dept_code: 'D006', name: '投放优化中心', parent_id: 1, leader: '李娜', phone: '13800001004', sort: 4, status: 'active', created_at: nowStr },
    { id: 7, dept_code: 'D007', name: '优化部', parent_id: 6, leader: '李娜', phone: '13800001005', sort: 1, status: 'active', created_at: nowStr },
    { id: 8, dept_code: 'D008', name: '财务部', parent_id: 1, leader: '赵敏', phone: '13800001006', sort: 5, status: 'active', created_at: nowStr },
    { id: 9, dept_code: 'D009', name: '行政人事部', parent_id: 1, leader: '赵磊', phone: '13800001007', sort: 6, status: 'active', created_at: nowStr },
    { id: 10, dept_code: 'D010', name: '视频制作部', parent_id: 1, leader: '王强', phone: '13800001008', sort: 7, status: 'active', created_at: nowStr },
  ];

  // 角色权限（与后端种子一致）
  db.roles = [
    { id: 1, role_key: 'admin', name: '管理员', description: '全模块管理权限，可查看与操作所有业务数据', data_scope: 'all', menu_ids: JSON.stringify(['m1','m2','m2-1','m2-1-1','m2-1-2','m2-1-3','m2-2','m2-3','m3','m3-1','m3-2','m3-3','m3-4','m4','m4-1','m4-2','m4-3','m4-4','m4-5','m4-6','m4-7','m4-8','m5','m5-1','m5-2','m5-3']), field_permissions: '{}', is_system: 1, created_at: nowStr },
    { id: 2, role_key: 'manager', name: '部门经理', description: '管理本部门业务与审批', data_scope: 'deptAndSub', menu_ids: JSON.stringify(['m1','m2','m2-1','m2-1-1','m2-2','m2-3','m3','m3-1','m3-4']), field_permissions: JSON.stringify({ phone: 'masked', salary: 'hidden' }), is_system: 1, created_at: nowStr },
    { id: 3, role_key: 'sales', name: '商务专员', description: '客户跟进与开户报备', data_scope: 'self', menu_ids: JSON.stringify(['m1','m2','m2-2','m2-3','m3','m3-1']), field_permissions: JSON.stringify({ phone: 'masked', salary: 'hidden', bank_account: 'hidden' }), is_system: 1, created_at: nowStr },
    { id: 4, role_key: 'finance', name: '财务主管', description: '财务收付款、发票与成本', data_scope: 'all', menu_ids: JSON.stringify(['m1','m4','m4-1','m4-2','m4-3','m4-4','m4-5','m4-6','m4-7','m4-8']), field_permissions: '{}', is_system: 1, created_at: nowStr },
    { id: 5, role_key: 'hr', name: '人事经理', description: '人资行政全流程', data_scope: 'all', menu_ids: JSON.stringify(['m1','m5','m5-1','m5-3']), field_permissions: '{}', is_system: 1, created_at: nowStr },
  ];

  // 系统设置分组配置
  db.settings = {
    public_sea: { recycle_days: '7', enabled: 'true', claim_limit: '50', level_a: '500000', level_b: '200000', level_c: '50000' },
    clue: { auto_assign: 'true', recycle_days: '15', source_scope: 'all' },
    customer: { id_prefix: 'CU', auto_no: 'true', merge_rule: 'byName' },
    alert: { balance_threshold: '10000', contract_remind_days: '30', feishu_notify: 'false', email_notify: 'true' },
    tax: { vat_rate: '6', surcharge_rate: '0.72', culture_fee_rate: '0' },
  };

  // ---- 无效客资 ----
  const invalidReasons = ['电话空号', '客户无投放意向', '资料不完整', '客户已停业', '重复客资'];
  for (let i = 0; i < 12; i++) {
    db.invalidLeads.push({
      id: i + 1,
      lead_id: `WX${String(i + 1).padStart(5, '0')}`,
      entity_name: `河南${['鼎盛', '华信', '恒达', '众合', '天成', '华泰', '新世纪', '卓越'][i % 8]}${['商贸', '教育', '传媒', '金融'][i % 4]}有限公司`,
      lead_level: levels[i % 4],
      primary_industry: industries[i % 7],
      secondary_industry: `${industries[i % 7]}营销`,
      invalid_reason: invalidReasons[i % 5],
      entered_at: `2026-0${(i % 7) + 1}-${String((i % 27) + 1).padStart(2, '0')} 09:00:00`,
      marked_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')} 14:${String(i * 5 % 60).padStart(2, '0')}:00`,
      marked_by: salesNames[i % 4],
      marked_by_id: 1 + (i % 4),
      creator_name: salesNames[(i + 1) % 4],
      creator_id: 1 + ((i + 1) % 4),
      contact_name: `联系人${i + 1}`,
      contact_phone: `139${String(30000000 + i * 113).slice(0, 8)}`,
      source: ['官网咨询', '转介绍', '陌拜电话', '展会', '线上广告'][i % 5],
    });
  }

  // ---- 客户联系人 ----
  for (let i = 0; i < 30; i++) {
    const cid = 1 + (i % 15);
    db.customerContacts.push({
      id: i + 1,
      customer_id: cid,
      contact_name: `${['张', '李', '王', '赵', '陈', '刘', '杨'][i % 7]}${['总', '经理', '主管', '总监', '主任'][i % 5]}`,
      position: ['市场总监', '运营经理', '采购主管', '财务负责人', 'CEO'][i % 5],
      phone: `138${String(10000000 + i * 217).slice(0, 8)}`,
      email: `contact${i + 1}@example.com`,
      wechat: `wx_${i + 1001}`,
      is_primary: i % 3 === 0 ? 1 : 0,
      remark: i % 4 === 0 ? '主要决策人' : '',
      created_at: `2026-0${(i % 8) + 1}-15 10:00:00`,
    });
  }

  // ---- 客户跟进记录 ----
  for (let i = 0; i < 30; i++) {
    const cid = 1 + (i % 15);
    db.customerFollowUps.push({
      id: i + 1,
      customer_id: cid,
      follow_type: ['电话', '拜访', '微信', '邮件', '会议'][i % 5],
      content: [
        '沟通客户投放需求，了解预算与预期ROI',
        '拜访客户，展示投放方案与案例',
        '微信同步最新行业案例，客户积极回应',
        '发送报价单与合同模板',
        '确认合同细节，约定签约时间',
      ][i % 5],
      creator_name: salesNames[i % 4],
      creator_id: 1 + (i % 4),
      created_at: `2026-08-${String(1 + (i % 27)).padStart(2, '0')} ${String(9 + (i % 8)).padStart(2, '0')}:${String(i * 7 % 60).padStart(2, '0')}:00`,
      next_follow_at: i % 3 === 0 ? '' : `2026-09-${String(1 + (i % 15)).padStart(2, '0')} 10:00:00`,
    });
  }

  // ---- 提成规则 ----
  db.commissionRules = [
    { id: 1, rule_name: '广告业绩阶梯-标准', biz_type: 'ad', base_type: 'amount', calc_mode: 'ladder', department: '商务中心', position: '', status: 'active',
      tiers: JSON.stringify([
        { min: 0, max: 100000, rate: 3 },
        { min: 100000, max: 500000, rate: 5 },
        { min: 500000, max: 1000000, rate: 7 },
        { min: 1000000, max: 99999999, rate: 9 },
      ]),
      created_at: '2026-01-01 00:00:00',
    },
    { id: 2, rule_name: '广告业绩整体档位-资深', biz_type: 'ad', base_type: 'amount', calc_mode: 'overall', department: '商务一部', position: '高级商务', status: 'active',
      tiers: JSON.stringify([
        { min: 0, max: 200000, rate: 4 },
        { min: 200000, max: 800000, rate: 6 },
        { min: 800000, max: 99999999, rate: 10 },
      ]),
      created_at: '2026-01-01 00:00:00',
    },
    { id: 3, rule_name: '视频项目提成-标准', biz_type: 'video', base_type: 'profit', calc_mode: 'ladder', department: '视频制作部', position: '', status: 'active',
      tiers: JSON.stringify([
        { min: 0, max: 50000, rate: 8 },
        { min: 50000, max: 200000, rate: 12 },
        { min: 200000, max: 99999999, rate: 15 },
      ]),
      created_at: '2026-01-01 00:00:00',
    },
    { id: 4, rule_name: '回款提成-财务', biz_type: 'ad', base_type: 'received', calc_mode: 'ladder', department: '财务部', position: '', status: 'inactive',
      tiers: JSON.stringify([
        { min: 0, max: 99999999, rate: 1 },
      ]),
      created_at: '2026-03-01 00:00:00',
    },
  ];

  // ---- 付款计划（合同费用分期） ----
  for (let i = 0; i < 12; i++) {
    const feeId = 1 + (i % 6);
    const period = (i % 3) + 1;
    const totalAmount = 50000 + (i % 6) * 20000;
    const ratios = [30, 50, 20]; // 首付/二期/尾款 百分比
    const planAmount = totalAmount * ratios[period - 1] / 100;
    db.paymentPlans.push({
      id: i + 1,
      fee_id: feeId,
      contract_id: 1 + (i % 6),
      period_no: period,
      plan_date: `2026-${String(8 + Math.floor(i / 3)).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
      plan_amount: planAmount,
      paid_amount: i < 6 ? planAmount : (i < 9 ? planAmount * 0.5 : 0),
      ratio: ratios[period - 1],
      status: i < 6 ? 'paid' : (i < 9 ? 'partial' : 'unpaid'),
      remark: '',
      created_at: '2026-07-01 10:00:00',
    });
  }

  // ---- 付款记录 ----
  for (let i = 0; i < 10; i++) {
    const planId = 1 + (i % 6);
    db.paymentRecords.push({
      id: i + 1,
      plan_id: planId,
      fee_id: 1 + (i % 6),
      contract_id: 1 + (i % 6),
      amount: 15000 + i * 2000,
      pay_date: `2026-08-${String((i % 27) + 1).padStart(2, '0')}`,
      pay_method: ['银行转账', '银行承兑', '现金', '支付宝'][i % 4],
      voucher_no: `PAY${String(i + 1).padStart(8, '0')}`,
      operator_name: '赵敏',
      remark: i % 3 === 0 ? '第X期付款' : '',
      created_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')} 15:00:00`,
    });
  }

  // 员工档案（与后端种子一致，供组织架构/人资看板 mock 模式使用）
  const empRows: string[][] = [
    ['MT001', '张伟', '男', '商务一部', '商务主管', '138****8888', 'zhangwei@mutang.com', '2022-03-15', '2027-03-14', '上海市浦东新区', 'active', ''],
    ['MT002', '李娜', '女', '商务一部', '商务经理', '139****6666', 'lina@mutang.com', '2022-06-01', '2027-05-31', '上海市徐汇区', 'active', ''],
    ['MT003', '王强', '男', '商务二部', '商务专员', '137****5555', 'wangqiang@mutang.com', '2023-02-20', '2026-02-19', '上海市闵行区', 'active', ''],
    ['MT004', '刘洋', '男', '优化部', '优化师', '136****4444', 'liuyang@mutang.com', '2026-07-01', '2026-09-30', '上海市杨浦区', 'probation', ''],
    ['MT005', '陈静', '女', '财务部', '财务主管', '135****3333', 'chenjing@mutang.com', '2021-09-10', '2026-09-09', '上海市静安区', 'active', ''],
    ['MT006', '赵磊', '男', '行政人事部', '人事专员', '134****2222', 'zhaolei@mutang.com', '2023-11-05', '2026-11-04', '上海市普陀区', 'active', ''],
    ['MT007', '周晓峰', '男', '商务一部', '商务专员', '131****7001', 'zhouxf@mutang.com', '2026-01-12', '2029-01-11', '郑州市金水区', 'active', ''],
    ['MT008', '吴倩', '女', '商务一部', '商务助理', '131****7002', 'wuqian@mutang.com', '2026-02-08', '2029-02-07', '郑州市二七区', 'active', ''],
    ['MT009', '郑浩', '男', '商务二部', '商务专员', '131****7003', 'zhenghao@mutang.com', '2025-11-20', '2028-11-19', '郑州市中原区', 'active', ''],
    ['MT010', '冯雪', '女', '商务二部', '商务经理', '131****7004', 'fengxue@mutang.com', '2025-09-03', '2028-09-02', '郑州市管城区', 'active', ''],
    ['MT011', '蒋磊', '男', '优化部', '优化师', '131****7005', 'jianglei@mutang.com', '2026-03-15', '2029-03-14', '郑州市惠济区', 'active', ''],
    ['MT012', '沈丹', '女', '优化部', '优化师', '131****7006', 'shendan@mutang.com', '2026-04-22', '2029-04-21', '郑州市郑东新区', 'active', ''],
    ['MT013', '韩磊', '男', '优化部', '投放主管', '131****7007', 'hanlei@mutang.com', '2025-06-30', '2028-06-29', '郑州市金水区', 'active', ''],
    ['MT014', '杨梅', '女', '财务部', '财务专员', '131****7008', 'yangmei@mutang.com', '2026-05-10', '2029-05-09', '郑州市二七区', 'active', ''],
    ['MT015', '朱涛', '男', '财务部', '出纳', '131****7009', 'zhutao@mutang.com', '2026-06-18', '2029-06-17', '郑州市中原区', 'probation', ''],
    ['MT016', '秦岚', '女', '行政人事部', '人事专员', '131****7010', 'qinlan@mutang.com', '2026-07-06', '2026-10-05', '郑州市管城区', 'probation', ''],
    ['MT017', '尤勇', '男', '视频制作部', '剪辑师', '131****7011', 'youyong@mutang.com', '2026-02-25', '2029-02-24', '郑州市惠济区', 'active', ''],
    ['MT018', '许静', '女', '视频制作部', '编导', '131****7012', 'xujing@mutang.com', '2025-12-15', '2028-12-14', '郑州市金水区', 'active', ''],
    ['MT019', '何军', '男', '商务一部', '商务专员', '131****7013', 'hejun@mutang.com', '2025-04-10', '2028-04-09', '郑州市二七区', 'resigned', '2026-05-20'],
    ['MT020', '吕芳', '女', '商务二部', '商务助理', '131****7014', 'lvfang@mutang.com', '2025-03-08', '2028-03-07', '郑州市中原区', 'resigned', '2026-06-30'],
    ['MT021', '施强', '男', '优化部', '优化师', '131****7015', 'shiqiang@mutang.com', '2024-11-11', '2027-11-10', '郑州市管城区', 'resigned', '2026-03-15'],
    ['MT022', '张敏', '女', '财务部', '会计', '131****7016', 'zhangmin@mutang.com', '2024-08-20', '2027-08-19', '郑州市金水区', 'resigned', '2026-01-31'],
    ['MT023', '孔亮', '男', '视频制作部', '摄影师', '131****7017', 'kongliang@mutang.com', '2025-07-14', '2028-07-13', '郑州市惠济区', 'resigned', '2026-07-25'],
    ['MT024', '曹阳', '男', '商务一部', '商务专员', '131****7018', 'caoyang@mutang.com', '2026-08-03', '2026-11-02', '郑州市郑东新区', 'probation', ''],
  ];
  db.employees = empRows.map((r, i) => ({
    id: i + 1, employee_no: r[0], name: r[1], gender: r[2], department: r[3], position: r[4],
    phone: r[5], email: r[6], join_date: r[7], contract_expire_date: r[8], address: r[9],
    status: r[10], leave_date: r[11], created_at: nowStr,
  }));

  // 人资八表（与后端种子一致，覆盖 simpleFill 空壳）
  const fill = (rows: string[][], cols: string[]) =>
    rows.map((r, i) => ({ id: i + 1, ...Object.fromEntries(cols.map((c, j) => [c, r[j]])), created_at: nowStr }));

  db.resumes = fill([
    ['RS00001', '周明轩', '商务专员', '本科', '3', '猎聘', 'pending_review'],
    ['RS00002', '郑小婷', '优化师', '本科', '2', 'BOSS直聘', 'interviewing'],
    ['RS00003', '冯子豪', '视频剪辑', '大专', '4', '内推', 'hired'],
    ['RS00004', '何雅静', '人事专员', '本科', '1', '智联招聘', 'rejected'],
    ['RS00005', '高志远', '财务专员', '本科', '5', '猎聘', 'pending_review'],
    ['RS00006', '蒋雨橙', '行政助理', '大专', '2', '58同城', 'interviewing'],
  ], ['resume_no', 'name', 'position', 'education', 'work_years', 'source', 'status']);
  db.resumes.forEach((r: any) => { r.work_years = Number(r.work_years); });

  db.invitations = fill([
    ['IV00001', '周明轩', '商务专员', '13810012345', 'BOSS直聘', '张伟', '2026-08-30 10:00', '总部3楼会议室A', 'onsite', 'pending_confirm', ''],
    ['IV00002', '郑小婷', '优化师', '13920023456', '猎聘', '李娜', '2026-08-29 14:00', '线上腾讯会议', 'video', 'accepted', '已发送会议链接'],
    ['IV00003', '冯子豪', '视频剪辑', '13630034567', '内推', '王强', '2026-08-28 15:30', '总部2楼剪辑室', 'onsite', 'accepted', '作品集已提前审阅'],
    ['IV00004', '蒋雨橙', '行政助理', '13740045678', '智联招聘', '孙丽', '2026-08-29 11:00', '总部3楼会议室B', 'onsite', 'pending_confirm', ''],
    ['IV00005', '高志远', '财务专员', '13550056789', '猎聘', '赵敏', '2026-09-01 10:00', '线上飞书会议', 'video', 'declined', '候选人薪资期望不匹配'],
    ['IV00006', '林晓彤', '商务专员', '13660067890', '58同城', '张伟', '2026-09-02 14:00', '总部3楼会议室A', 'onsite', 'expired', '未按时参加'],
    ['IV00007', '黄俊杰', '优化师', '13770078901', 'BOSS直聘', '李娜', '2026-09-03 10:30', '线上腾讯会议', 'video', 'accepted', ''],
    ['IV00008', '徐梦瑶', '人事专员', '13880089012', '内推', '孙丽', '2026-09-04 15:00', '总部3楼会议室B', 'onsite', 'pending_confirm', ''],
    ['IV00009', '马晓东', '商务专员', '13990090123', '猎聘', '王强', '2026-09-05 10:00', '总部3楼会议室A', 'onsite', 'accepted', ''],
    ['IV00010', '沈佳怡', '视频剪辑', '13601101234', '智联招聘', '李娜', '2026-09-06 14:30', '线上飞书会议', 'video', 'pending_confirm', ''],
  ], ['invitation_no', 'candidate_name', 'position', 'phone', 'channel', 'interviewer_name', 'interview_time', 'location', 'interview_mode', 'status', 'remark']);

  db.interviews = fill([
    ['IT00001', '郑小婷', '优化师', '初面', '李娜', '2026-08-29 14:00', 'video', 'passed', '4.5', '沟通逻辑清晰，投放思路到位，有巨量千川实操经验', '进入复试'],
    ['IT00002', '郑小婷', '优化师', '复试', '张伟', '2026-09-01 10:00', 'onsite', 'passed', '4.8', '数据敏感度高，对ROI有深入理解，建议录用', '发offer'],
    ['IT00003', '冯子豪', '视频剪辑', '初面', '王强', '2026-08-28 15:30', 'onsite', 'passed', '4.2', '作品完成度高，剪辑节奏把控好', '进入复试'],
    ['IT00004', '冯子豪', '视频剪辑', '终面', '李娜', '2026-08-31 14:00', 'onsite', 'hired', '4.7', '创意能力强，可独立承担项目，薪资可谈', '发offer'],
    ['IT00005', '蒋雨橙', '行政助理', '初面', '孙丽', '2026-08-29 11:00', 'onsite', 'pending', '0', '', ''],
    ['IT00006', '周明轩', '商务专员', '初面', '张伟', '2026-08-30 10:00', 'onsite', 'pending', '0', '', ''],
    ['IT00007', '何雅静', '人事专员', '初面', '孙丽', '2026-08-26 14:00', 'video', 'failed', '2.5', '经验与岗位要求匹配度不足，沟通表达一般', '不予通过'],
    ['IT00008', '黄俊杰', '优化师', '初面', '李娜', '2026-09-03 10:30', 'video', 'pending', '0', '', ''],
    ['IT00009', '徐梦瑶', '人事专员', '初面', '孙丽', '2026-09-04 15:00', 'onsite', 'pending', '0', '', ''],
    ['IT00010', '马晓东', '商务专员', '初面', '王强', '2026-09-05 10:00', 'onsite', 'pending', '0', '', ''],
    ['IT00011', '沈佳怡', '视频剪辑', '初面', '李娜', '2026-09-06 14:30', 'video', 'pending', '0', '', ''],
    ['IT00012', '高志远', '财务专员', '初面', '赵敏', '2026-09-01 10:00', 'video', 'failed', '3.0', '财务知识基础尚可，但缺乏广告行业经验', '不予通过'],
  ], ['interview_no', 'candidate_name', 'position', 'round', 'interviewer_name', 'interview_time', 'interview_mode', 'status', 'score', 'evaluation', 'suggestion']);
  db.interviews.forEach((r: any) => { r.score = Number(r.score); });

  db.checkins = fill([
    ['CK00001', '郑小婷', '优化师', 'interview', '2026-08-29 14:00', '2026-08-29 13:45', '前台扫码', 'checked_in', ''],
    ['CK00002', '冯子豪', '视频剪辑', 'interview', '2026-08-28 15:30', '2026-08-28 15:20', '前台扫码', 'checked_in', ''],
    ['CK00003', '蒋雨橙', '行政助理', 'interview', '2026-08-29 11:00', '', '', 'absent', '未按时到场，电话未接'],
    ['CK00004', '周明轩', '商务专员', 'interview', '2026-08-30 10:00', '2026-08-30 10:12', '前台扫码', 'late', '迟到12分钟'],
    ['CK00005', '何雅静', '人事专员', 'interview', '2026-08-26 14:00', '2026-08-26 13:50', '前台扫码', 'checked_in', ''],
    ['CK00006', '高志远', '财务专员', 'interview', '2026-09-01 10:00', '', '', 'absent', '候选人爽约'],
    ['CK00007', '黄俊杰', '优化师', 'interview', '2026-09-03 10:30', '', '', 'pending', ''],
    ['CK00008', '徐梦瑶', '人事专员', 'interview', '2026-09-04 15:00', '', '', 'pending', ''],
    ['CK00009', '马晓东', '商务专员', 'interview', '2026-09-05 10:00', '', '', 'pending', ''],
    ['CK00010', '沈佳怡', '视频剪辑', 'interview', '2026-09-06 14:30', '', '', 'pending', ''],
    ['CK00011', '林晓彤', '商务专员', 'interview', '2026-09-02 14:00', '', '', 'absent', '未按时到场'],
    ['CK00012', '赵磊', '行政主管', 'onboard', '2026-08-15 09:00', '2026-08-15 08:55', 'HR系统', 'checked_in', '入职签到'],
  ], ['checkin_no', 'candidate_name', 'position', 'checkin_type', 'appointment_time', 'checkin_time', 'checkin_method', 'status', 'remark']);

  db.recruitPlans = fill([
    ['RP00001', '商务专员', '商务一部', '5', '2', '3', 'high', '2026-09-30', '张伟', 'recruiting', '扩招需求，Q3重点岗位'],
    ['RP00002', '优化师', '优化部', '3', '1', '2', 'high', '2026-09-15', '李娜', 'recruiting', '巨量千川方向优先'],
    ['RP00003', '视频剪辑', '视频部', '2', '1', '1', 'medium', '2026-09-20', '王强', 'recruiting', '有信息流经验优先'],
    ['RP00004', '财务专员', '财务部', '1', '0', '1', 'medium', '2026-10-15', '赵敏', 'recruiting', '有广告行业经验优先'],
    ['RP00005', '人事专员', '行政人事部', '1', '1', '0', 'low', '2026-09-10', '孙丽', 'completed', '已到岗徐梦瑶'],
    ['RP00006', '行政助理', '行政人事部', '1', '1', '0', 'low', '2026-08-31', '孙丽', 'completed', '蒋雨橙已入职'],
    ['RP00007', '前端开发', '技术部', '2', '0', '2', 'high', '2026-10-31', '张伟', 'recruiting', 'React + TypeScript 技术栈'],
    ['RP00008', '商务主管', '商务三部', '1', '0', '1', 'high', '2026-11-15', '张伟', 'paused', '暂停招聘，待预算审批'],
    ['RP00009', '运营经理', '运营部', '1', '0', '1', 'medium', '2026-12-01', '李娜', 'cancelled', '岗位调整，取消招聘'],
    ['RP00010', '销售代表', '商务二部', '4', '1', '3', 'high', '2026-09-30', '王强', 'recruiting', '急招，有客户资源优先'],
  ], ['plan_no', 'position', 'department', 'headcount', 'onboarded', 'recruiting', 'urgency', 'expected_date', 'owner_name', 'status', 'remark']);
  db.recruitPlans.forEach((r: any) => {
    r.headcount = Number(r.headcount);
    r.onboarded = Number(r.onboarded);
    r.recruiting = Number(r.recruiting);
  });

  db.performances = fill([
    ['PF00001', '张伟', '商务一部', '2026-Q2', 'KPI', '92.5', 'A', 'confirmed'],
    ['PF00002', '李娜', '商务一部', '2026-Q2', 'KPI', '88', 'B+', 'confirmed'],
    ['PF00003', '王强', '商务二部', '2026-Q2', 'KPI', '81.5', 'B', 'pending'],
    ['PF00004', '刘洋', '优化部', '2026-Q2', 'OKR', '90', 'A', 'pending'],
    ['PF00005', '陈静', '财务部', '2026-Q2', 'KPI', '86.5', 'B+', 'confirmed'],
    ['PF00006', '赵磊', '行政人事部', '2026-Q2', 'KPI', '78', 'C', 'pending'],
  ], ['performance_no', 'employee_name', 'department', 'period', 'mode', 'score', 'grade', 'status']);
  db.performances.forEach((r: any) => { r.score = Number(r.score); });

  db.salaries = fill([
    ['SL00001', '张伟', '商务一部', '12000', '6800', '600', '320', '19080', '2026-07', 'paid'],
    ['SL00002', '李娜', '商务一部', '15000', '5200', '600', '380', '20420', '2026-07', 'paid'],
    ['SL00003', '王强', '商务二部', '8500', '4100', '500', '260', '12840', '2026-07', 'paid'],
    ['SL00004', '刘洋', '优化部', '9000', '3600', '500', '280', '12820', '2026-08', 'pending'],
    ['SL00005', '陈静', '财务部', '13000', '2800', '600', '350', '16050', '2026-08', 'pending'],
    ['SL00006', '赵磊', '行政人事部', '7500', '1500', '400', '220', '9180', '2026-08', 'pending'],
  ], ['salary_no', 'employee_name', 'department', 'base_salary', 'perf_salary', 'subsidy', 'deduction', 'actual_salary', 'salary_month', 'status']);
  db.salaries.forEach((r: any) => {
    ['base_salary', 'perf_salary', 'subsidy', 'deduction', 'actual_salary'].forEach((k) => { r[k] = Number(r[k]); });
  });

  db.attendances = fill([
    ['AT00001', '张伟', '商务一部', '2026-08', '21', '1', '0', '0.5', '12'],
    ['AT00002', '李娜', '商务一部', '2026-08', '21', '0', '0', '1', '8'],
    ['AT00003', '王强', '商务二部', '2026-08', '20', '2', '1', '2', '5'],
    ['AT00004', '刘洋', '优化部', '2026-08', '21', '0', '0', '0', '22'],
    ['AT00005', '陈静', '财务部', '2026-08', '21', '1', '0', '0', '3'],
    ['AT00006', '赵磊', '行政人事部', '2026-08', '20', '3', '0', '1', '2'],
  ], ['attendance_no', 'employee_name', 'department', 'attend_month', 'work_days', 'late_count', 'early_count', 'leave_days', 'overtime_hours']);
  db.attendances.forEach((r: any) => {
    ['work_days', 'late_count', 'early_count', 'leave_days', 'overtime_hours'].forEach((k) => { r[k] = Number(r[k]); });
  });

  db.recruitPlans = fill([
    ['RP00001', '商务一部', '商务专员', '3', '1', 'urgent', '2026-08-15', 'recruiting'],
    ['RP00002', '优化部', '优化师', '2', '0', 'urgent', '2026-09-01', 'recruiting'],
    ['RP00003', '视频部', '视频剪辑', '1', '1', 'normal', '2026-08-01', 'completed'],
    ['RP00004', '财务部', '财务专员', '1', '0', 'normal', '2026-09-10', 'recruiting'],
    ['RP00005', '行政人事部', '行政助理', '1', '0', 'low', '2026-09-20', 'pending'],
  ], ['plan_no', 'department', 'position', 'headcount', 'hired_count', 'urgency', 'plan_date', 'status']);
  db.recruitPlans.forEach((r: any) => {
    r.headcount = Number(r.headcount);
    r.hired_count = Number(r.hired_count);
  });
}

// ========== Mock API 引擎 ==========

/**
 * 通用列表查询
 */
function mockList(
  collection: keyof MockDb,
  params: Record<string, any>,
  searchFields: string[] = ['name'],
  filterFields: string[] = []
) {
  const { page, pageSize, sortBy, sortOrder, keyword } = parseQueryParams(params);
  let dataList = [...(db[collection] as any[])];
  if (keyword) {
    dataList = filterByFields(dataList, keyword, searchFields);
  }
  dataList = filterByExact(dataList, params, filterFields);
  dataList = sortList(dataList, sortBy, sortOrder);
  const { list, total } = paginate(dataList, page, pageSize);
  return { code: 0, message: 'ok', data: { list, total, page, pageSize } };
}

/**
 * 通用详情查询
 */
function mockGet(collection: keyof MockDb, id: number) {
  const item = (db[collection] as any[]).find((x: any) => x.id === id);
  if (!item) return { code: 404, message: '记录不存在', data: null };
  return { code: 0, message: 'ok', data: item };
}

/**
   * 通用创建
   */
  function mockCreate(collection: keyof MockDb, data: any) {
    const list = db[collection] as any[];
    const newId = Math.max(0, ...list.map((x: any) => x.id || 0)) + 1;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const newItem = { id: newId, ...data, created_at: now };
    list.unshift(newItem);
    return { code: 0, message: '创建成功', data: newItem };
  }

/**
 * 通用更新
 */
function mockUpdate(collection: keyof MockDb, id: number, data: any) {
  const list = db[collection] as any[];
  const idx = list.findIndex((x: any) => x.id === id);
  if (idx === -1) return { code: 404, message: '记录不存在', data: null };
  list[idx] = { ...list[idx], ...data, id };
  return { code: 0, message: '更新成功', data: list[idx] };
}

/**
 * 通用删除
 */
function mockDelete(collection: keyof MockDb, id: number) {
  const list = db[collection] as any[];
  const idx = list.findIndex((x: any) => x.id === id);
  if (idx === -1) return { code: 404, message: '记录不存在', data: null };
  list.splice(idx, 1);
  return { code: 0, message: '删除成功', data: null };
}

/**
 * 通用批量删除
 */
function mockBatchDelete(collection: keyof MockDb, ids: number[]) {
  const list = db[collection] as any[];
  const set = new Set(ids);
  db[collection as keyof MockDb] = list.filter((x: any) => !set.has(x.id)) as any;
  return { code: 0, message: `成功删除 ${ids.length} 条`, data: { deleted: ids.length } };
}

// ========== 业务 API ==========

const mockApi = {
  // ---- 认证 ----
  login(username: string, password: string) {
    const user = db.users.find(u => u.username === username && u.password === password);
    if (!user) {
      return { code: 401, message: '用户名或密码错误', data: null };
    }
    const token = `mock_token_${user.id}_${Date.now()}`;
    const { password: _, ...info } = user;
    return { code: 0, message: '登录成功', data: { token, user: info } };
  },

  loginFeishu() {
    const user = db.users[0]; // 默认用 admin
    const token = `mock_feishu_token_${user.id}_${Date.now()}`;
    const { password: _, ...info } = user;
    return { code: 0, message: '飞书授权登录成功', data: { token, user: info } };
  },

  refresh() {
    const token = scopedStorage.getItem('erp_token');
    if (!token) return { code: 401, message: '未登录', data: null };
    const newToken = `mock_token_refreshed_${Date.now()}`;
    return { code: 0, message: 'token 已刷新', data: { token: newToken } };
  },

  switchRole(role: string) {
    const token = scopedStorage.getItem('erp_token');
    if (!token) return { code: 401, message: '未登录', data: null };
    const allowedRoles = ['admin', 'manager', 'sales', 'finance', 'hr'];
    if (!allowedRoles.includes(role)) return { code: 400, message: '无效的角色', data: null };
    const user = db.users.find((u: any) => u.role === role) || db.users[0];
    const newToken = `mock_token_${user.id}_${Date.now()}`;
    const { password: _, ...info } = user;
    return { code: 0, message: '角色已切换', data: { token: newToken, user: { ...info, role } } };
  },

  me() {
    const token = scopedStorage.getItem('erp_token');
    if (!token || !token.startsWith('mock_')) {
      return { code: 401, message: '未登录', data: null };
    }
    const uidMatch = token.match(/mock_\w+_(\d+)_/);
    if (!uidMatch) return { code: 401, message: 'token 无效', data: null };
    const uid = Number(uidMatch[1]);
    const user = db.users.find(u => u.id === uid);
    if (!user) return { code: 401, message: '用户不存在', data: null };
    const { password: _, ...info } = user;
    return { code: 0, message: 'ok', data: info };
  },

  logout() {
    return { code: 0, message: '退出成功', data: null };
  },

  // ---- 工作台 ----
  dashboardSummary() {
    return {
      code: 0, message: 'ok',
      data: {
        yesterday_consume: 1256800,
        yesterday_grant: 89500,
        period_consume: 8523400,
        month_consume: 35680000,
        month_new_orders: 128,
        customer_total: 37,
        yesterday_growth: 12.5,
        period_growth: 8.7,
        updated_at: '2026-08-28 14:30:00',
      },
    };
  },

  dashboardRealtime() {
    return {
      code: 0, message: 'ok',
      data: {
        inner_port: 356800,
        outer_port: 128500,
        group: 89600,
        total: 574900,
        updated_at: '2026-08-28 14:30:00',
      },
    };
  },

  dashboardCharts(timeDim: string) {
    const factor = timeDim === 'today' ? 1 : timeDim === 'week' ? 7 : timeDim === 'month' ? 30 : 365;
    return {
      code: 0, message: 'ok',
      data: {
        group_consume: [
          { name: '优选集团', value: Math.round(3560000 * factor / 30) },
          { name: '智云集团', value: Math.round(2890000 * factor / 30) },
          { name: '鼎盛集团', value: Math.round(2150000 * factor / 30) },
          { name: '华信集团', value: Math.round(1680000 * factor / 30) },
          { name: '其他', value: Math.round(1200000 * factor / 30) },
        ],
        sales_consume: [
          { name: '张伟', value: Math.round(1568000 * factor / 30) },
          { name: '李娜', value: Math.round(1320000 * factor / 30) },
          { name: '王强', value: Math.round(1080000 * factor / 30) },
          { name: '赵敏', value: Math.round(956000 * factor / 30) },
          { name: '刘洋', value: Math.round(780000 * factor / 30) },
        ],
        port_profit: [
          { name: '巨量千川', value: 45 },
          { name: '腾讯广告', value: 25 },
          { name: '磁力引擎', value: 18 },
          { name: '小红书商业', value: 12 },
        ],
        dept_consume: [
          { name: '商务一部', value: 42 },
          { name: '商务二部', value: 35 },
          { name: '商务三部', value: 23 },
        ],
        port_consume: [
          { name: '巨量千川', value: 38 },
          { name: '腾讯广告', value: 26 },
          { name: '磁力引擎', value: 18 },
          { name: '小红书商业', value: 12 },
          { name: '百度营销', value: 6 },
        ],
        trend_line: Array.from({ length: 7 }, (_, i) => ({
          date: `08-${String(22 + i).padStart(2, '0')}`,
          value: Math.round((800000 + ((i * 37) % 5) * 90000) * (factor / 30)),
        })),
        time_dim: timeDim,
      },
    };
  },

  // 排行榜：按端口维度（全部/内部/外部）与时间维度（本周/本月/本年）真实派生数据并重新排序
  dashboardRankings(port: string, timeDim: string) {
    const timeFactor = timeDim === 'week' ? 1 : timeDim === 'month' ? 4.3 : 52;
    const scale = (v: number) => Math.round(v * timeFactor);
    // 按端口维度取值并降序重排名（保留额外字段）
    const rankBy = <T extends { inner: number; outer: number }>(rows: T[], extra: (r: T, value: number) => Record<string, any>) => {
      const valueOf = (r: T) => (port === 'inner' ? r.inner : port === 'outer' ? r.outer : r.inner + r.outer);
      return [...rows]
        .map((r) => ({ ...extra(r, scale(valueOf(r))), value: scale(valueOf(r)) }))
        .sort((a, b) => b.value - a.value)
        .map((x, i) => ({ ...x, rank: i + 1 }));
    };

    const salesBase = [
      { name: '张伟', inner: 1120000, outer: 448000 },
      { name: '李娜', inner: 956000, outer: 364000 },
      { name: '王强', inner: 780000, outer: 300000 },
      { name: '赵敏', inner: 680000, outer: 276000 },
      { name: '刘洋', inner: 550000, outer: 230000 },
    ];
    const groupBase = [
      { name: '优选科技集团', inner: 2460000, outer: 1100000, rate: 7.7 },
      { name: '智云教育集团', inner: 1980000, outer: 910000, rate: 7.0 },
      { name: '鼎盛商贸集团', inner: 1350000, outer: 800000, rate: -2.5 },
      { name: '华信金融集团', inner: 1180000, outer: 500000, rate: 8.0 },
      { name: '鲜达生活集团', inner: 820000, outer: 430000, rate: 8.5 },
    ];
    const portBase = [
      { name: '巨量千川', inner: 3680000, outer: 1600000 },
      { name: '腾讯广告', inner: 2200000, outer: 950000 },
      { name: '磁力引擎', inner: 1150000, outer: 530000 },
      { name: '小红书商业', inner: 640000, outer: 280000 },
      { name: '百度营销', inner: 380000, outer: 180000 },
    ];
    const industryBase = [
      { name: '电商', inner: 3100000, outer: 1460000 },
      { name: '教育', inner: 1980000, outer: 910000 },
      { name: '金融', inner: 1450000, outer: 700000 },
      { name: '本地生活', inner: 1120000, outer: 560000 },
      { name: '家居', inner: 830000, outer: 420000 },
    ];
    const newOpenBase = [
      { name: '张伟', inner: 12, outer: 6, unit: 568000 },
      { name: '李娜', inner: 10, outer: 5, unit: 456000 },
      { name: '王强', inner: 8, outer: 4, unit: 320000 },
      { name: '赵敏', inner: 7, outer: 3, unit: 280000 },
      { name: '刘洋', inner: 5, outer: 3, unit: 220000 },
    ];

    // 新开排行以开单数为排序依据，消耗随时间维度缩放（新单不随端口切分）
    const newOpenRank = [...newOpenBase]
      .map((r) => ({ dept: r.name, count: r.inner + r.outer, consume: scale(r.unit) }))
      .sort((a, b) => b.count - a.count)
      .map((x, i) => ({ ...x, rank: i + 1 }));

    return {
      code: 0, message: 'ok',
      data: {
        sales: rankBy(salesBase, (r, value) => ({
          name: r.name,
          value,
          inner_consume: scale(r.inner),
          outer_consume: scale(r.outer),
        })),
        group: rankBy(groupBase, (r, value) => ({
          name: r.name,
          value,
          increment: Math.round(value * r.rate / 100),
          rate: r.rate,
        })),
        port: rankBy(portBase, (r, value) => ({ name: r.name, value })),
        industry: rankBy(industryBase, (r, value) => ({ name: r.name, value })),
        new_open: newOpenRank,
      },
    };
  },

  dashboardTargets() {
    return {
      code: 0, message: 'ok',
      data: {
        list: [
          { department: '商务一部', annual_target: 80000000, actual: 56800000, rate: 71.0, month_target: 8000000, month_actual: 6520000, month_rate: 81.5 },
          { department: '商务二部', annual_target: 60000000, actual: 42500000, rate: 70.8, month_target: 6000000, month_actual: 4890000, month_rate: 81.5 },
          { department: '商务三部', annual_target: 40000000, actual: 28600000, rate: 71.5, month_target: 4000000, month_actual: 3120000, month_rate: 78.0 },
          { department: '视频部', annual_target: 15000000, actual: 10200000, rate: 68.0, month_target: 1500000, month_actual: 1080000, month_rate: 72.0 },
        ],
        total: { annual_target: 195000000, actual: 138100000, rate: 70.8 },
      },
    };
  },

  dashboardPerformance() {
    return {
      code: 0, message: 'ok',
      data: {
        avg_score: 82.5,
        leader: '陈静',
        members: [
          { name: '张伟', score: 92, status: '已确认' },
          { name: '李娜', score: 88, status: '已确认' },
          { name: '王强', score: 78, status: '待确认' },
          { name: '赵敏', score: 85, status: '已确认' },
          { name: '刘洋', score: 72, status: '待确认' },
          { name: '陈静', score: 95, status: '已确认' },
        ],
        tasks: {
          total: 24,
          confirmed: 18,
          pending: 6,
        },
      },
    };
  },

  // ---- 通用列表 ----
  list: mockList,
  get: mockGet,
  create: mockCreate,
  update: mockUpdate,
  delete: mockDelete,
  batchDelete: mockBatchDelete,

  // 更新状态（通用）
  updateStatus(collection: keyof MockDb, id: number, status: string, remark: string) {
    const list = db[collection] as any[];
    const item = list.find((x: any) => x.id === id);
    if (!item) return { code: 404, message: '记录不存在', data: null };
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    item.status = status;
    if (remark !== undefined) item.remark = remark;
    item.updated_at = now;
    return { code: 0, message: '状态已更新', data: item };
  },

  // 面试评价
  evaluateInterview(id: number, data: any) {
    const item = db.interviews.find((x: any) => x.id === id);
    if (!item) return { code: 404, message: '记录不存在', data: null };
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    item.score = Number(data.score) || 0;
    item.evaluation = data.evaluation || '';
    item.suggestion = data.suggestion || '';
    item.status = data.status || 'passed';
    item.evaluated_at = now;
    item.updated_at = now;
    return { code: 0, message: '评价已提交', data: item };
  },

  // 安排下一轮面试
  arrangeNextInterview(id: number, data: any) {
    const current = db.interviews.find((x: any) => x.id === id);
    if (!current) return { code: 404, message: '记录不存在', data: null };
    const roundMap: Record<string, string> = { '初面': '复试', '复试': '终面' };
    const nextRound = roundMap[current.round] || '复试';
    const newItem = {
      id: db.interviews.length + 1,
      interview_no: `IT${Date.now().toString().slice(-5)}`,
      candidate_name: current.candidate_name,
      position: current.position,
      round: nextRound,
      interviewer_name: data.interviewer_name || '张伟',
      interview_time: data.interview_time || '',
      interview_mode: data.interview_mode || 'onsite',
      status: 'pending',
      score: 0,
      evaluation: '',
      suggestion: '',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    db.interviews.push(newItem);
    return { code: 0, message: `已安排${nextRound}`, data: newItem };
  },

  // 签到统计
  checkinStats(date: string) {
    const target = date || new Date().toISOString().slice(0, 10);
    const list = db.checkins.filter((c: any) => {
      const d = (c.appointment_time || '').slice(0, 10);
      return d === target;
    });
    const total = list.length;
    const checked = list.filter((c: any) => c.status === 'checked_in').length;
    const absent = list.filter((c: any) => c.status === 'absent').length;
    const late = list.filter((c: any) => c.status === 'late').length;
    const pending = list.filter((c: any) => c.status === 'pending').length;
    return { code: 0, message: 'ok', data: { date: target, total, checked, absent, late, pending } };
  },

  // 登记签到
  registerCheckin(id: number, data: any) {
    const item = db.checkins.find((x: any) => x.id === id);
    if (!item) return { code: 404, message: '记录不存在', data: null };
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const appt = item.appointment_time || '';
    // 判断是否迟到（> 预约时间 10 分钟）
    const apptTime = new Date(appt.replace(' ', 'T')).getTime();
    const nowTime = new Date().getTime();
    const isLate = apptTime && nowTime - apptTime > 10 * 60 * 1000;
    item.checkin_time = data.checkin_time || now;
    item.checkin_method = data.checkin_method || '前台扫码';
    item.status = isLate ? 'late' : 'checked_in';
    if (data.remark) item.remark = data.remark;
    item.updated_at = now;
    return { code: 0, message: '签到成功', data: item };
  },

  // 标记未到
  markAbsent(id: number, remark: string) {
    const item = db.checkins.find((x: any) => x.id === id);
    if (!item) return { code: 404, message: '记录不存在', data: null };
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    item.status = 'absent';
    item.remark = remark || '未按时到场';
    item.updated_at = now;
    return { code: 0, message: '已标记未到', data: item };
  },

  // 招聘计划统计
  recruitPlanStats() {
    const list = db.recruitPlans as any[];
    const total = list.length;
    const recruiting = list.filter((r) => r.status === 'recruiting').length;
    const completed = list.filter((r) => r.status === 'completed').length;
    const totalHeadcount = list.reduce((s, r) => s + (Number(r.headcount) || 0), 0);
    const totalOnboarded = list.reduce((s, r) => s + (Number(r.onboarded) || 0), 0);
    const completionRate = totalHeadcount > 0 ? +(totalOnboarded / totalHeadcount * 100).toFixed(1) : 0;
    const thisMonthOnboard = 5; // 模拟：本月入职人数
    return { code: 0, message: 'ok', data: { total, recruiting, completed, completionRate, totalHeadcount, totalOnboarded, thisMonthOnboard } };
  },

  // 跟记录
  addFollowUp(_entity: string, _id: number, data: any) {
    return { code: 0, message: '跟进记录已添加', data: { id: Date.now(), ...data } };
  },

  getFollowUps(_entity: string, _id: number) {
    return {
      code: 0, message: 'ok',
      data: [
        { id: 1, content: '首次电话沟通，客户对千川投放有兴趣，约下周面谈', follow_type: '电话', created_at: '2026-08-20 10:30:00', creator_name: '张伟' },
        { id: 2, content: '面谈详细沟通投放方案，客户意向度高，待确认预算', follow_type: '拜访', created_at: '2026-08-22 15:00:00', creator_name: '张伟' },
        { id: 3, content: '客户确认50万预算，进入合同流程', follow_type: '微信', created_at: '2026-08-25 09:20:00', creator_name: '张伟' },
      ],
    };
  },

  // 审批：支持多级流转（与真实后端 updateBusinessStatus 口径一致）
  approve(collection: keyof MockDb, id: number, action: string, remark: string) {
    const list = db[collection] as any[];
    const item = list.find((x: any) => x.id === id);
    if (!item) return { code: 404, message: '记录不存在', data: null };
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    item.updated_at = now;

    // 计算总审批级数（开户：<10万1级 / ≥10万且<50万2级 / ≥50万3级；采购：<5000元1级 / ≥5000元2级）
    const amount = item.apply_amount ?? item.total_amount ?? 0;
    let totalLevels = 1;
    let rejectLevels: string[] = ['manager'];
    if (collection === 'accountApplications') {
      if (amount >= 500000) { totalLevels = 3; rejectLevels = ['manager', 'finance', 'gm']; }
      else if (amount >= 100000) { totalLevels = 2; rejectLevels = ['manager', 'finance']; }
      else { totalLevels = 1; rejectLevels = ['manager']; }
    } else if (collection === 'purchaseReqs') {
      if (amount >= 5000) { totalLevels = 2; rejectLevels = ['manager', 'gm']; }
      else { totalLevels = 1; rejectLevels = ['manager']; }
    }

    // 获取当前审批层级（0-based）
    let currentLevel = 0;
    if (item.status === 'approving') currentLevel = 1;
    if (item.status === 'approving2') currentLevel = 2;
    if (item.status === 'pending_approval') currentLevel = 0;

    // ---- 驳回 ----
    if (action !== 'approve') {
      item.reject_step = rejectLevels[currentLevel] || 'manager';
      item.reject_reason = remark || '审批驳回';
      item.status = 'rejected';
      return { code: 0, message: '已驳回', data: item };
    }

    // ---- 通过：按层级流转 ----
    if (item.status === 'pending_approval') {
      // 一级（经理）通过
      if (totalLevels > 1) {
        item.status = 'approving'; // 进入二级
      } else {
        item.status = 'approved';
        item.approved_at = now;
      }
    } else if (item.status === 'approving') {
      // 二级通过
      if (totalLevels > 2) {
        item.status = 'approving2'; // 进入三级
      } else {
        item.status = 'approved';
        item.approved_at = now;
      }
    } else if (item.status === 'approving2') {
      // 三级（总经理）通过 → 终态
      item.status = 'approved';
      item.approved_at = now;
    } else {
      // 其他状态（如已通过）不做流转
      item.status = 'approved';
      item.approved_at = now;
    }
    return { code: 0, message: '审批通过', data: item };
  },

  // 用户列表（脱敏密码）
  users() {
    return {
      code: 0, message: 'ok',
      data: {
        list: db.users.map((u: any) => {
          const { password: _pwd, ...rest } = u;
          return rest;
        }),
        total: db.users.length,
      },
    };
  },

  // 待办列表：按状态分组（pending=待处理 / done=已处理 / initiated=我发起的）
  todoList(params: Record<string, any>) {
    const { page, pageSize, sortBy, sortOrder } = parseQueryParams(params);
    const tab = params.status || 'pending';
    let list: any[];
    if (tab === 'initiated') {
      list = db.todos.filter((t: any) => t.is_initiated_by_me);
    } else if (tab === 'done') {
      list = db.todos.filter((t: any) => t.status === 'approved' || t.status === 'rejected');
    } else {
      list = db.todos.filter((t: any) => t.status === 'pending');
    }
    list = sortList(list, sortBy, sortOrder);
    const paged = paginate(list, page, pageSize);
    return { code: 0, message: 'ok', data: { list: paged.list, total: paged.total, page, pageSize } };
  },

  // 公海领取/分配
  claimLead(id: number) {
    const lead = db.publicLeads.find(l => l.id === id);
    if (lead) {
      lead.assign_status = 'assigned';
      lead.assigned_name = '当前用户';
    }
    return { code: 0, message: '领取成功', data: null };
  },

  batchClaimLeads(ids: number[]) {
    db.publicLeads.forEach(l => {
      if (ids.includes(l.id)) {
        l.assign_status = 'assigned';
        l.assigned_name = '当前用户';
      }
    });
    return { code: 0, message: `成功领取 ${ids.length} 条`, data: null };
  },

  batchAssignLeads(ids: number[], assignedTo: number) {
    const user = db.users.find(u => u.id === assignedTo);
    db.publicLeads.forEach(l => {
      if (ids.includes(l.id)) {
        l.assign_status = 'assigned';
        l.assigned_to = assignedTo;
        l.assigned_name = user?.name || '负责人';
      }
    });
    return { code: 0, message: `成功分配 ${ids.length} 条`, data: null };
  },

  autoAssignLeads() {
    // 按轮询规则分配所有 pending 客资给销售人员
    const sales = db.users.filter(u => u.role === 'sales');
    if (sales.length === 0) return { code: 1, message: '没有可用的商务人员', data: null };
    const pending = db.publicLeads.filter(l => l.assign_status === 'pending');
    pending.forEach((l, i) => {
      const seller = sales[i % sales.length];
      l.assign_status = 'assigned';
      l.assigned_to = seller.id;
      l.assigned_name = seller.name;
    });
    return { code: 0, message: `已自动分配 ${pending.length} 条`, data: { count: pending.length } };
  },

  // 生成采购订单
  generatePurchaseOrder(id: number) {
    const req = (db.purchaseReqs as any[]).find((r: any) => r.id === id);
    if (!req) return { code: 404, message: '采购申请不存在', data: null };
    if (req.status !== 'approved') return { code: 1, message: '只有已通过的申请才能生成采购订单', data: null };
    if (req.generated_order) return { code: 1, message: '已生成采购订单，无需重复生成', data: null };
    req.generated_order = true;
    // 在采购订单表新增一条
    const orderNo = `CGDD${String(db.purchaseOrders.length + 1).padStart(6, '0')}`;
    const order = {
      id: db.purchaseOrders.length + 1,
      order_id: orderNo,
      req_id: req.req_no,
      supplier: '默认供应商',
      total_amount: req.total_amount,
      status: '待收货',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    db.purchaseOrders.push(order as never);
    return { code: 0, message: '采购订单已生成', data: order };
  },

  // ---- 无效客资 ----
  // ---- 公海客资 ----
  publicLeadList(params: Record<string, any>) {
    const { page, pageSize, sortBy, sortOrder, keyword } = parseQueryParams(params);
    let list = [...db.publicLeads];
    if (keyword) list = filterByFields(list, keyword, ['entity_name', 'lead_id', 'contact_name']);
    list = filterByExact(list, params, ['lead_level', 'primary_industry', 'secondary_industry', 'assign_status']);
    if (params.creator_id && params.creator_id !== 'all') {
      list = list.filter((x: any) => String(x.creator_id) === String(params.creator_id));
    }
    if (params.entered_rangeStart) list = list.filter((x: any) => (x.entered_at || '') >= params.entered_rangeStart);
    if (params.entered_rangeEnd) list = list.filter((x: any) => (x.entered_at || '') <= params.entered_rangeEnd + ' 23:59:59');
    list = sortList(list, sortBy, sortOrder);
    const paged = paginate(list, page, pageSize);
    return { code: 0, message: 'ok', data: { list: paged.list, total: paged.total, page, pageSize } };
  },

  // ---- 无效客资 ----
  invalidLeadList(params: Record<string, any>) {
    const { page, pageSize, sortBy, sortOrder, keyword } = parseQueryParams(params);
    let list = [...db.invalidLeads];
    if (keyword) list = filterByFields(list, keyword, ['entity_name', 'lead_id']);
    list = filterByExact(list, params, ['lead_level', 'primary_industry', 'invalid_reason']);
    if (params.start_date) list = list.filter((x: any) => x.marked_at >= params.start_date);
    if (params.end_date) list = list.filter((x: any) => x.marked_at <= params.end_date + ' 23:59:59');
    list = sortList(list, sortBy, sortOrder);
    const paged = paginate(list, page, pageSize);
    return { code: 0, message: 'ok', data: { list: paged.list, total: paged.total, page, pageSize } };
  },
  invalidLeadRemove(id: number) { return mockDelete('invalidLeads' as any, id); },
  invalidLeadBatchRemove(ids: number[]) { return mockBatchDelete('invalidLeads' as any, ids); },
  // 恢复到公海：从无效客资移到公海客资池
  invalidLeadRestore(id: number) {
    const idx = db.invalidLeads.findIndex(x => x.id === id);
    if (idx === -1) return { code: 404, message: '记录不存在', data: null };
    const item = db.invalidLeads[idx];
    const newId = db.publicLeads.length + 1;
    db.publicLeads.push({
      id: newId,
      lead_id: `GH${String(newId).padStart(5, '0')}`,
      entity_name: item.entity_name,
      lead_level: item.lead_level,
      primary_industry: item.primary_industry,
      secondary_industry: item.secondary_industry,
      assign_status: 'pending',
      assigned_to: null,
      assigned_name: '',
      entered_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      creator_id: item.marked_by_id || 1,
      creator_name: item.marked_by || '系统',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      contact_name: item.contact_name,
      contact_phone: item.contact_phone,
      source: item.source,
      restored_from_invalid: 1,
    } as any);
    db.invalidLeads.splice(idx, 1);
    return { code: 0, message: '已恢复到公海客资池', data: null };
  },
  invalidLeadBatchRestore(ids: number[]) {
    let count = 0;
    ids.forEach(id => {
      const item = db.invalidLeads.find(x => x.id === id);
      if (!item) return;
      const newId = db.publicLeads.length + 1;
      db.publicLeads.push({
        id: newId,
        lead_id: `GH${String(newId).padStart(5, '0')}`,
        entity_name: item.entity_name,
        lead_level: item.lead_level,
        primary_industry: item.primary_industry,
        secondary_industry: item.secondary_industry,
        assign_status: 'pending',
        assigned_to: null,
        assigned_name: '',
        entered_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        creator_id: item.marked_by_id || 1,
        creator_name: item.marked_by || '系统',
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        contact_name: item.contact_name,
        contact_phone: item.contact_phone,
        source: item.source,
        restored_from_invalid: 1,
      } as any);
      count++;
    });
    const set = new Set(ids);
    db.invalidLeads = db.invalidLeads.filter(x => !set.has(x.id)) as any;
    return { code: 0, message: `已恢复 ${count} 条到公海`, data: { count } };
  },
  // 公海客资标记无效
  markPublicLeadInvalid(id: number, reason: string) {
    const idx = db.publicLeads.findIndex(x => x.id === id);
    if (idx === -1) return { code: 404, message: '记录不存在', data: null };
    const item = db.publicLeads[idx];
    const newId = db.invalidLeads.length + 1;
    db.invalidLeads.push({
      id: newId,
      lead_id: `WX${String(newId).padStart(5, '0')}`,
      entity_name: item.entity_name,
      lead_level: item.lead_level,
      primary_industry: item.primary_industry,
      secondary_industry: item.secondary_industry,
      invalid_reason: reason || '其他',
      entered_at: item.entered_at,
      marked_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      marked_by: '当前用户',
      marked_by_id: 1,
      creator_name: item.creator_name,
      creator_id: item.creator_id,
      contact_name: item.contact_name,
      contact_phone: item.contact_phone,
      source: item.source,
    } as any);
    db.publicLeads.splice(idx, 1);
    return { code: 0, message: '已标记为无效客资', data: null };
  },

  // ---- 客户联系人 ----
  customerContactList(customerId: number) {
    const list = db.customerContacts.filter((x: any) => x.customer_id === customerId);
    return { code: 0, message: 'ok', data: { list, total: list.length } };
  },
  customerContactCreate(data: any) {
    if (data.is_primary) {
      db.customerContacts.forEach((c: any) => {
        if (c.customer_id === data.customer_id) c.is_primary = 0;
      });
    }
    return mockCreate('customerContacts' as any, data);
  },
  customerContactUpdate(id: number, data: any) {
    if (data.is_primary) {
      const item = db.customerContacts.find((c: any) => c.id === id);
      if (item) {
        db.customerContacts.forEach((c: any) => {
          if (c.customer_id === item.customer_id) c.is_primary = 0;
        });
      }
    }
    return mockUpdate('customerContacts' as any, id, data);
  },
  customerContactRemove(id: number) { return mockDelete('customerContacts' as any, id); },

  // ---- 客户跟进记录 ----
  customerFollowUpList(customerId: number) {
    const list = db.customerFollowUps
      .filter((x: any) => x.customer_id === customerId)
      .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
    return { code: 0, message: 'ok', data: { list, total: list.length } };
  },
  customerFollowUpAdd(data: any) {
    return mockCreate('customerFollowUps' as any, data);
  },
  customerFollowUpUpdate(id: number, data: any) {
    return mockUpdate('customerFollowUps' as any, id, data);
  },
  customerFollowUpDelete(id: number) {
    return mockDelete('customerFollowUps' as any, id);
  },

  // ---- 提成规则 ----
  commissionRuleList(params: Record<string, any>) {
    const { page, pageSize, sortBy, sortOrder } = parseQueryParams(params);
    let list = [...db.commissionRules];
    if (params.biz_type) list = list.filter((x: any) => x.biz_type === params.biz_type);
    list = sortList(list, sortBy, sortOrder);
    const paged = paginate(list, page, pageSize);
    return { code: 0, message: 'ok', data: { list: paged.list.map((x: any) => ({ ...x, tiers: JSON.parse(x.tiers) })), total: paged.total, page, pageSize } };
  },
  commissionRuleAll(params: Record<string, any>) {
    let list = [...db.commissionRules];
    if (params.biz_type) list = list.filter((x: any) => x.biz_type === params.biz_type && x.status === 'active');
    return { code: 0, message: 'ok', data: list.map((x: any) => ({ ...x, tiers: JSON.parse(x.tiers) })) };
  },
  commissionRuleCreate(data: any) {
    const tiers = typeof data.tiers === 'string' ? data.tiers : JSON.stringify(data.tiers || []);
    return mockCreate('commissionRules' as any, { ...data, tiers });
  },
  commissionRuleUpdate(id: number, data: any) {
    const tiers = data.tiers ? (typeof data.tiers === 'string' ? data.tiers : JSON.stringify(data.tiers)) : undefined;
    const updateData = { ...data };
    if (tiers !== undefined) updateData.tiers = tiers;
    return mockUpdate('commissionRules' as any, id, updateData);
  },
  commissionRuleRemove(id: number) { return mockDelete('commissionRules' as any, id); },

  // ---- 提成计算 ----
  calculateCommission(bizType: string, salesName: string, settleMonth: string, ruleId: number) {
    const rule = db.commissionRules.find((r: any) => r.id === ruleId);
    if (!rule) return { code: 404, message: '提成规则不存在', data: null };
    const tiers = typeof rule.tiers === 'string' ? JSON.parse(rule.tiers) : rule.tiers;
    // 模拟汇总业绩：从开户/消耗/视频订单统计
    let totalAmount = 0;
    if (bizType === 'ad') {
      const apps = db.accountApplications.filter((a: any) =>
        a.applicant_name === salesName && a.created_at?.startsWith(settleMonth.replace('-', '-'))
      );
      const consumes = db.consumptions.filter((c: any) =>
        c.operator_name === salesName && c.consume_date?.startsWith(settleMonth)
      );
      totalAmount = apps.reduce((s: number, a: any) => s + (a.apply_amount || 0), 0)
        + consumes.reduce((s: number, c: any) => s + (c.amount || 0), 0);
    } else {
      const orders = db.videoOrders.filter((v: any) =>
        v.sales_name === salesName && v.created_at?.startsWith(settleMonth)
      );
      totalAmount = orders.reduce((s: number, v: any) => s + (v.amount || 0), 0);
    }
    // 如汇总为0或不足，给个演示值
    if (totalAmount <= 0) totalAmount = 50000 + Math.floor(Math.random() * 500000);
    // 按规则计算提成
    let commission = 0;
    let rate = 0;
    if (rule.calc_mode === 'overall') {
      // 整体档位：找到最高满足档位，全量按该档位比例
      for (const t of tiers) {
        if (totalAmount >= t.min) rate = t.rate;
      }
      commission = totalAmount * rate / 100;
    } else {
      // 阶梯累计：每个区间的金额按区间比例
      for (const t of tiers) {
        if (totalAmount <= t.min) break;
        const tierAmount = Math.min(totalAmount, t.max) - t.min;
        commission += tierAmount * t.rate / 100;
      }
    }
    return { code: 0, message: 'ok', data: { base_amount: totalAmount, rate, commission: Math.round(commission * 100) / 100, rule_name: rule.rule_name } };
  },

  // ---- 付款计划 ----
  paymentPlanList(params: Record<string, any>) {
    const { page, pageSize } = parseQueryParams(params);
    let list = [...db.paymentPlans];
    if (params.fee_id) list = list.filter((x: any) => x.fee_id === Number(params.fee_id));
    if (params.contract_id) list = list.filter((x: any) => x.contract_id === Number(params.contract_id));
    list.sort((a: any, b: any) => a.period_no - b.period_no);
    const paged = paginate(list, page, pageSize);
    return { code: 0, message: 'ok', data: { list: paged.list, total: paged.total, page, pageSize } };
  },
  paymentPlanCreate(data: any) { return mockCreate('paymentPlans' as any, data); },
  paymentPlanUpdate(id: number, data: any) { return mockUpdate('paymentPlans' as any, id, data); },
  paymentPlanRemove(id: number) { return mockDelete('paymentPlans' as any, id); },

  // ---- 付款记录 ----
  paymentRecordList(params: Record<string, any>) {
    const { page, pageSize } = parseQueryParams(params);
    let list = [...db.paymentRecords];
    if (params.plan_id) list = list.filter((x: any) => x.plan_id === Number(params.plan_id));
    if (params.contract_id) list = list.filter((x: any) => x.contract_id === Number(params.contract_id));
    list = sortList(list, 'pay_date', 'desc');
    const paged = paginate(list, page, pageSize);
    return { code: 0, message: 'ok', data: { list: paged.list, total: paged.total, page, pageSize } };
  },
  // 登记付款：新增付款记录并更新计划状态
  paymentRecordAdd(data: any) {
    const record = mockCreate('paymentRecords' as any, data);
    if (record.code === 0 && data.plan_id) {
      const plan = db.paymentPlans.find((p: any) => p.id === data.plan_id);
      if (plan) {
        plan.paid_amount = (plan.paid_amount || 0) + Number(data.amount || 0);
        if (plan.paid_amount >= plan.plan_amount) {
          plan.status = 'paid';
        } else if (plan.paid_amount > 0) {
          plan.status = 'partial';
        }
        plan.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
    }
    return record;
  },

  // ---- 审批会签/或签节点级操作 ----
  stepApprove(instanceId: number, stepId: number, comment?: string) {
    const steps = (db.approvalSteps || []) as any[];
    const step = steps.find(s => s.id === stepId && s.instance_id === instanceId);
    if (!step) return { code: 404, message: '审批节点不存在', data: null };
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const mode = step.mode || 'single';
    const subApprovers: any[] = step.sub_approvers ? (typeof step.sub_approvers === 'string' ? JSON.parse(step.sub_approvers) : step.sub_approvers) : [];

    // 单人模式：降级为通过当前节点
    if (mode === 'single' || subApprovers.length === 0) {
      step.status = 'approved';
      step.approved_at = now;
      step.comment = comment || '';
      // 流转下一节点
      advanceNextStep(instanceId);
      return { code: 0, message: '已通过', data: null };
    }

    // 找到当前审批人（模拟：第一个pending的人作为当前操作者）
    const approver = subApprovers.find(a => a.status === 'pending');
    if (!approver) return { code: 1, message: '没有待审批人', data: null };
    approver.status = 'approved';
    approver.comment = comment || '';
    approver.approved_at = now;

    if (mode === 'countersign') {
      // 会签：所有人通过才通过
      const allApproved = subApprovers.every(a => a.status === 'approved');
      if (allApproved) {
        step.status = 'approved';
        step.approved_at = now;
        advanceNextStep(instanceId);
      } else {
        step.status = 'processing'; // 会签中
      }
    } else if (mode === 'or_sign') {
      // 或签：任一人通过即通过，其余人标记为others_handled
      subApprovers.forEach(a => {
        if (a.status === 'pending') a.status = 'others_handled';
      });
      step.status = 'approved';
      step.approved_at = now;
      advanceNextStep(instanceId);
    }
    step.sub_approvers = JSON.stringify(subApprovers);
    updateInstanceStatus(instanceId);
    return { code: 0, message: '已通过', data: null };
  },
  stepReject(instanceId: number, stepId: number, comment?: string) {
    const steps = (db.approvalSteps || []) as any[];
    const step = steps.find(s => s.id === stepId && s.instance_id === instanceId);
    if (!step) return { code: 404, message: '审批节点不存在', data: null };
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const mode = step.mode || 'single';
    const subApprovers: any[] = step.sub_approvers ? (typeof step.sub_approvers === 'string' ? JSON.parse(step.sub_approvers) : step.sub_approvers) : [];

    if (mode === 'single' || subApprovers.length === 0) {
      step.status = 'rejected';
      step.rejected_at = now;
      step.comment = comment || '';
    } else {
      const approver = subApprovers.find(a => a.status === 'pending');
      if (approver) {
        approver.status = 'rejected';
        approver.comment = comment || '';
        approver.rejected_at = now;
      }
      // 任一人驳回，整个节点驳回
      step.status = 'rejected';
      step.sub_approvers = JSON.stringify(subApprovers);
    }
    const instance = (db.approvalInstances || []).find((i: any) => i.id === instanceId);
    if (instance) {
      instance.status = 'rejected';
      instance.result = 'rejected';
    }
    return { code: 0, message: '已驳回', data: null };
  },

  // ---- 审批查询 ----
  getApprovalByBusiness(businessType: string, businessId: number) {
    const instances = (db.approvalInstances || []) as any[];
    const inst = instances.find((i: any) => i.business_type === businessType && i.business_id === businessId);
    return { code: 0, message: 'ok', data: inst || null };
  },
  getApprovalSteps(instanceId: number) {
    const steps = (db.approvalSteps || []) as any[];
    const list = steps
      .filter((s: any) => s.instance_id === instanceId)
      .sort((a: any, b: any) => a.step_order - b.step_order);
    return { code: 0, message: 'ok', data: list };
  },
  getApprovalInstance(id: number) {
    const instances = (db.approvalInstances || []) as any[];
    const inst = instances.find((i: any) => i.id === id);
    return { code: 0, message: 'ok', data: inst || null };
  },
  submitApproval(data: { businessType: string; businessId: number; title?: string }) {
    const instances = (db.approvalInstances || []) as any[];
    const steps = (db.approvalSteps || []) as any[];
    // 检查是否已存在
    const existing = instances.find((i: any) => i.business_type === data.businessType && i.business_id === data.businessId);
    if (existing) return { code: 400, message: '审批已存在', data: existing };
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const nextId = instances.length > 0 ? Math.max(...instances.map((i: any) => i.id)) + 1 : 1;
    const instance = {
      id: nextId,
      business_type: data.businessType,
      business_id: data.businessId,
      title: data.title || '审批申请',
      applicant_name: '当前用户',
      applicant_id: 0,
      status: 'processing',
      result: 'processing',
      created_at: now,
    };
    instances.push(instance);
    // 简化：给1个审批节点（经理审批）
    const stepId = steps.length > 0 ? Math.max(...steps.map((s: any) => s.id)) + 1 : 100;
    steps.push({
      id: stepId, instance_id: nextId, step_order: 1,
      step_name: '经理审批', mode: 'single',
      approver_name: '李经理', approver_id: 2,
      status: 'pending', comment: '', approved_at: null, sub_approvers: null,
    });
    return { code: 0, message: '已提交', data: instance };
  },

  // 人资看板
  hrDashboard() {
    return {
      code: 0, message: 'ok',
      data: {
        active_count: 36,
        this_month_join: 4,
        this_month_leave: 2,
        hiring_positions: 8,
        trend_data: {
          months: ['3月', '4月', '5月', '6月', '7月', '8月'],
          join: [5, 3, 4, 6, 4, 4],
          leave: [1, 2, 1, 3, 2, 2],
        },
        dept_data: [
          { name: '商务一部', value: 12 },
          { name: '商务二部', value: 10 },
          { name: '财务部', value: 4 },
          { name: '人事部', value: 3 },
          { name: '技术部', value: 5 },
          { name: '运营部', value: 2 },
        ],
      },
    };
  },

  // 行业大盘
  industryOverview() {
    return {
      code: 0, message: 'ok',
      data: {
        trend: {
          dates: ['08-01', '08-07', '08-14', '08-21', '08-28'],
          series: [
            { name: '电商', data: [320, 350, 380, 420, 456] },
            { name: '教育', data: [180, 195, 210, 205, 220] },
            { name: '金融', data: [150, 168, 175, 182, 195] },
            { name: '本地生活', data: [120, 135, 145, 160, 175] },
          ],
        },
        cost: {
          industries: ['电商', '教育', '游戏', '金融', '本地生活', '家居', '美妆'],
          cpc: [2.5, 3.2, 4.5, 5.8, 2.1, 3.5, 4.0],
          cpm: [25, 32, 45, 58, 21, 35, 40],
        },
        share: [
          { name: '电商', value: 35 },
          { name: '教育', value: 18 },
          { name: '游戏', value: 15 },
          { name: '金融', value: 12 },
          { name: '本地生活', value: 10 },
          { name: '其他', value: 10 },
        ],
      },
    };
  },
};

// 审批辅助函数：在approvalSteps模块内使用
function advanceNextStep(instanceId: number) {
  const steps = (db.approvalSteps || []) as any[];
  const mySteps = steps.filter(s => s.instance_id === instanceId).sort((a, b) => a.step_order - b.step_order);
  const currentIdx = mySteps.findIndex(s => s.status === 'approved' ? false : s.status !== 'rejected' && s.status !== 'completed');
  // 简单逻辑：找到第一个pending/processing的，标记它为已完成，下一个设为pending
  for (let i = 0; i < mySteps.length; i++) {
    if (mySteps[i].status === 'processing' || mySteps[i].status === 'pending') {
      mySteps[i].status = 'approved';
      if (i + 1 < mySteps.length) {
        mySteps[i + 1].status = 'pending';
      }
      break;
    }
  }
  updateInstanceStatus(instanceId);
}
function updateInstanceStatus(instanceId: number) {
  const steps = (db.approvalSteps || []) as any[];
  const mySteps = steps.filter(s => s.instance_id === instanceId);
  const instance = (db.approvalInstances || []).find((i: any) => i.id === instanceId);
  if (!instance) return;
  const anyRejected = mySteps.some(s => s.status === 'rejected');
  const allApproved = mySteps.every(s => s.status === 'approved' || s.status === 'completed');
  if (anyRejected) {
    instance.status = 'rejected';
    instance.result = 'rejected';
  } else if (allApproved && mySteps.length > 0) {
    instance.status = 'approved';
    instance.result = 'approved';
  } else {
    instance.status = 'processing';
    instance.result = 'processing';
  }
}

// 审批种子数据：含会签（合同审批）和或签（支出报销）
function seedApprovals() {
  if (db.approvalInstances.length > 0) return;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // 实例1：合同审批 - 会签进行中（法务已通过，财务待审批）
  db.approvalInstances.push({
    id: 1,
    business_type: 'contract',
    business_id: 1001,
    title: '郑州鼎盛科技广告投放合同审批',
    applicant_name: '张伟',
    applicant_id: 2,
    status: 'processing',
    result: 'processing',
    created_at: '2026-08-25 10:00:00',
  });
  const steps1 = [
    { id: 101, instance_id: 1, step_order: 1, step_name: '部门经理审批', mode: 'single', approver_name: '李娜', approver_id: 3, status: 'approved', comment: '同意', approved_at: '2026-08-25 11:00:00', sub_approvers: null },
    { id: 102, instance_id: 1, step_order: 2, step_name: '法务+财务会签', mode: 'countersign', approver_name: '', approver_id: 0, status: 'processing', comment: '', approved_at: null,
      sub_approvers: JSON.stringify([
        { user_id: 101, name: '陈静', role: '法务', status: 'approved', comment: '合同条款合规', approved_at: '2026-08-26 09:30:00' },
        { user_id: 102, name: '赵敏', role: '财务负责人', status: 'pending', comment: '', approved_at: null },
      ]),
    },
    { id: 103, instance_id: 1, step_order: 3, step_name: '总经理审批', mode: 'single', approver_name: '王总', approver_id: 99, status: 'pending', comment: '', approved_at: null, sub_approvers: null },
  ];
  db.approvalSteps.push(...(steps1 as any));

  // 实例2：支出报销 - 或签节点
  db.approvalInstances.push({
    id: 2,
    business_type: 'expense',
    business_id: 2001,
    title: '商务一部差旅费报销审批',
    applicant_name: '王强',
    applicant_id: 4,
    status: 'processing',
    result: 'processing',
    created_at: '2026-08-27 14:00:00',
  });
  const steps2 = [
    { id: 201, instance_id: 2, step_order: 1, step_name: '部门经理审批', mode: 'single', approver_name: '张伟', approver_id: 2, status: 'approved', comment: '属实，同意', approved_at: '2026-08-27 15:00:00', sub_approvers: null },
    { id: 202, instance_id: 2, step_order: 2, step_name: '财务审批（任一通过）', mode: 'or_sign', approver_name: '', approver_id: 0, status: 'pending', comment: '', approved_at: null,
      sub_approvers: JSON.stringify([
        { user_id: 102, name: '赵敏', role: '财务主管', status: 'pending', comment: '', approved_at: null },
        { user_id: 103, name: '孙丽', role: '财务出纳', status: 'pending', comment: '', approved_at: null },
      ]),
    },
  ];
  db.approvalSteps.push(...(steps2 as any));

  // 实例3：简单审批流 - 已完成（用于历史数据）
  db.approvalInstances.push({
    id: 3,
    business_type: 'purchase',
    business_id: 3001,
    title: '办公设备采购申请',
    applicant_name: '刘洋',
    applicant_id: 5,
    status: 'approved',
    result: 'approved',
    created_at: '2026-08-10 09:00:00',
  });
}

export { mockApi };

// ========== 初始化 ==========
export function initMockMode() {
  if (_mockMode) return; // 防止重复初始化
  seed();
  seedApprovals();
  _mockMode = true;
}
