import { useEffect, useMemo, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { loadIndustryOverview } from '@/api/industry-overview';
import { computeOverview } from './industry-overview-data';
import type { OverviewComputed, OverviewRaw, TimeDim } from './industry-overview-data';

export interface IndustryOverviewState {
  loading: boolean;
  error: string | null;
  data: OverviewComputed | null;
  /** 所选周期内无消耗数据（趋势/占比图空态） */
  consumeEmpty: boolean;
  /** 行业ROI 基准表无数据（流量成本图空态） */
  roiEmpty: boolean;
}

const INITIAL_RAW: OverviewRaw = { consumes: [], roiBaselines: [] };

/**
 * 真实取数 hook：三张表全量拉取一次（与时间维度无关），
 * 时间维度切换时仅在前端重新聚合（useMemo 依赖 dim）。
 */
export const useIndustryOverview = (dim: TimeDim): IndustryOverviewState => {
  const [raw, setRaw] = useState<OverviewRaw>(INITIAL_RAW);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const result = await loadIndustryOverview();
        if (cancelled) return;
        setRaw(result);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : '数据加载失败';
        logger.error('[IndustryOverview] load failed', { msg });
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 三表均无数据时 data 为 null，各图走空态；切换时间维度仅重新聚合，不重新拉取
  const data = useMemo<OverviewComputed | null>(
    () => (raw.consumes.length > 0 || raw.roiBaselines.length > 0 ? computeOverview(raw, dim) : null),
    [raw, dim],
  );

  return {
    loading,
    error,
    data,
    consumeEmpty: !data || data.pieData.length === 0,
    roiEmpty: data === null || raw.roiBaselines.length === 0,
  };
};
