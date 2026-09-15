import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  ChannelDistributionResponse,
  DashboardOverview,
  EnrollmentTrendResponse,
} from '@shared/dashboard';
import type { LeadTodoResponse } from '@shared/lead';

async function requestDashboardData<T>(
  url: string,
  sceneName: string,
): Promise<T> {
  try {
    const response = await axiosForBackend.get<T>(url);
    if (response.status === 403) {
      logger.error(`工作台接口无访问权限: ${url}`);
      throw new Error('当前账号无权访问工作台数据');
    }
    return response.data;
  } catch (error) {
    logger.error(`工作台接口请求失败(${sceneName}): ${url}`, error);
    throw error;
  }
}

export function fetchDashboardOverview(): Promise<DashboardOverview> {
  return requestDashboardData<DashboardOverview>(
    '/api/dashboard/overview',
    '经营总览',
  );
}

export function fetchEnrollmentTrend(): Promise<EnrollmentTrendResponse> {
  return requestDashboardData<EnrollmentTrendResponse>(
    '/api/dashboard/enrollment-trend',
    '招生趋势',
  );
}

export function fetchChannelDistribution(): Promise<ChannelDistributionResponse> {
  return requestDashboardData<ChannelDistributionResponse>(
    '/api/dashboard/channel-distribution',
    '渠道分布',
  );
}

export function fetchLeadTodos(): Promise<LeadTodoResponse> {
  return requestDashboardData<LeadTodoResponse>(
    '/api/dashboard/lead-todos',
    '待跟进线索',
  );
}
