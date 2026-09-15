import React from 'react';
import { Play, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { VideoRecord } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

type QueueTab = 'all' | 'pending' | 'analyzing' | 'done';

interface VideoQueueProps {
  videos: VideoRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeTab: QueueTab;
  onTabChange: (tab: QueueTab) => void;
}

const VideoQueue: React.FC<VideoQueueProps> = ({
  videos,
  selectedId,
  onSelect,
  activeTab,
  onTabChange,
}) => {
  const filtered = videos.filter((v) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return v.analyzeStatus === 'pending';
    if (activeTab === 'analyzing') return v.analyzeStatus === 'analyzing';
    return v.analyzeStatus === 'done' || v.analyzeStatus === 'failed';
  });

  const counts = {
    all: videos.length,
    pending: videos.filter((v) => v.analyzeStatus === 'pending').length,
    analyzing: videos.filter((v) => v.analyzeStatus === 'analyzing').length,
    done: videos.filter((v) => v.analyzeStatus === 'done' || v.analyzeStatus === 'failed').length,
  };

  const tabs: { key: QueueTab; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待拆解' },
    { key: 'analyzing', label: '拆解中' },
    { key: 'done', label: '已完成' },
  ];

  const getStatusBadge = (
    status: string,
  ): { color: string; bg: string; label: string; icon: React.ReactNode } => {
    switch (status) {
      case 'pending':
        return {
          color: '#94a3b8',
          bg: 'rgba(148,163,184,0.15)',
          label: '待拆解',
          icon: <Clock size={10} />,
        };
      case 'analyzing':
        return {
          color: '#00d4ff',
          bg: 'rgba(0,212,255,0.15)',
          label: '拆解中',
          icon: <Loader2 size={10} className="animate-spin" />,
        };
      case 'done':
        return {
          color: '#10b981',
          bg: 'rgba(16,185,129,0.15)',
          label: '已完成',
          icon: <CheckCircle size={10} />,
        };
      case 'failed':
        return {
          color: '#ef4444',
          bg: 'rgba(239,68,68,0.15)',
          label: '失败',
          icon: <XCircle size={10} />,
        };
      default:
        return {
          color: '#64748b',
          bg: 'rgba(100,116,139,0.15)',
          label: status,
          icon: null,
        };
    }
  };

  return (
    <div
      className="h-full flex flex-col rounded-xl overflow-hidden"
      style={{ backgroundColor: '#121738', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-4"
        style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}
      >
        <h3 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>
          拆解队列
        </h3>
        <p className="text-xs mt-1" style={{ color: '#64748b' }}>
          共 {videos.length} 个视频
        </p>
      </div>

      {/* Tabs */}
      <div className="px-3 pt-3 pb-2 flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              backgroundColor: activeTab === tab.key ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: activeTab === tab.key ? '#00d4ff' : '#64748b',
            }}
          >
            {tab.label}
            <span
              className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
              style={{
                backgroundColor:
                  activeTab === tab.key ? 'rgba(0,212,255,0.2)' : 'rgba(100,116,139,0.2)',
              }}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Play
              size={24}
              className="mx-auto mb-2"
              style={{ color: '#64748b', opacity: 0.3 }}
            />
            <p className="text-xs" style={{ color: '#64748b' }}>
              {activeTab === 'pending'
                ? '暂无待拆解视频'
                : activeTab === 'analyzing'
                ? '暂无拆解中视频'
                : activeTab === 'done'
                ? '暂无已完成视频'
                : '暂无视频'}
            </p>
          </div>
        ) : (
          filtered.map((video) => {
            const badge = getStatusBadge(video.analyzeStatus);
            const isSelected = selectedId === video.id;
            return (
              <div
                key={video.id}
                onClick={() => onSelect(video.id)}
                className="flex gap-3 p-2 rounded-lg cursor-pointer transition-all group"
                style={{
                  backgroundColor: isSelected ? 'rgba(99,102,241,0.15)' : 'transparent',
                  border: isSelected
                    ? '1px solid rgba(99,102,241,0.3)'
                    : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#1a2050';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div
                  className="w-16 h-10 rounded flex-shrink-0 overflow-hidden relative"
                  style={{ backgroundColor: '#0a0e27' }}
                >
                  {video.coverUrl ? (
                    <Image
                      src={video.coverUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play size={14} style={{ color: '#64748b' }} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <p
                    className="text-xs leading-tight line-clamp-2"
                    style={{ color: isSelected ? '#e2e8f0' : '#94a3b8' }}
                  >
                    {video.title || '无标题视频'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                    {video.overallScore !== undefined && (
                      <span className="text-xs font-medium" style={{ color: '#fbbf24' }}>
                        {video.overallScore.toFixed(0)}分
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default VideoQueue;
