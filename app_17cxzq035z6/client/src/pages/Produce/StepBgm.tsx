import React, { useState } from 'react';
import {
  Music,
  Play,
  Pause,
  Wand2,
  Volume2,
  SkipBack,
} from 'lucide-react';

interface SoundEffect {
  id: string;
  name: string;
  duration: string;
}

interface StepBgmProps {
  onComplete?: () => void;
  onPrev?: () => void;
}

const BGM_STYLES = [
  '紧张',
  '温馨',
  '欢快',
  '科技',
  '伤感',
  '励志',
  '悬疑',
  '治愈',
];

const SOUND_CATEGORIES = ['转场', '强调', '环境', '特效', '人声'];

const MOCK_SOUNDS: Record<string, SoundEffect[]> = {
  转场: [
    { id: 's1', name: '嗖声转场', duration: '0.5s' },
    { id: 's2', name: '闪白音效', duration: '0.3s' },
    { id: 's3', name: '风鸣过渡', duration: '1s' },
  ],
  强调: [
    { id: 's4', name: '叮咚强调', duration: '0.4s' },
    { id: 's5', name: '哇哦惊叹', duration: '0.6s' },
    { id: 's6', name: '鼓点重击', duration: '0.2s' },
  ],
  环境: [
    { id: 's7', name: '咖啡厅背景', duration: '30s' },
    { id: 's8', name: '雨声白噪', duration: '60s' },
    { id: 's9', name: '城市车流', duration: '45s' },
  ],
  特效: [
    { id: 's10', name: '魔法闪光', duration: '1s' },
    { id: 's11', name: '气泡升起', duration: '0.8s' },
    { id: 's12', name: '电子脉冲', duration: '0.5s' },
  ],
  人声: [
    { id: 's13', name: '笑声合集', duration: '2s' },
    { id: 's14', name: '惊叹哇', duration: '0.5s' },
    { id: 's15', name: '掌声欢呼', duration: '3s' },
  ],
};

