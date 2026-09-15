import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { reconcileBitable } from '@client/src/api/bitable-retry';
import type {
  AuditMarketingContentRequest,
  CreateMarketingContentRequest,
  CreateMaterialRequest,
  MarketingContentCalendarResponse,
  MarketingContentDetail,
  MarketingContentEffectRequest,
  MarketingContentListResponse,
  MarketingContentStatus,
  MarketingContentStatusResponse,
  MaterialListResponse,
  UpdateMarketingContentMediaRequest,
  UpdateMaterialRequest,
  MaterialOptionsResponse,
} from '@shared/content';

export { extractErrorMessage } from '@client/src/utils/error-message';

export interface ContentListQuery {
  status?: MarketingContentStatus;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export const fetchMarketingContents = async (
  params: ContentListQuery,
): Promise<MarketingContentListResponse> => {
  try {
    const response = await axiosForBackend.get<MarketingContentListResponse>(
      '/api/marketing-contents',
      { params },
    );
    return response.data;
  } catch (error) {
    logger.error('获取招生内容列表失败', error);
    throw error;
  }
};

export const createMarketingContent = async (
  request: CreateMarketingContentRequest,
): Promise<{ id: string }> => {
  try {
    const response = await axiosForBackend.post<{ id: string }>(
      '/api/marketing-contents',
      request,
    );
    return response.data;
  } catch (error) {
    logger.error('创建招生内容失败', error);
    throw error;
  }
};

export const auditMarketingContent = async (
  id: string,
  request: AuditMarketingContentRequest,
): Promise<MarketingContentStatusResponse> => {
  try {
    const response = await axiosForBackend.patch<MarketingContentStatusResponse>(
      `/api/marketing-contents/${id}/audit`,
      request,
    );
    return response.data;
  } catch (error) {
    logger.error('审核招生内容失败', error);
    throw error;
  }
};

export const markMarketingContentUsed = async (
  id: string,
): Promise<MarketingContentStatusResponse> => {
  try {
    const response = await axiosForBackend.patch<MarketingContentStatusResponse>(
      `/api/marketing-contents/${id}/use`,
    );
    return response.data;
  } catch (error) {
    logger.error('标记内容已使用失败', error);
    throw error;
  }
};

export const saveMarketingContentEffect = async (
  id: string,
  request: MarketingContentEffectRequest,
): Promise<{ id: string }> => {
  try {
    const response = await axiosForBackend.patch<{ id: string }>(
      `/api/marketing-contents/${id}/effect`,
      request,
    );
    return response.data;
  } catch (error) {
    logger.error('录入内容效果数据失败', error);
    throw error;
  }
};

export const fetchMarketingContentDetail = async (
  id: string,
): Promise<MarketingContentDetail> => {
  try {
    const response = await axiosForBackend.get<MarketingContentDetail>(
      `/api/marketing-contents/${id}`,
    );
    return response.data;
  } catch (error) {
    logger.error('获取招生内容详情失败', error);
    throw error;
  }
};

export const saveMarketingContentMedia = async (
  id: string,
  request: UpdateMarketingContentMediaRequest,
): Promise<MarketingContentDetail> => {
  try {
    const response = await axiosForBackend.patch<MarketingContentDetail>(
      `/api/marketing-contents/${id}/media`,
      request,
    );
    return response.data;
  } catch (error) {
    logger.error('保存内容素材失败', error);
    throw error;
  }
};

export const fetchMarketingCalendar = async (
  month: string,
): Promise<MarketingContentCalendarResponse> => {
  try {
    const response = await axiosForBackend.get<MarketingContentCalendarResponse>(
      '/api/marketing-contents/calendar',
      { params: { month } },
    );
    return response.data;
  } catch (error) {
    logger.error('获取发布日历失败', error);
    throw error;
  }
};

export interface MaterialListQuery {
  materialType?: string;
  platform?: string;
  tag?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export const fetchMaterials = async (
  params: MaterialListQuery,
): Promise<MaterialListResponse> => {
  try {
    await reconcileBitable(['material']);
    const response = await axiosForBackend.get<MaterialListResponse>(
      '/api/materials',
      { params },
    );
    return response.data;
  } catch (error) {
    logger.error('获取素材库列表失败', error);
    throw error;
  }
};

export const fetchMaterialOptions = async (): Promise<MaterialOptionsResponse> => {
  try {
    const response = await axiosForBackend.get<MaterialOptionsResponse>(
      '/api/materials/options',
    );
    return response.data;
  } catch (error) {
    logger.error('获取素材库筛选项失败', error);
    throw error;
  }
};

export const createMaterial = async (
  request: CreateMaterialRequest,
): Promise<{ id: string }> => {
  try {
    const response = await axiosForBackend.post<{ id: string }>(
      '/api/materials',
      request,
    );
    return response.data;
  } catch (error) {
    logger.error('新增素材失败', error);
    throw error;
  }
};

export const updateMaterial = async (
  materialId: string,
  request: UpdateMaterialRequest,
): Promise<{ id: string }> => {
  try {
    const response = await axiosForBackend.patch<{ id: string }>(
      `/api/materials/${materialId}`,
      request,
    );
    return response.data;
  } catch (error) {
    logger.error('更新素材失败', error);
    throw error;
  }
};

export const deleteMaterial = async (materialId: string): Promise<void> => {
  try {
    await axiosForBackend.delete(`/api/materials/${materialId}`);
  } catch (error) {
    logger.error('删除素材失败', error);
    throw error;
  }
};

export const deleteMarketingContent = async (id: string): Promise<void> => {
  try {
    await axiosForBackend.delete(`/api/marketing-contents/${id}`);
  } catch (error) {
    logger.error('删除招生内容失败', error);
    throw error;
  }
};
