import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  MessageSquare,
  Activity,
  Scissors,
  Hash,
  Music,
  Library,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import GeneContent from './GeneContent';
import { mockGeneData, type GeneCategory } from './mockGenes';
import {
  listGenes,
  toggleFavorite as apiToggleFavorite,
  incrementUse as apiIncrementUse,
} from '@client/src/api/gene';

interface CategoryItem {
  key: GeneCategory;
  label: string;
  icon: React.ReactNode;
  count: number;
}

const categoryItems: CategoryItem[] = [
  { key: 'hook', label: '钩子模板', icon: <Sparkles size={18} />, count: 12 },
  { key: 'copy', label: '文案句式', icon: <MessageSquare size={18} />, count: 12 },
  { key: 'emotion', label: '情绪曲线', icon: <Activity size={18} />, count: 6 },
  { key: 'editing', label: '剪辑节奏', icon: <Scissors size={18} />, count: 4 },
  { key: 'tag', label: '话题标签', icon: <Hash size={18} />, count: 20 },
  { key: 'bgm', label: 'BGM库', icon: <Music size={18} />, count: 12 },
];

const GenePage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<GeneCategory>('hook');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('effect');
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((val: string): void => {
    setSearchQuery(val);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setDebouncedSearch(val);
    }, 300);
  }, []);

  // Fetch gene data (mock data as fallback)
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setLoading(true);
      try {
        const apiSort = sortBy === 'favorite' ? 'effect' : sortBy as 'effect' | 'useCount' | 'createdAt';
        await listGenes(activeCategory, 1, 50, apiSort);
      } catch (err) {
        logger.error('加载基因数据失败，使用本地mock', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeCategory, sortBy]);

  const handleToggleFavorite = useCallback((cat: GeneCategory, id: string): void => {
    const items: { isFavorite: boolean; id: string }[] = (
      mockGeneData[cat] as unknown as { isFavorite: boolean; id: string }[]
    );
    const item = items.find((it) => it.id === id);
    if (!item) return;
    const wasFav = item.isFavorite;
    item.isFavorite = !wasFav;

    apiToggleFavorite(id).catch((err: unknown) => {
      logger.error('收藏操作失败', err);
      item.isFavorite = wasFav;
      toast.error('操作失败，请重试');
    });
  }, []);

  const handleUse = useCallback((cat: GeneCategory, id: string): void => {
    const items: { useCount: number; id: string }[] = (
      mockGeneData[cat] as unknown as { useCount: number; id: string }[]
    );
    const item = items.find((it) => it.id === id);
    if (!item) return;
    item.useCount += 1;

    apiIncrementUse(id).catch((err: unknown) => {
      logger.error('增加使用次数失败', err);
      item.useCount -= 1;
    });
  }, []);

  // Re-render trigger for content when mutation happens
  const [, setTick] = useState<number>(0);
  const forceUpdate = useCallback((): void => setTick((t: number) => t + 1), []);

  const handleToggleFavWithUpdate = useCallback((cat: GeneCategory, id: string): void => {
    handleToggleFavorite(cat, id);
    forceUpdate();
  }, [handleToggleFavorite, forceUpdate]);

  const handleUseWithUpdate = useCallback((cat: GeneCategory, id: string): void => {
    handleUse(cat, id);
    forceUpdate();
  }, [handleUse, forceUpdate]);

  const totalCount = categoryItems.reduce((sum: number, c: CategoryItem) => sum + c.count, 0);

  return (
    <div className="flex min-h-full" style={{ backgroundColor: '#0a0e27' }}>
      {/* Left sidebar */}
      <aside
        className="shrink-0 py-6 pl-6 pr-3"
        style={{
          width: 220,
          borderRight: '1px solid #1e293b',
        }}
      >
        <div className="mb-6 pr-3">
          <h1 className="text-xl font-semibold leading-tight mb-1" style={{ color: '#00d4ff' }}>
            爆款基因库
          </h1>
          <p className="text-xs" style={{ color: '#64748b' }}>
            共 {totalCount} 条基因元素
          </p>
        </div>

        <nav className="space-y-1">
          {categoryItems.map((item: CategoryItem) => {
            const isActive = activeCategory === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveCategory(item.key)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all relative"
                style={{
                  color: isActive ? '#fff' : '#94a3b8',
                  backgroundColor: isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                  cursor: 'pointer',
                }}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full"
                    style={{ height: 24, backgroundColor: '#00d4ff' }}
                  />
                )}
                <span style={{ color: isActive ? '#00d4ff' : '#6366f1' }}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: isActive ? 'rgba(0,212,255,0.2)' : 'rgba(148,163,184,0.1)',
                    color: isActive ? '#00d4ff' : '#64748b',
                  }}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </nav>

        <div
          className="mt-8 p-4 rounded-xl"
          style={{
            backgroundColor: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <Library size={20} style={{ color: '#6366f1', marginBottom: 8 }} />
          <p className="text-xs font-medium mb-1" style={{ color: '#e2e8f0' }}>
            AI基因提取
          </p>
          <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
            上传爆款视频，AI自动提取爆款基因元素
          </p>
        </div>
      </aside>

      {/* Right content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Toolbar */}
        <div
          className="flex items-center justify-between gap-4 mb-6 p-4 rounded-xl flex-wrap"
          style={{ backgroundColor: '#121738', border: '1px solid #1e293b' }}
        >
          <div
            className="relative flex items-center h-9 px-3 rounded-lg flex-1 max-w-md"
            style={{
              backgroundColor: '#0a0e27',
              border: '1px solid #1e293b',
            }}
          >
            <Search size={16} style={{ color: '#64748b' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="搜索基因内容..."
              className="w-full bg-transparent outline-none text-sm ml-2"
              style={{ color: '#e2e8f0' }}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Track filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs shrink-0" style={{ color: '#64748b' }}>赛道</span>
              <select
                value={trackFilter}
                onChange={(e) => setTrackFilter(e.target.value)}
                className="h-8 px-3 rounded-lg text-sm outline-none appearance-none cursor-pointer"
                style={{
                  backgroundColor: '#0a0e27',
                  color: '#e2e8f0',
                  border: '1px solid #1e293b',
                }}
              >
                <option value="all">全部</option>
                <option value="搞笑">搞笑</option>
                <option value="知识">知识</option>
                <option value="美食">美食</option>
                <option value="美妆">美妆</option>
                <option value="穿搭">穿搭</option>
                <option value="游戏">游戏</option>
                <option value="科技">科技</option>
                <option value="情感">情感</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-xs shrink-0" style={{ color: '#64748b' }}>排序</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-8 px-3 rounded-lg text-sm outline-none appearance-none cursor-pointer"
                style={{
                  backgroundColor: '#0a0e27',
                  color: '#e2e8f0',
                  border: '1px solid #1e293b',
                }}
              >
                <option value="effect">效果评分</option>
                <option value="useCount">使用次数</option>
                <option value="favorite">收藏数</option>
                <option value="newest">最新</option>
              </select>
            </div>

            {/* Only favorites toggle */}
            <button
              type="button"
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className="flex items-center gap-2 h-8 px-3 rounded-lg text-xs transition-colors"
              style={{
                backgroundColor: onlyFavorites ? 'rgba(245,158,11,0.15)' : '#0a0e27',
                color: onlyFavorites ? '#f59e0b' : '#94a3b8',
                border: onlyFavorites
                  ? '1px solid rgba(245,158,11,0.3)'
                  : '1px solid #1e293b',
              }}
            >
              <Sparkles size={14} />
              只看收藏
            </button>
          </div>
        </div>

        {/* Category title */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
            {categoryItems.find((c: CategoryItem) => c.key === activeCategory)?.label ?? ''}
          </h2>
        </div>

        {/* Content area */}
        {loading ? (
          <div
            className="flex items-center justify-center py-20 rounded-xl"
            style={{ backgroundColor: '#121738', border: '1px solid #1e293b', color: '#64748b' }}
          >
            加载中...
          </div>
        ) : (
          <GeneContent
            category={activeCategory}
            searchQuery={debouncedSearch}
            sortBy={sortBy}
            onlyFavorites={onlyFavorites}
            trackFilter={trackFilter}
            onToggleFavorite={handleToggleFavWithUpdate}
            onUse={handleUseWithUpdate}
          />
        )}
      </div>
    </div>
  );
};

export default GenePage;
