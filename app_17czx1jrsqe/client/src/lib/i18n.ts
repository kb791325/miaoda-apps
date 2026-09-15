/**
 * 轻量级国际化模块
 * - 以中文文案为 key，英文为译文；中文环境原样返回
 * - 语言偏好持久化到 scopedStorage，切换后全局响应式刷新
 */
import { useSyncExternalStore } from 'react';
import { scopedStorage } from '@lark-apaas/client-toolkit';
import { BUSINESS_DICT } from '@/lib/i18n-business';

export type Lang = 'zh' | 'en';

const STORAGE_KEY = '__mutang_lang';
let currentLang: Lang = (scopedStorage.getItem(STORAGE_KEY) as Lang) || 'zh';

const listeners = new Set<() => void>();

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang) {
  if (currentLang === lang) return;
  currentLang = lang;
  scopedStorage.setItem(STORAGE_KEY, lang);
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 订阅语言变化，语言切换时触发组件重渲染 */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang);
}

const EN_DICT: Record<string, string> = {
  // ===== 系统品牌 =====
  牧唐数智一体化: 'MuTang Digital ERP',
  'ERP 管理系统': 'ERP System',
  系统运行正常: 'System Normal',

  // ===== 顶栏 =====
  首页: 'Home',
  '搜索客户、合同、订单、员工...': 'Search customers, contracts, orders...',
  热门搜索: 'Popular',
  搜索结果: 'Results',
  无相关结果: 'No results found',
  语言切换: 'Language',
  消息通知: 'Notifications',
  全部已读: 'Mark all read',
  全部: 'All',
  审批: 'Approval',
  预警: 'Alert',
  系统: 'System',
  查看全部消息: 'View all messages',
  个人中心: 'Profile',
  修改密码: 'Change Password',
  退出登录: 'Log Out',
  已退出登录: 'Logged out',
  数据范围: 'Data Scope',

  // ===== 角色 / 数据范围 =====
  管理员: 'Admin',
  部门经理: 'Manager',
  商务: 'Sales',
  财务: 'Finance',
  人事: 'HR',
  超级管理员: 'Super Admin',
  全部数据: 'All Data',
  本部门: 'Department',
  本部门及下级: 'Dept. & Sub',
  仅本人: 'Self Only',

  // ===== 列表通用 =====
  查询: 'Search',
  重置: 'Reset',
  导出: 'Export',
  导出当前页: 'Export Page',
  列设置: 'Columns',
  刷新: 'Refresh',
  收起: 'Collapse',
  展开: 'Expand',
  暂无数据: 'No Data',
  调整筛选条件后重试: 'Try adjusting the filters',
  全选: 'Select All',
  选择: 'Select',
  '条/页': 'items/page',
  共: 'Total',
  条: 'items',
  已选: 'Selected',
  项: 'items',
  操作: 'Actions',
  更多: 'More',

  // ===== 一级菜单 =====
  工作台: 'Workbench',
  客户管理: 'Customer',
  广告业务: 'Advertising',
  视频业务: 'Video',
  合同业务: 'Contract',
  财务管理: 'Finance',
  人资管理: 'HR',
  行政管理: 'Admin',
  任务中心: 'Task Center',
  系统管理: 'System',
  业务支持: 'Support',

  // ===== 二级/三级菜单 =====
  公海管理: 'Public Sea',
  公海客资: 'Sea Leads',
  无效客资: 'Invalid Leads',
  转化分析: 'Conversion',
  线索管理: 'Leads',
  开户管理: 'Account Opening',
  报备管理: 'Filing',
  转户管理: 'Transfer',
  提成管理: 'Commission',
  视频订单: 'Video Orders',
  视频项目: 'Video Projects',
  演员管理: 'Actors',
  外包管理: 'Outsourcing',
  拍摄费用: 'Shooting Cost',
  场地费用: 'Venue Cost',
  样品管理: 'Samples',
  合同管理: 'Contracts',
  合同模版: 'Templates',
  合同费用: 'Contract Cost',
  客户明细: 'Customer Detail',
  收款管理: 'Receipts',
  充值管理: 'Recharge',
  退款管理: 'Refunds',
  消耗管理: 'Consumption',
  垫款管理: 'Advances',
  发票管理: 'Invoices',
  端口管理: 'Ports',
  银行管理: 'Banks',
  成本管理: 'Costs',
  收入管理: 'Incomes',
  支出管理: 'Expenses',
  退币管理: 'Coin Refund',
  后返管理: 'Rebate',
  扣减管理: 'Deduction',
  激励管理: 'Incentive',
  费用管理: 'Daily Expense',
  '保证金&押金': 'Deposit',
  人资看板: 'HR Dashboard',
  员工管理: 'Employees',
  简历管理: 'Resumes',
  邀约管理: 'Invitations',
  面试管理: 'Interviews',
  签到管理: 'Check-in',
  工资管理: 'Salary',
  绩效管理: 'Performance',
  考勤管理: 'Attendance',
  招聘计划: 'Recruit Plan',
  采购管理: 'Purchase',
  采购申请: 'Requisition',
  采购订单: 'Purchase Order',
  采购详情: 'Purchase Detail',
  资产管理: 'Assets',
  库存管理: 'Inventory',
  入库管理: 'Stock-in',
  领用管理: 'Issue',
  归还管理: 'Return',
  盘点管理: 'Stocktaking',
  批量导入: 'Batch Import',
  批量导出: 'Batch Export',
  我的待办: 'My Todo',
  协作任务: 'Collaboration',
  系统设置: 'Settings',
  公海设置: 'Sea Settings',
  线索设置: 'Lead Settings',
  客户设置: 'Customer Settings',
  预警设置: 'Alert Settings',
  税点设置: 'Tax Settings',
  组织架构: 'Organization',
  客户账户: 'Accounts',
  角色权限: 'Roles',
  操作日志: 'Operation Logs',
  登录日志: 'Login Logs',
  '行业ROI管理': 'Industry ROI',
  竞品监控: 'Competitors',
  行业大盘: 'Industry Board',
  素材库: 'Materials',

  // ===== 工作台 =====
  '欢迎回来，查看今日数据概览': 'Welcome back, here is today\'s overview',
  昨日消耗: 'Yesterday Spend',
  昨日赠款: 'Yesterday Bonus',
  本周消耗: 'Week Spend',
  本月消耗: 'Month Spend',
  本月新开单: 'New Orders',
  较上期: 'vs prev.',
  今日实时消耗: 'Real-time Spend',
  数据更新于: 'Updated at',
  内部端口: 'Internal Ports',
  外部端口: 'External Ports',
  集团: 'Group',
  数据分析: 'Analytics',
  今日: 'Today',
  本周: 'This Week',
  本月: 'This Month',
  本年: 'This Year',
  集团消耗分布: 'Group Spend Split',
  'Top 商务消耗排行': 'Top Sales Spend',
  端口利润占比: 'Port Profit Split',
  部门消耗占比: 'Dept Spend Split',
  端口消耗分布: 'Port Spend Split',
  集团消耗: 'Group Spend',
  端口利润: 'Port Profit',
  部门消耗: 'Dept Spend',
  端口消耗: 'Port Spend',
  目标详情: 'Targets',
  部门: 'Department',
  年度目标: 'Year Target',
  年度完成: 'Year Done',
  月度目标: 'Month Target',
  月度完成: 'Month Done',
  完成率: 'Rate',
  排行榜: 'Rankings',
  全部端口: 'All Ports',
  商务排行: 'Sales',
  集团排行: 'Groups',
  端口排行: 'Ports',
  行业排行: 'Industries',
  新开排行: 'New Accounts',
  内部: 'Inner',
  外部: 'Outer',
  新开账户: 'New accounts',
  绩效任务: 'Performance',
  部门平均分值: 'Dept Avg Score',
  人参与: 'participants',
  总任务: 'Total Tasks',
  已确认: 'Confirmed',
  待确认: 'Pending',
  员工绩效: 'Employee Performance',

  // ===== 列表框架 =====
  刷新成功: 'Refreshed',
  请输入: 'Enter ',
  至: 'to',

  // ===== 登录页 =====
  '牧唐数智一体化 ERP': 'MuTang Digital ERP',
  '点击即可快速授权登录': 'Click to sign in quickly',
  '正在跳转...': 'Redirecting...',
  '飞书登录': 'Feishu Login',
  其他方式: 'Other Methods',
  切换账号: 'Switch Account',
  手机登录: 'Mobile Login',
  '我已经阅读并且同意': 'I have read and agree to',
  服务协议: 'Terms of Service',
  和: 'and',
  隐私政策: 'Privacy Policy',
  '你将访问"飞书伙伴演示环境2026"的应用，账号不存在的情况下，将自动创建账号。':
    'You will access the "Feishu Partner Demo 2026" app. If no account exists, one will be created automatically.',
  提示: 'Notice',
  '请先同意': 'Please agree to the',
  同意: 'Agree',

  // ===== 顶栏补充 =====
  全屏: 'Fullscreen',
  '系统通知': 'System Notice',
  '审批提醒': 'Approval Alert',
  '预警信息': 'Warning',
  暂无消息: 'No messages',
  搜索历史: 'Search History',
  清空: 'Clear',
  搜索历史已清空: 'Search history cleared',
  管: 'U',
  总部: 'HQ',
  '—': '—',
  牧唐: 'MuTang',
  '正在验证登录状态...': 'Verifying login status...',
};

/** 合并业务词典，主词典优先 */
const FULL_DICT: Record<string, string> = { ...BUSINESS_DICT, ...EN_DICT };

/** 翻译文案：中文环境原样返回，英文环境返回译文（无译文时回退原文） */
export function t(text: string): string {
  if (currentLang === 'zh') return text;
  return FULL_DICT[text] ?? text;
}
