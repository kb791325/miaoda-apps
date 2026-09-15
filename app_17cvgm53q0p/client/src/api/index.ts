import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

import { emitUnauthorized } from '@client/src/utils/auth-events';

const AUTH_ENTRY_URLS = [
  '/api/auth/login',
  '/api/auth/feishu-login',
];

axiosForBackend.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error?.response?.status;
    const url: string = error?.config?.url ?? '';
    const isAuthEntry: boolean = AUTH_ENTRY_URLS.some((path: string) =>
      url.includes(path),
    );
    if (status === 401 && !isAuthEntry) {
      emitUnauthorized();
    }
    return Promise.reject(error);
  },
);

logger.debug('api interceptors registered');

// 各业务域 API 按命名空间聚合导出，避免跨模块 export 名冲突
export * as authApi from './auth';
export * as orderApi from './order';
export * as productApi from './product';
export * as customerApi from './customer';
export * as dashboardApi from './dashboard';
export * as followUpApi from './follow-up';
export * as shipmentApi from './shipment';
export * as feeApi from './fee';
export * as financeApi from './finance';
export * as homeApi from './home';
export * as opLogApi from './op-log';
export * as reminderApi from './reminder';
