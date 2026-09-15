import React, { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { useNavigate } from 'react-router-dom';
import { getHotSearch, searchVideos, listVideos } from '@client/src/api/douyin';
import { batchAnalyze } from '@client/src/api/analyze';
import { startPipeline, getPipelineStatus } from '@client/src/api/auto';
import type { HotSearchItem, VideoRecord, PipelineStatus } from '@shared/api.interface';
import SearchConfigCard, { type SearchMode } from './SearchConfigCard';
import HotSearchSidebar from './HotSearchSidebar';
import ResultsSection from './ResultsSection';
import VideoPlayerModal from './VideoPlayerModal';
import PipelineProgressModal from './PipelineProgressModal';

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState<SearchMode>('keyword');
  const [keyword, setKeyword] = useState('');
  const [sortType, setSortType] = useState('0');
  const [timeFilter, setTimeFilter] = useState('0');
  const [durationFilter, setDurationFilter] = useState('0');
  const [category, setCategory] = useState('');
  const [count, setCount] = useState(20);

  const [hotList, setHotList] = useState<HotSearchItem[]>([]);
  const [refreshingHot, setRefreshingHot] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [results, setResults] = useState<VideoRecord[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchProgress, setSearchProgress] = useState(0);
  const [isFallback, setIsFallback] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [playingVideo, setPlayingVideo] = useState<VideoRecord | null>(null);

  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);

  const loadDefaultVideos = useCallback(async (): Promise<void> => {
    try {
      const data = await listVideos({ page: 1, pageSize: 15, sortBy: 'digg' });
      setResults(data.items);
      setTotalVideos(data.total);
      setKeyword('');
      setIsFallback(false);
      setSearchMessage('');
    } catch (err) {
      logger.error('加载默认视频失败', err as Error);
    }
  }, []);

  const loadHot = useCallback(async (): Promise<void> => {
    try {
      setRefreshingHot(true);
      const data = await getHotSearch();
      setHotList(data);
    } catch (err) {
      logger.error('加载热榜失败', err as Error);
    } finally {
      setRefreshingHot(false);
    }
  }, []);

  useEffect(() => {
    void loadHot();
    void loadDefaultVideos();
  }, [loadHot, loadDefaultVideos]);

  const handleSearch = useCallback(
    async (autoAnalyze = false): Promise<void> => {
      const trimmed = keyword.trim();
      if (!trimmed) return;
      setLoading(true);
      setSearchProgress(0);
      setSelectedIds(new Set());
      setIsFallback(false);
      setSearchMessage('');

      const progressTimer = setInterval(() => {
        setSearchProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);

      try {
        const data = await searchVideos(trimmed, count, sortType);
        setResults(data.items);
        setIsFallback(data.isFallback ?? false);
        setSearchMessage(data.message ?? '');
        setSearchProgress(100);

        if (autoAnalyze && data.items.length > 0) {
          const ids = data.items.slice(0, 10).map((v) => v.id);
          try {
            await batchAnalyze(ids);
            navigate('/analyze');
            return;
          } catch (err) {
            logger.error('自动拆解失败', err as Error);
          }
        }
      } catch (err) {
        logger.error('搜索失败', err as Error);
      } finally {
        clearInterval(progressTimer);
        setTimeout(() => {
          setLoading(false);
          setSearchProgress(0);
        }, 300);
      }
    },
    [keyword, count, sortType, navigate],
  );

  const handleHotClick = useCallback(
    (word: string): void => {
      setKeyword(word);
      setSearchMode('keyword');
      setLoading(true);
      setSearchProgress(0);
      setSelectedIds(new Set());
      setIsFallback(false);
      setSearchMessage('');

      const progressTimer = setInterval(() => {
        setSearchProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 15));
      }, 200);

      void searchVideos(word, count, sortType)
        .then((data) => {
          setResults(data.items);
          setIsFallback(data.isFallback ?? false);
          setSearchMessage(data.message ?? '');
          setSearchProgress(100);
        })
        .catch((err: Error) => {
          logger.error('热词搜索失败', err);
        })
        .finally(() => {
          clearInterval(progressTimer);
          setTimeout(() => {
            setLoading(false);
            setSearchProgress(0);
          }, 300);
        });
    },
    [count, sortType],
  );

  const toggleSelect = useCallback((id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((): void => {
    if (selectedIds.size === results.length && results.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((v) => v.id)));
    }
  }, [results, selectedIds.size]);

  const sortByEngagement = useCallback((): void => {
    setResults((prev) =>
      [...prev].sort((a, b) => {
        const engA = a.diggCount + a.commentCount * 3 + a.shareCount * 5 + a.collectCount * 2;
        const engB = b.diggCount + b.commentCount * 3 + b.shareCount * 5 + b.collectCount * 2;
        return engB - engA;
      }),
    );
  }, []);

  const autoSelectTop10 = useCallback((): void => {
    const top10 = results.slice(0, 10).map((v) => v.id);
    setSelectedIds(new Set(top10));
  }, [results]);

  const handleBatchAnalyze = useCallback(async (): Promise<void> => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      await batchAnalyze(ids);
      navigate('/analyze');
    } catch (err) {
      logger.error('批量拆解失败', err as Error);
    }
  }, [selectedIds, navigate]);

  const handleOneClickViral = useCallback(async (): Promise<void> => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    try {
      const { taskId } = await startPipeline(trimmed);
      setPipelineStatus(null);
      setPipelineModalOpen(true);

      const poll = setInterval(async () => {
        try {
          const status = await getPipelineStatus(taskId);
          setPipelineStatus(status);
          if (status.stage === 'done' || status.stage === 'failed') {
            clearInterval(poll);
          }
        } catch (err) {
          logger.error('轮询流水线状态失败', err as Error);
        }
      }, 1500);
    } catch (err) {
      logger.error('启动一键爆款失败', err as Error);
    }
  }, [keyword]);

  const handleGoToScript = useCallback(
    (scriptId: string): void => {
      setPipelineModalOpen(false);
      navigate(`/script/${scriptId}`);
    },
    [navigate],
  );

  const getRankColor = (pos: number): string => {
    if (pos === 1) return '#ef4444';
    if (pos === 2) return '#f97316';
    if (pos === 3) return '#fbbf24';
    return '#64748b';
  };

  const hasResults = results.length > 0;

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: '#0a0e27', padding: '24px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold leading-tight mb-1" style={{ color: '#00d4ff' }}>
            爆款搜索台
          </h1>
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            输入关键词，一键抓取抖音爆款视频，挖掘流量密码
          </p>
        </div>
        <div
          className="px-3 py-1.5 rounded-lg text-sm"
          style={{ backgroundColor: '#121738', color: '#94a3b8' }}
        >
           {keyword.trim() ? (
             <>
               搜索结果：<span style={{ color: '#00d4ff' }}>{results.length}</span> 条
             </>
           ) : (
             <>
               共收录 <span style={{ color: '#00d4ff' }}>{totalVideos}</span> 条爆款视频
             </>
           )}
        </div>
      </div>

      <SearchConfigCard
        searchMode={searchMode}
        onModeChange={setSearchMode}
        keyword={keyword}
        onKeywordChange={setKeyword}
        sortType={sortType}
        onSortChange={setSortType}
        timeFilter={timeFilter}
        onTimeChange={setTimeFilter}
        durationFilter={durationFilter}
        onDurationChange={setDurationFilter}
        category={category}
        onCategoryChange={setCategory}
        count={count}
        onCountChange={setCount}
        loading={loading}
        progress={searchProgress}
        onSearch={handleSearch}
        onOneClickViral={handleOneClickViral}
        onExpandSidebar={() => setSidebarCollapsed(false)}
      />

      {/* Main content + sidebar */}
      <div className="flex-1 min-h-0 mt-6 flex gap-4 relative">
         {/* Main area */}
         <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
           {isFallback && searchMessage && (
             <div
               className="mb-4 flex items-center gap-2 flex-shrink-0"
               style={{
                 backgroundColor: 'rgba(245,158,11,0.15)',
                 border: '1px solid rgba(245,158,11,0.3)',
                 borderRadius: '8px',
                 padding: '12px 16px',
               }}
             >
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                 <line x1="12" y1="9" x2="12" y2="13" />
                 <line x1="12" y1="17" x2="12.01" y2="17" />
               </svg>
               <span className="text-sm" style={{ color: '#fbbf24' }}>
                 {searchMessage}
               </span>
             </div>
           )}
           {hasResults ? (
             <ResultsSection
              results={results}
              loading={loading}
              progress={searchProgress}
              selectedIds={selectedIds}
              onToggle={toggleSelect}
              onToggleAll={toggleSelectAll}
              onSortByEngagement={sortByEngagement}
              onAutoSelectTop10={autoSelectTop10}
               onBatchAnalyze={handleBatchAnalyze}
               onPlay={(video: VideoRecord) => setPlayingVideo(video)}
             />
          ) : (
            <EmptyState mode={searchMode} />
          )}
        </div>

        {/* Hot search sidebar */}
        <HotSearchSidebar
          hotList={hotList}
          onHotClick={handleHotClick}
          getRankColor={getRankColor}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          onRefresh={() => void loadHot()}
          refreshing={refreshingHot}
        />
      </div>

      <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />
      <PipelineProgressModal
        isOpen={pipelineModalOpen}
        status={pipelineStatus}
        onClose={() => setPipelineModalOpen(false)}
        onGoToScript={handleGoToScript}
      />
    </div>
  );
};

const EmptyState: React.FC<{ mode: SearchMode }> = ({ mode }) => {
  const isHot = mode === 'hot';
  const Icon = isHot ? TrendingUp : Search;
  return (
    <div
      className="flex-1 flex items-center justify-center rounded-xl"
      style={{ backgroundColor: '#121738' }}
    >
      <div className="text-center">
        <Icon
          size={36}
          className="mx-auto mb-3"
          style={{ color: isHot ? '#ef4444' : '#64748b', opacity: 0.5 }}
        />
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          {isHot ? '展开右侧热榜查看热门话题' : '输入关键词开始搜索爆款视频'}
        </p>
        <p className="text-xs mt-1" style={{ color: '#475569' }}>
          {isHot ? '点击热词可直接搜索' : '支持关键词、话题、账号多种搜索方式'}
        </p>
      </div>
    </div>
  );
};

export default SearchPage;
