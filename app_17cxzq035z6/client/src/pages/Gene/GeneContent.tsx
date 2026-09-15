import React, { useState } from 'react';
import {
  Star,
  Heart,
  Play,
  Pause,
  Copy,
  Check,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  mockGeneData,
  type GeneCategory,
  type HookGene,
  type CopyGene,
  type EmotionGene,
  type EditingGene,
  type TagGene,
  type BgmGene,
} from './mockGenes';

interface GeneContentProps {
  category: GeneCategory;
  searchQuery: string;
  sortBy: string;
  onlyFavorites: boolean;
  trackFilter: string;
  onToggleFavorite: (cat: GeneCategory, id: string) => void;
  onUse: (cat: GeneCategory, id: string) => void;
}

const StarRating: React.FC<{ score: number; size?: number }> = ({ score, size = 14 }) => {
  const fullStars = Math.round(score / 20);
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i: number) => (
        <Star
          key={i}
          size={size}
          fill={i < fullStars ? '#f59e0b' : 'none'}
          style={{ color: i < fullStars ? '#f59e0b' : '#334155' }}
        />
      ))}
    </div>
  );
};

const hookTypeColors: Record<string, string> = {
  悬念型: '#a855f7',
  反转型: '#f59e0b',
  痛点型: '#ef4444',
  福利型: '#10b981',
  共鸣型: '#00d4ff',
  对比型: '#3b82f6',
};

const HookCards: React.FC<{
  items: HookGene[];
  onToggleFavorite: (id: string) => void;
  onUse: (id: string) => void;
}> = ({ items, onToggleFavorite, onUse }) => (
  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
    {items.map((item: HookGene) => {
      const typeColor = hookTypeColors[item.type] ?? '#6366f1';
      return (
        <div
          key={item.id}
          className="rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
          style={{
            backgroundColor: '#121738',
            border: '1px solid #1e293b',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="px-2.5 py-1 rounded-md text-xs font-medium"
              style={{
                backgroundColor: `${typeColor}20`,
                color: typeColor,
                border: `1px solid ${typeColor}40`,
              }}
            >
              {item.type}
            </span>
            <button
              type="button"
              onClick={() => onToggleFavorite(item.id)}
              className="p-1.5 rounded-md transition-colors hover:bg-white/5"
              style={{ color: item.isFavorite ? '#f59e0b' : '#64748b' }}
            >
              <Heart size={16} fill={item.isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>

          <p
            className="text-base font-medium mb-3 leading-relaxed"
            style={{ color: '#e2e8f0' }}
          >
            {item.content}
          </p>

          <p className="text-xs mb-4 leading-relaxed" style={{ color: '#64748b' }}>
            示例：{item.example}
          </p>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <StarRating score={item.effectScore} />
              <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>
                {item.effectScore}分
              </span>
            </div>
            <span className="text-xs" style={{ color: '#64748b' }}>
              使用 {item.useCount.toLocaleString()}
            </span>
          </div>

          <div
            className="text-xs mb-4 truncate cursor-pointer hover:underline"
            style={{ color: '#6366f1' }}
            title={item.sourceVideo}
          >
            来源：{item.sourceVideo}
          </div>

          <button
            type="button"
            onClick={() => onUse(item.id)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: '#6366f1',
              color: '#fff',
            }}
          >
            <Zap size={14} />
            应用到脚本
          </button>
        </div>
      );
    })}
  </div>
);

const CopyList: React.FC<{
  items: CopyGene[];
  onToggleFavorite: (id: string) => void;
  onUse: (id: string) => void;
}> = ({ items, onToggleFavorite, onUse }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string): void => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success('已复制到剪贴板');
      onUse(id);
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(() => {
      toast.error('复制失败');
    });
  };

  const catColors: Record<string, string> = {
    开头型: '#3b82f6',
    转折型: '#a855f7',
    结尾型: '#10b981',
    金句型: '#f59e0b',
  };

  const highlightTemplate = (template: string, keywords: string[]): React.ReactNode => {
    let result: React.ReactNode = template;
    keywords.forEach((kw: string, idx: number) => {
      if (typeof result !== 'string') return;
      const parts = result.split(kw);
      if (parts.length > 1) {
        result = parts.map((part: string, i: number) => (
          <React.Fragment key={`${idx}-${i}`}>
            {part}
            {i < parts.length - 1 && (
              <span style={{ color: '#00d4ff', fontWeight: 600 }}>{kw}</span>
            )}
          </React.Fragment>
        ));
      }
    });
    return result;
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#121738', border: '1px solid #1e293b' }}>
      {items.map((item: CopyGene, index: number) => {
        const catColor = catColors[item.category] ?? '#6366f1';
        return (
          <div
            key={item.id}
            className="flex items-center gap-4 p-4 transition-colors hover:bg-white/5"
            style={{
              borderBottom: index < items.length - 1 ? '1px solid rgba(30,41,59,0.5)' : 'none',
            }}
          >
            <span
              className="px-2.5 py-1 rounded-md text-xs font-medium shrink-0"
              style={{
                backgroundColor: `${catColor}20`,
                color: catColor,
                border: `1px solid ${catColor}40`,
              }}
            >
              {item.category}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm mb-1 leading-relaxed"
                style={{ color: '#e2e8f0' }}
              >
                {highlightTemplate(item.template, item.keywords)}
              </p>
              <div className="flex items-center gap-3 text-xs" style={{ color: '#64748b' }}>
                <span>效果评分 {item.effectScore}</span>
                <span>使用 {item.useCount.toLocaleString()} 次</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleFavorite(item.id)}
              className="p-2 rounded-md transition-colors hover:bg-white/5 shrink-0"
              style={{ color: item.isFavorite ? '#f59e0b' : '#64748b' }}
            >
              <Heart size={16} fill={item.isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={() => handleCopy(item.template, item.id)}
              className="p-2 rounded-md transition-colors hover:bg-white/5 shrink-0"
              style={{ color: '#00d4ff' }}
              title="复制"
            >
              {copiedId === item.id ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        );
      })}
    </div>
  );
};

const EmotionCurveSvg: React.FC<{ curve: number[]; color?: string }> = ({ curve, color = '#6366f1' }) => {
  const width = 200;
  const height = 80;
  const padding = 8;
  const points = curve.map((v: number, i: number) => {
    const x = padding + (i / (curve.length - 1)) * (width - padding * 2);
    const y = height - padding - (v / 100) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height: 80 }}>
      <defs>
        <linearGradient id="emoGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#emoGrad)" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {curve.map((v: number, i: number) => {
        const x = padding + (i / (curve.length - 1)) * (width - padding * 2);
        const y = height - padding - (v / 100) * (height - padding * 2);
        return (
          <circle key={i} cx={x} cy={y} r="3" fill={color} />
        );
      })}
    </svg>
  );
};

