import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { VideoProduction, ListResponse } from '@shared/api.interface';

interface CreateProductionParams {
  scriptId?: string;
  characterRef?: string;
}

export async function createProduction(
  params: CreateProductionParams,
): Promise<VideoProduction> {
  try {
    const response = await axiosForBackend({
      url: '/api/produce',
      method: 'POST',
      data: params,
    });
    return response.data.item;
  } catch (error) {
    logger.error('创建视频制作项目失败', error);
    throw error;
  }
}

export async function getProduction(id: string): Promise<VideoProduction> {
  try {
    const response = await axiosForBackend({
      url: `/api/produce/${id}`,
      method: 'GET',
    });
    return response.data.item;
  } catch (error) {
    logger.error('获取视频制作项目失败', error);
    throw error;
  }
}

export async function updateProduction(
  id: string,
  data: Partial<VideoProduction>,
): Promise<VideoProduction> {
  try {
    const response = await axiosForBackend({
      url: `/api/produce/${id}`,
      method: 'PUT',
      data,
    });
    return response.data.item;
  } catch (error) {
    logger.error('更新视频制作项目失败', error);
    throw error;
  }
}

export async function listProductions(
  page = 1,
  pageSize = 20,
): Promise<ListResponse<VideoProduction>> {
  try {
    const response = await axiosForBackend({
      url: '/api/produce/list',
      method: 'GET',
      params: { page, pageSize },
    });
    return response.data;
  } catch (error) {
    logger.error('获取视频制作列表失败', error);
    throw error;
  }
}
