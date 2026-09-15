import React from 'react';
import { TrendingUp, Play, Loader2 } from 'lucide-react';
import type { HotSearchItem } from '@shared/api.interface';

interface HotSearchSectionProps {
  hotList: HotSearchItem[];
  onHotClick: (word: string) => void;
  getRankColor: (pos: number) => string;
}

const HotSearchSection: React.FC<HotSearchSectionProps> = ({ hotList, onHotClick, getRankColor }) => {
  const formatHot = (v: number): string => {
    if (v >= 10000) return (v / 10000).toFixed(1) + '万';
    return String(v);
  };

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ backgroundColor: '#121738', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} style={{ color: '#ef4444' }} />
          <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
            抖音热榜 Top 50
          </h2>
          <span
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
          >
            HOT
          </span>
        </div>
        <div className="text-sm" style={{ color: '#64748b' }}>
          共 {hotList.length} 个热词 · 点击可搜索
        </div>
      </div>

      {hotList.length === 0 ? (
        <div className="py-12 text-center">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" style={{ color: '#6366f1' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>热榜加载中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {hotList.map((item) => (
            <div
              key={item.position}
              onClick={() => onHotClick(item.word)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group"
              style={{ backgroundColor: '#0a0e27' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1a2050';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0a0e27';
              }}
            >
              <span
                className="w-6 text-center font-bold text-sm flex-shrink-0"
                style={{ color: getRankColor(item.position) }}
              >
                {item.position}
              </span>
              <span
                className="flex-1 text-sm truncate group-hover:text-white transition-colors"
                style={{ color: '#e2e8f0' }}
              >
                {item.word}
              </span>
              <span className="text-xs flex-shrink-0" style={{ color: '#64748b' }}>
                {formatHot(item.hotValue)}
              </span>
              <Play
                size={12}
                style={{ color: '#6366f1', opacity: 0 }}
                className="group-hover:opacity-100 transition-opacity"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HotSearchSection;
