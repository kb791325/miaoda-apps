import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link as LinkIcon } from 'lucide-react';
import { ArrowLeft, Sparkles } from 'lucide-react';

import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import { Button } from '@/components/ui/button';
import ReportCard from '@/components/ReportCard';
import { MaterialStatusBadge, RatingLevelBadge } from '@/components/StatusBadge';
import { fmtCount } from '@/lib/format';
import { useWorkshop } from '@/lib/store';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] py-2.5 last:border-b-0">
      <span className="shrink-0 text-[10px] font-black uppercase tracking-tight text-slate-400">{label}</span>
      <span className="min-w-0 text-right text-xs font-bold text-slate-800">{value || '—'}</span>
    </div>
  );
}

function MetricCell({ label, value, aux }: { label: string; value: string; aux?: string }) {
  return (
    <div className="border-r border-[#E2E8F0] p-4 last:border-r-0">
      <div className="text-[9px] font-black uppercase tracking-tight text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-bold tabular-nums text-slate-800">{value}</div>
      {aux ? <div className="mt-1 text-[10px] font-medium text-slate-400">{aux}</div> : null}
    </div>
  );
}

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { materials } = useWorkshop();
  const material = materials.find((m) => m.id === id);

  const radarOption = useMemo<EChartsOption | null>(() => {
    if (!material) return null;
    return {
      tooltip: {},
      radar: {
        indicator: [
          { name: '完播力' },
          { name: '互动潜力' },
          { name: '内容质量' },
          { name: '平台适配' },
          { name: '传播潜力' },
        ],
        radius: '62%',
        axisName: { color: '#94A3B8', fontSize: 11, fontWeight: 700 },
        splitLine: { lineStyle: { color: '#E2E8F0' } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: '#E2E8F0' } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: [
                material.fiveDimensions.completionPower,
                material.fiveDimensions.interactionPotential,
                material.fiveDimensions.contentQuality,
                material.fiveDimensions.platformFit,
                material.fiveDimensions.spreadPotential,
              ],
              name: '五维评分',
            },
          ],
          itemStyle: { color: '#0033A0' },
          lineStyle: { color: '#0033A0', width: 2 },
          areaStyle: { color: '#0033A0', opacity: 0.15 },
        },
      ],
    };
  }, [material]);

  if (!material) {
    return (
      <ReportCard className="py-16 text-center">
        <div className="text-sm font-bold text-slate-700">素材不存在或已被删除</div>
        <Button type="button" variant="outline" onClick={() => navigate('/materials')} className="mt-4 rounded-none">
          <ArrowLeft className="size-4" /> 返回素材库
        </Button>
      </ReportCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 rounded-none text-slate-500">
            <ArrowLeft className="size-4" /> 返回
          </Button>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800">{material.videoTitle}</h1>
            <RatingLevelBadge level={material.ratingLevel} />
            <MaterialStatusBadge status={material.disassemblyStatus} />
          </div>
          <div className="mt-1 text-[10px] font-medium text-slate-400">
            {material.contentType} · {material.author} · 更新于 {material.updatedAt}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" className="rounded-none" onClick={() => window.open(material.douyinLink, '_blank', 'noopener')}>
            <LinkIcon className="size-4" /> 打开抖音
          </Button>
          <Button type="button" className="rounded-none" onClick={() => navigate('/scripts', { state: { theme: material.videoTitle } })}>
            <Sparkles className="size-4" /> 基于此素材生成脚本
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左列：基础信息 + 拆解内容 */}
        <div className="space-y-6 lg:col-span-2">
          <ReportCard>
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">基础信息</div>
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8">
              <InfoRow label="作者" value={material.author} />
              <InfoRow label="内容类型" value={material.contentType} />
              <InfoRow label="抖音链接" value={material.douyinLink} />
              <InfoRow label="BGM" value={material.bgm} />
              <div className="border-b border-[#E2E8F0] py-2.5 md:col-span-2">
                <div className="text-[10px] font-black uppercase tracking-tight text-slate-400">标签</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {material.tags.length === 0 ? <span className="text-xs text-slate-400">—</span> : material.tags.map((tag) => (
                    <span key={tag} className="rounded-[2px] bg-[#0033A0]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#0033A0]">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </ReportCard>

          <ReportCard>
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">拆解内容</div>
            <div className="space-y-4">
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-tight text-slate-400">视频文案</div>
                <p className="text-[11px] font-medium leading-relaxed text-slate-600">{material.videoScript || '—'}</p>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-tight text-slate-400">画面描述</div>
                <p className="text-[11px] font-medium leading-relaxed text-slate-600">{material.sceneDescription || '—'}</p>
              </div>
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-tight text-slate-400">钩子分析</div>
                <p className="border-l-2 border-[#0033A0] pl-3 text-[11px] font-medium leading-relaxed text-slate-600">{material.hookAnalysis || '—'}</p>
              </div>
            </div>
          </ReportCard>
        </div>

        {/* 右列：互动数据 + 五维评分 */}
        <div className="space-y-6">
          <ReportCard className="p-0">
            <div className="p-4 pb-0 text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">互动数据</div>
            <div className="mt-2 grid grid-cols-2 border-y border-[#E2E8F0]">
              <MetricCell label="点赞" value={fmtCount(material.likes)} />
              <MetricCell label="评论" value={fmtCount(material.comments)} />
              <MetricCell label="分享" value={fmtCount(material.shares)} />
              <MetricCell label="完播力评分" value={String(material.completionRate)} />
            </div>
          </ReportCard>

          <ReportCard className="p-0">
            <div className="flex items-center justify-between p-4 pb-0">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">五维评分</div>
              <div className="text-right">
                <span className="text-xl font-bold tabular-nums text-slate-800">{material.compositeScore}</span>
                <span className="ml-1 text-[10px] font-bold text-slate-400">/100</span>
              </div>
            </div>
            {radarOption && <ReactECharts option={radarOption} theme="ud" className="h-[300px] w-full" />}
          </ReportCard>
        </div>
      </div>
    </div>
  );
}
