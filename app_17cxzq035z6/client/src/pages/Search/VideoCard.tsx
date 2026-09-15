import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Play } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { VideoRecord } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

interface VideoCardProps {
  video: VideoRecord;
  selected: boolean;
  onToggle: (id: string) => void;
  onPlay?: (video: VideoRecord) => void;
}

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

const getScoreColor = (score?: number, grade?: string): string => {
  if (grade === 'S') return '#fbbf24';
  if (grade === 'A') return '#ef4444';
  if (grade === 'B') return '#f59e0b';
  if (grade === 'C') return '#64748b';
  if (score !== undefined) {
    if (score >= 85) return '#fbbf24';
    if (score >= 70) return '#ef4444';
    if (score >= 55) return '#f59e0b';
  }
  return '#6366f1';
};

const VideoCard: React.FC<VideoCardProps> = ({ video, selected, onToggle, onPlay }) => {
  const [coverError, setCoverError] = useState(false);
  const scoreColor = getScoreColor(video.overallScore, video.grade);

  const handlePlayClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onPlay) onPlay(video);
  };

  const handleCoverError = (): void => {
    logger.warn('封面加载失败', video.coverUrl);
    setCoverError(true);
  };

  return (
    <div
      onClick={() => onToggle(video.id)}
      className="relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group"
      style={{
        backgroundColor: '#121738',
        border: selected ? '2px solid #6366f1' : '1px solid #1e293b',
        boxShadow: selected
          ? '0 8px 30px rgba(99,102,241,0.3)'
          : '0 4px 20px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(99,102,241,0.25)';
          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
          e.currentTarget.style.borderColor = '#1e293b';
        }
      }}
    >
      {/* Checkbox */}
      <div
        className="absolute top-2 left-2 z-20 w-5 h-5 rounded-md flex items-center justify-center transition-all"
        style={{
          backgroundColor: selected ? '#6366f1' : 'rgba(0,0,0,0.5)',
          border: selected ? 'none' : '1px solid rgba(255,255,255,0.3)',
        }}
      >
        {selected && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      {/* Cover */}
      <div
        className="relative w-full"
        style={{
          aspectRatio: '16/9',
          background: 'linear-gradient(135deg, #1a2050 0%, #0a0e27 100%)',
        }}
      >
        {video.coverUrl && !coverError ? (
          <Image
            src={video.coverUrl}
            alt={video.title || 'video'}
            className="w-full h-full object-cover"
            onError={handleCoverError}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #1a2050 0%, #0a0e27 100%)',
            }}
          >
            <Play size={32} style={{ color: '#64748b' }} />
          </div>
        )}

        {/* Play button overlay */}
        {onPlay && (
          <button
            onClick={handlePlayClick}
            className="absolute inset-0 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            aria-label="播放视频"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: 'rgba(99,102,241,0.85)',
                boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
              }}
            >
              <Play size={24} fill="white" style={{ color: 'white', marginLeft: 2 }} />
            </div>
          </button>
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(10,14,39,0.9), transparent)',
          }}
        />

        {/* Duration badge */}
        <div
          className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-xs font-medium"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#e2e8f0' }}
        >
          {formatDuration(video.duration)}
        </div>

        {/* Score badge */}
        {(video.overallScore !== undefined || video.grade) && (
          <div
            className="absolute top-2 right-2 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{
              backgroundColor: 'rgba(0,0,0,0.7)',
              border: `2px solid ${scoreColor}`,
              color: scoreColor,
              boxShadow: `0 0 12px ${scoreColor}40`,
            }}
          >
            {video.grade || Math.round(video.overallScore || 0)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2">
        {/* Title */}
        <h3
          className="text-sm font-medium leading-tight line-clamp-2"
          style={{ color: '#e2e8f0', minHeight: '36px' }}
        >
          {video.title || '无标题'}
        </h3>

        {/* Author */}
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
            style={{ backgroundColor: '#1a2050' }}
          >
            {video.authorAvatar ? (
              <Image src={video.authorAvatar} alt={video.authorNickname} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: '#64748b' }}>
                {video.authorNickname?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <span className="text-xs truncate flex-1" style={{ color: '#94a3b8' }}>
            {video.authorNickname || '未知作者'}
          </span>
          <span className="text-xs flex-shrink-0" style={{ color: '#64748b' }}>
            {formatCount(video.followerCount)}粉
          </span>
        </div>

        {/* Interaction data */}
        <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid rgba(148,163,184,0.1)' }}>
          <div className="flex items-center gap-1" style={{ color: '#64748b' }}>
            <Heart size={12} />
            <span className="text-xs">{formatCount(video.diggCount)}</span>
          </div>
          <div className="flex items-center gap-1" style={{ color: '#64748b' }}>
            <MessageCircle size={12} />
            <span className="text-xs">{formatCount(video.commentCount)}</span>
          </div>
          <div className="flex items-center gap-1" style={{ color: '#64748b' }}>
            <Share2 size={12} />
            <span className="text-xs">{formatCount(video.shareCount)}</span>
          </div>
          <div className="flex items-center gap-1" style={{ color: '#64748b' }}>
            <Bookmark size={12} />
            <span className="text-xs">{formatCount(video.collectCount)}</span>
          </div>
        </div>

        {/* Hashtags */}
        {video.hashtags && video.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {video.hashtags.slice(0, 3).map((tag: string, idx: number) => (
              <span
                key={idx}
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: 'rgba(99,102,241,0.15)',
                  color: '#6366f1',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCard;
