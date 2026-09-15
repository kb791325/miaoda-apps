import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { ViralGene, ListResponse } from '@shared/api.interface';

export type GeneType = 'hook' | 'copy' | 'emotion' | 'editing' | 'tag' | 'bgm' | 'all';
export type GeneSort = 'effect' | 'useCount' | 'createdAt';

export async function listGenes(
  type: GeneType = 'all',
  page = 1,
  pageSize = 20,
  sort: GeneSort = 'effect',
): Promise<ListResponse<ViralGene>> {
  try {
    const response = await axiosForBackend({
      url: '/api/gene/list',
      method: 'GET',
      params: { type, page, pageSize, sort },
    });
    return response.data;
  } catch (error) {
    logger.error('获取基因列表失败', error);
    throw error;
  }
}

export async function toggleFavorite(id: string): Promise<{
  id: string;
  isFavorite: boolean;
}> {
  try {
    const response = await axiosForBackend({
      url: `/api/gene/${id}/favorite`,
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    logger.error('切换基因收藏失败', error);
    throw error;
  }
}

export async function incrementUse(id: string): Promise<{
  id: string;
  useCount: number;
}> {
  try {
    const response = await axiosForBackend({
      url: `/api/gene/${id}/use`,
      method: 'PUT',
    });
    return response.data;
  } catch (error) {
    logger.error('增加使用次数失败', error);
    throw error;
  }
}
