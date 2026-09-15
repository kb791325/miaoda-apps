import { scopedStorage, logger } from '@lark-apaas/client-toolkit';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { toast } from 'sonner';
import { mockApi, initMockMode, isMockMode, setMockMode, mockDb } from '@/mock';
import { ENTITY_REAL_COLUMNS } from './entity-real-columns';

/**
 * API 请求层
 *
 * 策略：
 * 1. 优先尝试真实 API 调用
 * 2. 如果连续 2 次网络级失败（非 401 的 fetch 错误 / 非 JSON 响应），
 *    自动降级到前端 mock 模式（妙搭预览环境的 vite dev server 没有 /api 代理）
 * 3. mock 模式下使用内存数据库模拟完整 CRUD
 *
 * baseURL 解析：
 * - 环境变量 VITE_API_BASE_URL 最高优先级
 * - localhost 本地开发走 http://localhost:3000/api
 * - 其他环境（同源部署）走相对路径 /api
 */

const STORAGE_KEY = 'erp_mock_mode';

let networkFailCount = 0;
const NETWORK_FAIL_THRESHOLD = 2;
let htmlFailCount = 0;
const HTML_FAIL_THRESHOLD = 1; // vite dev server 的 HTML fallback 一次就够了

// 默认走真实后端；后端不可用时（网络失败 / 非 JSON 响应）自动降级到 mock 模式
// 每次页面刷新都重新尝试真实后端，避免历史 mock 标记残留
(function initMockDefault() {
  scopedStorage.removeItem(STORAGE_KEY);
  setMockMode(false);
  networkFailCount = 0;
  htmlFailCount = 0;
})();

// mock 模式下定期探测后端是否恢复，恢复后自动切回真实模式（节流 15s）
let lastProbeAt = 0;
const PROBE_INTERVAL = 15000;
let probing = false;

function scheduleBackendProbe() {
  if (probing || Date.now() - lastProbeAt < PROBE_INTERVAL) return;
  probing = true;
  lastProbeAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  fetch(`${BASE_URL}/health`, { signal: controller.signal, credentials: BASE_URL.startsWith('http') ? 'include' : 'same-origin' })
    .then(async (res) => {
      // 403 CSRF 失败也算后端存活（只是需要 token），200/403 都认为后端在线
      const ok = res.ok || res.status === 403;
      if (ok) {
        logger.info('[api] 后端已恢复，自动退出 mock 模式');
        setMockMode(false);
        scopedStorage.removeItem(STORAGE_KEY);
        networkFailCount = 0;
        htmlFailCount = 0;
        csrfTokenPromise = null; // 重新获取 csrf token
        toast.success('后端服务已恢复，已切换回实时数据');
      }
    })
    .catch(() => { /* 后端仍不可用，继续 mock */ })
    .finally(() => { probing = false; clearTimeout(timer); });
}

function resolveBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;

  if (typeof window === 'undefined') return '/api';

  const { hostname, protocol } = window.location;

  // 本地开发：localhost 直连 NestJS（端口 3000，configureApp 加了 /app/<app_id> 前缀）
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//localhost:3000/app/app_17czx1jrsqe/api`;
  }

  // 妙搭沙箱预览态 — 端口前缀模式（8001-xxx / 5173-xxx）
  // 走同源 /api，由平台网关统一代理到后端
  const portMatch = hostname.match(/^(\d+)-(.+)$/);
  if (portMatch) {
    if (typeof window !== 'undefined') {
      const appPrefixMatch = window.location.pathname.match(/^(\/app\/app_\w+\/)/);
      if (appPrefixMatch) {
        return `${appPrefixMatch[1]}api`;
      }
    }
    return '/api';
  }

  // 妙搭沙箱预览态 — APP_ID 统一域名模式（saasuniversity-app_<id>-<sandbox>.aiforce.run）
  // 走同源 /api，由平台网关统一代理到后端
  const unifiedMatch = hostname.match(/^saasuniversity-(app_\w+-\d+\..+)$/);
  if (unifiedMatch) {
    if (typeof window !== 'undefined') {
      const appPrefixMatch = window.location.pathname.match(/^(\/app\/app_\w+\/)/);
      if (appPrefixMatch) {
        return `${appPrefixMatch[1]}api`;
      }
    }
    return '/api';
  }

  // 发布态：检测当前页面是否在 /app/<app_id>/ 路径下，补齐前缀
  if (typeof window !== 'undefined') {
    const appPrefixMatch = window.location.pathname.match(/^(\/app\/app_\w+\/)/);
    if (appPrefixMatch) {
      return `${appPrefixMatch[1]}api`;
    }
  }

  // 发布态 / 同源部署：走相对路径 /api（由平台 nginx 统一代理）
  return '/api';
}

const BASE_URL = resolveBaseUrl();

// axiosForBackend 内部已设置 baseURL = CLIENT_BASE_PATH = /app/app_17czx1jrsqe/
// 传入的 url 不能包含应用前缀，否则会拼成双前缀
// 从 BASE_URL 中提取应用前缀（如 /app/app_17czx1jrsqe），用于幂等剥离
const APP_PREFIX = BASE_URL.replace(/\/api$/, '');

