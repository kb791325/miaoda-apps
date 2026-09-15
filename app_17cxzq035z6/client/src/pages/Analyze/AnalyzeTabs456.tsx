import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Play,
  Scissors,
  Palette,
  FileText,
  MessageSquare,
  BookOpen,
  Sparkles,
  ThumbsUp,
  Tags,
  Film,
  Clock,
  Copy,
} from 'lucide-react';
import type { VideoRecord, EmotionPoint, RetentionNode } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

// ============ Tab 4: 内容拆解 ============
export const ContentBreakdownTab: React.FC<{ video: VideoRecord }> = ({ video }) => {
  const detail = video.analyzeDetail;
  if (!detail) return <EmptyTab />;

  const emotionOption: EChartsOption = buildEmotionOption(detail.emotionCurve || []);

  return (
    <div className="flex flex-col gap-4">
      {/* Hook analysis */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <div className="flex items-center gap-2 mb-3">
          <Play size={16} style={{ color: '#ef4444' }} />
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>钩子分析</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded ml-2"
            style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#6366f1' }}
          >
            AI生成
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          {detail.hookAnalysis}
        </p>
      </div>

      {/* Emotion curve */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} style={{ color: '#00d4ff' }} />
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>情绪曲线</span>
        </div>
        <ReactECharts option={emotionOption} style={{ height: 260 }} />
      </div>

      {/* Retention nodes */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} style={{ color: '#10b981' }} />
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>留存节点时间轴</span>
        </div>
        <RetentionTimeline nodes={detail.retentionNodes || []} />
      </div>

      {/* Copy structure */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} style={{ color: '#6366f1' }} />
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>文案结构</span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          {detail.copyStructure}
        </p>
      </div>

      {/* Replicable elements */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <div className="flex items-center gap-2 mb-3">
          <Copy size={16} style={{ color: '#f59e0b' }} />
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>可复制元素</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(detail.replicableElements || []).map((el, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5"
              style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#6366f1' }}
            >
              <Tags size={12} />
              {el}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const RetentionTimeline: React.FC<{ nodes: RetentionNode[] }> = ({ nodes }) => {
  return (
    <div className="relative pl-6">
      <div
        className="absolute left-[7px] top-1 bottom-1 w-px"
        style={{ backgroundColor: 'rgba(99,102,241,0.3)' }}
      />
      <div className="flex flex-col gap-4">
        {nodes.map((node, idx) => (
          <div key={idx} className="relative flex items-start gap-3">
            <div
              className="absolute -left-[22px] top-1 w-3 h-3 rounded-full flex-shrink-0"
              style={{
                backgroundColor: idx === 0 ? '#ef4444' : idx === nodes.length - 1 ? '#10b981' : '#6366f1',
                boxShadow: `0 0 8px ${idx === 0 ? '#ef4444' : idx === nodes.length - 1 ? '#10b981' : '#6366f1'}80`,
              }}
            />
            <span
              className="text-xs px-2 py-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}
            >
              {node.time}s
            </span>
            <span className="text-sm flex-1" style={{ color: '#94a3b8' }}>
              {node.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

function buildEmotionOption(points: EmotionPoint[]): EChartsOption {
  return {
    tooltip: { trigger: 'axis' },
    grid: { containLabel: true, left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: points.map((p) => `${p.time}%`),
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.1)' } },
    },
    series: [
      {
        type: 'line',
        data: points.map((p) => p.value),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#00d4ff', width: 2 },
        itemStyle: { color: '#00d4ff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0,212,255,0.3)' },
              { offset: 1, color: 'rgba(0,212,255,0.02)' },
            ],
          },
        },
      },
    ],
  };
}

// ============ Tab 5: 剪辑与视觉 ============
export const EditingVisualTab: React.FC<{ video: VideoRecord }> = ({ video }) => {
  const detail = video.analyzeDetail;
  const keyframes = [
    { time: '0:03', desc: '开场钩子画面' },
    { time: '0:15', desc: '核心信息呈现' },
    { time: '0:30', desc: '案例/数据展示' },
    { time: '0:50', desc: '收尾升华画面' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Editing rhythm grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ backgroundColor: '#121738' }}>
          <div className="flex items-center gap-2 mb-2">
            <Scissors size={14} style={{ color: '#6366f1' }} />
            <span className="text-xs" style={{ color: '#64748b' }}>平均镜头时长</span>
          </div>
          <p className="text-xl font-semibold" style={{ color: '#00d4ff' }}>
            1.2<span className="text-sm font-normal ml-1" style={{ color: '#64748b' }}>秒</span>
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#121738' }}>
          <div className="flex items-center gap-2 mb-2">
            <Film size={14} style={{ color: '#6366f1' }} />
            <span className="text-xs" style={{ color: '#64748b' }}>切镜数</span>
          </div>
          <p className="text-xl font-semibold" style={{ color: '#00d4ff' }}>
            65<span className="text-sm font-normal ml-1" style={{ color: '#64748b' }}>个</span>
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#121738' }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} style={{ color: '#6366f1' }} />
            <span className="text-xs" style={{ color: '#64748b' }}>转场类型分布</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span style={{ color: '#00d4ff' }}>硬切 70%</span>
            <span style={{ color: '#6366f1' }}>缩放 20%</span>
            <span style={{ color: '#f59e0b' }}>模糊 10%</span>
          </div>
        </div>
      </div>

      {/* Visual style */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <div className="flex items-center gap-2 mb-3">
          <Palette size={16} style={{ color: '#f59e0b' }} />
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>视觉风格</span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          {detail?.visualStyle || '暂无分析数据'}
        </p>
      </div>

      {/* Keyframes */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <div className="flex items-center gap-2 mb-4">
          <Film size={16} style={{ color: '#00d4ff' }} />
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>关键帧展示</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {keyframes.map((kf, idx) => (
            <div key={idx} className="flex flex-col gap-2">
              <div
                className="relative w-full rounded-lg overflow-hidden"
                style={{ aspectRatio: '16/9', backgroundColor: '#0a0e27' }}
              >
                {video.coverUrl ? (
                  <Image
                    src={video.coverUrl}
                    alt={kf.desc}
                    className="w-full h-full object-cover"
                    style={{ filter: `hue-rotate(${idx * 30}deg) brightness(${1 - idx * 0.1})` }}
                  />
                ) : (
                  <Play size={20} style={{ color: '#64748b' }} className="m-auto" />
                )}
                <span
                  className="absolute bottom-1 right-1 text-xs px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#e2e8f0' }}
                >
                  {kf.time}
                </span>
              </div>
              <p className="text-xs text-center" style={{ color: '#64748b' }}>
                {kf.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Editing rhythm description */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <div className="flex items-center gap-2 mb-3">
          <Scissors size={16} style={{ color: '#6366f1' }} />
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>剪辑节奏分析</span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          {detail?.editingRhythm || '暂无分析数据'}
        </p>
      </div>
    </div>
  );
};

// ============ Tab 6: 逐字稿与评论 ============
export const TranscriptCommentsTab: React.FC<{ video: VideoRecord }> = ({ video }) => {
  const commentAnalysis = video.commentAnalysis;
  const lines = (video.transcript || '').split('\n').filter(Boolean);
  const timeStep = Math.floor((video.duration || 60) / Math.max(lines.length, 1));

  return (
    <div className="flex flex-col gap-4">
      {/* Transcript */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={16} style={{ color: '#6366f1' }} />
            <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>逐字稿</span>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#6366f1' }}
          >
            AI生成
          </span>
        </div>
        <div
          className="max-h-60 overflow-y-auto space-y-2 pr-2"
          style={{ scrollbarWidth: 'thin' }}
        >
          {lines.map((line, idx) => {
            const t = idx * timeStep;
            const mm = Math.floor(t / 60).toString().padStart(2, '0');
            const ss = (t % 60).toString().padStart(2, '0');
            return (
              <div key={idx} className="flex gap-3">
                <span
                  className="text-xs px-2 py-0.5 rounded flex-shrink-0 h-fit"
                  style={{ backgroundColor: 'rgba(0,212,255,0.1)', color: '#00d4ff' }}
                >
                  {mm}:{ss}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                  {line}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top comments */}
      <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={16} style={{ color: '#00d4ff' }} />
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>高赞评论</span>
        </div>
        <div className="flex flex-col gap-3">
          {(commentAnalysis?.topComments || []).map((comment, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#0a0e27' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#6366f1' }}
                  >
                    {`用户${idx + 1}`.charAt(0)}
                  </div>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>
                    抖音用户{String(idx + 1).padStart(4, '0')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsUp size={12} style={{ color: '#ef4444' }} />
                  <span className="text-xs" style={{ color: '#64748b' }}>
                    {Math.round((commentAnalysis?.clusters?.[0]?.count || 200) * (1 - idx * 0.15))}
                  </span>
                </div>
              </div>
              <p className="text-sm" style={{ color: '#e2e8f0' }}>
                {comment}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Comment clusters */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
          <div className="flex items-center gap-2 mb-4">
            <Tags size={16} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>评论聚类分析</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(commentAnalysis?.clusters || []).map((c, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-full text-xs"
                style={{
                  backgroundColor: 'rgba(245,158,11,0.15)',
                  color: '#f59e0b',
                  fontSize: `${11 + Math.min(idx, 4)}px`,
                }}
              >
                {c.name} ({c.count})
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ backgroundColor: '#121738' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} style={{ color: '#00d4ff' }} />
            <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>二次选题建议</span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              '《XX技巧的3个常见误区，90%的人都踩过》',
              '《手把手教你XX：从入门到精通完整教程》',
              '《XX vs YY：到底哪个更适合你？实测对比》',
            ].map((s, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-sm"
                style={{ color: '#94a3b8' }}
              >
                <span style={{ color: '#00d4ff' }}>{idx + 1}.</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyTab: React.FC = () => (
  <div
    className="rounded-xl p-12 text-center"
    style={{ backgroundColor: '#121738' }}
  >
    <p style={{ color: '#64748b' }}>暂无分析数据</p>
  </div>
);