const EmotionCards: React.FC<{
  items: EmotionGene[];
  onToggleFavorite: (id: string) => void;
  onUse: (id: string) => void;
}> = ({ items, onToggleFavorite, onUse }) => (
  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
    {items.map((item: EmotionGene) => (
      <div
        key={item.id}
        className="rounded-xl p-5 transition-all duration-300 hover:-translate-y-1"
        style={{
          backgroundColor: '#121738',
          border: '1px solid #1e293b',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>
            {item.name}
          </h3>
          <button
            type="button"
            onClick={() => onToggleFavorite(item.id)}
            className="p-1.5 rounded-md transition-colors hover:bg-white/5"
            style={{ color: item.isFavorite ? '#f59e0b' : '#64748b' }}
          >
            <Heart size={16} fill={item.isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="mb-4 -mx-2">
          <EmotionCurveSvg curve={item.curve} color="#6366f1" />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.applicableTracks.map((track: string) => (
            <span
              key={track}
              className="px-2 py-0.5 rounded text-xs"
              style={{
                backgroundColor: 'rgba(99,102,241,0.1)',
                color: '#94a3b8',
              }}
            >
              {track}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StarRating score={item.effectScore} />
            <span className="text-xs" style={{ color: '#f59e0b' }}>{item.effectScore}分</span>
          </div>
          <span className="text-xs" style={{ color: '#64748b' }}>
            使用 {item.useCount.toLocaleString()}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onUse(item.id)}
          className="w-full py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
          style={{
            backgroundColor: 'rgba(0,212,255,0.15)',
            color: '#00d4ff',
            border: '1px solid rgba(0,212,255,0.3)',
          }}
        >
          预览曲线
        </button>
      </div>
    ))}
  </div>
);

const EditingCards: React.FC<{
  items: EditingGene[];
  onToggleFavorite: (id: string) => void;
  onUse: (id: string) => void;
}> = ({ items, onToggleFavorite, onUse }) => (
  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
    {items.map((item: EditingGene) => (
      <div
        key={item.id}
        className="rounded-xl p-5 transition-all duration-300 hover:-translate-y-1"
        style={{
          backgroundColor: '#121738',
          border: '1px solid #1e293b',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
            {item.name}
          </h3>
          <button
            type="button"
            onClick={() => onToggleFavorite(item.id)}
            className="p-1.5 rounded-md transition-colors hover:bg-white/5"
            style={{ color: item.isFavorite ? '#f59e0b' : '#64748b' }}
          >
            <Heart size={16} fill={item.isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div
            className="p-3 rounded-lg text-center"
            style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}
          >
            <div className="text-xs mb-1" style={{ color: '#64748b' }}>平均镜头时长</div>
            <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
              {item.avgShotDuration}
            </div>
          </div>
          <div
            className="p-3 rounded-lg text-center"
            style={{ backgroundColor: 'rgba(0,212,255,0.1)' }}
          >
            <div className="text-xs mb-1" style={{ color: '#64748b' }}>切镜频率</div>
            <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
              {item.cutFrequency}
            </div>
          </div>
          <div
            className="p-3 rounded-lg text-center"
            style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}
          >
            <div className="text-xs mb-1" style={{ color: '#64748b' }}>转场偏好</div>
            <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
              {item.transitionPreference}
            </div>
          </div>
        </div>

        <p className="text-sm mb-4 leading-relaxed" style={{ color: '#94a3b8' }}>
          适用场景：{item.scenario}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StarRating score={item.effectScore} />
            <span className="text-xs" style={{ color: '#f59e0b' }}>{item.effectScore}分</span>
          </div>
          <span className="text-xs" style={{ color: '#64748b' }}>
            使用 {item.useCount.toLocaleString()}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onUse(item.id)}
          className="w-full py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
          style={{
            backgroundColor: '#6366f1',
            color: '#fff',
          }}
        >
          应用参数
        </button>
      </div>
    ))}
  </div>
);

const TagCloud: React.FC<{
  items: TagGene[];
  onToggleFavorite: (id: string) => void;
  onUse: (id: string) => void;
}> = ({ items, onToggleFavorite, onUse }) => {
  const maxHeat = Math.max(...items.map((t: TagGene) => t.heatScore));
  const minHeat = Math.min(...items.map((t: TagGene) => t.heatScore));

  const getTagSize = (heat: number): number => {
    const ratio = (heat - minHeat) / Math.max(1, maxHeat - minHeat);
    return 12 + ratio * 14;
  };

  const getTagColor = (heat: number): string => {
    const ratio = (heat - minHeat) / Math.max(1, maxHeat - minHeat);
    if (ratio > 0.7) return '#ef4444';
    if (ratio > 0.4) return '#f59e0b';
    return '#94a3b8';
  };

  return (
    <div
      className="rounded-xl p-6 min-h-[300px] flex flex-wrap items-center justify-center gap-4 content-center"
      style={{
        backgroundColor: '#121738',
        border: '1px solid #1e293b',
      }}
    >
      {items.map((item: TagGene) => {
        const size = getTagSize(item.heatScore);
        const color = getTagColor(item.heatScore);
        return (
          <div
            key={item.id}
            className="relative group cursor-pointer transition-all hover:scale-110"
            onClick={() => onUse(item.id)}
          >
            <span
              className="font-medium transition-colors"
              style={{
                fontSize: size,
                color,
                textShadow: item.heatScore > 90 ? '0 0 10px rgba(239,68,68,0.4)' : 'none',
              }}
            >
              #{item.name}
            </span>
            <div
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                backgroundColor: '#1a2050',
                color: '#e2e8f0',
                border: '1px solid #1e293b',
              }}
            >
              使用 {item.useCount.toLocaleString()} · 热度 {item.heatScore}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.id);
              }}
              className="absolute -top-2 -right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                backgroundColor: '#1a2050',
                color: item.isFavorite ? '#f59e0b' : '#64748b',
                border: '1px solid #1e293b',
              }}
            >
              <Heart size={10} fill={item.isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

const BgmWaveform: React.FC<{ playing: boolean; color?: string }> = ({ playing, color = '#00d4ff' }) => {
  const bars = 20;
  return (
    <div className="flex items-end gap-0.5 h-8">
      {Array.from({ length: bars }).map((_, i: number) => {
        const height = playing
          ? 20 + Math.sin(i * 0.8 + Date.now() / 200) * 20 + Math.random() * 10
          : 8 + (i % 5) * 4;
        return (
          <div
            key={i}
            className="rounded-full transition-all duration-150"
            style={{
              width: 3,
              height: playing ? `${Math.max(8, Math.min(32, height))}px` : `${height}px`,
              backgroundColor: color,
              opacity: 0.7,
              animation: playing ? `wave 0.5s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
            }}
          />
        );
      })}
    </div>
  );
};

const BgmCards: React.FC<{
  items: BgmGene[];
  onToggleFavorite: (id: string) => void;
  onUse: (id: string) => void;
}> = ({ items, onToggleFavorite, onUse }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handlePlay = (id: string): void => {
    const newId = playingId === id ? null : id;
    setPlayingId(newId);
    if (newId) onUse(id);
  };

  const emotionColors: Record<string, string> = {
    激昂: '#ef4444',
    温馨: '#f59e0b',
    紧张: '#a855f7',
    治愈: '#10b981',
    欢快: '#00d4ff',
    伤感: '#64748b',
  };

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {items.map((item: BgmGene) => {
        const isPlaying = playingId === item.id;
        const emoColor = emotionColors[item.emotion] ?? '#6366f1';
        return (
          <div
            key={item.id}
            className="rounded-xl p-5 transition-all duration-300 hover:-translate-y-1"
            style={{
              backgroundColor: '#121738',
              border: '1px solid #1e293b',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <div className="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={() => handlePlay(item.id)}
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105"
                style={{
                  backgroundColor: isPlaying ? 'rgba(0,212,255,0.2)' : 'rgba(99,102,241,0.2)',
                  color: isPlaying ? '#00d4ff' : '#6366f1',
                  border: `2px solid ${isPlaying ? '#00d4ff' : '#6366f1'}`,
                }}
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>
              <div className="flex-1 min-w-0">
                <h3
                  className="text-sm font-semibold truncate mb-1"
                  style={{ color: '#e2e8f0' }}
                >
                  {item.name}
                </h3>
                <BgmWaveform playing={isPlaying} color={emoColor} />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span
                className="px-2 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: 'rgba(99,102,241,0.1)',
                  color: '#94a3b8',
                }}
              >
                {item.style}
              </span>
              <span
                className="px-2 py-0.5 rounded text-xs"
                style={{
                  backgroundColor: `${emoColor}20`,
                  color: emoColor,
                }}
              >
                {item.emotion}
              </span>
              <span className="text-xs ml-auto" style={{ color: '#64748b' }}>
                {item.duration}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#64748b' }}>
                使用 {item.useCount.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => onToggleFavorite(item.id)}
                className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                style={{ color: item.isFavorite ? '#f59e0b' : '#64748b' }}
              >
                <Heart size={16} fill={item.isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const GeneContent: React.FC<GeneContentProps> = ({
  category,
  searchQuery,
  sortBy,
  onlyFavorites,
  trackFilter,
  onToggleFavorite,
  onUse,
}) => {
  const q = searchQuery.toLowerCase().trim();

  function filterByFav<T extends { isFavorite: boolean }>(arr: T[]): T[] {
    return onlyFavorites ? arr.filter((it: T) => it.isFavorite) : arr;
  }

  function filterBySearch<T>(arr: T[], fields: (keyof T)[]): T[] {
    if (!q) return arr;
    return arr.filter((item: T) =>
      fields.some((f: keyof T) => {
        const val = item[f];
        if (Array.isArray(val)) {
          return val.some((v: unknown) => String(v).toLowerCase().includes(q));
        }
        return String(val ?? '').toLowerCase().includes(q);
      }),
    );
  }

  function sortItems<T extends { effectScore?: number; useCount?: number; heatScore?: number }>(
    arr: T[],
  ): T[] {
    const sorted = [...arr];
    switch (sortBy) {
      case 'effect':
        return sorted.sort((a: T, b: T) => (b.effectScore ?? b.heatScore ?? 0) - (a.effectScore ?? a.heatScore ?? 0));
      case 'useCount':
        return sorted.sort((a: T, b: T) => (b.useCount ?? 0) - (a.useCount ?? 0));
      case 'newest':
      default:
        return sorted;
    }
  }

  if (category === 'hook') {
    let items: HookGene[] = mockGeneData.hook;
    items = filterByFav(items);
    items = filterBySearch(items, ['content', 'type', 'example', 'sourceVideo']);
    if (trackFilter !== 'all') {
      items = items.filter((it: HookGene) => it.category === trackFilter);
    }
    items = sortItems(items);
    if (items.length === 0) return <EmptyState />;
    return (
      <HookCards
        items={items}
        onToggleFavorite={(id) => onToggleFavorite('hook', id)}
        onUse={(id) => onUse('hook', id)}
      />
    );
  }

  if (category === 'copy') {
    let items: CopyGene[] = mockGeneData.copy;
    items = filterByFav(items);
    items = filterBySearch(items, ['template', 'category']);
    items = sortItems(items);
    if (items.length === 0) return <EmptyState />;
    return (
      <CopyList
        items={items}
        onToggleFavorite={(id) => onToggleFavorite('copy', id)}
        onUse={(id) => onUse('copy', id)}
      />
    );
  }

  if (category === 'emotion') {
    let items: EmotionGene[] = mockGeneData.emotion;
    items = filterByFav(items);
    items = filterBySearch(items, ['name', 'category', 'applicableTracks']);
    if (trackFilter !== 'all') {
      items = items.filter((it: EmotionGene) => it.applicableTracks.includes(trackFilter));
    }
    items = sortItems(items);
    if (items.length === 0) return <EmptyState />;
    return (
      <EmotionCards
        items={items}
        onToggleFavorite={(id) => onToggleFavorite('emotion', id)}
        onUse={(id) => onUse('emotion', id)}
      />
    );
  }

  if (category === 'editing') {
    let items: EditingGene[] = mockGeneData.editing;
    items = filterByFav(items);
    items = filterBySearch(items, ['name', 'scenario', 'transitionPreference']);
    items = sortItems(items);
    if (items.length === 0) return <EmptyState />;
    return (
      <EditingCards
        items={items}
        onToggleFavorite={(id) => onToggleFavorite('editing', id)}
        onUse={(id) => onUse('editing', id)}
      />
    );
  }

  if (category === 'tag') {
    let items: TagGene[] = mockGeneData.tag;
    items = filterByFav(items);
    items = filterBySearch(items, ['name', 'category']);
    if (trackFilter !== 'all') {
      items = items.filter((it: TagGene) => it.category === trackFilter);
    }
    items = [...items].sort((a: TagGene, b: TagGene) => b.heatScore - a.heatScore);
    if (items.length === 0) return <EmptyState />;
    return (
      <TagCloud
        items={items}
        onToggleFavorite={(id) => onToggleFavorite('tag', id)}
        onUse={(id) => onUse('tag', id)}
      />
    );
  }

  // bgm
  let items: BgmGene[] = mockGeneData.bgm;
  items = filterByFav(items);
  items = filterBySearch(items, ['name', 'style', 'emotion']);
  if (trackFilter !== 'all') {
    items = items.filter((it: BgmGene) => it.style.includes(trackFilter));
  }
  items = sortItems(items);
  if (items.length === 0) return <EmptyState />;
  return (
    <BgmCards
      items={items}
      onToggleFavorite={(id) => onToggleFavorite('bgm', id)}
      onUse={(id) => onUse('bgm', id)}
    />
  );
};

const EmptyState: React.FC = () => (
  <div
    className="flex flex-col items-center justify-center py-20 rounded-xl"
    style={{ backgroundColor: '#121738', border: '1px solid #1e293b' }}
  >
    <ExternalLink size={28} style={{ color: '#6366f1', marginBottom: 16 }} />
    <h2 className="text-lg font-semibold mb-2" style={{ color: '#e2e8f0' }}>
      暂无匹配内容
    </h2>
    <p className="text-sm" style={{ color: '#64748b' }}>
      试试调整筛选条件或搜索关键词
    </p>
  </div>
);

export default GeneContent;
