import React, { useState } from 'react';
import { Download, Sparkles, Grid, List } from 'lucide-react';
import type { VideoRecord } from '@shared/api.interface';
import VideoCard from './VideoCard';
import { Image } from '@client/src/components/ui/image';

interface ResultsSectionProps {
  results: VideoRecord[];
  loading: boolean;
  progress: number;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onSortByEngagement: () => void;
  onAutoSelectTop10: () => void;
  onBatchAnalyze: () => void;
  onPlay?: (video: VideoRecord) => void;
}

type ViewMode = 'card' | 'table';

const ResultsSection: React.FC<ResultsSectionProps> = ({
  results,
  loading,
  progress,
  selectedIds,
  onToggle,
  onToggleAll,
  onSortByEngagement,
  onAutoSelectTop10,
  onBatchAnalyze,
  onPlay,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const allSelected = results.length > 0 && selectedIds.size === results.length;

  const formatCount = (num: number): string => {
    if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return String(num);
  };

  const formatDuration = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Progress bar */}
      {loading && results.length > 0 && (
        <div className="w-full h-1 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: '#1e293b' }}>
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366f1 0%, #00d4ff 100%)',
            }}
          />
        </div>
      )}

      {/* Toolbar */}
      <div
        className="rounded-xl px-5 py-3 flex items-center gap-4 flex-wrap flex-shrink-0"
        style={{ backgroundColor: '#121738', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
      >
        <div className="text-sm" style={{ color: '#94a3b8' }}>
          共{' '}
          <span style={{ color: '#00d4ff' }} className="font-medium">
            {results.length}
          </span>{' '}
          条结果
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-md" style={{ backgroundColor: '#0a0e27' }}>
          <button
            onClick={() => setViewMode('card')}
            className="p-1.5 rounded-sm transition-all"
            style={{
              backgroundColor: viewMode === 'card' ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: viewMode === 'card' ? '#00d4ff' : '#64748b',
            }}
            title="卡片视图"
          >
            <Grid size={14} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className="p-1.5 rounded-sm transition-all"
            style={{
              backgroundColor: viewMode === 'table' ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: viewMode === 'table' ? '#00d4ff' : '#64748b',
            }}
            title="表格视图"
          >
            <List size={14} />
          </button>
        </div>

        <div className="w-px h-5" style={{ backgroundColor: '#1e293b' }} />

        <label className="flex items-center gap-2 cursor-pointer">
          <div
            className="w-4 h-4 rounded flex items-center justify-center"
            style={{
              backgroundColor: allSelected ? '#6366f1' : 'transparent',
              border: allSelected ? 'none' : '1px solid #64748b',
            }}
            onClick={onToggleAll}
          >
            {allSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span className="text-sm" style={{ color: '#94a3b8' }}>全选</span>
        </label>

        <div className="text-sm" style={{ color: '#94a3b8' }}>
          已选{' '}
          <span style={{ color: '#00d4ff' }} className="font-medium">
            {selectedIds.size}
          </span>
        </div>

        <button
          onClick={onSortByEngagement}
          className="text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
          style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#6366f1' }}
        >
          按互动排序
        </button>
        <button
          onClick={onAutoSelectTop10}
          className="text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
          style={{ backgroundColor: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}
        >
          自动选择 Top 10
        </button>

        <div className="flex-1" />

        <button
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
          style={{ backgroundColor: 'rgba(148,163,184,0.1)', color: '#94a3b8' }}
        >
          <Download size={14} />
          导出 CSV
        </button>
        <button
          onClick={onBatchAnalyze}
          disabled={selectedIds.size === 0}
          className="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg font-medium transition-all"
          style={{
            background:
              selectedIds.size === 0
                ? '#1a2050'
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: selectedIds.size === 0 ? '#64748b' : 'white',
            cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <Sparkles size={14} />
          开始拆解 ({selectedIds.size})
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto pr-2 min-h-0">
        {loading && results.length === 0 ? (
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-4 gap-4">
             {results.map((video) => (
               <VideoCard
                 key={video.id}
                 video={video}
                 selected={selectedIds.has(video.id)}
                 onToggle={onToggle}
                 onPlay={onPlay}
               />
             ))}
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: '#121738', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: '#64748b', width: 40 }}></th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: '#64748b' }}>视频</th>
                  <th className="px-4 py-3 text-left font-medium" style={{ color: '#64748b' }}>作者</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: '#64748b' }}>点赞</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: '#64748b' }}>评论</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: '#64748b' }}>转发</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: '#64748b' }}>收藏</th>
                  <th className="px-4 py-3 text-right font-medium" style={{ color: '#64748b' }}>时长</th>
                </tr>
              </thead>
              <tbody>
                {results.map((video) => {
                  const selected = selectedIds.has(video.id);
                  return (
                    <tr
                      key={video.id}
                      onClick={() => onToggle(video.id)}
                      className="cursor-pointer transition-colors"
                      style={{
                        backgroundColor: selected ? 'rgba(99,102,241,0.1)' : 'transparent',
                        borderBottom: '1px solid rgba(148,163,184,0.05)',
                      }}
                      onMouseEnter={(e) => {
                        if (!selected) e.currentTarget.style.backgroundColor = '#1a2050';
                      }}
                      onMouseLeave={(e) => {
                        if (!selected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td className="px-4 py-2">
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center"
                          style={{
                            backgroundColor: selected ? '#6366f1' : 'transparent',
                            border: selected ? 'none' : '1px solid #64748b',
                          }}
                        >
                          {selected && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-16 h-9 rounded flex-shrink-0 overflow-hidden"
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
                            className="truncate max-w-xs"
                            style={{ color: '#e2e8f0' }}
                          >
                            {video.title || '无标题'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2" style={{ color: '#94a3b8' }}>
                        {video.authorNickname || '-'}
                      </td>
                      <td className="px-4 py-2 text-right" style={{ color: '#ef4444' }}>
                        {formatCount(video.diggCount)}
                      </td>
                      <td className="px-4 py-2 text-right" style={{ color: '#00d4ff' }}>
                        {formatCount(video.commentCount)}
                      </td>
                      <td className="px-4 py-2 text-right" style={{ color: '#10b981' }}>
                        {formatCount(video.shareCount)}
                      </td>
                      <td className="px-4 py-2 text-right" style={{ color: '#f59e0b' }}>
                        {formatCount(video.collectCount)}
                      </td>
                      <td className="px-4 py-2 text-right" style={{ color: '#64748b' }}>
                        {formatDuration(video.duration)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const SkeletonCard: React.FC = () => (
  <div className="rounded-xl overflow-hidden animate-pulse" style={{ backgroundColor: '#121738' }}>
    <div className="w-full" style={{ aspectRatio: '16/9', backgroundColor: '#1a2050' }} />
    <div className="p-3 flex flex-col gap-2">
      <div className="h-4 rounded" style={{ backgroundColor: '#1a2050', width: '80%' }} />
      <div className="h-4 rounded" style={{ backgroundColor: '#1a2050', width: '50%' }} />
      <div className="flex items-center gap-2 pt-1">
        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#1a2050' }} />
        <div className="h-3 rounded flex-1" style={{ backgroundColor: '#1a2050' }} />
      </div>
    </div>
  </div>
);

export default ResultsSection;
