import React, { useRef, useState, useEffect } from 'react';
import { Search, TrendingUp, Hash, User, Filter, Loader2, Zap } from 'lucide-react';
import type { SuggestItem } from '@shared/api.interface';
import { getSuggest } from '@client/src/api/douyin';
import { logger } from '@lark-apaas/client-toolkit/logger';
import SelectField from './SelectField';

export type SearchMode = 'keyword' | 'topic' | 'account' | 'hot';

interface SearchConfigCardProps {
  searchMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  keyword: string;
  onKeywordChange: (kw: string) => void;
  sortType: string;
  onSortChange: (v: string) => void;
  timeFilter: string;
  onTimeChange: (v: string) => void;
  durationFilter: string;
  onDurationChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  count: number;
  onCountChange: (n: number) => void;
  loading: boolean;
  progress: number;
  onSearch: (autoAnalyze?: boolean) => void;
  onExpandSidebar: () => void;
  onOneClickViral?: () => void;
}

const sortOptions = [
  { value: '0', label: '综合排序' },
  { value: '1', label: '最多点赞' },
  { value: '2', label: '最新发布' },
  { value: '3', label: '最多评论' },
  { value: '4', label: '最多收藏' },
];

const timeOptions = [
  { value: '0', label: '不限' },
  { value: '1', label: '1天内' },
  { value: '7', label: '1周内' },
  { value: '30', label: '1月内' },
  { value: '180', label: '半年内' },
];

const durationOptions = [
  { value: '0', label: '不限' },
  { value: '15', label: '<15秒' },
  { value: '30', label: '15-30秒' },
  { value: '60', label: '30-60秒' },
  { value: '180', label: '1-3分钟' },
  { value: '999', label: '>3分钟' },
];

const categoryOptions = [
  { value: '', label: '全部赛道' },
  { value: '搞笑', label: '搞笑' },
  { value: '知识', label: '知识' },
  { value: '美食', label: '美食' },
  { value: '美妆', label: '美妆' },
  { value: '穿搭', label: '穿搭' },
  { value: '游戏', label: '游戏' },
  { value: '音乐', label: '音乐' },
  { value: '影视', label: '影视' },
  { value: '科技', label: '科技' },
  { value: '情感', label: '情感' },
  { value: '母婴', label: '母婴' },
  { value: '教育', label: '教育' },
  { value: '职场', label: '职场' },
];

