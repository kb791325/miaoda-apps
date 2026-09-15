import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

axiosForBackend.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const err = new Error('无操作权限，请联系管理员分配角色');
      (err as unknown as Record<string, unknown>).is403 = true;
      return Promise.reject(err);
    }
    return Promise.reject(error);
  },
);

export default axiosForBackend;
