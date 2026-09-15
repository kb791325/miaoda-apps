import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { Sparkles, Zap, TrendingUp, ArrowUpDown } from 'lucide-react';
import type { VideoRecord } from '@shared/api.interface';
import { DIMENSIONS } from './mockData';
import { Image } from '@client/src/components/ui/image';

const COLORS = ['#00d4ff', '#6366f1', '#f59e0b', '#ef4444', '#10b981'];

interface BatchCompareProps {
  videos: VideoRecord[];
}

const BatchCompare: React.FC<BatchCompareProps> = ({ videos }) => {
  const doneVideos = videos.filter((v) => v.analyzeStatus === 'done').slice(0, 5);
  const [sortField, setSortField] = useState<string>('overallScore');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...doneVideos].sort((a, b) => {
    let va: number = a.overallScore || 0;
    let vb: number = b.overallScore || 0;
    if (sortField === 'diggCount') {
      va = a.diggCount;
      vb = b.diggCount;
    } else if (sortField === 'commentCount') {
      va = a.commentCount;
      vb = b.commentCount;
    } else if (sortField !== 'overallScore' && a.eightDimScores && b.eightDimScores) {
      va = a.eightDimScores[sortField as keyof typeof a.eightDimScores] || 0;
      vb = b.eightDimScores[sortField as keyof typeof b.eightDimScores] || 0;
    }
    return sortAsc ? va - vb : vb - va;
  });

  const handleSort = (field: string): void => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const radarOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: {
      data: doneVideos.map((v) => v.title?.slice(0, 12) || '视频'),
      textStyle: { color: '#94a3b8', fontSize: 11 },
      bottom: 0,
      type: 'scroll',
    },
    radar: {
      indicator: DIMENSIONS.map((d) => ({ name: d.label })),
      shape: 'polygon',
      splitNumber: 5,
      center: ['50%', '45%'],
      radius: '60%',
      axisName: { color: '#94a3b8', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.15)' } },
      splitArea: {
        show: true,
        areaStyle: { color: ['rgba(99,102,241,0.02)', 'rgba(99,102,241,0.05)'] },
      },
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
    },
    series: [
      {
        type: 'radar',
        data: doneVideos.map((v, idx) => ({
          value: DIMENSIONS.map((d) => v.eightDimScores?.[d.key] || 0),
          name: v.title?.slice(0, 12) || '视频',
          lineStyle: { color: COLORS[idx % COLORS.length], width: 2 },
          itemStyle: { color: COLORS[idx % COLORS.length] },
          areaStyle: { color: `${COLORS[idx % COLORS.length]}15` },
        })),
      },
    ],
  };

  const commonTraits = [
    '均采用3秒强钩子开头，划走率低于平均25%',
    '信息密度高，平均每秒输出1.2个有效信息点',
    '使用数字冲击+案例佐证的双重说服结构',
    '结尾均有明确互动引导，评论率提升30%',
    '画面节奏明快，平均镜头时长控制在1.2-1.5秒',
  ];

  const differences = [
    { field: '钩子策略', detail: '反常识型钩子点赞率最高，痛点共鸣型评论率最高' },
    { field: '视频时长', detail: '60秒以内完播率高，90秒以上收藏率高' },
    { field: '发布时间', detail: '工作日午间发布流量起势快，晚间发布长尾效应强' },
    { field: '话题标签', detail: '精准标签+泛流量标签组合曝光量最优' },
  ];

  if (doneVideos.length < 2) {
    return (
      <div
        className="rounded-xl p-12 text-center"
        style={{ backgroundColor: '#121738' }}
      >
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          至少需要 2 个已完成拆解的视频才能进行批量对比
        </p>
        <p className="text-xs mt-2" style={{ color: '#64748b' }}>
          当前已完成 {doneVideos.length} 个
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Overview table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: '#121738', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
      >
        <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
          <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>对比总览</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                <th className="px-4 py-2.5 text-left font-medium" style={{ color: '#64748b' }}>视频</th>
                <SortableTh
                  label="综合评分"
                  field="overallScore"
                  current={sortField}
                  asc={sortAsc}
                  onSort={handleSort}
                />
                <th className="px-4 py-2.5 text-left font-medium" style={{ color: '#64748b' }}>评级</th>
                {DIMENSIONS.slice(0, 5).map((d) => (
                  <SortableTh
                    key={d.key}
                    label={d.label}
                    field={d.key}
                    current={sortField}
                    asc={sortAsc}
                    onSort={handleSort}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((video, idx) => (
                <tr
                  key={video.id}
                  style={{ borderBottom: '1px solid rgba(148,163,184,0.05)' }}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: '#0a0e27' }}
                      >
                        {video.coverUrl ? (
                          <Image
                            src={video.coverUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <span
                        className="truncate max-w-[180px]"
                        style={{ color: '#e2e8f0' }}
                      >
                        {video.title || '无标题'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 font-semibold" style={{ color: COLORS[idx % COLORS.length] }}>
                    {video.overallScore?.toFixed(0)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: getGradeBg(video.grade || 'C'),
                        color: getGradeColor(video.grade || 'C'),
                      }}
                    >
                      {video.grade || '-'}
                    </span>
                  </td>
                  {DIMENSIONS.slice(0, 5).map((d) => (
                    <td key={d.key} className="px-4 py-2" style={{ color: '#94a3b8' }}>
                      {video.eightDimScores?.[d.key] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overlaid radar chart */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={16} style={{ color: '#00d4ff' }} />
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>八维叠加雷达图</span>
        </div>
        <ReactECharts option={radarOption} style={{ height: 380 }} />
      </div>

      {/* Viral formula + common traits */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.4)',
            boxShadow: '0 0 20px rgba(99,102,241,0.15)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} style={{ color: '#00d4ff' }} />
            <span className="text-base font-semibold" style={{ color: '#00d4ff' }}>
              爆款公式自动生成
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(0,212,255,0.2)', color: '#00d4ff' }}
            >
              AI生成
            </span>
          </div>
          <p className="text-base font-medium leading-relaxed mb-3" style={{ color: '#e2e8f0' }}>
            反常识数字钩子 + 三段式方法论结构 + 真实案例佐证 + 金句升华收尾 + 评论区互动引导
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(148,163,184,0.2)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: '92%', background: 'linear-gradient(90deg, #6366f1, #00d4ff)' }}
              />
            </div>
            <span className="text-xs font-semibold" style={{ color: '#00d4ff' }}>匹配度 92%</span>
          </div>
          <button
            className="mt-4 w-full py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #00d4ff 100%)',
              color: 'white',
            }}
          >
            <Sparkles size={14} className="inline mr-1.5" />
            用爆款规律生成新脚本
          </button>
        </div>

        <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>爆款共性分析</span>
          </div>
          <div className="flex flex-col gap-2">
            {commonTraits.map((trait, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}
                >
                  {idx + 1}
                </span>
                <span className="text-sm flex-1" style={{ color: '#94a3b8' }}>
                  {trait}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Differences */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: '#e2e8f0' }}>差异分析</p>
        <div className="grid grid-cols-2 gap-3">
          {differences.map((diff, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#0a0e27' }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: '#00d4ff' }}>
                {diff.field}
              </p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                {diff.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SortableTh: React.FC<{
  label: string;
  field: string;
  current: string;
  asc: boolean;
  onSort: (f: string) => void;
}> = ({ label, field, current, asc, onSort }) => {
  const active = current === field;
  return (
    <th className="px-4 py-2.5 text-left font-medium">
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-1 transition-colors hover:opacity-80"
        style={{ color: active ? '#00d4ff' : '#64748b' }}
      >
        {label}
        <ArrowUpDown size={12} />
      </button>
    </th>
  );
};

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'S': return '#fbbf24';
    case 'A': return '#ef4444';
    case 'B': return '#f59e0b';
    default: return '#64748b';
  }
}

function getGradeBg(grade: string): string {
  switch (grade) {
    case 'S': return 'rgba(251,191,36,0.15)';
    case 'A': return 'rgba(239,68,68,0.15)';
    case 'B': return 'rgba(245,158,11,0.15)';
    default: return 'rgba(100,116,139,0.15)';
  }
}

export default BatchCompare;
