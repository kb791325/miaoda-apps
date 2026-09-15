import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { PipelineStatus } from '@shared/api.interface';

export async function startPipeline(
  keyword: string,
  options?: { track?: string; duration?: number },
): Promise<{ taskId: string }> {
  try {
    const resp = await axiosForBackend.post('/api/auto/pipeline', { keyword, ...options });
    return resp.data;
  } catch (error) {
    logger.error('启动流水线失败', error);
    throw error;
  }
}

export async function getPipelineStatus(taskId: string): Promise<PipelineStatus> {
  try {
    const resp = await axiosForBackend.get(`/api/auto/pipeline/${taskId}`);
    return resp.data;
  } catch (error) {
    logger.error('获取流水线状态失败', error);
    throw error;
  }
}
