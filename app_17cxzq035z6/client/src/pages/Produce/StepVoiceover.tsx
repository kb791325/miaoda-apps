import React, { useState } from 'react';
import {
  Mic,
  Play,
  Pause,
  Upload,
  Wand2,
  Sparkles,
  Volume2,
  Clock,
} from 'lucide-react';

interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  desc: string;
}

interface VoiceShot {
  id: number;
  line: string;
  duration: number;
}

interface StepVoiceoverProps {
  onComplete?: () => void;
  onPrev?: () => void;
}

const VOICES: VoiceOption[] = [
  { id: 'f1', name: '甜美女声', gender: 'female', desc: '年轻甜美，适合美妆生活' },
  { id: 'f2', name: '知性女声', gender: 'female', desc: '成熟知性，适合知识教育' },
  { id: 'f3', name: '活力少女', gender: 'female', desc: '元气满满，适合搞笑娱乐' },
  { id: 'f4', name: '温柔御姐', gender: 'female', desc: '低沉温柔，适合情感故事' },
  { id: 'm1', name: '磁性男声', gender: 'male', desc: '深沉磁性，适合科技测评' },
  { id: 'm2', name: '阳光男声', gender: 'male', desc: '阳光开朗，适合运动旅行' },
  { id: 'm3', name: '播音腔', gender: 'male', desc: '字正腔圆，适合新闻播报' },
];

const MOCK_SHOTS: VoiceShot[] = [
  { id: 1, line: '大家好，今天给大家分享一个超级实用的小技巧', duration: 3 },
  { id: 2, line: '只需要三步，就能让你的皮肤变得更加细腻光滑', duration: 4 },
  { id: 3, line: '第一步，先用温水把脸打湿，然后取适量洗面奶', duration: 5 },
  { id: 4, line: '第二步，用指腹轻轻打圈按摩，不要太用力哦', duration: 4 },
  { id: 5, line: '最后一步，用清水冲洗干净，拍上爽肤水就完成啦', duration: 4 },
];

