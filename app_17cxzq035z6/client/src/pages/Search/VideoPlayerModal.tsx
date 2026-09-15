import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Users, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Image } from '@client/src/components/ui/image';
import type { VideoRecord } from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface VideoPlayerModalProps {
  video: VideoRecord | null;
  onClose: () => void;
}

const formatCount = (num: number): string => {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return String(num);
};

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  const [videoError, setVideoError] = useState(false);

  if (!video) return null;

  const openInDouyin = `https://www.douyin.com/video/${video.awemeId}`;
  const canPlay = video.videoUrl && !videoError;

  return (
    <Dialog open={!!video} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent
        className="p-0 overflow-hidden max-w-3xl"
        style={{
          backgroundColor: '#121738',
          border: '1px solid #1e293b',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          borderRadius: '12px',
        }}
        showCloseButton={true}
      >
        <DialogTitle className="sr-only">{video.title || '视频播放'}</DialogTitle>

        {/* Title */}
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
          <h2
            className="text-base font-semibold leading-tight line-clamp-2"
            style={{ color: '#e2e8f0' }}
          >
            {video.title || '无标题'}
          </h2>
        </div>

        {/* Video area */}
        {canPlay ? (
          <video
            src={video.videoUrl}
            controls
            autoPlay
            onError={() => setVideoError(true)}
            className="w-full"
            style={{ maxHeight: '70vh', backgroundColor: '#000' }}
          />
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-4 py-12 px-6"
            style={{ backgroundColor: '#000', minHeight: '300px' }}
          >
            <AlertTriangle size={40} style={{ color: '#f59e0b' }} />
            <p className="text-sm text-center" style={{ color: '#94a3b8' }}>
              视频因防盗链限制无法直接播放
            </p>
            <UniversalLink
              to={openInDouyin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={14} />
              在抖音打开
            </UniversalLink>
          </div>
        )}

        {/* Bottom info */}
        <div className="px-5 py-4 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(148,163,184,0.1)' }}>
          {/* Author */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
              style={{ backgroundColor: '#1a2050' }}
            >
              {video.authorAvatar ? (
                <Image src={video.authorAvatar} alt={video.authorNickname} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: '#64748b' }}>
                  {video.authorNickname?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>
                {video.authorNickname || '未知作者'}
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: '#64748b' }}>
                <Users size={12} />
                <span>{formatCount(video.followerCount)} 粉丝</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-1.5" style={{ color: '#ef4444' }}>
              <Heart size={14} />
              <span className="text-sm">{formatCount(video.diggCount)}</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: '#00d4ff' }}>
              <MessageCircle size={14} />
              <span className="text-sm">{formatCount(video.commentCount)}</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: '#10b981' }}>
              <Share2 size={14} />
              <span className="text-sm">{formatCount(video.shareCount)}</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: '#f59e0b' }}>
              <Bookmark size={14} />
              <span className="text-sm">{formatCount(video.collectCount)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayerModal;
