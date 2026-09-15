import React, { useState } from 'react';
import {
  Image,
  RefreshCw,
  Upload,
  Wand2,
  Sparkles,
  Play,
  Clock,
} from 'lucide-react';
import { Image as UIImage } from '@client/src/components/ui/image';

interface ShotItem {
  id: number;
  duration: number;
  scene: string;
  line: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'done';
}

interface StepStoryboardImgProps {
  onComplete?: () => void;
  onPrev?: () => void;
}

const MOCK_SHOTS: ShotItem[] = [
  { id: 1, duration: 3, scene: '主角面对镜头微笑，背景为明亮的室内', line: '大家好，今天给大家分享...', status: 'done', imageUrl: 'https://picsum.photos/seed/sb1/320/180' },
  { id: 2, duration: 5, scene: '特写产品细节，手指划过产品表面', line: '这款产品最大的亮点就是...', status: 'done', imageUrl: 'https://picsum.photos/seed/sb2/320/180' },
  { id: 3, duration: 4, scene: '主角展示使用效果，表情惊喜', line: '用了之后真的太惊艳了！', status: 'generating' },
  { id: 4, duration: 6, scene: '多角度展示产品全貌', line: '从外观到功能，每一处都很用心', status: 'pending' },
  { id: 5, duration: 3, scene: '主角比心，背景温馨', line: '喜欢的朋友赶紧入手吧！', status: 'pending' },
];

const StepStoryboardImg: React.FC<StepStoryboardImgProps> = ({ onComplete, onPrev }) => {
  const [shots, setShots] = useState<ShotItem[]>(MOCK_SHOTS);
  const [generatingAll, setGeneratingAll] = useState<boolean>(false);

  const handleGenerate = (id: number): void => {
    setShots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'generating' as const } : s)),
    );
    setTimeout(() => {
      setShots((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: 'done' as const,
                imageUrl: `https://picsum.photos/seed/sb${id}${Date.now()}/320/180`,
              }
            : s,
        ),
      );
    }, 1500);
  };

  const handleGenerateAll = (): void => {
    setGeneratingAll(true);
    const pendingIds = shots.filter((s) => s.status !== 'done').map((s) => s.id);
    setShots((prev) =>
      prev.map((s) =>
        pendingIds.includes(s.id) ? { ...s, status: 'generating' as const } : s,
      ),
    );
    setTimeout(() => {
      setShots((prev) =>
        prev.map((s) =>
          pendingIds.includes(s.id)
            ? {
                ...s,
                status: 'done' as const,
                imageUrl: `https://picsum.photos/seed/sb${s.id}all/320/180`,
              }
            : s,
        ),
      );
      setGeneratingAll(false);
    }, 2000);
  };

  const doneCount = shots.filter((s) => s.status === 'done').length;
  const allDone = doneCount === shots.length;

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        backgroundColor: '#121738',
        border: '1px solid #1e293b',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,212,255,0.15)' }}
          >
            <Image size={20} style={{ color: '#00d4ff' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
              分镜图生成
            </h2>
            <p className="text-xs" style={{ color: '#64748b' }}>
              从脚本导入分镜，逐镜生成画面参考图
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-1 rounded-md flex items-center gap-1"
            style={{
              backgroundColor: 'rgba(245,158,11,0.1)',
              color: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.3)',
            }}
          >
            <Wand2 size={12} />
            需对接AI绘图API
          </span>
          <button
            onClick={handleGenerateAll}
            disabled={generatingAll || allDone}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: 'rgba(99,102,241,0.15)',
              color: '#c7d2fe',
              border: '1px solid rgba(99,102,241,0.3)',
            }}
          >
            {generatingAll ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            {allDone ? '全部完成' : '全部生成'}
          </button>
        </div>
      </div>

      {/* Import info */}
      <div
        className="p-3 rounded-lg flex items-center gap-3"
        style={{
          backgroundColor: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        <Play size={16} style={{ color: '#6366f1' }} />
        <span className="text-xs" style={{ color: '#94a3b8' }}>
          已从脚本导入 <span style={{ color: '#c7d2fe' }}>{shots.length} 个分镜</span>，
          总时长 {shots.reduce((sum, s) => sum + s.duration, 0)} 秒
        </span>
      </div>

      {/* Shot list */}
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {shots.map((shot) => (
          <div
            key={shot.id}
            className="flex gap-4 p-3 rounded-lg"
            style={{
              backgroundColor: 'rgba(10,14,39,0.5)',
              border: '1px solid #1e293b',
            }}
          >
            {/* Shot number + duration */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 w-12">
              <span
                className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #00d4ff 100%)',
                  color: '#fff',
                }}
              >
                {shot.id}
              </span>
              <span
                className="text-xs flex items-center gap-0.5"
                style={{ color: '#64748b' }}
              >
                <Clock size={10} />
                {shot.duration}s
              </span>
            </div>

            {/* Image area */}
            <div
              className="w-40 h-24 rounded-lg overflow-hidden flex-shrink-0 relative"
              style={{
                backgroundColor: '#0a0e27',
                border: '1px solid #1e293b',
              }}
            >
              {shot.status === 'done' && shot.imageUrl ? (
                <UIImage
                  src={shot.imageUrl}
                  alt={`分镜${shot.id}`}
                  className="w-full h-full object-cover"
                />
              ) : shot.status === 'generating' ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <RefreshCw size={20} className="animate-spin" style={{ color: '#6366f1' }} />
                  <span className="text-xs" style={{ color: '#6366f1' }}>
                    生成中...
                  </span>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image size={24} style={{ color: '#334155' }} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium mb-1" style={{ color: '#e2e8f0' }}>
                {shot.scene}
              </div>
              <div className="text-xs" style={{ color: '#64748b' }}>
                台词：{shot.line}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              {shot.status === 'pending' && (
                <button
                  onClick={() => handleGenerate(shot.id)}
                  className="px-3 py-1.5 rounded text-xs font-medium transition-all hover:opacity-80"
                  style={{
                    backgroundColor: 'rgba(99,102,241,0.15)',
                    color: '#c7d2fe',
                    border: '1px solid rgba(99,102,241,0.3)',
                  }}
                >
                  生成
                </button>
              )}
              {shot.status === 'done' && (
                <>
                  <button
                    onClick={() => handleGenerate(shot.id)}
                    className="px-3 py-1.5 rounded text-xs font-medium transition-all hover:opacity-80 flex items-center gap-1"
                    style={{
                      backgroundColor: 'rgba(148,163,184,0.1)',
                      color: '#94a3b8',
                      border: '1px solid #1e293b',
                    }}
                  >
                    <RefreshCw size={12} />
                    重生成
                  </button>
                  <button
                    className="px-3 py-1.5 rounded text-xs font-medium transition-all hover:opacity-80 flex items-center gap-1"
                    style={{
                      backgroundColor: 'rgba(148,163,184,0.1)',
                      color: '#94a3b8',
                      border: '1px solid #1e293b',
                    }}
                  >
                    <Upload size={12} />
                    上传
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onPrev}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: 'rgba(148,163,184,0.1)',
            color: '#94a3b8',
            border: '1px solid #1e293b',
          }}
        >
          上一步
        </button>
        <button
          onClick={onComplete}
          disabled={!allDone}
          className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#00d4ff',
            color: '#0a0e27',
            boxShadow: '0 4px 15px rgba(0,212,255,0.3)',
          }}
        >
          下一步：视频片段
        </button>
      </div>
    </div>
  );
};

export default StepStoryboardImg;
