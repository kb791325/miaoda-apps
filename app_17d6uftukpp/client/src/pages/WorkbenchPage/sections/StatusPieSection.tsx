import { memo, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { IBizRecord } from '@/data/mt-records';

interface StatusPieSectionProps {
  ads: IBizRecord[];
  videos: IBizRecord[];
}

/** 广告账户 / 视频项目状态分布环形图 */
export default memo(function StatusPieSection({ ads, videos }: StatusPieSectionProps) {
  const option = useMemo<EChartsOption>(() => {
    const adNormal = ads.filter((a) => a.values.status === '正常').length;
    const adLow = ads.filter((a) => a.values.status === '余额不足').length;
    const adStandby = ads.filter((a) => a.values.status === '暂停' || a.values.status === '待激活').length;
    const adAbnormal = ads.filter((a) => ['封禁', '已注销'].includes(String(a.values.status))).length;
    const videoDoing = videos.filter((v) => v.values.status !== '已完成').length;
    const videoDone = videos.filter((v) => v.values.status === '已完成').length;

    const data = [
      { name: '正常账户', value: adNormal },
      { name: '余额不足', value: adLow },
      { name: '暂停/待激活', value: adStandby },
      { name: '封禁/注销', value: adAbnormal },
      { name: '视频制作中', value: videoDoing },
      { name: '视频已完成', value: videoDone },
    ].filter((d) => d.value > 0);

    return {
      tooltip: { trigger: 'item' },
      legend: { type: 'scroll', bottom: 0 },
      series: [
        {
          name: '项目状态',
          type: 'pie',
          radius: ['40%', '65%'],
          center: ['50%', '45%'],
          data,
          label: { show: false },
          emphasis: { label: { show: false } },
        },
      ],
    };
  }, [ads, videos]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">项目状态分布</CardTitle>
        <CardDescription>广告与视频项目当前状态占比</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <ReactECharts option={option} theme="ud" className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
});
