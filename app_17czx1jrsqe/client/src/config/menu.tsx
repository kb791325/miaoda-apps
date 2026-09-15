import {
  LayoutDashboard,
  Users,
  Megaphone,
  Video,
  FileText,
  Wallet,
  UserCog,
  Building2,
  ClipboardList,
  Settings,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface MenuItem {
  id: string;
  title: string;
  path?: string;
  icon?: ComponentType<{ className?: string }>;
  children?: MenuItem[];
  children2?: MenuItem[]; // 三级菜单
  /** 可见角色；不配置表示全员可见 */
  roles?: string[];
}

export const MENU_LIST: MenuItem[] = [
  {
    id: 'dashboard',
    title: '工作台',
    path: '/dashboard/workbench',
    icon: LayoutDashboard,
  },
  {
    id: 'customer',
    title: '客户管理',
    icon: Users,
    roles: ['admin', 'manager', 'sales'],
    children: [
      {
        id: 'public-sea-group',
        title: '公海管理',
        children2: [
          { id: 'public-sea', title: '公海客资', path: '/customer/public-sea' },
          { id: 'invalid-leads', title: '无效客资', path: '/customer/invalid-leads' },
          { id: 'conversion-analysis', title: '转化分析', path: '/customer/conversion-analysis' },
        ],
      },
      { id: 'clues', title: '线索管理', path: '/customer/clues' },
      { id: 'customers', title: '客户管理', path: '/customer/customers' },
    ],
  },
  {
    id: 'advertising',
    title: '广告业务',
    icon: Megaphone,
    roles: ['admin', 'manager', 'sales'],
    children: [
      { id: 'account-open', title: '开户管理', path: '/advertising/account-open' },
      { id: 'filing', title: '报备管理', path: '/advertising/filing' },
      { id: 'transfer', title: '转户管理', path: '/advertising/transfer' },
      { id: 'commission', title: '提成管理', path: '/advertising/commission' },
    ],
  },
  {
    id: 'video',
    title: '视频业务',
    icon: Video,
    roles: ['admin', 'manager'],
    children: [
      { id: 'video-orders', title: '视频订单', path: '/video/orders' },
      { id: 'video-projects', title: '视频项目', path: '/video/projects' },
      { id: 'actors', title: '演员管理', path: '/video/actors' },
      { id: 'outsourcing', title: '外包管理', path: '/video/outsourcing' },
      { id: 'video-commission', title: '提成管理', path: '/video/commission' },
      { id: 'shooting-cost', title: '拍摄费用', path: '/video/shooting-cost' },
      { id: 'venue-cost', title: '场地费用', path: '/video/venue-cost' },
      { id: 'samples', title: '样品管理', path: '/video/samples' },
    ],
  },
  {
    id: 'contract',
    title: '合同业务',
    icon: FileText,
    roles: ['admin', 'manager', 'sales', 'finance'],
    children: [
      { id: 'contracts', title: '合同管理', path: '/contract/contracts', roles: ['admin', 'manager', 'sales'] },
      { id: 'templates', title: '合同模版', path: '/contract/templates', roles: ['admin', 'manager', 'sales'] },
      { id: 'costs', title: '合同费用', path: '/contract/costs', roles: ['admin', 'finance'] },
    ],
  },
  {
    id: 'finance',
    title: '财务管理',
    icon: Wallet,
    roles: ['admin', 'finance'],
    children: [
      { id: 'customer-detail', title: '客户明细', path: '/finance/customer-detail' },
      { id: 'receipts', title: '收款管理', path: '/finance/receipts' },
      { id: 'recharges', title: '充值管理', path: '/finance/recharges' },
      { id: 'refunds', title: '退款管理', path: '/finance/refunds' },
      { id: 'consumption', title: '消耗管理', path: '/finance/consumption' },
      { id: 'advances', title: '垫款管理', path: '/finance/advances' },
      { id: 'invoices', title: '发票管理', path: '/finance/invoices' },
      { id: 'ports', title: '端口管理', path: '/finance/ports' },
      { id: 'banks', title: '银行管理', path: '/finance/banks' },
      { id: 'costs', title: '成本管理', path: '/finance/costs' },
      { id: 'incomes', title: '收入管理', path: '/finance/incomes' },
      { id: 'expenses', title: '支出管理', path: '/finance/expenses' },
      { id: 'coin-refund', title: '退币管理', path: '/finance/coin-refund' },
      { id: 'rebate', title: '后返管理', path: '/finance/rebate' },
      { id: 'deduction', title: '扣减管理', path: '/finance/deduction' },
      { id: 'incentive', title: '激励管理', path: '/finance/incentive' },
      { id: 'expense-mgmt', title: '费用管理', path: '/finance/expense-mgmt' },
      { id: 'deposit', title: '保证金&押金', path: '/finance/deposit' },
    ],
  },
  {
    id: 'hr',
    title: '人资管理',
    icon: UserCog,
    roles: ['admin', 'hr'],
    children: [
      { id: 'hr-dashboard', title: '人资看板', path: '/hr/dashboard' },
      { id: 'employees', title: '员工管理', path: '/hr/employees' },
      { id: 'resumes', title: '简历管理', path: '/hr/resumes' },
      { id: 'invitations', title: '邀约管理', path: '/hr/invitations' },
      { id: 'interviews', title: '面试管理', path: '/hr/interviews' },
      { id: 'checkin', title: '签到管理', path: '/hr/checkin' },
      { id: 'salary', title: '工资管理', path: '/hr/salary' },
      { id: 'performance', title: '绩效管理', path: '/hr/performance' },
      { id: 'attendance', title: '考勤管理', path: '/hr/attendance' },
      { id: 'recruit-plan', title: '招聘计划', path: '/hr/recruit-plan' },
    ],
  },
  {
    id: 'admin',
    title: '行政管理',
    icon: Building2,
    roles: ['admin', 'hr'],
    children: [
      {
        id: 'purchase-group',
        title: '采购管理',
        children2: [
          { id: 'purchase-requisition', title: '采购申请', path: '/admin/purchase-requisition' },
          { id: 'purchase-order', title: '采购订单', path: '/admin/purchase-order' },
          { id: 'purchase-detail', title: '采购详情', path: '/admin/purchase-detail' },
        ],
      },
      { id: 'assets', title: '资产管理', path: '/admin/assets' },
      { id: 'inventory', title: '库存管理', path: '/admin/inventory' },
      { id: 'stock-in', title: '入库管理', path: '/admin/stock-in' },
      { id: 'requisition', title: '领用管理', path: '/admin/requisition' },
      { id: 'return', title: '归还管理', path: '/admin/return' },
      { id: 'inventory-check', title: '盘点管理', path: '/admin/inventory-check' },
    ],
  },
  {
    id: 'task',
    title: '任务中心',
    icon: ClipboardList,
    children: [
      { id: 'batch-import', title: '批量导入', path: '/task/batch-import' },
      { id: 'batch-export', title: '批量导出', path: '/task/batch-export' },
      { id: 'my-todo', title: '我的待办', path: '/task/my-todo' },
      { id: 'my-drafts', title: '我的草稿', path: '/task/my-drafts' },
      { id: 'collab-tasks', title: '协作任务', path: '/task/collab-tasks' },
    ],
  },
  {
    id: 'system',
    title: '系统管理',
    icon: Settings,
    roles: ['admin'],
    children: [
      {
        id: 'settings-group',
        title: '系统设置',
        children2: [
          { id: 'settings-public-sea', title: '公海设置', path: '/system/settings/public-sea' },
          { id: 'settings-clue', title: '线索设置', path: '/system/settings/clue' },
          { id: 'settings-customer', title: '客户设置', path: '/system/settings/customer' },
          { id: 'settings-alert', title: '预警设置', path: '/system/settings/alert' },
          { id: 'settings-tax', title: '税点设置', path: '/system/settings/tax' },
        ],
      },
      { id: 'organization', title: '组织架构', path: '/system/organization' },
      { id: 'customer-accounts', title: '客户账户', path: '/system/customer-accounts' },
      { id: 'roles', title: '角色权限', path: '/system/roles' },
      { id: 'operation-logs', title: '操作日志', path: '/system/operation-logs' },
      { id: 'login-logs', title: '登录日志', path: '/system/login-logs' },
    ],
  },
  {
    id: 'support',
    title: '业务支持',
    icon: TrendingUp,
    children: [
      { id: 'industry-roi', title: '行业ROI管理', path: '/support/industry-roi' },
      { id: 'competitor', title: '竞品监控', path: '/support/competitor' },
      { id: 'industry-dashboard', title: '行业大盘', path: '/support/industry-dashboard' },
      { id: 'materials', title: '素材库', path: '/support/materials' },
    ],
  },
];

/** 根据路径找面包屑（支持详情页前缀匹配） */
export function findBreadcrumb(path: string): { id: string; title: string; path?: string }[] {
  const result: { id: string; title: string; path?: string }[] = [];
  for (const m of MENU_LIST) {
    if (m.path === path) return [{ id: m.id, title: m.title, path: m.path }];
    if (!m.children) continue;
    for (const c of m.children) {
      if (c.path === path) {
        return [
          { id: m.id, title: m.title },
          { id: c.id, title: c.title, path: c.path },
        ];
      }
      // 前缀匹配：详情页 /customers/123 匹配 /customers 菜单，追加「详情」项
      if (c.path && path.startsWith(`${c.path}/`)) {
        return [
          { id: m.id, title: m.title },
          { id: c.id, title: c.title, path: c.path },
          { id: 'detail', title: '详情' },
        ];
      }
      if (!c.children2) continue;
      for (const cc of c.children2) {
        if (cc.path === path) {
          return [
            { id: m.id, title: m.title },
            { id: c.id, title: c.title },
            { id: cc.id, title: cc.title, path: cc.path },
          ];
        }
        if (cc.path && path.startsWith(`${cc.path}/`)) {
          return [
            { id: m.id, title: m.title },
            { id: c.id, title: c.title },
            { id: cc.id, title: cc.title, path: cc.path },
            { id: 'detail', title: '详情' },
          ];
        }
      }
    }
  }
  return result;
}

export { ChevronRight };
