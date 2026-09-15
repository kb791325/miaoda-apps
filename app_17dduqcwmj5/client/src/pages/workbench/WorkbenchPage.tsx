import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type {
  ChannelDistributionResponse,
  DashboardOverview,
  EnrollmentTrendResponse,
} from '@shared/dashboard';
import {
  fetchChannelDistribution,
  fetchDashboardOverview,
  fetchEnrollmentTrend,
} from './dashboard.api';
import WelcomeHeader from './WelcomeHeader';
import KpiCards from './KpiCards';
import EnrollmentTrendChart from './EnrollmentTrendChart';
import ChannelPieChart from './ChannelPieChart';
import TodoQuickAccess from './TodoQuickAccess';

const WorkbenchPage: React.FC = () => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [trend, setTrend] = useState<EnrollmentTrendResponse | null>(null);
  const [channel, setChannel] = useState<ChannelDistributionResponse | null>(
    null,
  );
  const [overviewLoading, setOverviewLoading] = useState<boolean>(true);
  const [trendLoading, setTrendLoading] = useState<boolean>(true);
  const [channelLoading, setChannelLoading] = useState<boolean>(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOverview = useCallback((): void => {
    setOverviewLoading(true);
    setOverviewError(null);
    fetchDashboardOverview()
      .then((data: DashboardOverview) => {
        setOverview(data);
      })
      .catch(() => {
        setOverviewError('经营总览数据加载失败，请重试');
      })
      .finally(() => {
        setOverviewLoading(false);
      });
  }, []);

  useEffect(() => {
    loadOverview();

    fetchEnrollmentTrend()
      .then((data: EnrollmentTrendResponse) => {
        setTrend(data);
      })
      .catch(() => {
        setLoadError('工作台数据加载失败，请刷新页面重试');
      })
      .finally(() => {
        setTrendLoading(false);
      });

    fetchChannelDistribution()
      .then((data: ChannelDistributionResponse) => {
        setChannel(data);
      })
      .catch(() => {
        setLoadError('工作台数据加载失败，请刷新页面重试');
      })
      .finally(() => {
        setChannelLoading(false);
      });
  }, [loadOverview]);

  return (
    <div className="flex flex-col gap-6">
      <WelcomeHeader />

      {loadError ? (
        <div className="flex items-center gap-2 rounded-lg border border-[hsl(5_75%_55%/0.35)] bg-[hsl(5_75%_55%/0.08)] px-4 py-3 text-sm text-[hsl(5_75%_40%)]">
          <AlertCircle className="size-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : null}

      <KpiCards
        overview={overview}
        loading={overviewLoading}
        error={overviewError}
        onRetry={loadOverview}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <EnrollmentTrendChart items={trend?.items ?? null} loading={trendLoading} />
        <ChannelPieChart
          items={channel?.items ?? null}
          loading={channelLoading}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-foreground">待办事项</h2>
        <TodoQuickAccess todo={overview?.todo ?? null} loading={overviewLoading} />
      </div>
    </div>
  );
};

export default WorkbenchPage;
