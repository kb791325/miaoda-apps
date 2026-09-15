import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { ListResponse } from '@shared/api.interface';

export interface ProjectItem {
  id: string;
  type: 'video' | 'script' | 'production' | 'gene';
  title: string;
  coverUrl: string;
  gradeOrScore: string | number;
  status: string;
  createdAt: string;
  category?: string;
  isFavorite?: boolean;
}

export async function listProjects(
  type: 'all' | 'video' | 'script' | 'production' | 'gene' = 'all',
  page = 1,
  pageSize = 20,
): Promise<ListResponse<ProjectItem>> {
  try {
    const response = await axiosForBackend({
      url: '/api/project/list',
      method: 'GET',
      params: { type, page, pageSize },
    });
    return response.data;
  } catch (error) {
    logger.error('获取项目列表失败', error);
    throw error;
  }
}

export async function toggleFavorite(
  id: string,
  type: 'video' | 'script' | 'production' | 'gene',
): Promise<{ success: boolean }> {
  try {
    const response = await axiosForBackend({
      url: `/api/project/${id}/favorite`,
      method: 'POST',
      data: { type },
    });
    return response.data;
  } catch (error) {
    logger.error('切换收藏状态失败', error);
    throw error;
  }
}

export async function deleteProject(
  id: string,
  type: 'video' | 'script' | 'production' | 'gene',
): Promise<{ success: boolean }> {
  try {
    const response = await axiosForBackend({
      url: `/api/project/${id}`,
      method: 'DELETE',
      params: { type },
    });
    return response.data;
  } catch (error) {
    logger.error('删除项目失败', error);
    throw error;
  }
}

export async function copyProject(
  id: string,
  type: 'video' | 'script' | 'production' | 'gene',
): Promise<{ id: string }> {
  try {
    const response = await axiosForBackend({
      url: `/api/project/${id}/copy`,
      method: 'POST',
      data: { type },
    });
    return response.data;
  } catch (error) {
    logger.error('复制项目失败', error);
    throw error;
  }
}