const StepVoiceover: React.FC<StepVoiceoverProps> = ({ onComplete, onPrev }) => {
  const [selectedVoice, setSelectedVoice] = useState<string>('f1');
  const [speed, setSpeed] = useState<number>(1.0);
  const [autoAlign, setAutoAlign] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [generated, setGenerated] = useState<boolean>(false);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const handleGenerate = (): void => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 1500);
  };

  const handlePlay = (id: number): void => {
    setPlayingId(playingId === id ? null : id);
    if (playingId !== id) {
      setTimeout(() => setPlayingId(null), 2000);
    }
  };

  const femaleVoices = VOICES.filter((v) => v.gender === 'female');
  const maleVoices = VOICES.filter((v) => v.gender === 'male');

  const totalDuration = MOCK_SHOTS.reduce((sum, s) => sum + s.duration, 0);

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
            style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}
          >
            <Mic size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
              配音
            </h2>
            <p className="text-xs" style={{ color: '#64748b' }}>
              选择音色、语速，逐镜生成专业配音
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
          需对接TTS API
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left: voice selection */}
        <div className="col-span-2 space-y-4">
          {/* Female voices */}
          <div>
            <div className="text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>
              女声
            </div>
            <div className="grid grid-cols-4 gap-2">
              {femaleVoices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className="p-3 rounded-lg text-left transition-all hover:opacity-80"
                  style={{
                    backgroundColor:
                      selectedVoice === voice.id
                        ? 'rgba(99,102,241,0.15)'
                        : 'rgba(10,14,39,0.5)',
                    border: `1px solid ${
                      selectedVoice === voice.id ? '#6366f1' : '#1e293b'
                    }`,
                  }}
                >
                  <div
                    className="text-sm font-medium mb-1"
                    style={{ color: '#e2e8f0' }}
                  >
                    {voice.name}
                  </div>
                  <div className="text-[10px]" style={{ color: '#64748b' }}>
                    {voice.desc}
                  </div>
                  <button
                    className="mt-2 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: 'rgba(0,212,255,0.1)',
                      color: '#00d4ff',
                    }}
                  >
                    <Play size={10} />
                    试听
                  </button>
                </button>
              ))}
            </div>
          </div>

          {/* Male voices */}
          <div>
            <div className="text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>
              男声
            </div>
            <div className="grid grid-cols-4 gap-2">
              {maleVoices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className="p-3 rounded-lg text-left transition-all hover:opacity-80"
                  style={{
                    backgroundColor:
                      selectedVoice === voice.id
                        ? 'rgba(99,102,241,0.15)'
                        : 'rgba(10,14,39,0.5)',
                    border: `1px solid ${
                      selectedVoice === voice.id ? '#6366f1' : '#1e293b'
                    }`,
                  }}
                >
                  <div
                    className="text-sm font-medium mb-1"
                    style={{ color: '#e2e8f0' }}
                  >
                    {voice.name}
                  </div>
                  <div className="text-[10px]" style={{ color: '#64748b' }}>
                    {voice.desc}
                  </div>
                  <button
                    className="mt-2 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: 'rgba(0,212,255,0.1)',
                      color: '#00d4ff',
                    }}
                  >
                    <Play size={10} />
                    试听
                  </button>
                </button>
              ))}
            </div>
          </div>

          {/* Speed slider */}
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(10,14,39,0.5)', border: '1px solid #1e293b' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: '#94a3b8' }}>
                语速调节
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: '#00d4ff' }}
              >
                {speed.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-cyan-400"
              style={{ accentColor: '#00d4ff' }}
            />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: '#64748b' }}>
              <span>0.8x</span>
              <span>1.0x</span>
              <span>1.5x</span>
            </div>
          </div>
        </div>

        {/* Right: side config */}
        <div className="space-y-3">
          {/* Reference audio */}
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(10,14,39,0.5)', border: '1px solid #1e293b' }}
          >
            <div className="text-xs mb-2" style={{ color: '#94a3b8' }}>
              参考音频（可选）
            </div>
            <div
              className="p-3 rounded-lg border-dashed flex flex-col items-center gap-2 cursor-pointer hover:opacity-80"
              style={{
                backgroundColor: 'rgba(10,14,39,0.3)',
                border: '1px dashed #1e293b',
              }}
            >
              <Upload size={20} style={{ color: '#64748b' }} />
              <span className="text-xs" style={{ color: '#64748b' }}>
                上传参考音频
              </span>
            </div>
          </div>

          {/* Auto align */}
          <div
            className="p-3 rounded-lg flex items-center justify-between"
            style={{ backgroundColor: 'rgba(10,14,39,0.5)', border: '1px solid #1e293b' }}
          >
            <span className="text-xs" style={{ color: '#94a3b8' }}>
              自动对齐时长
            </span>
            <button
              onClick={() => setAutoAlign(!autoAlign)}
              className="w-10 h-5 rounded-full relative transition-all"
              style={{
                backgroundColor: autoAlign ? '#6366f1' : '#1e293b',
              }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{
                  backgroundColor: '#fff',
                  left: autoAlign ? 22 : 2,
                }}
              />
            </button>
          </div>

          {/* Generate btn */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
            }}
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <Sparkles size={14} className="animate-pulse" />
                生成中...
              </span>
            ) : generated ? (
              <span className="flex items-center justify-center gap-2">
                重新生成配音
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles size={14} />
                生成全部配音
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Shot voice list */}
      <div
        className="p-3 rounded-lg"
        style={{ backgroundColor: 'rgba(10,14,39,0.5)', border: '1px solid #1e293b' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
            逐镜配音列表
          </span>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
            <Volume2 size={12} />
            <span>总时长 {totalDuration}s</span>
          </div>
        </div>
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          {MOCK_SHOTS.map((shot) => (
            <div
              key={shot.id}
              className="flex items-center gap-3 p-2 rounded-lg"
              style={{
                backgroundColor: 'rgba(18,23,56,0.6)',
                border: '1px solid #1e293b',
              }}
            >
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(99,102,241,0.2)',
                  color: '#00d4ff',
                }}
              >
                {shot.id}
              </span>
              <button
                onClick={() => handlePlay(shot.id)}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:opacity-80"
                style={{
                  backgroundColor: generated ? 'rgba(0,212,255,0.15)' : 'rgba(100,116,139,0.2)',
                  border: `1px solid ${generated ? 'rgba(0,212,255,0.4)' : '#334155'}`,
                }}
                disabled={!generated}
              >
                {playingId === shot.id ? (
                  <Pause size={12} style={{ color: '#00d4ff' }} />
                ) : (
                  <Play size={12} style={{ color: generated ? '#00d4ff' : '#64748b', marginLeft: 1 }} />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm truncate"
                  style={{ color: '#e2e8f0' }}
                  title={shot.line}
                >
                  {shot.line}
                </div>
              </div>
              <span
                className="text-xs flex items-center gap-1 flex-shrink-0"
                style={{ color: '#64748b' }}
              >
                <Clock size={10} />
                {shot.duration}s
              </span>
            </div>
          ))}
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
          disabled={!generated}
          className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#00d4ff',
            color: '#0a0e27',
            boxShadow: '0 4px 15px rgba(0,212,255,0.3)',
          }}
        >
          下一步：BGM音效
        </button>
      </div>
    </div>
  );
};

export default StepVoiceover;
