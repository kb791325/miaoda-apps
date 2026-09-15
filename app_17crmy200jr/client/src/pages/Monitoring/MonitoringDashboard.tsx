import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import PageLoader from '@client/src/components/PageLoader';
import * as monitoringApi from '@client/src/api/monitoring';
import type {
  PerformanceOverview as PerformanceOverviewData,
  ResponseTimeStats,
  ThroughputStats,
  ErrorStats,
  BusinessMetricsOverview,
  AlertEvent,
  SlowRequestItem,
  MetricTrend,
  SystemMetrics,
} from '@shared/api.interface';
import PerformanceOverview from './PerformanceOverview';
import ResponseTimeChart from './ResponseTimeChart';
import ThroughputChart from './ThroughputChart';
import ErrorStatsPanel from './ErrorStatsPanel';
import BusinessMetricsPanel from './BusinessMetricsPanel';
import ActiveAlertsPanel from './ActiveAlertsPanel';
import SlowRequestsTable from './SlowRequestsTable';
import SystemResourcesPanel from './SystemResourcesPanel';
import TrendsChart from './TrendsChart';
import PerformanceBenchmarkPanel from './PerformanceBenchmarkPanel';
import { buildTimeSeries, buildThroughputSeries } from './chartHelpers';

const REFRESH_INTERVAL_MS = 30000;

interface DashboardData {
  performance: PerformanceOverviewData | null;
  responseTime: ResponseTimeStats | null;
  throughput: ThroughputStats | null;
  errorStats: ErrorStats | null;
  business: BusinessMetricsOverview | null;
  activeAlerts: AlertEvent[];
  slowRequests: SlowRequestItem[];
  trends: MetricTrend[];
  system: SystemMetrics | null;
}

const INITIAL_DATA: DashboardData = {
  performance: null, responseTime: null, throughput: null,
  errorStats: null, business: null, activeAlerts: [],
  slowRequests: [], trends: [], system: null,
};

const MonitoringDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const hasDataRef = useRef<boolean>(false);

  const fetchAll = useCallback(async () => {
    try {
      const [
        performance, responseTime, throughput, errorStats,
        business, activeAlerts, slowRequests, trends,
      ] = await Promise.all([
        monitoringApi.getPerformanceOverview(),
        monitoringApi.getResponseTimeStats(),
        monitoringApi.getThroughputStats(),
        monitoringApi.getErrorStats(),
        monitoringApi.getBusinessOverview(),
        monitoringApi.getActiveAlerts(),
        monitoringApi.getSlowRequests(10),
        monitoringApi.getBusinessTrends('all', 30),
      ]);
      setData({
        performance, responseTime, throughput, errorStats, business,
        activeAlerts: Array.isArray(activeAlerts) ? activeAlerts : [],
        slowRequests: Array.isArray(slowRequests) ? slowRequests : [],
        trends: Array.isArray(trends) ? trends : [],
        system: business?.system ?? null,
      });
      hasDataRef.current = true;
      setError(null);
      setLastRefresh(new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }));
    } catch (err: unknown) {
      logger.error('获取监控数据失败', err);
      if (!hasDataRef.current) setError('无法加载监控数据，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchAll]);

  const handleAcknowledge = useCallback(async (id: string) => {
    try {
      await monitoringApi.acknowledgeAlert(id);
      setData((prev) => ({
        ...prev,
        activeAlerts: prev.activeAlerts.filter((a) => a.id !== id),
      }));
    } catch (err: unknown) {
      logger.error('确认告警失败', err);
    }
  }, []);

  const handleResolve = useCallback(async (id: string) => {
    try {
      await monitoringApi.resolveAlert(id);
      setData((prev) => ({
        ...prev,
        activeAlerts: prev.activeAlerts.filter((a) => a.id !== id),
      }));
    } catch (err: unknown) {
      logger.error('解决告警失败', err);
    }
  }, []);

  if (loading && !data.performance) return <PageLoader />;

  if (error && !data.performance) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <button
            onClick={fetchAll}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className="size-3.5" /> 重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">系统监控</h1>
          {lastRefresh && (
            <p className="text-xs text-muted-foreground mt-0.5">
              最近刷新: {lastRefresh}
              <span className="ml-2 text-muted-foreground/60">
                (每 30 秒自动刷新)
              </span>
            </p>
          )}
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <PerformanceOverview data={data.performance} loading={loading} />
          <ResponseTimeChart
            data={buildTimeSeries(data.responseTime, 24)} loading={loading}
          />
          <ThroughputChart
            data={buildThroughputSeries(data.throughput, 24)} loading={loading}
          />
          <TrendsChart data={data.trends} loading={loading} />
        </div>
        <div className="space-y-4">
          <BusinessMetricsPanel data={data.business} loading={loading} />
          <ActiveAlertsPanel
            data={data.activeAlerts} loading={loading}
            onAcknowledge={handleAcknowledge} onResolve={handleResolve}
          />
          <ErrorStatsPanel data={data.errorStats} loading={loading} />
          <SystemResourcesPanel data={data.system} loading={loading} />
          <SlowRequestsTable data={data.slowRequests} loading={loading} />
          <PerformanceBenchmarkPanel
            data={null}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;