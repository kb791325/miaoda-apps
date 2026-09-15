import React from 'react';
import { ChevronLeft, ChevronRight, FolderKanban } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onChange }) => {
  const pages: number[] = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <nav className="flex items-center justify-center gap-1 mt-8" aria-label="项目分页">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
        style={{
          backgroundColor: '#121738',
          color: page === 1 ? '#64748b' : '#94a3b8',
          border: '1px solid #1e293b',
          cursor: page === 1 ? 'not-allowed' : 'pointer',
        }}
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((p: number) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: p === page ? '#6366f1' : '#121738',
            color: p === page ? '#fff' : '#94a3b8',
            border: p === page ? '1px solid #6366f1' : '1px solid #1e293b',
            fontWeight: p === page ? 600 : 400,
          }}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
        style={{
          backgroundColor: '#121738',
          color: page === totalPages ? '#64748b' : '#94a3b8',
          border: '1px solid #1e293b',
          cursor: page === totalPages ? 'not-allowed' : 'pointer',
        }}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
};

interface SkeletonProps {
  viewMode: 'grid' | 'list';
}

export const Skeleton: React.FC<SkeletonProps> = ({ viewMode }) => {
  if (viewMode === 'grid') {
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {Array.from({ length: 8 }).map((_, i: number) => (
          <div
            key={i}
            className="rounded-xl overflow-hidden animate-pulse"
            style={{ backgroundColor: '#121738', border: '1px solid #1e293b' }}
          >
            <div className="w-full" style={{ aspectRatio: '16/9', backgroundColor: '#1a2050' }} />
            <div className="p-5 space-y-3">
              <div className="h-4 rounded" style={{ width: '80%', backgroundColor: '#1a2050' }} />
              <div className="h-4 rounded" style={{ width: '50%', backgroundColor: '#1a2050' }} />
              <div className="flex justify-between pt-2">
                <div className="h-4 w-16 rounded" style={{ backgroundColor: '#1a2050' }} />
                <div className="h-4 w-12 rounded" style={{ backgroundColor: '#1a2050' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      className="rounded-xl overflow-hidden animate-pulse"
      style={{ backgroundColor: '#121738', border: '1px solid #1e293b' }}
    >
      {Array.from({ length: 6 }).map((_, i: number) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4"
          style={{ borderBottom: i < 5 ? '1px solid #1e293b' : 'none' }}
        >
          <div className="w-20 h-12 rounded" style={{ backgroundColor: '#1a2050' }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded w-2/3" style={{ backgroundColor: '#1a2050' }} />
            <div className="h-3 rounded w-1/3" style={{ backgroundColor: '#1a2050' }} />
          </div>
          <div className="w-16 h-6 rounded" style={{ backgroundColor: '#1a2050' }} />
        </div>
      ))}
    </div>
  );
};

export const EmptyState: React.FC = () => (
  <div
    className="flex flex-col items-center justify-center py-20 rounded-xl"
    style={{ backgroundColor: '#121738', border: '1px solid #1e293b' }}
  >
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
      style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}
    >
      <FolderKanban size={28} style={{ color: '#6366f1' }} />
    </div>
    <h2 className="text-lg font-semibold mb-2" style={{ color: '#e2e8f0' }}>
      暂无项目
    </h2>
    <p className="text-sm text-center max-w-xs" style={{ color: '#64748b' }}>
      去各功能页面创建你的第一个项目吧
    </p>
  </div>
);
