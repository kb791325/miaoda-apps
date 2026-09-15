import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutGrid,
  List,
  ChevronRight,
  FolderKanban,
  Video,
  FileText,
  Clapperboard,
  Search as SearchIcon,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import ProjectGridCard from './ProjectGridCard';
import ProjectListView from './ProjectListView';
import { Pagination, Skeleton, EmptyState } from './ProjectUI';
import { generateMockProjects, type ProjectTypeExt } from './mockProjects';
import {
  listProjects,
  toggleFavorite as apiToggleFavorite,
  deleteProject as apiDeleteProject,
  copyProject as apiCopyProject,
  type ProjectItem,
} from '@client/src/api/project';
import { showConfirm } from '@lark-apaas/client-toolkit';

type ProjectType = 'all' | ProjectTypeExt;
type ViewMode = 'grid' | 'list';

const typeTabs: { key: ProjectType; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'all', label: '全部', icon: <FolderKanban size={16} />, color: '#6366f1' },
  { key: 'search', label: '搜索任务', icon: <SearchIcon size={16} />, color: '#3b82f6' },
  { key: 'video', label: '视频拆解', icon: <Video size={16} />, color: '#a855f7' },
  { key: 'script', label: '脚本项目', icon: <FileText size={16} />, color: '#00d4ff' },
  { key: 'production', label: '视频制作', icon: <Clapperboard size={16} />, color: '#10b981' },
];

const routeMap: Record<string, string> = {
  search: '/',
  video: '/analyze',
  script: '/script',
  production: '/produce',
};

