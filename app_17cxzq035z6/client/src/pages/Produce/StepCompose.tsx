import React, { useState } from 'react';
import {
  Download,
  Play,
  Pause,
  Wand2,
  Sparkles,
  Type,
  Monitor,
  Settings,
} from 'lucide-react';
import { Image } from '@client/src/components/ui/image';

interface StepComposeProps {
  onComplete?: () => void;
  onPrev?: () => void;
}

const SUBTITLE_FONTS = ['思源黑体', '站酷快乐体', '汉仪尚巍手书', '阿里普惠体'];
const TRANSITIONS = ['无', '淡入淡出', '滑动', '缩放', '翻页'];
const RESOLUTIONS = [
  { value: '1080x1920', label: '1080 × 1920（竖屏）' },
  { value: '1920x1080', label: '1920 × 1080（横屏）' },
  { value: '1080x1080', label: '1080 × 1080（方形）' },
];

const StepCompose: React.FC<StepComposeProps> = ({ onComplete, onPrev }) => {
  const [subtitleFont, setSubtitleFont] = useState<string>('思源黑体');
  const [subtitleSize, setSubtitleSize] = useState<number>(24);
  const [subtitleColor, setSubtitleColor] = useState<string>('#ffffff');
  const [subtitlePosition, setSubtitlePosition] = useState<string>('bottom');
  const [transition, setTransition] = useState<string>('淡入淡出');
  const [resolution, setResolution] = useState<string>('1080x1920');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const handleCompose = (): void => {
    setIsComposing(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsComposing(false);
          setIsDone(true);
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  };

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
            style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}
          >
            <Download size={20} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
              合成输出
            </h2>
            <p className="text-xs" style={{ color: '#64748b' }}>
              最终合成视频，支持字幕、转场、分辨率设置
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
          需对接视频合成API
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left: Video preview */}
        <div className="col-span-2 space-y-4">
          <div
            className="rounded-lg overflow-hidden relative"
            style={{
              backgroundColor: '#000',
              aspectRatio: '9/16',
              maxHeight: 480,
            }}
          >
            {isDone ? (
              <>
                <Image
                  src="https://picsum.photos/seed/finalvideo/600/1000"
                  alt="final video preview"
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                >
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105"
                    style={{
                      backgroundColor: 'rgba(0,212,255,0.9)',
                      boxShadow: '0 0 30px rgba(0,212,255,0.5)',
                    }}
                  >
                    {isPlaying ? (
                      <Pause size={24} style={{ color: '#0a0e27' }} />
                    ) : (
                      <Play size={24} style={{ color: '#0a0e27', marginLeft: 3 }} />
                    )}
                  </button>
                </div>
                {/* subtitle preview */}
                <div
                  className="absolute left-0 right-0 px-4 text-center"
                  style={{
                    bottom: subtitlePosition === 'bottom' ? 48 : subtitlePosition === 'middle' ? '50%' : 48,
                    transform: subtitlePosition === 'middle' ? 'translateY(50%)' : 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: subtitleSize,
                      color: subtitleColor,
                      fontFamily: 'sans-serif',
                      fontWeight: 600,
                      textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                    }}
                  >
                    喜欢的朋友赶紧入手吧！
                  </span>
                </div>
              </>
            ) : isComposing ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <Sparkles size={32} className="animate-pulse" style={{ color: '#6366f1' }} />
                <div className="text-sm" style={{ color: '#e2e8f0' }}>
                  视频合成中...
                </div>
                <div className="w-48">
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'rgba(30,41,59,0.8)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #6366f1 0%, #00d4ff 100%)',
                      }}
                    />
                  </div>
                  <div
                    className="text-xs text-center mt-2"
                    style={{ color: '#64748b' }}
                  >
                    {progress}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <Monitor size={40} style={{ color: '#334155' }} />
                <p className="text-sm" style={{ color: '#64748b' }}>
                  点击下方按钮开始合成
                </p>
              </div>
            )}
          </div>

          {/* Compose button + download */}
          <div className="flex items-center gap-3">
            {!isDone ? (
              <button
                onClick={handleCompose}
                disabled={isComposing}
                className="flex-1 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                }}
              >
                {isComposing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles size={16} className="animate-spin" />
                    合成中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles size={16} />
                    开始合成
                  </span>
                )}
              </button>
            ) : (
              <button
                className="flex-1 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: '#00d4ff',
                  color: '#0a0e27',
                  boxShadow: '0 4px 20px rgba(0,212,255,0.4)',
                }}
              >
                <Download size={18} />
                下载 MP4
              </button>
            )}
          </div>
        </div>

        {/* Right: Settings */}
        <div className="space-y-3">
          {/* Subtitle settings */}
          <div
            className="p-3 rounded-lg"
            style={{
              backgroundColor: 'rgba(10,14,39,0.5)',
              border: '1px solid #1e293b',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Type size={14} style={{ color: '#6366f1' }} />
              <span className="text-xs font-medium" style={{ color: '#e2e8f0' }}>
                字幕样式
              </span>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: '#64748b' }}>
                  字体
                </label>
                <select
                  value={subtitleFont}
                  onChange={(e) => setSubtitleFont(e.target.value)}
                  className="w-full px-2 py-1.5 rounded text-xs"
                  style={{
                    backgroundColor: '#0a0e27',
                    border: '1px solid #1e293b',
                    color: '#e2e8f0',
                  }}
                >
                  {SUBTITLE_FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px]" style={{ color: '#64748b' }}>
                    字号
                  </label>
                  <span className="text-[10px]" style={{ color: '#00d4ff' }}>
                    {subtitleSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min="14"
                  max="48"
                  value={subtitleSize}
                  onChange={(e) => setSubtitleSize(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: '#00d4ff' }}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] flex-shrink-0" style={{ color: '#64748b' }}>
                  颜色
                </label>
                <div className="flex gap-1">
                  {['#ffffff', '#facc15', '#00d4ff', '#ef4444'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setSubtitleColor(c)}
                      className="w-5 h-5 rounded-full transition-all"
                      style={{
                        backgroundColor: c,
                        border: subtitleColor === c ? '2px solid #00d4ff' : '2px solid transparent',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: '#64748b' }}>
                  位置
                </label>
                <div className="flex gap-1">
                  {['top', 'middle', 'bottom'].map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setSubtitlePosition(pos)}
                      className="flex-1 py-1 rounded text-[10px]"
                      style={{
                        backgroundColor:
                          subtitlePosition === pos
                            ? 'rgba(99,102,241,0.2)'
                            : 'transparent',
                        color: subtitlePosition === pos ? '#e2e8f0' : '#64748b',
                        border: `1px solid ${
                          subtitlePosition === pos ? '#6366f1' : '#1e293b'
                        }`,
                      }}
                    >
                      {pos === 'top' ? '顶部' : pos === 'middle' ? '中部' : '底部'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Transition */}
          <div
            className="p-3 rounded-lg"
            style={{
              backgroundColor: 'rgba(10,14,39,0.5)',
              border: '1px solid #1e293b',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Settings size={14} style={{ color: '#6366f1' }} />
              <span className="text-xs font-medium" style={{ color: '#e2e8f0' }}>
                转场效果
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {TRANSITIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTransition(t)}
                  className="py-1.5 rounded text-[10px]"
                  style={{
                    backgroundColor:
                      transition === t ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: transition === t ? '#e2e8f0' : '#64748b',
                    border: `1px solid ${transition === t ? '#6366f1' : '#1e293b'}`,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div
            className="p-3 rounded-lg"
            style={{
              backgroundColor: 'rgba(10,14,39,0.5)',
              border: '1px solid #1e293b',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Monitor size={14} style={{ color: '#6366f1' }} />
              <span className="text-xs font-medium" style={{ color: '#e2e8f0' }}>
                分辨率
              </span>
            </div>
            <div className="space-y-1.5">
              {RESOLUTIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setResolution(r.value)}
                  className="w-full py-1.5 px-2 rounded text-[10px] text-left flex items-center justify-between"
                  style={{
                    backgroundColor:
                      resolution === r.value ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: resolution === r.value ? '#c7d2fe' : '#64748b',
                    border: `1px solid ${
                      resolution === r.value ? 'rgba(99,102,241,0.4)' : '#1e293b'
                    }`,
                  }}
                >
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
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
          className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: 'rgba(16,185,129,0.15)',
            color: '#10b981',
            border: '1px solid rgba(16,185,129,0.3)',
          }}
        >
          完成
        </button>
      </div>
    </div>
  );
};

export default StepCompose;
