import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Play,
  User,
  Sparkles,
  Layers,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { VideoRecord } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';
import VideoQueue from './VideoQueue';
import BatchCompare from './BatchCompare';
import { QuickConclusionTab, RadarScoreTab, TrafficPoolTab } from './AnalyzeTabs123';
import { ContentBreakdownTab, EditingVisualTab, TranscriptCommentsTab } from './AnalyzeTabs456';
import { RemakeSopTab } from './AnalyzeTab7';
import { generateMockVideos } from './mockData';

type ViewMode = 'single' | 'batch';
type QueueTab = 'all' | 'pending' | 'analyzing' | 'done';
type DetailTab = 'conclusion' | 'radar' | 'traffic' | 'content' | 'editing' | 'transcript' | 'sop';

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: 'conclusion', label: '快速结论' },
  { key: 'radar', label: '八维评分' },
  { key: 'traffic', label: '流量池' },
  { key: 'content', label: '内容拆解' },
  { key: 'editing', label: '剪辑视觉' },
  { key: 'transcript', label: '逐字稿评论' },
  { key: 'sop', label: '复刻SOP' },
];

const AnalyzePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [queueTab, setQueueTab] = useState<QueueTab>('all');
  const [detailTab, setDetailTab] = useState<DetailTab>('conclusion');
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load videos (mock for now; real API on server)
  useEffect(() => {
    const load = (): void => {
      try {
        const mock = generateMockVideos(6);
        setVideos(mock);
        const firstDone = mock.find((v) => v.analyzeStatus === 'done');
        if (firstDone) setSelectedId(firstDone.id);
      } catch (err) {
        logger.error('加载拆解列表失败', err as Error);
      } finally {
        setLoading(false);
      }
    };
    // Simulate brief loading
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, []);

  const selectedVideo = videos.find((v) => v.id === selectedId) || null;

  const handleSelect = useCallback((id: string): void => {
    setSelectedId(id);
    setDetailTab('conclusion');
  }, []);

  const filteredVideos = queueTab === 'all'
    ? videos
    : videos.filter((v) => v.analyzeStatus === queueTab);

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: '#0a0e27', padding: '24px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold leading-tight mb-1" style={{ color: '#00d4ff' }}>
            拆解与评分中心
          </h1>
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            AI 八维拆解爆款视频，批量对比提炼爆款公式
          </p>
        </div>

        {/* View mode tabs */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ backgroundColor: '#121738' }}
        >
          <button
            onClick={() => setViewMode('single')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all"
            style={{
              backgroundColor: viewMode === 'single' ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: viewMode === 'single' ? '#00d4ff' : '#94a3b8',
            }}
          >
            <BarChart3 size={14} />
            单视频分析
          </button>
          <button
            onClick={() => setViewMode('batch')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all"
            style={{
              backgroundColor: viewMode === 'batch' ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: viewMode === 'batch' ? '#00d4ff' : '#94a3b8',
            }}
          >
            <Layers size={14} />
            批量对比
          </button>
        </div>
      </div>

      {/* Body */}
      {viewMode === 'single' ? (
        <div className="flex-1 min-h-0 flex gap-4">
          {/* Queue sidebar */}
          <div className="w-[280px] flex-shrink-0">
            <VideoQueue
              videos={videos}
              selectedId={selectedId}
              onSelect={handleSelect}
              activeTab={queueTab}
              onTabChange={setQueueTab}
            />
          </div>

          {/* Detail area */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden rounded-xl" style={{ backgroundColor: '#121738' }}>
            {loading || !selectedVideo ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm" style={{ color: '#64748b' }}>加载中...</p>
              </div>
            ) : (
              <>
                {/* Video header */}
                <VideoDetailHeader video={selectedVideo} />

                {/* Detail tabs */}
                <div
                  className="flex items-center gap-1 px-5 py-2 flex-shrink-0"
                  style={{ backgroundColor: '#0a0e27', borderTop: '1px solid rgba(148,163,184,0.1)' }}
                >
                  {DETAIL_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setDetailTab(tab.key)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap"
                      style={{
                        backgroundColor: detailTab === tab.key ? 'rgba(99,102,241,0.2)' : 'transparent',
                        color: detailTab === tab.key ? '#00d4ff' : '#64748b',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto p-5">
                  <DetailContent tab={detailTab} video={selectedVideo} />
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          <BatchCompare videos={videos} />
        </div>
      )}
    </div>
  );
};

const VideoDetailHeader: React.FC<{ video: VideoRecord }> = ({ video }) => {
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
    <div className="p-5 flex gap-5 flex-shrink-0">
      {/* Cover */}
      <div
        className="relative w-48 flex-shrink-0 rounded-lg overflow-hidden"
        style={{ aspectRatio: '16/9', backgroundColor: '#0a0e27' }}
      >
        {video.coverUrl ? (
          <Image src={video.coverUrl} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play size={32} style={{ color: '#64748b' }} />
          </div>
        )}
        <span
          className="absolute bottom-1 right-1 text-xs px-1.5 py-0.5 rounded"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#e2e8f0' }}
        >
          {formatDuration(video.duration)}
        </span>
        {video.overallScore !== undefined && (
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold"
            style={{
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: video.grade === 'S' ? '#fbbf24' : video.grade === 'A' ? '#ef4444' : '#00d4ff',
            }}
          >
            {video.grade || Math.round(video.overallScore)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col">
        <h2
          className="text-lg font-semibold leading-tight mb-2"
          style={{ color: '#e2e8f0' }}
        >
          {video.title || '无标题视频'}
        </h2>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
              style={{ backgroundColor: '#0a0e27' }}
            >
              {video.authorAvatar ? (
                <Image
                  src={video.authorAvatar}
                  alt={video.authorNickname}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={12} style={{ color: '#64748b' }} />
                </div>
              )}
            </div>
            <span className="text-sm" style={{ color: '#94a3b8' }}>
              {video.authorNickname || '未知作者'}
            </span>
          </div>
          <span className="text-xs" style={{ color: '#64748b' }}>
            {formatCount(video.followerCount)}粉丝
          </span>
          <span className="text-xs" style={{ color: '#64748b' }}>
            {video.publishTime ? new Date(video.publishTime).toLocaleDateString('zh-CN') : ''}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
            style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#6366f1' }}
          >
            <Sparkles size={10} />
            AI生成
          </span>
        </div>

        {/* Interaction stats */}
        <div className="flex items-center gap-6 mt-auto">
          <div className="flex items-center gap-1.5" style={{ color: '#ef4444' }}>
            <Heart size={14} />
            <span className="text-sm font-medium">{formatCount(video.diggCount)}</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ color: '#00d4ff' }}>
            <MessageCircle size={14} />
            <span className="text-sm font-medium">{formatCount(video.commentCount)}</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ color: '#10b981' }}>
            <Share2 size={14} />
            <span className="text-sm font-medium">{formatCount(video.shareCount)}</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ color: '#f59e0b' }}>
            <Bookmark size={14} />
            <span className="text-sm font-medium">{formatCount(video.collectCount)}</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ color: '#6366f1' }}>
            <Play size={14} />
            <span className="text-sm font-medium">{formatCount(video.playCount)} 播放</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailContent: React.FC<{ tab: DetailTab; video: VideoRecord }> = ({ tab, video }) => {
  switch (tab) {
    case 'conclusion':
      return <QuickConclusionTab video={video} />;
    case 'radar':
      return video.eightDimScores ? <RadarScoreTab scores={video.eightDimScores} /> : null;
    case 'traffic':
      return <TrafficPoolTab />;
    case 'content':
      return <ContentBreakdownTab video={video} />;
    case 'editing':
      return <EditingVisualTab video={video} />;
    case 'transcript':
      return <TranscriptCommentsTab video={video} />;
    case 'sop':
      return <RemakeSopTab video={video} />;
    default:
      return null;
  }
};

export default AnalyzePage;
