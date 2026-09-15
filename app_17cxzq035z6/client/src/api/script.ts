import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { ScriptProject, ListResponse } from '@shared/api.interface';

interface GenerateScriptParams {
  topic: string;
  category?: string;
  targetDuration?: number;
  referenceVideoIds?: string[];
}

export async function generateScript(
  params: GenerateScriptParams,
): Promise<ScriptProject> {
  try {
    const response = await axiosForBackend({
      url: '/api/script/generate',
      method: 'POST',
      data: params,
    });
    return response.data.item;
  } catch (error) {
    logger.error('生成脚本失败', error);
    throw error;
  }
}

export async function getScript(id: string): Promise<ScriptProject> {
  try {
    const response = await axiosForBackend({
      url: `/api/script/${id}`,
      method: 'GET',
    });
    return response.data.item;
  } catch (error) {
    logger.error('获取脚本失败', error);
    throw error;
  }
}

export async function updateScript(
  id: string,
  data: Partial<ScriptProject>,
): Promise<ScriptProject> {
  try {
    const response = await axiosForBackend({
      url: `/api/script/${id}`,
      method: 'PUT',
      data,
    });
    return response.data.item;
  } catch (error) {
    logger.error('更新脚本失败', error);
    throw error;
  }
}

export async function listScripts(
  page = 1,
  pageSize = 20,
): Promise<ListResponse<ScriptProject>> {
  try {
    const response = await axiosForBackend({
      url: '/api/script/list',
      method: 'GET',
      params: { page, pageSize },
    });
    return response.data;
  } catch (error) {
    logger.error('获取脚本列表失败', error);
    throw error;
  }
}