const StepBgm: React.FC<StepBgmProps> = ({ onComplete, onPrev }) => {
  const [selectedStyle, setSelectedStyle] = useState<string>('欢快');
  const [bgmVolume, setBgmVolume] = useState<number>(60);
  const [activeCategory, setActiveCategory] = useState<string>('转场');
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(35);
  const [selected, setSelected] = useState<string[]>([]);

  const handlePlaySound = (id: string): void => {
    if (playingSound === id && isPlaying) {
      setPlayingSound(null);
      setIsPlaying(false);
    } else {
      setPlayingSound(id);
      setIsPlaying(true);
      setTimeout(() => {
        setPlayingSound(null);
        setIsPlaying(false);
      }, 1500);
    }
  };

  const toggleSelect = (id: string): void => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const sounds = MOCK_SOUNDS[activeCategory] || [];

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
            style={{ backgroundColor: 'rgba(236,72,153,0.15)' }}
          >
            <Music size={20} style={{ color: '#ec4899' }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
              BGM 与音效
            </h2>
            <p className="text-xs" style={{ color: '#64748b' }}>
              选择背景音乐风格，添加音效点缀
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
          需对接BGM素材库API
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left: BGM */}
        <div className="col-span-2 space-y-4">
          {/* BGM style */}
          <div>
            <div className="text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>
              BGM 风格
            </div>
            <div className="flex flex-wrap gap-2">
              {BGM_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor:
                      selectedStyle === style
                        ? 'rgba(99,102,241,0.2)'
                        : 'rgba(10,14,39,0.5)',
                    color: selectedStyle === style ? '#c7d2fe' : '#64748b',
                    border: `1px solid ${
                      selectedStyle === style ? '#6366f1' : '#1e293b'
                    }`,
                  }}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div
            className="p-3 rounded-lg"
            style={{
              backgroundColor: 'rgba(10,14,39,0.5)',
              border: '1px solid #1e293b',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Volume2 size={14} style={{ color: '#6366f1' }} />
                <span className="text-xs" style={{ color: '#94a3b8' }}>
                  BGM 音量
                </span>
              </div>
              <span className="text-sm font-semibold" style={{ color: '#00d4ff' }}>
                {bgmVolume}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={bgmVolume}
              onChange={(e) => setBgmVolume(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: '#00d4ff' }}
            />
          </div>

          {/* Preview player */}
          <div
            className="p-4 rounded-lg"
            style={{
              backgroundColor: 'rgba(10,14,39,0.5)',
              border: '1px solid #1e293b',
            }}
          >
            <div className="text-xs mb-3" style={{ color: '#64748b' }}>
              预览播放
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:opacity-80 flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #00d4ff 100%)',
                  boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                }}
              >
                {isPlaying ? (
                  <Pause size={18} style={{ color: '#fff' }} />
                ) : (
                  <Play size={18} style={{ color: '#fff', marginLeft: 2 }} />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: '#e2e8f0' }}>
                    {selectedStyle}风格BGM - 第1首
                  </span>
                  <span className="text-xs" style={{ color: '#64748b' }}>
                    0:{Math.floor(progress * 0.3)} / 0:30
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden cursor-pointer"
                  style={{ backgroundColor: 'rgba(30,41,59,0.8)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #6366f1 0%, #00d4ff 100%)',
                    }}
                  />
                </div>
              </div>
              <button
                className="p-2 rounded-lg hover:opacity-80"
                style={{ color: '#64748b' }}
              >
                <SkipBack size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Sound effects */}
        <div className="space-y-3">
          <div
            className="p-3 rounded-lg"
            style={{
              backgroundColor: 'rgba(10,14,39,0.5)',
              border: '1px solid #1e293b',
            }}
          >
            <div className="text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>
              音效库
            </div>
            {/* Categories */}
            <div className="flex flex-wrap gap-1 mb-3">
              {SOUND_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-2 py-0.5 rounded text-[10px] transition-all"
                  style={{
                    backgroundColor:
                      activeCategory === cat
                        ? 'rgba(99,102,241,0.2)'
                        : 'transparent',
                    color: activeCategory === cat ? '#c7d2fe' : '#64748b',
                    border: `1px solid ${
                      activeCategory === cat ? '#6366f1' : 'transparent'
                    }`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* Sound list */}
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              {sounds.map((sound) => {
                const isPlayingThis = playingSound === sound.id && isPlaying;
                const isSelected = selected.includes(sound.id);
                return (
                  <div
                    key={sound.id}
                    className="flex items-center gap-2 p-2 rounded-lg"
                    style={{
                      backgroundColor: isSelected
                        ? 'rgba(99,102,241,0.1)'
                        : 'rgba(18,23,56,0.5)',
                      border: `1px solid ${
                        isSelected ? 'rgba(99,102,241,0.3)' : 'transparent'
                      }`,
                    }}
                  >
                    <button
                      onClick={() => handlePlaySound(sound.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: 'rgba(0,212,255,0.15)',
                      }}
                    >
                      {isPlayingThis ? (
                        <Pause size={10} style={{ color: '#00d4ff' }} />
                      ) : (
                        <Play size={10} style={{ color: '#00d4ff', marginLeft: 1 }} />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs truncate"
                        style={{ color: '#e2e8f0' }}
                      >
                        {sound.name}
                      </div>
                      <div className="text-[10px]" style={{ color: '#64748b' }}>
                        {sound.duration}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSelect(sound.id)}
                      className="text-[10px] px-2 py-0.5 rounded flex-shrink-0"
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(16,185,129,0.15)'
                          : 'rgba(148,163,184,0.1)',
                        color: isSelected ? '#10b981' : '#64748b',
                        border: `1px solid ${
                          isSelected ? 'rgba(16,185,129,0.3)' : '#1e293b'
                        }`,
                      }}
                    >
                      {isSelected ? '已添加' : '添加'}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[10px]" style={{ color: '#64748b' }}>
              已选 <span style={{ color: '#c7d2fe' }}>{selected.length}</span> 个音效
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
            backgroundColor: '#00d4ff',
            color: '#0a0e27',
            boxShadow: '0 4px 15px rgba(0,212,255,0.3)',
          }}
        >
          下一步：合成输出
        </button>
      </div>
    </div>
  );
};

export default StepBgm;
