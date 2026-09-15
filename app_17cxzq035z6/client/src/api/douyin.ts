import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { HotSearchItem, VideoRecord, SuggestItem, CrawlSearchResult } from '@shared/api.interface';

export async function getHotSearch(): Promise<HotSearchItem[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/douyin/hot-search',
      method: 'GET',
    });
    return response.data.items;
  } catch (error) {
    logger.error('获取热榜失败', error);
    throw error;
  }
}

export async function searchVideos(
  keyword: string,
  count = 20,
  sortType = '0',
): Promise<{ items: VideoRecord[]; taskId?: string; isFallback?: boolean; message?: string }> {
  try {
    const response = await axiosForBackend({
      url: '/api/douyin/search',
      method: 'GET',
      params: { keyword, count, sortType },
    });
    return response.data;
  } catch (error) {
    logger.error('搜索视频失败', error);
    throw error;
  }
}

export async function getVideoDetail(id: string): Promise<VideoRecord> {
  try {
    const response = await axiosForBackend({
      url: `/api/douyin/video/${id}`,
      method: 'GET',
    });
    return response.data.item;
  } catch (error) {
    logger.error('获取视频详情失败', error);
    throw error;
  }
}

export async function getRelatedVideos(id: string): Promise<VideoRecord[]> {
  try {
    const response = await axiosForBackend({
      url: `/api/douyin/related/${id}`,
      method: 'GET',
    });
    return response.data.items;
  } catch (error) {
    logger.error('获取相关视频失败', error);
    throw error;
  }
}

export async function getSuggest(keyword: string): Promise<SuggestItem[]> {
  try {
    const response = await axiosForBackend({
      url: '/api/douyin/suggest',
      method: 'GET',
      params: { keyword },
    });
    return response.data.items;
  } catch (error) {
    logger.error('获取搜索建议失败', error);
    throw error;
  }
}

export async function crawlSearch(keyword: string, count = 20): Promise<CrawlSearchResult> {
  try {
    const response = await axiosForBackend({
      url: '/api/douyin/crawl-search',
      method: 'POST',
      data: { keyword, count },
    });
    return response.data;
  } catch (error) {
    logger.error('实时爬取搜索失败', error);
    throw error;
  }
}

export async function listVideos(params: {
  page?: number;
  pageSize?: number;
  sortBy?: 'digg' | 'created_at';
}): Promise<{ items: VideoRecord[]; total: number; page: number; pageSize: number; sortBy: string }> {
  try {
    const response = await axiosForBackend({
      url: '/api/douyin/videos',
      method: 'GET',
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        sortBy: params.sortBy ?? 'digg',
      },
    });
    return response.data;
  } catch (error) {
    logger.error('获取视频列表失败', error);
    throw error;
  }
}
