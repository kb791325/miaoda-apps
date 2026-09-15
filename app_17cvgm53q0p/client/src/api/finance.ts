import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  FinanceDashboardResponse,
  FinanceExportType,
  FinanceGroupBy,
  FinanceReportCustomerResponse,
  FinanceReportProductResponse,
  FinanceReportTimelineResponse,
} from '@shared/finance';

/** 财务接口统一日期区间参数（YYYY-MM-DD 闭区间） */
export interface FinanceRangeParams {
  startDate: string;
  endDate: string;
}

/** 财务接口超时（毫秒）：后端需分页拉取多维表格，放宽上限 */
const FINANCE_TIMEOUT_MS = 30000;

/** 最大尝试次数（含首次），仅对幂等 GET 生效 */
const FINANCE_MAX_ATTEMPTS = 3;

/** 重试退避基数（毫秒，随尝试次数递增） */
const FINANCE_RETRY_DELAY_MS = 600;

function isRetryableError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (!error.response) return true;
  return error.response.status >= 500;
}

/** 财务 GET 请求：超时 + 失败自动重试（超时/网络错误/5xx） */
async function getWithRetry<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= FINANCE_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await axiosForBackend.get<T>(url, {
        timeout: FINANCE_TIMEOUT_MS,
        ...config,
      });
    } catch (error: unknown) {
      lastError = error;
      if (attempt < FINANCE_MAX_ATTEMPTS && isRetryableError(error)) {
        await new Promise((resolve) =>
          setTimeout(resolve, FINANCE_RETRY_DELAY_MS * attempt),
        );
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/** 财务仪表盘：汇总 + 趋势 + 商品/客户利润排行 Top10 */
export async function getDashboard(
  params: FinanceRangeParams,
): Promise<FinanceDashboardResponse> {
  const res = await getWithRetry<FinanceDashboardResponse>(
    '/api/finance/dashboard',
    { params },
  );
  return res.data;
}

/** 利润报表：按时间统计（支持日/周/月分组） */
export async function getTimelineReport(params: {
  startDate: string;
  endDate: string;
  groupBy: FinanceGroupBy;
}): Promise<FinanceReportTimelineResponse> {
  const res = await getWithRetry<FinanceReportTimelineResponse>(
    '/api/finance/report/timeline',
    { params },
  );
  return res.data;
}

/** 利润报表：按商品统计 */
export async function getProductReport(
  params: FinanceRangeParams,
): Promise<FinanceReportProductResponse> {
  const res = await getWithRetry<FinanceReportProductResponse>(
    '/api/finance/report/product',
    { params },
  );
  return res.data;
}

/** 利润报表：按客户统计 */
export async function getCustomerReport(
  params: FinanceRangeParams,
): Promise<FinanceReportCustomerResponse> {
  const res = await getWithRetry<FinanceReportCustomerResponse>(
    '/api/finance/report/customer',
    { params },
  );
  return res.data;
}

/** 导出利润报表 Excel（blob 下载，文件名从 content-disposition 解析） */
export async function exportExcel(params: {
  type: FinanceExportType;
  startDate: string;
  endDate: string;
  groupBy?: FinanceGroupBy;
}): Promise<AxiosResponse<Blob>> {
  return getWithRetry<Blob>('/api/finance/export', {
    params,
    responseType: 'blob',
  });
}