const SearchConfigCard: React.FC<SearchConfigCardProps> = ({
  searchMode,
  onModeChange,
  keyword,
  onKeywordChange,
  sortType,
  onSortChange,
  timeFilter,
  onTimeChange,
  durationFilter,
  onDurationChange,
  category,
  onCategoryChange,
  count,
  onCountChange,
  loading,
  progress,
  onSearch,
  onExpandSidebar,
  onOneClickViral,
}) => {
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (keyword.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const data = await getSuggest(keyword);
        setSuggestions(data);
      } catch (err) {
        logger.error('获取建议失败', err as Error);
      }
    }, 300);
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, [keyword]);

  const modeTabs: { key: SearchMode; label: string; icon: React.ReactNode }[] = [
    { key: 'keyword', label: '关键词搜索', icon: <Search size={16} /> },
    { key: 'topic', label: '话题搜索', icon: <Hash size={16} /> },
    { key: 'account', label: '账号搜索', icon: <User size={16} /> },
    { key: 'hot', label: '热榜追踪', icon: <TrendingUp size={16} /> },
  ];

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 flex-shrink-0"
      style={{ backgroundColor: '#121738', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
    >
      {/* Mode tabs */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg w-fit"
        style={{ backgroundColor: '#0a0e27' }}
      >
        {modeTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onModeChange(tab.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all"
            style={{
              backgroundColor: searchMode === tab.key ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: searchMode === tab.key ? '#00d4ff' : '#94a3b8',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hot mode hint */}
      {searchMode === 'hot' && (
        <div
          className="px-4 py-3 rounded-lg flex items-center justify-between"
          style={{ backgroundColor: '#0a0e27', border: '1px solid #1e293b' }}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} style={{ color: '#ef4444' }} />
            <span className="text-sm" style={{ color: '#94a3b8' }}>
              热榜追踪模式 · 查看右侧热榜，点击热词可自动搜索
            </span>
          </div>
          <button
            onClick={onExpandSidebar}
            className="text-xs px-3 py-1 rounded-md transition-all"
            style={{ backgroundColor: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}
          >
            展开热榜
          </button>
        </div>
      )}

      {/* Keyword mode */}
      {searchMode === 'keyword' && (
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#64748b' }}
              />
              <input
                ref={inputRef}
                type="text"
                value={keyword}
                onChange={(e) => {
                  onKeywordChange(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSearch(false);
                }}
                placeholder="输入关键词，如：美食探店、健身打卡..."
                className="w-full pl-12 pr-4 py-3.5 rounded-lg text-base outline-none transition-all"
                style={{
                  backgroundColor: '#0a0e27',
                  border: '1px solid #1e293b',
                  color: '#e2e8f0',
                }}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-30"
                  style={{
                    backgroundColor: '#121738',
                    border: '1px solid #1e293b',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                  }}
                >
                  {suggestions.slice(0, 8).map((s, idx) => (
                    <div
                      key={idx}
                      onMouseDown={() => {
                        onKeywordChange(s.keyword);
                        onSearch(false);
                      }}
                      className="px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2"
                      style={{ color: '#94a3b8' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#1a2050';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Search size={14} style={{ color: '#64748b' }} />
                      {s.keyword}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => onSearch(false)}
              disabled={loading || !keyword.trim()}
              className="px-6 py-3.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              style={{
                background: loading
                  ? '#1a2050'
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(99,102,241,0.3)',
                cursor: loading || !keyword.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              开始搜索
            </button>
             {onOneClickViral && (
               <button
                 onClick={onOneClickViral}
                 disabled={loading || !keyword.trim()}
                 className="px-7 py-3.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 hover:scale-105"
                 style={{
                   background: loading
                     ? '#1a2050'
                     : 'linear-gradient(135deg, #00d4ff 0%, #06b6d4 100%)',
                   color: '#0a0e27',
                   boxShadow: loading
                     ? 'none'
                     : '0 6px 20px rgba(0,212,255,0.45)',
                   cursor: loading || !keyword.trim() ? 'not-allowed' : 'pointer',
                 }}
               >
                 <Zap size={18} fill="#0a0e27" />
                 一键爆款
               </button>
             )}
           </div>
        </div>
      )}

      {(searchMode === 'topic' || searchMode === 'account') && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder={
                searchMode === 'topic'
                  ? '输入话题名称，如：#美食探店...'
                  : '输入账号昵称或ID...'
              }
              className="w-full px-4 py-3.5 rounded-lg text-base outline-none"
              style={{ backgroundColor: '#0a0e27', border: '1px solid #1e293b', color: '#e2e8f0' }}
            />
          </div>
          <button
            onClick={() => onSearch(false)}
            disabled={loading || !keyword.trim()}
            className="px-6 py-3.5 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              cursor: loading || !keyword.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            开始搜索
          </button>
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm" style={{ color: '#64748b' }}>
          <Filter size={14} />
          <span>筛选：</span>
        </div>
        <SelectField value={sortType} onChange={onSortChange} options={sortOptions} />
        <SelectField value={timeFilter} onChange={onTimeChange} options={timeOptions} />
        <SelectField
          value={durationFilter}
          onChange={onDurationChange}
          options={durationOptions}
        />
        <SelectField value={category} onChange={onCategoryChange} options={categoryOptions} />
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: '#64748b' }}>数量：</span>
          <input
            type="number"
            value={count}
            onChange={(e) => onCountChange(Number(e.target.value))}
            min={1}
            max={100}
            className="w-20 px-3 py-1.5 rounded-lg text-sm outline-none text-center"
            style={{ backgroundColor: '#0a0e27', border: '1px solid #1e293b', color: '#e2e8f0' }}
          />
        </div>
      </div>

      {/* Progress bar */}
      {loading && (
        <div
          className="w-full h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: '#1e293b' }}
        >
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366f1 0%, #00d4ff 100%)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SearchConfigCard;