const PAGE_SIZE = 12;

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, onChange, options }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs shrink-0" style={{ color: '#64748b' }}>{label}</span>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 pl-3 pr-7 rounded-lg text-sm outline-none appearance-none cursor-pointer"
        style={{
          backgroundColor: '#0a0e27',
          color: '#e2e8f0',
          border: '1px solid #1e293b',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronRight
        size={14}
        className="absolute right-2 top-1/2 pointer-events-none"
        style={{
          color: '#64748b',
          transform: 'translateY(-50%) rotate(90deg)',
        }}
      />
    </div>
  </div>
);

const ProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<ProjectType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [category, setCategory] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [items, setItems] = useState<ProjectItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((val: string): void => {
    setSearchQuery(val);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 300);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isWithinTime = (dateStr: string): boolean => {
    if (timeFilter === 'all') return true;
    const d = new Date(dateStr).getTime();
    const now = Date.now();
    const dayMs = 86400000;
    switch (timeFilter) {
      case 'today':
        return now - d < dayMs;
      case 'week':
        return now - d < 7 * dayMs;
      case 'month':
        return now - d < 30 * dayMs;
      case 'year':
        return now - d < 365 * dayMs;
      default:
        return true;
    }
  };

  const applyClientFilters = (all: ProjectItem[]): ProjectItem[] => {
    let filtered: ProjectItem[] = all;
    if (category !== 'all') {
      filtered = filtered.filter((it: ProjectItem) => it.category === category);
    }
    if (gradeFilter !== 'all') {
      filtered = filtered.filter((it: ProjectItem) => {
        const grade = typeof it.gradeOrScore === 'string' ? it.gradeOrScore : '';
        return grade === gradeFilter;
      });
    }
    filtered = filtered.filter((it: ProjectItem) => isWithinTime(it.createdAt));
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter((it: ProjectItem) =>
        it.title.toLowerCase().includes(q),
      );
    }
    if (sortBy === 'score') {
      filtered = [...filtered].sort((a: ProjectItem, b: ProjectItem) => {
        const sa = typeof a.gradeOrScore === 'number' ? a.gradeOrScore : 0;
        const sb = typeof b.gradeOrScore === 'number' ? b.gradeOrScore : 0;
        return sb - sa;
      });
    } else if (sortBy === 'favorite') {
      filtered = [...filtered].sort(
        (a: ProjectItem, b: ProjectItem) =>
          Number(b.isFavorite ?? false) - Number(a.isFavorite ?? false),
      );
    } else {
      filtered = [...filtered].sort(
        (a: ProjectItem, b: ProjectItem) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return filtered;
  };

  const fetchProjects = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      if (activeType === 'search') {
        await new Promise<void>((resolve) => setTimeout(resolve, 200));
        const mocks = generateMockProjects('search');
        const filtered = applyClientFilters(mocks);
        const start = (page - 1) * PAGE_SIZE;
        setItems(filtered.slice(start, start + PAGE_SIZE));
        setTotal(filtered.length);
      } else {
        const apiType = activeType as 'all' | 'video' | 'script' | 'production' | 'gene';
        const result = await listProjects(apiType, page, PAGE_SIZE * 3);
        const filtered = applyClientFilters(result.items);
        setItems(filtered.slice(0, PAGE_SIZE));
        setTotal(Math.min(filtered.length, result.total));
      }
    } catch {
      const mocks = generateMockProjects(activeType);
      const filtered = applyClientFilters(mocks);
      const start = (page - 1) * PAGE_SIZE;
      setItems(filtered.slice(start, start + PAGE_SIZE));
      setTotal(filtered.length);
    } finally {
      setLoading(false);
    }
  }, [activeType, page, category, gradeFilter, timeFilter, sortBy, debouncedSearch]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleToggleFavorite = async (id: string): Promise<void> => {
    const prev = items.find((it: ProjectItem) => it.id === id);
    if (!prev) return;
    const wasFav = !!prev.isFavorite;
    setItems((list) =>
      list.map((it: ProjectItem) =>
        it.id === id ? { ...it, isFavorite: !wasFav } : it,
      ),
    );
    try {
      await apiToggleFavorite(id, prev.type);
    } catch (err) {
      logger.error('切换收藏失败', err);
      setItems((list) =>
        list.map((it: ProjectItem) =>
          it.id === id ? { ...it, isFavorite: wasFav } : it,
        ),
      );
      toast.error('操作失败，请重试');
      throw err;
    }
  };

  const handleCopy = async (id: string): Promise<void> => {
    const prev = items.find((it: ProjectItem) => it.id === id);
    if (!prev) return;
    try {
      await apiCopyProject(id, prev.type);
      toast.success('项目已复制');
      fetchProjects();
    } catch (err) {
      logger.error('复制项目失败', err);
      toast.error('复制失败，请重试');
      throw err;
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    const prev = items.find((it: ProjectItem) => it.id === id);
    if (!prev) return;
    const confirmed = await showConfirm('确定要删除这个项目吗？此操作不可恢复。');
    if (!confirmed) return;
    apiDeleteProject(id, prev.type)
      .then(() => {
        setItems((list) => list.filter((it: ProjectItem) => it.id !== id));
        toast.success('项目已删除');
      })
      .catch((err: unknown) => {
        logger.error('删除项目失败', err);
        toast.error('删除失败,请重试');
      });
  };

  const handleOpen = (item: ProjectItem): void => {
    const route = routeMap[item.type];
    if (route) navigate(route);
  };

  const handleTypeChange = (type: ProjectType): void => {
    setActiveType(type);
    setPage(1);
  };

  const handleMenuToggle = (id: string): void => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));



  return (
    <div className="min-h-full" style={{ backgroundColor: '#0a0e27', padding: '24px' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold leading-tight mb-2" style={{ color: '#00d4ff' }}>
          项目库
        </h1>
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          统一管理搜索任务、视频拆解、脚本项目和视频制作
        </p>
      </div>

      {/* Type Tabs */}
      <div
        className="flex items-center gap-1 mb-5 p-1 rounded-lg w-fit"
        style={{ backgroundColor: '#121738', border: '1px solid #1e293b' }}
      >
        {typeTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTypeChange(tab.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all"
            style={{
              color: activeType === tab.key ? '#fff' : '#94a3b8',
              backgroundColor: activeType === tab.key
                ? `${tab.color}25`
                : 'transparent',
              fontWeight: activeType === tab.key ? 500 : 400,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div
        className="flex items-center justify-between gap-4 mb-5 p-4 rounded-xl flex-wrap"
        style={{ backgroundColor: '#121738', border: '1px solid #1e293b' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div
            className="relative flex items-center h-9 px-3 rounded-lg"
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
              placeholder="搜索项目标题..."
              className="w-56 bg-transparent outline-none text-sm ml-2"
              style={{ color: '#e2e8f0' }}
            />
          </div>

          <SelectField
            label="赛道"
            value={category}
            onChange={(v) => { setCategory(v); setPage(1); }}
            options={[
              { value: 'all', label: '全部' },
              { value: '搞笑', label: '搞笑' },
              { value: '知识', label: '知识' },
              { value: '美食', label: '美食' },
              { value: '美妆', label: '美妆' },
              { value: '穿搭', label: '穿搭' },
              { value: '游戏', label: '游戏' },
              { value: '科技', label: '科技' },
              { value: '情感', label: '情感' },
              { value: '教育', label: '教育' },
              { value: '职场', label: '职场' },
            ]}
          />

          <SelectField
            label="评级"
            value={gradeFilter}
            onChange={(v) => { setGradeFilter(v); setPage(1); }}
            options={[
              { value: 'all', label: '全部' },
              { value: 'S', label: 'S级' },
              { value: 'A', label: 'A级' },
              { value: 'B', label: 'B级' },
              { value: 'C', label: 'C级' },
            ]}
          />

          <SelectField
            label="时间"
            value={timeFilter}
            onChange={(v) => { setTimeFilter(v); setPage(1); }}
            options={[
              { value: 'all', label: '全部' },
              { value: 'today', label: '今天' },
              { value: 'week', label: '本周' },
              { value: 'month', label: '本月' },
              { value: 'year', label: '今年' },
            ]}
          />
        </div>

        <div className="flex items-center gap-3">
          <SelectField
            label="排序"
            value={sortBy}
            onChange={(v) => { setSortBy(v); setPage(1); }}
            options={[
              { value: 'createdAt', label: '创建时间' },
              { value: 'score', label: '评分' },
              { value: 'favorite', label: '收藏数' },
            ]}
          />

          {/* View toggle */}
          <div
            className="flex items-center p-0.5 rounded-lg"
            style={{ backgroundColor: '#0a0e27', border: '1px solid #1e293b' }}
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className="p-1.5 rounded-md transition-colors"
              style={{
                color: viewMode === 'grid' ? '#00d4ff' : '#64748b',
                backgroundColor: viewMode === 'grid' ? 'rgba(0,212,255,0.1)' : 'transparent',
              }}
              title="卡片视图"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="p-1.5 rounded-md transition-colors"
              style={{
                color: viewMode === 'list' ? '#00d4ff' : '#64748b',
                backgroundColor: viewMode === 'list' ? 'rgba(0,212,255,0.1)' : 'transparent',
              }}
              title="列表视图"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton viewMode={viewMode} />
      ) : items.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'grid' ? (
        <div ref={menuRef} className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {items.map((item: ProjectItem) => (
            <ProjectGridCard
              key={item.id}
              item={item}
              openMenuId={openMenuId}
              onOpen={handleOpen}
              onToggleFavorite={handleToggleFavorite}
              onCopy={handleCopy}
              onDelete={handleDelete}
              onMenuToggle={handleMenuToggle}
            />
          ))}
        </div>
      ) : (
        <ProjectListView
          items={items}
          onOpen={handleOpen}
          onToggleFavorite={handleToggleFavorite}
          onCopy={handleCopy}
          onDelete={handleDelete}
        />
      )}

      {/* Pagination */}
      {!loading && items.length > 0 && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
};

export default ProjectPage;
