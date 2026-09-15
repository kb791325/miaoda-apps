import React, { useState } from 'react';
import {
  Film,
  Play,
  RefreshCw,
  Wand2,
  Sparkles,
  Clock,
  Link,
} from 'lucide-react';
import { Image } from '@client/src/components/ui/image';

interface ClipItem {
  id: number;
  duration: number;
  scene: string;
  videoUrl?: string;
  status: 'pending' | 'generating' | 'done';
}

interface StepVideoClipsProps {
  onComplete?: () => void;
  onPrev?: () => void;
}

const MOCK_CLIPS: ClipItem[] = [
  { id: 1, duration: 3, scene: '主角面对镜头微笑', status: 'done' },
  { id: 2, duration: 5, scene: '特写产品细节', status: 'done' },
  { id: 3, duration: 4, scene: '主角展示使用效果', status: 'generating' },
  { id: 4, duration: 6, scene: '多角度展示产品', status: 'pending' },
  { id: 5, duration: 3, scene: '结尾CTA', status: 'pending' },
];

const StepVideoClips: React.FC<StepVideoClipsProps> = ({ onComplete, onPrev }) => {
  const [model, setModel] = useState<'standard' | 'high'>('standard');
  const [durationMode, setDurationMode] = useState<'follow' | 'custom'>('follow');
  const [smoothTransition, setSmoothTransition] = useState<boolean>(true);
  const [clips, setClips] = useState<ClipItem[]>(MOCK_CLIPS);
  const [generatingAll, setGeneratingAll] = useState<boolean>(false);

  const handleGenerate = (id: number): void => {
    setClips((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'generating' as const } : c)),
    );
    setTimeout(() => {
      setClips((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: 'done' as const } : c,
        ),
      );
    }, 2000);
  };

  const handleGenerateAll = (): void => {
    setGeneratingAll(true);
    const pendingIds = clips.filter((c) => c.status !== 'done').map((c) => c.id);
    setClips((prev) =>
      prev.map((c) =>
        pendingIds.includes(c.id) ? { ...c, status: 'generating' as const } : c,
      ),
    );
    setTimeout(() => {
      setClips((prev) =>
        prev.map((c) =>
          pendingIds.includes(c.id) ? { ...c, status: 'done' as const } : c,
        ),
      );
      setGeneratingAll(false);
    }, 2500);
  };

  const doneCount = clips.filter((c) => c.status === 'done').length;
  const allDone = doneCount === clips.length;
  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);

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
            style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}
          >
            <Film size={20} style={{ color: '#10b981' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
              视频片段生成
            </h2>
            <p className="text-xs" style={{ color: '#64748b' }}>
              逐镜生成动态视频片段，支持模型选择与时长调整
            </p>
          </div>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-md flex items-center gap-1"
          style={{
            backgroundColor: 'rgba(245,158,11,0.1)',
            color: '#f59e0b',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <Wand2 size={12} />
          需对接AI视频生成API
        </span>
      </div>

      {/* Config row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Model select */}
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: 'rgba(10,14,39,0.5)', border: '1px solid #1e293b' }}
        >
          <div className="text-xs mb-2" style={{ color: '#64748b' }}>
            模型选择
          </div>
          <div className="flex gap-2">
            {(['standard', 'high'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className="flex-1 py-1.5 rounded text-xs font-medium transition-all"
                style={{
                  backgroundColor: model === m ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: model === m ? '#e2e8f0' : '#64748b',
                  border: `1px solid ${model === m ? '#6366f1' : '#1e293b'}`,
                }}
              >
                {m === 'standard' ? '标准' : '高质量'}
              </button>
            ))}
          </div>
        </div>

        {/* Duration mode */}
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: 'rgba(10,14,39,0.5)', border: '1px solid #1e293b' }}
        >
          <div className="text-xs mb-2" style={{ color: '#64748b' }}>
            时长设置
          </div>
          <div className="flex gap-2">
            {(['follow', 'custom'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDurationMode(d)}
                className="flex-1 py-1.5 rounded text-xs font-medium transition-all"
                style={{
                  backgroundColor:
                    durationMode === d ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: durationMode === d ? '#e2e8f0' : '#64748b',
                  border: `1px solid ${durationMode === d ? '#6366f1' : '#1e293b'}`,
                }}
              >
                {d === 'follow' ? '跟随分镜' : '自定义'}
              </button>
            ))}
          </div>
        </div>

        {/* Smooth transition */}
        <div
          className="p-3 rounded-lg flex items-center justify-between"
          style={{ backgroundColor: 'rgba(10,14,39,0.5)', border: '1px solid #1e293b' }}
        >
          <div className="flex items-center gap-2">
            <Link size={14} style={{ color: '#6366f1' }} />
            <span className="text-xs" style={{ color: '#94a3b8' }}>
              首尾帧衔接
            </span>
          </div>
          <button
            onClick={() => setSmoothTransition(!smoothTransition)}
            className="w-10 h-5 rounded-full relative transition-all"
            style={{
              backgroundColor: smoothTransition ? '#6366f1' : '#1e293b',
            }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
              style={{
                backgroundColor: '#fff',
                left: smoothTransition ? 22 : 2,
              }}
            />
          </button>
        </div>
      </div>

      {/* Generate all + stats */}
      <div className="flex items-center justify-between">
        <div className="text-xs" style={{ color: '#64748b' }}>
          共 <span style={{ color: '#e2e8f0' }}>{clips.length}</span> 个片段，
          已完成 <span style={{ color: '#10b981' }}>{doneCount}</span>，
          总时长 <span style={{ color: '#00d4ff' }}>{totalDuration}s</span>
        </div>
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

      {/* Clip list */}
      <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
        {clips.map((clip) => (
          <div
            key={clip.id}
            className="p-3 rounded-lg"
            style={{
              backgroundColor: 'rgba(10,14,39,0.5)',
              border: '1px solid #1e293b',
            }}
          >
            <div className="flex gap-3">
              <div
                className="w-24 h-14 rounded-lg overflow-hidden flex-shrink-0 relative flex items-center justify-center"
                style={{ backgroundColor: '#0a0e27', border: '1px solid #1e293b' }}
              >
                {clip.status === 'done' ? (
                  <>
                    <Image
                      src={`https://picsum.photos/seed/clip${clip.id}/160/90`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(0,212,255,0.8)' }}
                      >
                        <Play size={14} style={{ color: '#0a0e27', marginLeft: 2 }} />
                      </div>
                    </button>
                  </>
                ) : clip.status === 'generating' ? (
                  <div className="flex flex-col items-center gap-1">
                    <RefreshCw size={18} className="animate-spin" style={{ color: '#6366f1' }} />
                    <span className="text-[10px]" style={{ color: '#6366f1' }}>
                      生成中
                    </span>
                  </div>
                ) : (
                  <Film size={20} style={{ color: '#334155' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: 'rgba(99,102,241,0.2)',
                      color: '#00d4ff',
                    }}
                  >
                    {clip.id}
                  </span>
                  <span
                    className="text-xs flex items-center gap-0.5"
                    style={{ color: '#64748b' }}
                  >
                    <Clock size={10} />
                    {clip.duration}s
                  </span>
                </div>
                <div
                  className="text-xs truncate"
                  style={{ color: '#e2e8f0' }}
                  title={clip.scene}
                >
                  {clip.scene}
                </div>
                <div className="mt-1.5">
                  {clip.status === 'pending' && (
                    <button
                      onClick={() => handleGenerate(clip.id)}
                      className="w-full py-1 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor: 'rgba(99,102,241,0.15)',
                        color: '#c7d2fe',
                        border: '1px solid rgba(99,102,241,0.3)',
                      }}
                    >
                      生成
                    </button>
                  )}
                  {clip.status === 'done' && (
                    <button
                      onClick={() => handleGenerate(clip.id)}
                      className="w-full py-1 rounded text-[10px] font-medium flex items-center justify-center gap-1"
                      style={{
                        backgroundColor: 'rgba(148,163,184,0.1)',
                        color: '#94a3b8',
                        border: '1px solid #1e293b',
                      }}
                    >
                      <RefreshCw size={10} />
                      重新生成
                    </button>
                  )}
                </div>
              </div>
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
          下一步：配音
        </button>
      </div>
    </div>
  );
};

export default StepVideoClips;