function normalizeApiUrl(url: string): string {
  let normalized = url;
  // 幂等剥离应用前缀（无论调用几次都不会重复叠加）
  if (APP_PREFIX && normalized.startsWith(APP_PREFIX)) {
    normalized = normalized.slice(APP_PREFIX.length);
  }
  // 确保以 / 开头，防止相对路径拼接到当前页面路由
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  return normalized;
}
// SDK 使用 suda-csrf-token cookie + x-suda-csrf-token header 做 CSRF 校验
// 跨域时需先请求首页拿 cookie，同源时直接从 document.cookie 读

let csrfTokenPromise: Promise<string | null> | null = null;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchCsrfToken(): Promise<string | null> {
  const isCrossOrigin = BASE_URL.startsWith('http');

  // 同源：先从 cookie 读，读不到就请求首页触发平台下发 cookie
  if (!isCrossOrigin) {
    const fromCookie = getCookie('suda-csrf-token');
    if (fromCookie) return fromCookie;
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/', true);
        xhr.withCredentials = true;
        xhr.onload = () => resolve();
        xhr.onerror = () => reject(new Error('xhr failed'));
        xhr.send();
      });
      const afterFetch = getCookie('suda-csrf-token');
      if (afterFetch) return afterFetch;
    } catch { /* ignore */ }
    return null;
  }

  // 跨域：请求一次首页拿 set-cookie
  try {
    const basePath = BASE_URL.replace(/\/api$/, '/');
    const res = await fetch(basePath, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const text = await res.text();
      const m = text.match(/csrfToken["']?\s*[:=]\s*["']([^"']+)/);
      if (m) return m[1];
      return getCookie('suda-csrf-token');
    }
  } catch {
    // ignore
  }
  return null;
}

function ensureCsrfToken(): Promise<string | null> {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetchCsrfToken();
  }
  return csrfTokenPromise;
}

