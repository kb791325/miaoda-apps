import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Zap,
  TrendingUp,
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import type { VideoRecord, EightDimScores } from '@shared/api.interface';
import { DIMENSIONS, TRAFFIC_POOLS } from './mockData';

// ============ Tab 1: 快速结论 ============
export const QuickConclusionTab: React.FC<{ video: VideoRecord }> = ({ video }) => {
  const gradeInfo = getGradeInfo(video.grade || 'B');
  const score = video.overallScore || 0;

  const gaugeOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        splitNumber: 10,
        itemStyle: {
          color: gradeInfo.color,
          shadowColor: gradeInfo.color,
          shadowBlur: 20,
        },
        progress: { show: true, width: 12 },
        pointer: { show: false },
        axisLine: { lineStyle: { width: 12, color: [[1, 'rgba(30,41,59,0.5)']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, 0],
          fontSize: 36,
          fontWeight: 'bold',
          color: gradeInfo.color,
          formatter: '{value}',
        },
        data: [{ value: Math.round(score) }],
      },
    ],
  };

  const statItems = [
    { label: '点赞数', value: video.diggCount, color: '#ef4444', growth: 12.5 },
    { label: '评论数', value: video.commentCount, color: '#00d4ff', growth: 8.3 },
    { label: '转发数', value: video.shareCount, color: '#10b981', growth: 15.7 },
    { label: '收藏数', value: video.collectCount, color: '#f59e0b', growth: 20.1 },
  ];

  const suggestions = [
    { type: 'priority', text: '开头钩子可以更强，建议前2秒直接亮出核心利益点', icon: <Zap size={14} /> },
    { type: 'improve', text: '中间信息密度可提升，增加1-2个案例佐证增强说服力', icon: <Lightbulb size={14} /> },
    { type: 'good', text: '结尾互动引导做得好，评论区互动率高于同类视频30%', icon: <CheckCircle2 size={14} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Top row: grade + gauge + viral formula */}
      <div className="grid grid-cols-3 gap-4">
        {/* Grade badge */}
        <div
          className="rounded-xl p-5 flex flex-col items-center justify-center"
          style={{ backgroundColor: '#0a0e27', border: `1px solid ${gradeInfo.color}40` }}
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-5xl font-bold mb-3"
            style={{
              background: `linear-gradient(135deg, ${gradeInfo.color}30, ${gradeInfo.color}10)`,
              color: gradeInfo.color,
              boxShadow: `0 0 30px ${gradeInfo.color}40`,
              border: `2px solid ${gradeInfo.color}`,
            }}
          >
            {video.grade || 'B'}
          </div>
          <p className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
            {gradeInfo.title}
          </p>
          <p className="text-xs mt-1" style={{ color: '#64748b' }}>
            综合评级
          </p>
        </div>

        {/* Gauge */}
        <div
          className="rounded-xl p-5 flex flex-col items-center"
          style={{ backgroundColor: '#0a0e27' }}
        >
          <p className="text-sm mb-2" style={{ color: '#94a3b8' }}>综合评分</p>
          <ReactECharts option={gaugeOption} style={{ height: 160, width: 200 }} />
          <p className="text-xs mt-1" style={{ color: '#64748b' }}>
            超越 {Math.round(score)}% 的同类视频
          </p>
        </div>

        {/* Viral formula */}
        <div
          className="rounded-xl p-5 flex flex-col"
          style={{
            backgroundColor: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.4)',
            boxShadow: '0 0 20px rgba(99,102,241,0.15)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} style={{ color: '#6366f1' }} />
            <span className="text-sm font-semibold" style={{ color: '#00d4ff' }}>
              爆款公式
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#6366f1' }}>
              AI生成
            </span>
          </div>
          <p className="text-base font-medium leading-relaxed" style={{ color: '#e2e8f0' }}>
            反常识钩子 + 数字冲击 + 三步方法论 + 案例佐证 + 金句收尾
          </p>
          <div className="mt-auto pt-3 flex items-center gap-2">
            <TrendingUp size={14} style={{ color: '#10b981' }} />
            <span className="text-xs" style={{ color: '#10b981' }}>
              匹配度 92% · 同类爆款Top 5%
            </span>
          </div>
        </div>
      </div>

      {/* Hook type tags */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#121738' }}>
        <p className="text-sm font-medium mb-3" style={{ color: '#e2e8f0' }}>核心钩子类型</p>
        <div className="flex flex-wrap gap-2">
          {['反常识钩子', '数字冲击', '痛点共鸣', '好奇设问', '利益承诺'].map((tag, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{
                backgroundColor: idx < 2 ? 'rgba(0,212,255,0.15)' : 'rgba(99,102,241,0.15)',
                color: idx < 2 ? '#00d4ff' : '#6366f1',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        {statItems.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl p-4"
            style={{ backgroundColor: '#121738' }}
          >
            <p className="text-xs mb-1" style={{ color: '#64748b' }}>{item.label}</p>
            <p className="text-xl font-semibold" style={{ color: item.color }}>
              {formatCount(item.value)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight size={12} style={{ color: '#10b981' }} />
              <span className="text-xs" style={{ color: '#10b981' }}>
                +{item.growth}% 环比
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <div className="flex items-center gap-2 mb-4">
          <Target size={16} style={{ color: '#00d4ff' }} />
          <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Top 3 优化建议</p>
        </div>
        <div className="flex flex-col gap-3">
          {suggestions.map((s, idx) => {
            const colorMap: Record<string, string> = {
              priority: '#ef4444',
              improve: '#f59e0b',
              good: '#10b981',
            };
            const color = colorMap[s.type] || '#6366f1';
            return (
              <div key={idx} className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {s.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed" style={{ color: '#e2e8f0' }}>
                    <span className="font-medium" style={{ color }}>
                      {idx + 1}.
                    </span>{' '}
                    {s.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============ Tab 2: 八维评分雷达 ============
export const RadarScoreTab: React.FC<{ scores: EightDimScores }> = ({ scores }) => {
  const radarOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { show: false },
    radar: {
      indicator: DIMENSIONS.map((d) => ({ name: d.label })),
      shape: 'polygon',
      splitNumber: 5,
      axisName: {
        color: '#94a3b8',
        fontSize: 12,
      },
      splitLine: {
        lineStyle: { color: 'rgba(148,163,184,0.15)' },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(99,102,241,0.02)', 'rgba(99,102,241,0.05)'],
        },
      },
      axisLine: {
        lineStyle: { color: 'rgba(148,163,184,0.2)' },
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: DIMENSIONS.map((d) => scores[d.key]),
            name: '评分',
            areaStyle: {
              color: {
                type: 'radial',
                x: 0.5,
                y: 0.5,
                r: 0.5,
                colorStops: [
                  { offset: 0, color: 'rgba(0,212,255,0.4)' },
                  { offset: 1, color: 'rgba(99,102,241,0.1)' },
                ],
              },
            },
            lineStyle: { color: '#00d4ff', width: 2 },
            itemStyle: { color: '#00d4ff' },
          },
        ],
      },
    ],
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: '#121738' }}
      >
        <ReactECharts option={radarOption} style={{ height: 360 }} />
      </div>

      {/* Dimension bars */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: '#e2e8f0' }}>各维度详细评分</p>
        <div className="flex flex-col gap-3">
          {DIMENSIONS.map((dim) => {
            const value = scores[dim.key];
            return (
              <div key={dim.key} className="flex items-center gap-3">
                <span className="text-sm w-20 flex-shrink-0" style={{ color: '#94a3b8' }}>
                  {dim.label}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#0a0e27' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${value}%`,
                      background:
                        value >= 85
                          ? 'linear-gradient(90deg, #10b981, #00d4ff)'
                          : value >= 70
                          ? 'linear-gradient(90deg, #6366f1, #00d4ff)'
                          : value >= 55
                          ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                          : '#ef4444',
                    }}
                  />
                </div>
                <span
                  className="text-sm font-semibold w-12 text-right"
                  style={{ color: value >= 85 ? '#10b981' : value >= 70 ? '#00d4ff' : '#f59e0b' }}
                >
                  {value}分
                </span>
                <span className="text-xs w-14 text-right" style={{ color: '#64748b' }}>
                  权重{dim.weight}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============ Tab 3: 流量池推演 ============
export const TrafficPoolTab: React.FC = () => {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
      <p className="text-sm font-semibold mb-4" style={{ color: '#e2e8f0' }}>流量池推演</p>
      <div className="flex flex-col gap-3">
        {TRAFFIC_POOLS.map((pool) => {
          const probColor =
            pool.probability >= 70 ? '#10b981' : pool.probability >= 40 ? '#f59e0b' : '#ef4444';
          return (
            <div
              key={pool.level}
              className="flex items-center gap-4 p-3 rounded-lg"
              style={{ backgroundColor: '#0a0e27' }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(99,102,241,0.15)',
                  color: '#6366f1',
                  border: '1px solid rgba(99,102,241,0.3)',
                }}
              >
                {pool.level}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
                    {pool.name}
                  </span>
                  <span className="text-xs" style={{ color: '#64748b' }}>
                    阈值 {pool.threshold} 播放
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pool.probability}%`, backgroundColor: probColor }}
                    />
                  </div>
                  <span className="text-xs font-semibold w-12 text-right" style={{ color: probColor }}>
                    {pool.probability}%
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 w-24">
                <p className="text-xs" style={{ color: '#64748b' }}>预测值</p>
                <p className="text-sm font-semibold" style={{ color: '#00d4ff' }}>
                  {formatCount(pool.predict)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============ helpers ============
function formatCount(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return String(num);
}

function getGradeInfo(grade: string): { color: string; title: string } {
  switch (grade) {
    case 'S':
      return { color: '#fbbf24', title: '超级爆款' };
    case 'A':
      return { color: '#ef4444', title: '优质爆款' };
    case 'B':
      return { color: '#f59e0b', title: '潜力作品' };
    case 'C':
      return { color: '#64748b', title: '普通作品' };
    default:
      return { color: '#6366f1', title: '待评估' };
  }
}
