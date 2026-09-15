import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { VideoRecord, CompareResult } from '@shared/api.interface';

export async function analyzeVideo(videoId: string): Promise<VideoRecord> {
  try {
    const response = await axiosForBackend({
      url: `/api/analyze/video/${videoId}`,
      method: 'POST',
    });
    return response.data.item;
  } catch (error) {
    logger.error('分析视频失败', error);
    throw error;
  }
}

export async function batchAnalyze(videoIds: string[]): Promise<{ count: number }> {
  try {
    const response = await axiosForBackend({
      url: '/api/analyze/batch',
      method: 'POST',
      data: { videoIds },
    });
    return response.data;
  } catch (error) {
    logger.error('批量分析失败', error);
    throw error;
  }
}

export async function compareVideos(videoIds: string[]): Promise<CompareResult> {
  try {
    const response = await axiosForBackend({
      url: '/api/analyze/compare',
      method: 'POST',
      data: { videoIds },
    });
    return response.data;
  } catch (error) {
    logger.error('对比视频失败', error);
    throw error;
  }
}
