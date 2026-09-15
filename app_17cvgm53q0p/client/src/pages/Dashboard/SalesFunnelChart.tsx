import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { CallbackDataParams } from 'echarts/types/dist/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SALES_STAGES } from '@shared/customer';
import type { Customer } from '@shared/customer';
import ChartState from './ChartState';
import {
  FUNNEL_STAGE_COLORS,
  FUNNEL_STAGE_LABEL_COLORS,
} from './chart-palette';

interface SalesFunnelChartProps {
  customers: Customer[];
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
}

const FUNNEL_STAGES: string[] = SALES_STAGES.filter(
  (stage: string): boolean => stage !== '已流失',
);

const FUNNEL_GEOMETRY = {
  left: '22%',
  width: '56%',
  top: 12,
  bottom: 48,
  minSize: '16%',
  maxSize: '100%',
  gap: 4,
  funnelAlign: 'center',
  sort: 'none',
} as const;

interface StageCount {
  name: string;
  value: number;
}

const SalesFunnelChart: React.FC<SalesFunnelChartProps> = ({
  customers,
  loading,
  error = false,
  onRetry,
}) => {
  const stageCounts: StageCount[] = useMemo(
    () =>
      FUNNEL_STAGES.map((stage: string, stageIndex: number) => ({
        name: stage,
        value: customers.filter((customer: Customer): boolean => {
          const reachedIndex: number = FUNNEL_STAGES.indexOf(
            customer.crm.salesStage,
          );
          return reachedIndex >= stageIndex;
        }).length,
      })),
    [customers],
  );

  const totalCount: number = stageCounts[0]?.value ?? 0;

  const dealRate: number = useMemo(() => {
    const dealt: StageCount | undefined = stageCounts.find(
      (item: StageCount): boolean => item.name === '已成交',
    );
    if (!dealt || totalCount === 0) return 0;
    return Math.round((dealt.value / totalCount) * 100);
  }, [stageCounts, totalCount]);

  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: (params: CallbackDataParams) => {
          if (params.seriesName !== '销售漏斗') return '';
          const index: number = Number(params.dataIndex);
          const current: StageCount | undefined = stageCounts[index];
          if (!current) return '';
          const prev: StageCount | undefined =
            index > 0 ? stageCounts[index - 1] : undefined;
          const rateText: string = prev
            ? prev.value > 0
              ? `较「${prev.name}」转化率：${Math.round(
                  (current.value / prev.value) * 100,
                )}%`
              : `较「${prev.name}」转化率：0%`
            : '漏斗起始阶段';
          return [
            `<div style="font-weight:600;margin-bottom:4px">${current.name}</div>`,
            `<div>客户数量：${current.value} 位</div>`,
            `<div>${rateText}</div>`,
          ].join('');
        },
      },
      legend: {
        bottom: 0,
        left: 'center',
        icon: 'roundRect',
        itemWidth: 14,
        itemHeight: 8,
        itemGap: 16,
        textStyle: { fontSize: 14, color: '#475569' },
        data: FUNNEL_STAGES,
      },
      series: [
        {
          name: '销售漏斗',
          type: 'funnel',
          ...FUNNEL_GEOMETRY,
          label: {
            show: true,
            position: 'inside',
            formatter: (params: CallbackDataParams) => {
              const item: StageCount | undefined =
                stageCounts[Number(params.dataIndex)];
              return item ? `{value|${item.value}}{unit| 位}` : '';
            },
            rich: {
              value: { fontSize: 22, fontWeight: 700, lineHeight: 28 },
              unit: { fontSize: 13, lineHeight: 28 },
            },
          },
          emphasis: {
            label: { show: true },
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(15, 23, 42, 0.3)',
              borderColor: '#FFFFFF',
              borderWidth: 1,
            },
          },
          data: stageCounts.map((item: StageCount) => ({
            name: item.name,
            value: item.value,
            itemStyle: {
              color: FUNNEL_STAGE_COLORS[item.name] ?? '#8F959E',
            },
            label: {
              color: FUNNEL_STAGE_LABEL_COLORS[item.name] ?? '#FFFFFF',
            },
          })),
        },
        {
          name: '阶段名称',
          type: 'funnel',
          ...FUNNEL_GEOMETRY,
          silent: true,
          tooltip: { show: false },
          itemStyle: { color: 'transparent', borderWidth: 0 },
          label: {
            show: true,
            position: 'left',
            distance: 12,
            fontSize: 15,
            fontWeight: 600,
            color: '#334155',
            formatter: (params: CallbackDataParams) => String(params.name),
          },
          data: stageCounts.map((item: StageCount) => ({
            name: item.name,
            value: item.value,
          })),
        },
      ],
    }),
    [stageCounts],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">销售漏斗</CardTitle>
        <span className="text-sm text-muted-foreground">
          共 {totalCount} 位客户 · 成交率 {dealRate}%
        </span>
      </CardHeader>
      <CardContent>
        <ChartState
          loading={loading}
          error={error}
          empty={totalCount === 0}
          emptyText="暂无客户阶段数据"
          onRetry={onRetry ?? (() => {})}
        >
          <ReactECharts
            option={option}
            theme="ud"
            className="h-[340px] w-full"
          />
        </ChartState>
      </CardContent>
    </Card>
  );
};

export default SalesFunnelChart;
