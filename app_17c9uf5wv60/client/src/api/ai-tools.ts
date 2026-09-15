import axiosForBackend from './apiClient';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  AnomalyDetectionResponse,
  HealthScoreResponse,
  ReplenishmentResponse,
  ReplenishmentListParams,
  SalesPredictionItem,
  SalesPredictionParams,
  TransferSuggestionResponse,
  NaturalLanguageQueryRequest,
  NaturalLanguageQueryResponse,
} from '@shared/api.interface';

interface AnomalyDetectionParams {
  type?: string;
  warehouse?: string;
}

export async function getAnomalyDetection(
  params?: AnomalyDetectionParams,
): Promise<AnomalyDetectionResponse> {
  try {
    const res = await axiosForBackend.get('/api/ai/anomaly-detection', { params });
    return res.data;
  } catch (err: unknown) {
    logger.error('aiTools.getAnomalyDetection failed', { error: String(err) });
    throw err;
  }
}

export async function getHealthScore(): Promise<HealthScoreResponse> {
  try {
    const res = await axiosForBackend.get('/api/ai/health-score');
    return res.data;
  } catch (err: unknown) {
    logger.error('aiTools.getHealthScore failed', { error: String(err) });
    throw err;
  }
}

export async function getReplenishment(
  params?: ReplenishmentListParams,
): Promise<ReplenishmentResponse> {
  try {
    const res = await axiosForBackend.get('/api/ai/replenishment', { params });
    return res.data;
  } catch (err: unknown) {
    logger.error('aiTools.getReplenishment failed', { error: String(err) });
    throw err;
  }
}

export async function getSalesPrediction(
  params: SalesPredictionParams,
): Promise<SalesPredictionItem> {
  try {
    const res = await axiosForBackend.get('/api/ai/sales-prediction', { params });
    return res.data;
  } catch (err: unknown) {
    logger.error('aiTools.getSalesPrediction failed', { error: String(err) });
    throw err;
  }
}

export async function getTransferSuggestions(): Promise<TransferSuggestionResponse> {
  try {
    const res = await axiosForBackend.get('/api/ai/transfer-suggestions');
    return res.data;
  } catch (err: unknown) {
    logger.error('aiTools.getTransferSuggestions failed', { error: String(err) });
    throw err;
  }
}

export async function queryNaturalLanguage(
  query: string,
): Promise<NaturalLanguageQueryResponse> {
  try {
    const body: NaturalLanguageQueryRequest = { query };
    const res = await axiosForBackend.post('/api/ai/natural-language', body);
    return res.data;
  } catch (err: unknown) {
    logger.error('aiTools.queryNaturalLanguage failed', { error: String(err) });
    throw err;
  }
}