function refreshCsrfToken() {
  csrfTokenPromise = null;
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

interface ApiResult<T = any> {
  code: number;
  message: string;
  data: T;
}

// ============== Mock 路由分发 ==============
// 把 API URL 路由到对应的 mock 处理函数

function routeMock(url: string, method: string, body: any, params: Record<string, any>): ApiResult {
  // 去掉 BASE_URL 前缀（如果有的话）
  const path = url.replace(BASE_URL, '').replace(/^\//, '');
  const query = params || {};

  // ---- 认证 ----
  if (path === 'auth/feishu/token' && method === 'POST') {
    return mockApi.loginFeishu();
  }
  if (path === 'auth/refresh' && method === 'POST') {
    return mockApi.refresh();
  }
  if (path === 'auth/me' && method === 'GET') {
    return mockApi.me();
  }
  if (path === 'auth/logout' && method === 'POST') {
    return mockApi.logout();
  }
  if (path === 'users' && method === 'GET') {
    return mockApi.users();
  }

  // ---- 工作台 ----
  if (path === 'dashboard/summary' && method === 'GET') return mockApi.dashboardSummary();
  if (path === 'dashboard/realtime' && method === 'GET') return mockApi.dashboardRealtime();
  if (path === 'dashboard/charts' && method === 'GET') return mockApi.dashboardCharts(query.time_dim || 'today');
  if (path === 'dashboard/rankings' && method === 'GET') return mockApi.dashboardRankings(query.port || 'all', query.time_dim || 'week');
  if (path === 'dashboard/targets' && method === 'GET') return mockApi.dashboardTargets();
  if (path === 'dashboard/performance' && method === 'GET') return mockApi.dashboardPerformance();

  // ---- 人资看板 ----
  if (path === 'hr/dashboard' && method === 'GET') return mockApi.hrDashboard();

  // ---- 行业大盘 ----
  if (path === 'business/industry-overview' && method === 'GET') return mockApi.industryOverview();

  // ---- 审批待办 - 已迁至后端 /api/approvals/todo ----
  if (path === 'approvals/todo' && method === 'GET') {
    return null; // 透传到真实后端
  }
  if (path === 'approvals/by-business' && method === 'GET') {
    return null; // 透传到真实后端
  }
  if (path === 'approvals/submit' && method === 'POST') {
    return null; // 透传到真实后端
  }
  if (path.startsWith('approvals/') && path.endsWith('/steps') && method === 'GET') {
    return null; // 透传到真实后端
  }
  if (path.startsWith('approvals/') && path.endsWith('/approve') && !path.includes('/steps/') && method === 'POST') {
    return null; // 透传到真实后端
  }
  if (path.startsWith('approvals/') && path.endsWith('/reject') && !path.includes('/steps/') && method === 'POST') {
    return null; // 透传到真实后端
  }

  // ---- 公海客资 ----
  if (path.startsWith('public-leads') && method === 'GET' && !path.includes('/')) {
    return mockApi.publicLeadList(query);
  }
  if (path === 'public-leads/claim' && method === 'POST') {
    return mockApi.claimLead(body.id);
  }
  if (path === 'public-leads/batch-claim' && method === 'POST') {
    return mockApi.batchClaimLeads(body.ids);
  }
  if (path === 'public-leads/batch-assign' && method === 'POST') {
    return mockApi.batchAssignLeads(body.ids, body.assigned_to);
  }
  if (path === 'public-leads/auto-assign' && method === 'POST') {
    return mockApi.autoAssignLeads();
  }
  if (path.startsWith('public-leads/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('publicLeads', id);
  }
  if (path.startsWith('public-leads') && method === 'POST') {
    return mockApi.create('publicLeads', body);
  }
  if (path.startsWith('public-leads/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('publicLeads', id, body);
  }
  if (path.startsWith('public-leads/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('publicLeads', id);
  }

  // ---- 线索 ----
  if (path.startsWith('leads') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('leads', query,
      ['lead_name', 'lead_id', 'company_name'],
      ['source', 'status', 'owner_id']
    );
  }
  if (path.startsWith('leads/') && method === 'GET' && path.endsWith('/follow-ups')) {
    const id = Number(path.split('/')[1]);
    return mockApi.getFollowUps('leads', id);
  }
  if (path.startsWith('leads/') && path.endsWith('/follow-ups') && method === 'POST') {
    const id = Number(path.split('/')[1]);
    return mockApi.addFollowUp('leads', id, body);
  }
  if (path.startsWith('leads/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('leads', id);
  }
  if (path === 'leads/batch-assign' && method === 'POST') {
    (body.ids || []).forEach((id: number) => {
      mockApi.update('leads', id, { owner_id: body.owner_id, owner_name: body.owner_name });
    });
    return { code: 0, message: `已分配 ${(body.ids || []).length} 条线索`, data: null };
  }
  if (path === 'leads' && method === 'POST') return mockApi.create('leads', body);
  if (path.startsWith('leads/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('leads', id, body);
  }
  if (path.startsWith('leads/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('leads', id);
  }

  // ---- 客户 ----
  if (path.startsWith('customers') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('customers', query,
      ['customer_name', 'group_name'],
      ['primary_industry', 'level', 'status', 'owner_id', 'department']
    );
  }
  if (path.startsWith('customers/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('customers', id);
  }
  if (path === 'customers' && method === 'POST') return mockApi.create('customers', body);
  if (path.startsWith('customers/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('customers', id, body);
  }
  if (path.startsWith('customers/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('customers', id);
  }

  // ---- 开户申请 ----
  if (path.startsWith('account-applications') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('accountApplications', query,
      ['apply_no', 'group_name', 'entity_name'],
      ['port', 'status']
    );
  }
  if (path.startsWith('account-applications/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('accountApplications', id);
  }
  if (path === 'account-applications' && method === 'POST') return mockApi.create('accountApplications', body);
  if (path.startsWith('account-applications/') && path.endsWith('/approve') && method === 'POST') {
    const id = Number(path.split('/')[1]);
    return mockApi.approve('accountApplications', id, body.action, body.remark);
  }
  if (path.startsWith('account-applications/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('accountApplications', id, body);
  }
  if (path.startsWith('account-applications/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('accountApplications', id);
  }

  // ---- 收款 ----
  if (path.startsWith('receipts') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('receipts', query,
      ['payment_no', 'customer_name'],
      ['status', 'pay_method']
    );
  }
  if (path === 'receipts' && method === 'POST') return mockApi.create('receipts', body);
  if (path.startsWith('receipts/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('receipts', id);
  }
  if (path.startsWith('receipts/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('receipts', id, body);
  }
  if (path.startsWith('receipts/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('receipts', id);
  }

  // ---- 客户明细 / 流水 ----
  if (path.startsWith('transactions') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('transactions', query,
      ['transaction_no', 'customer_name'],
      ['transaction_type', 'port', 'customer_id']
    );
  }

  // ---- 充值 ----
  if (path.startsWith('recharges') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('recharges', query,
      ['recharge_no', 'customer_name'],
      ['port', 'status']
    );
  }
  if (path === 'recharges' && method === 'POST') return mockApi.create('recharges', body);
  if (path.startsWith('recharges/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('recharges', id);
  }
  if (path.startsWith('recharges/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('recharges', id, body);
  }
  if (path.startsWith('recharges/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('recharges', id);
  }

  // ---- 退款 ----
  if (path.startsWith('refunds') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('refunds', query,
      ['refund_no', 'customer_name'],
      ['status']
    );
  }
  if (path === 'refunds' && method === 'POST') return mockApi.create('refunds', body);
  if (path.startsWith('refunds/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('refunds', id);
  }
  if (path.startsWith('refunds/') && path.endsWith('/approve') && method === 'POST') {
    const id = Number(path.split('/')[1]);
    return mockApi.approve('refunds', id, body.action, body.remark);
  }
  if (path.startsWith('refunds/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('refunds', id, body);
  }
  if (path.startsWith('refunds/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('refunds', id);
  }

  // ---- 消耗 ----
  if (path.startsWith('consumptions') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('consumptions', query,
      ['consumption_no', 'customer_name'],
      ['port', 'department', 'owner_id']
    );
  }

  // ---- 垫款 ----
  if (path.startsWith('advances') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('advances', query,
      ['advance_no', 'customer_name'],
      ['status']
    );
  }
  if (path === 'advances' && method === 'POST') return mockApi.create('advances', body);
  if (path.startsWith('advances/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('advances', id, body);
  }
  if (path.startsWith('advances/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('advances', id);
  }

  // ---- 发票 ----
  if (path.startsWith('invoices') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('invoices', query,
      ['invoice_no', 'customer_name'],
      ['invoice_type', 'status']
    );
  }
  if (path === 'invoices' && method === 'POST') return mockApi.create('invoices', body);
  if (path.startsWith('invoices/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('invoices', id, body);
  }
  if (path.startsWith('invoices/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('invoices', id);
  }

  // ---- 端口账户 ----
  if (path.startsWith('port-accounts') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('portAccounts', query,
      ['port_name'],
      ['port_type', 'status']
    );
  }
  if (path.startsWith('port-accounts/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('portAccounts', id);
  }
  if (path.startsWith('port-accounts/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('portAccounts', id, body);
  }

  // ---- 银行账户 ----
  if (path.startsWith('banks') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('banks', query, ['bank_name', 'account_name'], ['account_type', 'status']);
  }

  // ---- 成本 ----
  if (path.startsWith('costs') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('costs', query, ['cost_type'], ['cost_type', 'department']);
  }
  if (path === 'costs' && method === 'POST') return mockApi.create('costs', body);
  if (path.startsWith('costs/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('costs', id, body);
  }
  if (path.startsWith('costs/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('costs', id);
  }

  // ---- 收入 ----
  if (path.startsWith('incomes') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('incomes', query, ['income_type', 'customer_name'], ['income_type', 'receive_status']);
  }

  // ---- 支出 ----
  if (path.startsWith('expenses') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('expenses', query, ['expense_type', 'reason'], ['expense_type', 'approval_status']);
  }
  if (path === 'expenses' && method === 'POST') return mockApi.create('expenses', body);
  if (path.startsWith('expenses/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('expenses', id, body);
  }
  if (path.startsWith('expenses/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('expenses', id);
  }

  // ---- 报备 ----
  if (path.startsWith('filings') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('filings', query, ['filing_no', 'group_name'], ['port', 'status']);
  }
  if (path === 'filings' && method === 'POST') return mockApi.create('filings', body);
  if (path.startsWith('filings/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('filings', id, body);
  }
  if (path.startsWith('filings/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('filings', id);
  }

  // ---- 转户 ----
  if (path.startsWith('transfers') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('transfers', query, ['transfer_no', 'group_name', 'entity_name'], ['status']);
  }
  if (path === 'transfers' && method === 'POST') return mockApi.create('transfers', body);
  if (path.startsWith('transfers/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('transfers', id, body);
  }
  if (path.startsWith('transfers/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('transfers', id);
  }

  // ---- 广告提成 ----
  if (path.startsWith('ad-commissions') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('adCommissions', query, ['commission_id', 'sales_name'], ['department', 'status']);
  }

  // ---- 合同 ----
  if (path.startsWith('contracts') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('contracts', query,
      ['contract_id', 'contract_name', 'subject_name'],
      ['contract_type', 'status', 'owner_name']
    );
  }
  if (path.startsWith('contracts/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('contracts', id);
  }
  if (path === 'contracts' && method === 'POST') return mockApi.create('contracts', body);
  if (path.startsWith('contracts/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('contracts', id, body);
  }
  if (path.startsWith('contracts/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('contracts', id);
  }

  // ---- 合同模版 ----
  if (path.startsWith('contract-templates') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('contractTemplates', query, ['contract_name'], ['contract_type']);
  }

  // ---- 合同费用 ----
  if (path.startsWith('contract-fees') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('contractFees', query, ['fee_id'], ['fee_type', 'payment_status']);
  }

  // ---- 员工 ----
  if (path.startsWith('employees') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('employees', query, ['emp_no', 'name'], ['department', 'position', 'status']);
  }
  if (path.startsWith('employees/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('employees', id);
  }
  if (path === 'employees' && method === 'POST') return mockApi.create('employees', body);
  if (path.startsWith('employees/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('employees', id, body);
  }
  if (path.startsWith('employees/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('employees', id);
  }

  // ---- 简历 ----
  if (path.startsWith('resumes') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('resumes', query, ['resume_no', 'name', 'position'], ['source', 'status']);
  }

  // ---- 绩效 ----
  if (path.startsWith('performances') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('performances', query, ['performance_no', 'employee_name'], ['department', 'grade', 'status']);
  }

  // ---- 工资 ----
  if (path.startsWith('salaries') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('salaries', query, ['salary_no', 'employee_name'], ['department', 'status']);
  }

  // ---- 考勤 ----
  if (path.startsWith('attendances') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('attendances', query, ['attendance_no', 'employee_name'], ['department']);
  }

  // ---- 邀约/面试/签到/招聘计划 ----
  // ---- 邀约管理 ----
  if (path.startsWith('invitations') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('invitations', query, ['invitation_no', 'candidate_name', 'position', 'phone'], ['status', 'channel', 'interviewer_name']);
  }
  if (path === 'invitations' && method === 'POST') return mockApi.create('invitations', { ...body, invitation_no: `IV${Date.now().toString().slice(-5)}` });
  if (path.startsWith('invitations/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('invitations', id);
  }
  if (path.startsWith('invitations/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('invitations', id, body);
  }
  if (path.startsWith('invitations/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('invitations', id);
  }
  if (path === 'invitations/batch-delete' && method === 'POST') return mockApi.batchDelete('invitations', body.ids);
  if (path.startsWith('invitations/') && path.endsWith('/confirm') && method === 'POST') {
    const id = Number(path.split('/')[1]);
    return mockApi.updateStatus('invitations', id, body.status, body.remark || '');
  }

  // ---- 面试管理 ----
  if (path.startsWith('interviews') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('interviews', query, ['interview_no', 'candidate_name', 'position'], ['status', 'round', 'interviewer_name']);
  }
  if (path === 'interviews' && method === 'POST') return mockApi.create('interviews', { ...body, interview_no: `IT${Date.now().toString().slice(-5)}` });
  if (path.startsWith('interviews/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('interviews', id);
  }
  if (path.startsWith('interviews/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('interviews', id, body);
  }
  if (path.startsWith('interviews/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('interviews', id);
  }
  if (path === 'interviews/batch-delete' && method === 'POST') return mockApi.batchDelete('interviews', body.ids);
  if (path.startsWith('interviews/') && path.endsWith('/evaluate') && method === 'POST') {
    const id = Number(path.split('/')[1]);
    return mockApi.evaluateInterview(id, body);
  }
  if (path.startsWith('interviews/') && path.endsWith('/arrange-next') && method === 'POST') {
    const id = Number(path.split('/')[1]);
    return mockApi.arrangeNextInterview(id, body);
  }

  // ---- 签到管理 ----
  if (path.startsWith('checkins') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('checkins', query, ['checkin_no', 'candidate_name', 'position'], ['status', 'checkin_type']);
  }
  if (path === 'checkins' && method === 'POST') return mockApi.create('checkins', { ...body, checkin_no: `CK${Date.now().toString().slice(-5)}` });
  if (path.startsWith('checkins/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('checkins', id);
  }
  if (path.startsWith('checkins/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('checkins', id, body);
  }
  if (path.startsWith('checkins/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('checkins', id);
  }
  if (path === 'checkins/batch-delete' && method === 'POST') return mockApi.batchDelete('checkins', body.ids);
  if (path === 'checkins/stats' && method === 'GET') return mockApi.checkinStats(query.date);
  if (path.startsWith('checkins/') && path.endsWith('/register') && method === 'POST') {
    const id = Number(path.split('/')[1]);
    return mockApi.registerCheckin(id, body);
  }
  if (path.startsWith('checkins/') && path.endsWith('/mark-absent') && method === 'POST') {
    const id = Number(path.split('/')[1]);
    return mockApi.markAbsent(id, body?.remark || '');
  }

  // ---- 招聘计划 ----
  if (path.startsWith('recruit-plans') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('recruitPlans', query, ['plan_no', 'position', 'department', 'owner_name'], ['status', 'urgency']);
  }
  if (path === 'recruit-plans' && method === 'POST') return mockApi.create('recruitPlans', { ...body, plan_no: `RP${Date.now().toString().slice(-5)}` });
  if (path.startsWith('recruit-plans/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('recruitPlans', id);
  }
  if (path.startsWith('recruit-plans/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('recruitPlans', id, body);
  }
  if (path.startsWith('recruit-plans/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('recruitPlans', id);
  }
  if (path === 'recruit-plans/batch-delete' && method === 'POST') return mockApi.batchDelete('recruitPlans', body.ids);
  if (path === 'recruit-plans/stats' && method === 'GET') return mockApi.recruitPlanStats();

  // ---- 采购申请 ----
  if (path.startsWith('purchase-requisitions') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('purchaseReqs', query, ['req_no', 'reason', 'applicant_name'], ['status', 'department']);
  }
  if (path.startsWith('purchase-requisitions/') && path.endsWith('/approve') && method === 'POST') {
    const id = Number(path.split('/')[1]);
    return mockApi.approve('purchaseReqs', id, body.action, body.comment);
  }
  if (path.startsWith('purchase-requisitions/') && path.endsWith('/generate-order') && method === 'POST') {
    const id = Number(path.split('/')[1]);
    return mockApi.generatePurchaseOrder(id);
  }
  if (path === 'purchase-requisitions' && method === 'POST') return mockApi.create('purchaseReqs', body);
  if (path.startsWith('purchase-requisitions/') && method === 'GET') {
    const id = Number(path.split('/')[1]);
    return mockApi.get('purchaseReqs', id);
  }
  if (path.startsWith('purchase-requisitions/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.update('purchaseReqs', id, body);
  }
  if (path.startsWith('purchase-requisitions/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.delete('purchaseReqs', id);
  }

  // ---- 采购订单/详情 ----
  if (path.startsWith('purchase-orders') && method === 'GET' && !path.includes('/')) return mockApi.list('purchaseOrders', query, ['order_id']);
  if (path.startsWith('purchase-details') && method === 'GET' && !path.includes('/')) return mockApi.list('purchaseDetails', query, ['item_name']);

  // ---- 资产 ----
  if (path.startsWith('assets') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('assets', query, ['asset_id', 'asset_name'], ['category', 'depreciation_status']);
  }

  // ---- 库存/入库/领用/归还/盘点 ----
  if (path.startsWith('inventories') && method === 'GET' && !path.includes('/')) return mockApi.list('inventories', query, ['item_id', 'item_name'], ['category', 'status']);
  if (path.startsWith('stock-ins') && method === 'GET' && !path.includes('/')) return mockApi.list('stockIns', query, ['item_name']);
  if (path.startsWith('requisitions') && method === 'GET' && !path.includes('/')) return mockApi.list('requisitions', query, ['item_name', 'requester'], ['status']);
  if (path.startsWith('returns') && method === 'GET' && !path.includes('/')) return mockApi.list('returns', query, ['item_name', 'returner'], ['status']);
  if (path.startsWith('inventory-checks') && method === 'GET' && !path.includes('/')) return mockApi.list('inventoryChecks', query, ['title'], ['status']);

  // ---- 视频业务 ----
  if (path.startsWith('video-orders') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('videoOrders', query, ['order_id', 'group_name'], ['video_type', 'status']);
  }
  if (path.startsWith('video-projects') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('videoProjects', query, ['project_id', 'project_name'], ['status']);
  }
  if (path.startsWith('actors') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('actors', query, ['actor_id', 'name'], ['schedule_status']);
  }
  if (path.startsWith('outsourcings') && method === 'GET' && !path.includes('/')) return mockApi.list('outsourcings', query, ['supplier'], ['settle_status']);
  if (path.startsWith('video-commissions') && method === 'GET' && !path.includes('/')) return mockApi.list('videoCommissions', query, ['sales_name'], ['status']);
  if (path.startsWith('shoot-costs') && method === 'GET' && !path.includes('/')) return mockApi.list('shootCosts', query, ['cost_type']);
  if (path.startsWith('location-costs') && method === 'GET' && !path.includes('/')) return mockApi.list('locationCosts', query, ['location_name']);
  if (path.startsWith('samples') && method === 'GET' && !path.includes('/')) return mockApi.list('samples', query, ['sample_name'], ['mail_status']);

  // ---- 任务中心 ----
  if (path.startsWith('batch-imports') && method === 'GET' && !path.includes('/')) return mockApi.list('batchImports', query, ['task_id', 'file_name'], ['status']);
  if (path.startsWith('batch-exports') && method === 'GET' && !path.includes('/')) return mockApi.list('batchExports', query, ['task_id', 'export_type'], ['status']);
  if (path.startsWith('todos') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('todos', query, ['task_id', 'title'], ['task_type', 'status']);
  }
  if (path.startsWith('collab-tasks') && method === 'GET' && !path.includes('/')) {
    return mockApi.list('collabTasks', query, ['task_id', 'title'], ['priority', 'status']);
  }
  if (path === 'collab-tasks' && method === 'POST') return mockApi.create('collabTasks', body);

  // ---- 系统管理 ----
  if (path.startsWith('customer-accounts') && method === 'GET' && !path.includes('/')) return mockApi.list('customerAccounts', query, ['login_account', 'customer_name'], ['status']);
  if (path.startsWith('operation-logs') && method === 'GET' && !path.includes('/')) return mockApi.list('operationLogs', query, ['operator', 'module'], ['op_type']);
  if (path.startsWith('login-logs') && method === 'GET' && !path.includes('/')) return mockApi.list('loginLogs', query, ['username'], ['status']);

  // ---- 业务支持 ----
  if (path.startsWith('industry-rois') && method === 'GET' && !path.includes('/')) return mockApi.list('industryRois', query, ['industry_name'], ['platform']);
  if (path.startsWith('competitors') && method === 'GET' && !path.includes('/')) return mockApi.list('competitors', query, ['name', 'industry'], ['monitor_status']);
  if (path.startsWith('materials') && method === 'GET' && !path.includes('/')) return mockApi.list('materials', query, ['name'], ['material_type', 'platform']);

  // ---- 其他财务子模块（简单列表） ----
  if (path.startsWith('coin-refunds') && method === 'GET' && !path.includes('/')) return mockApi.list('coinRefunds', query, [], ['status']);
  if (path.startsWith('rebates') && method === 'GET' && !path.includes('/')) return mockApi.list('rebates', query, [], ['status']);
  if (path.startsWith('deductions') && method === 'GET' && !path.includes('/')) return mockApi.list('deductions', query, [], ['status']);
  if (path.startsWith('incentives') && method === 'GET' && !path.includes('/')) return mockApi.list('incentives', query, [], ['status']);
  if (path.startsWith('daily-expenses') && method === 'GET' && !path.includes('/')) return mockApi.list('dailyExpenses', query, [], ['status']);
  if (path.startsWith('deposits') && method === 'GET' && !path.includes('/')) return mockApi.list('deposits', query, [], ['status']);

  // ---- 组织架构：部门树 ----
  if (path === 'departments' && method === 'GET') {
    return mockApi.list('departments', query, ['name'], []);
  }
  if (path === 'departments' && method === 'POST') {
    return mockApi.create('departments', { status: 'active', ...body });
  }
  if (path.startsWith('departments/') && method === 'PUT') {
    return mockApi.update('departments', Number(path.split('/')[1]), body);
  }
  if (path.startsWith('departments/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    const dept = (mockDb.departments as any[]).find((d) => d.id === id);
    if (!dept) return { code: 404, message: '部门不存在', data: null };
    if ((mockDb.departments as any[]).some((d) => d.parent_id === id)) {
      return { code: 1, message: '请先删除或迁移该部门下的子部门', data: null };
    }
    if ((mockDb.employees as any[]).some((e) => e.department === dept.name && e.status !== 'resigned')) {
      return { code: 1, message: '该部门下还有在职员工，无法删除', data: null };
    }
    return mockApi.delete('departments', id);
  }

  // ---- 角色权限 ----
  if (path === 'roles' && method === 'GET') {
    const res = mockApi.list('roles', query, ['name'], []);
    if (res.code === 0 && res.data?.list) {
      res.data.list = res.data.list.map((r: any) => ({
        ...r,
        member_count: (mockDb.users as any[]).filter((u) => u.role === r.role_key).length,
      }));
    }
    return res;
  }
  if (path === 'roles' && method === 'POST') {
    return mockApi.create('roles', {
      role_key: `custom_${Date.now()}`,
      data_scope: 'self',
      menu_ids: '[]',
      field_permissions: '{}',
      is_system: 0,
      ...body,
    });
  }
  if (path.startsWith('roles/') && method === 'PUT') {
    return mockApi.update('roles', Number(path.split('/')[1]), body);
  }
  if (path.startsWith('roles/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    const role = (mockDb.roles as any[]).find((r) => r.id === id);
    if (!role) return { code: 404, message: '角色不存在', data: null };
    if (role.is_system) return { code: 1, message: '系统内置角色不可删除', data: null };
    const cnt = (mockDb.users as any[]).filter((u) => u.role === role.role_key).length;
    if (cnt > 0) return { code: 1, message: `该角色下还有 ${cnt} 名成员，无法删除`, data: null };
    return mockApi.delete('roles', id);
  }

  // ---- 系统设置：分组读写 ----
  if (path.startsWith('settings/') && method === 'GET') {
    const group = path.split('/')[1];
    return { code: 0, message: 'ok', data: mockDb.settings[group] || {} };
  }
  if (path.startsWith('settings/') && method === 'PUT') {
    const group = path.split('/')[1];
    mockDb.settings[group] = { ...(mockDb.settings[group] || {}), ...body };
    return { code: 0, message: '配置已保存', data: mockDb.settings[group] };
  }

  // ---- 无效客资 ----
  if (path.startsWith('invalid-leads') && method === 'GET' && !path.includes('/')) {
    return mockApi.invalidLeadList(query);
  }
  if (path === 'invalid-leads/batch-delete' && method === 'POST') {
    return mockApi.invalidLeadBatchRemove(body.ids);
  }
  if (path === 'invalid-leads/batch-restore' && method === 'POST') {
    return mockApi.invalidLeadBatchRestore(body.ids);
  }
  if (path.startsWith('invalid-leads/') && path.endsWith('/restore') && method === 'POST') {
    const id = Number(path.split('/')[1]);
    return mockApi.invalidLeadRestore(id);
  }
  if (path.startsWith('invalid-leads/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.invalidLeadRemove(id);
  }
  if (path.startsWith('public-leads/') && path.endsWith('/mark-invalid') && method === 'POST') {
    const id = Number(path.split('/')[1]);
    return mockApi.markPublicLeadInvalid(id, body.reason);
  }

  // ---- 客户联系人 ----
  if (path === 'customer-contacts' && method === 'GET') {
    return mockApi.customerContactList(Number(query.customer_id));
  }
  if (path === 'customer-contacts' && method === 'POST') return mockApi.customerContactCreate(body);
  if (path.startsWith('customer-contacts/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.customerContactUpdate(id, body);
  }
  if (path.startsWith('customer-contacts/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.customerContactRemove(id);
  }

  // ---- 客户跟进记录 ----
  if (path === 'customer-follow-ups' && method === 'GET') {
    return mockApi.customerFollowUpList(Number(query.customer_id));
  }
  if (path === 'customer-follow-ups' && method === 'POST') return mockApi.customerFollowUpAdd(body);

  // ---- 提成规则 ----
  if (path === 'commission-rules' && method === 'GET') return mockApi.commissionRuleList(query);
  if (path === 'commission-rules/all' && method === 'GET') return mockApi.commissionRuleAll(query);
  if (path === 'commission-rules' && method === 'POST') return mockApi.commissionRuleCreate(body);
  if (path.startsWith('commission-rules/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.commissionRuleUpdate(id, body);
  }
  if (path.startsWith('commission-rules/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.commissionRuleRemove(id);
  }
  if (path === 'commission-rules/calculate' && method === 'POST') {
    return mockApi.calculateCommission(body.biz_type, body.sales_name, body.settle_month, Number(body.rule_id));
  }

  // ---- 付款计划 ----
  if (path === 'payment-plans' && method === 'GET') return mockApi.paymentPlanList(query);
  if (path === 'payment-plans' && method === 'POST') return mockApi.paymentPlanCreate(body);
  if (path.startsWith('payment-plans/') && method === 'PUT') {
    const id = Number(path.split('/')[1]);
    return mockApi.paymentPlanUpdate(id, body);
  }
  if (path.startsWith('payment-plans/') && method === 'DELETE') {
    const id = Number(path.split('/')[1]);
    return mockApi.paymentPlanRemove(id);
  }

  // ---- 付款记录 ----
  if (path === 'payment-records' && method === 'GET') return mockApi.paymentRecordList(query);
  if (path === 'payment-records' && method === 'POST') return mockApi.paymentRecordAdd(body);

  // ---- 会签/或签：节点级审批 ----
  if (path.startsWith('approvals/') && path.includes('/steps/') && path.endsWith('/approve') && method === 'POST') {
    const parts = path.split('/');
    const instanceId = Number(parts[1]);
    const stepId = Number(parts[3]);
    return mockApi.stepApprove(instanceId, stepId, body.comment);
  }
  if (path.startsWith('approvals/') && path.includes('/steps/') && path.endsWith('/reject') && method === 'POST') {
    const parts = path.split('/');
    const instanceId = Number(parts[1]);
    const stepId = Number(parts[3]);
    return mockApi.stepReject(instanceId, stepId, body.comment);
  }

  // 兜底：未匹配的路径返回错误，避免 mock 模式下静默展示假空数据
  logger.warn(`[mock] 未匹配的路径: ${method} ${path}`);
  return {
    code: 503,
    message: `后端暂不可用（mock 兜底不覆盖该接口: ${method} ${path}），请稍后刷新重试`,
    data: null as any,
  };
}

// ============== 主请求函数 ==============

export async function request<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const fullUrl = `${BASE_URL}${url}`;

  // 如果已经是 mock 模式，直接走 mock（同时后台探测后端是否恢复）
  if (isMockMode()) {
    scheduleBackendProbe();
    let body: any = {};
    if (options.body && typeof options.body === 'string') {
      try { body = JSON.parse(options.body); } catch { /* ignore */ }
    }
    const method = (options.method || 'GET').toUpperCase();
    // 从 url 中提取 query params
    const queryStr = url.split('?')[1] || '';
    const params: Record<string, string> = {};
    if (queryStr) {
      new URLSearchParams(queryStr).forEach((v, k) => { params[k] = v; });
    }
    return routeMock(url.split('?')[0], method, body, params) as ApiResult<T>;
  }

  try {
    const method = (options.method || 'GET').toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
    let data: any = undefined;
    if (options.body && typeof options.body === 'string') {
      try { data = JSON.parse(options.body); } catch { /* ignore */ }
    }

    const axiosRes = await axiosForBackend({ url: normalizeApiUrl(fullUrl), method, data });

    networkFailCount = 0;
    htmlFailCount = 0;
    return axiosRes.data as ApiResult<T>;
  } catch (e: any) {
    if (e.response?.status === 401) {
      onUnauthorized?.();
    }

    const msg = e?.message || '网络连接失败';
    networkFailCount++;
    if (networkFailCount >= NETWORK_FAIL_THRESHOLD && !isMockMode()) {
      enableMockMode();
      return request(url, options);
    }
    return {
      code: -1,
      message: `网络错误：${msg}`,
      data: null as any,
    };
  }
}

async function handleResponse<T>(
  res: Response,
  fullUrl: string,
  url: string,
  options: RequestInit,
): Promise<ApiResult<T>> {
  if (res.status === 401) {
    onUnauthorized?.();
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // 非 JSON 响应（404 HTML / 网关错误等），不降级 mock，直接透传状态码与原因
    return {
      code: res.status,
      message: `服务端返回非 JSON 响应（HTTP ${res.status}），请检查请求地址是否正确`,
      data: null as any,
    };
  }

  const data = await res.json();
  networkFailCount = 0;
  htmlFailCount = 0;
  return data as ApiResult<T>;
}

function enableMockMode() {
  initMockMode();
  setMockMode(true);
  scopedStorage.setItem(STORAGE_KEY, '1');
  toast.warning('后端服务暂时不可用，已切换到本地演示数据');
}

// 用于手动切换 mock 模式的工具函数（调试用）
export function toggleMockMode(force?: boolean): boolean {
  const next = force !== undefined ? force : !isMockMode();
  if (next) {
    initMockMode();
    setMockMode(true);
    scopedStorage.setItem(STORAGE_KEY, '1');
  } else {
    setMockMode(false);
    scopedStorage.removeItem(STORAGE_KEY);
    networkFailCount = 0;
    htmlFailCount = 0;
  }
  return next;
}

// ============== 工具函数 ==============

const PARAM_MAP: Record<string, string> = {
  // 后端 Controller 期望 camelCase 参数名，无需转换
};

export async function apiGet<T = any>(url: string, params?: Record<string, any>) {
  const qs = params ? '?' + new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '' && v !== null)
        .map(([k, v]) => [PARAM_MAP[k] || k, v])
    )
  ).toString() : '';
  return request<T>(`${url}${qs}`, { method: 'GET' });
}

/** 从 /entity/<中文名> URL 中解析实体名 */
function extractEntityName(url: string): string | null {
  const m = url.match(/\/entity\/([^/?]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}

/** 按实体真实列白名单过滤写入 body，URL 不对应实体时 fail-open 不过滤 */
function filterWriteBody(url: string, body: Record<string, any>): Record<string, any> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const entityName = extractEntityName(url);
  if (!entityName) return body;
  const realCols = ENTITY_REAL_COLUMNS[entityName];
  if (!realCols) return body;
  const allowed = new Set(realCols);
  allowed.add('_id');
  const filtered: Record<string, any> = {};
  let dropped = 0;
  for (const [key, val] of Object.entries(body)) {
    if (allowed.has(key)) {
      filtered[key] = val;
    } else {
      dropped++;
      logger.warn('[request] 白名单过滤: 剔除不存在列', String({ entity: entityName, key }));
    }
  }
  if (dropped > 0) {
    logger.warn('[request] 白名单过滤: 已剔除 ' + dropped + ' 个不存在列, entity=' + entityName);
  }
  return filtered;
}

export async function apiPost<T = any>(url: string, body?: any) {
  return request<T>(url, {
    method: 'POST',
    body: body ? JSON.stringify(filterWriteBody(url, body)) : undefined,
  });
}

export async function apiPut<T = any>(url: string, body?: any) {
  return request<T>(url, {
    method: 'PUT',
    body: body ? JSON.stringify(filterWriteBody(url, body)) : undefined,
  });
}

export async function apiDelete<T = any>(url: string) {
  return request<T>(url, { method: 'DELETE' });
}
