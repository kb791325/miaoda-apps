import React from 'react';
import { TrendingUp, RefreshCw, ChevronRight, ChevronLeft } from 'lucide-react';
import type { HotSearchItem } from '@shared/api.interface';

interface HotSearchSidebarProps {
  hotList: HotSearchItem[];
  onHotClick: (word: string) => void;
  getRankColor: (pos: number) => string;
  collapsed: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const HotSearchSidebar: React.FC<HotSearchSidebarProps> = ({
  hotList,
  onHotClick,
  getRankColor,
  collapsed,
  onToggle,
  onRefresh,
  refreshing,
}) => {
  const formatHot = (v: number): string => {
    if (v >= 10000) return (v / 10000).toFixed(1) + '万';
    return String(v);
  };

  return (
    <aside
      className="flex-shrink-0 h-full transition-all duration-300"
      style={{ width: collapsed ? 0 : 280 }}
    >
      <div
        className="h-full flex flex-col rounded-xl overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: '#121738',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          opacity: collapsed ? 0 : 1,
          marginLeft: collapsed ? 0 : 0,
          visibility: collapsed ? 'hidden' : 'visible',
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} style={{ color: '#ef4444' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
              抖音热榜
            </h3>
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-md transition-all hover:opacity-80"
            style={{ color: '#64748b' }}
            title="刷新热榜"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 hot-list-scroll">
          {hotList.length === 0 ? (
            <div className="py-8 text-center">
              <RefreshCw size={18} className="animate-spin mx-auto mb-2" style={{ color: '#6366f1' }} />
              <p className="text-xs" style={{ color: '#64748b' }}>热榜加载中...</p>
            </div>
          ) : (
            hotList.map((item) => (
              <div
                key={item.position}
                onClick={() => onHotClick(item.word)}
                className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-all group"
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1a2050'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span
                  className="w-5 text-center font-bold text-xs flex-shrink-0"
                  style={{ color: getRankColor(item.position) }}
                >
                  {item.position}
                </span>
                <span
                  className="flex-1 text-xs truncate transition-colors"
                  style={{ color: '#e2e8f0' }}
                >
                  {item.word}
                </span>
                <span className="text-xs flex-shrink-0" style={{ color: '#64748b' }}>
                  {formatHot(item.hotValue)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={onToggle}
        className="absolute top-1/2 -translate-y-1/2 z-10 w-5 h-10 rounded-l-lg flex items-center justify-center transition-all hover:opacity-80"
        style={{
          right: collapsed ? 0 : 280,
          backgroundColor: '#121738',
          color: '#64748b',
          border: '1px solid #1e293b',
          borderRight: 'none',
        }}
      >
        {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </aside>
  );
};

export default HotSearchSidebar;
