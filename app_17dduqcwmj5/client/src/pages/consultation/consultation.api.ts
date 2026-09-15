import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { reconcileBitable } from '@client/src/api/bitable-retry';
import { extractErrorMessage } from '@client/src/utils/error-message';
import type {
  ConvertFaqMissRequest,
  ConvertFaqMissResponse,
  CreateFaqRequest,
  CreateFaqResponse,
  FaqListResponse,
  FaqMatchResponse,
  FaqMissListResponse,
  UpdateFaqRequest,
  UpdateFaqResponse,
} from '@shared/consultation';

export interface FaqListParams {
  category?: string;
  status?: string;
  keyword?: string;
  page: number;
  pageSize: number;
}

export interface FaqMissListParams {
  status?: string;
  page: number;
  pageSize: number;
}

export const matchFaq = async (
  question: string,
): Promise<FaqMatchResponse> => {
  try {
    const response = await axiosForBackend.post<FaqMatchResponse>(
      '/api/faqs/match',
      { question },
    );
    return response.data;
  } catch (error) {
    logger.error('FAQ 匹配请求失败', error);
    throw new Error(extractErrorMessage(error));
  }
};

export const listFaqs = async (
  params: FaqListParams,
): Promise<FaqListResponse> => {
  try {
    await reconcileBitable(['faq']);
    const response = await axiosForBackend.get<FaqListResponse>('/api/faqs', {
      params: {
        category: params.category || undefined,
        status: params.status || undefined,
        keyword: params.keyword || undefined,
        page: params.page,
        pageSize: params.pageSize,
      },
    });
    return response.data;
  } catch (error) {
    logger.error('FAQ 列表请求失败', error);
    throw new Error(extractErrorMessage(error));
  }
};

export const createFaq = async (
  request: CreateFaqRequest,
): Promise<CreateFaqResponse> => {
  try {
    const response = await axiosForBackend.post<CreateFaqResponse>(
      '/api/faqs',
      request,
    );
    return response.data;
  } catch (error) {
    logger.error('新增 FAQ 请求失败', error);
    throw new Error(extractErrorMessage(error));
  }
};

export const updateFaq = async (
  id: string,
  request: UpdateFaqRequest,
): Promise<UpdateFaqResponse> => {
  try {
    const response = await axiosForBackend.patch<UpdateFaqResponse>(
      `/api/faqs/${id}`,
      request,
    );
    return response.data;
  } catch (error) {
    logger.error('更新 FAQ 请求失败', error);
    throw new Error(extractErrorMessage(error));
  }
};

export const listFaqMisses = async (
  params: FaqMissListParams,
): Promise<FaqMissListResponse> => {
  try {
    const response = await axiosForBackend.get<FaqMissListResponse>(
      '/api/faq-misses',
      {
        params: {
          status: params.status || undefined,
          page: params.page,
          pageSize: params.pageSize,
        },
      },
    );
    return response.data;
  } catch (error) {
    logger.error('未命中问题列表请求失败', error);
    throw new Error(extractErrorMessage(error));
  }
};

export const convertFaqMiss = async (
  id: string,
  request: ConvertFaqMissRequest,
): Promise<ConvertFaqMissResponse> => {
  try {
    const response = await axiosForBackend.post<ConvertFaqMissResponse>(
      `/api/faq-misses/${id}/convert`,
      request,
    );
    return response.data;
  } catch (error) {
    logger.error('转换未命中问题请求失败', error);
    throw new Error(extractErrorMessage(error));
  }
};
