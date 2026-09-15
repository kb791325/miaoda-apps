import React from 'react';
import {
  Star,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import type { ProjectItem } from '@client/src/api/project';

interface ProjectGridCardProps {
  item: ProjectItem;
  openMenuId: string | null;
  onOpen: (item: ProjectItem) => void;
  onToggleFavorite: (id: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  onMenuToggle: (id: string) => void;
}

const typeLabelMap: Record<string, string> = {
  search: '搜索任务',
  video: '视频拆解',
  script: '脚本项目',
  production: '视频制作',
  gene: '爆款基因',
};

const typeColorMap: Record<string, string> = {
  search: '#3b82f6',
  video: '#a855f7',
  script: '#00d4ff',
  production: '#10b981',
  gene: '#f59e0b',
};

const gradeColors: Record<string, string> = {
  S: '#ef4444',
  A: '#f59e0b',
  B: '#10b981',
  C: '#64748b',
};

const statusColors: Record<string, string> = {
  进行中: '#3b82f6',
  已完成: '#10b981',
  草稿: '#64748b',
};

const StarRating: React.FC<{ score: number; size?: number }> = ({ score, size = 14 }) => {
  const fullStars = Math.floor(score / 20);
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

const ProjectGridCard: React.FC<ProjectGridCardProps> = ({
  item,
  openMenuId,
  onOpen,
  onToggleFavorite,
  onCopy,
  onDelete,
  onMenuToggle,
}) => {
  const typeColor = typeColorMap[item.type] ?? '#6366f1';
  const statusColor = statusColors[item.status] ?? '#64748b';
  const grade = typeof item.gradeOrScore === 'string' ? item.gradeOrScore : '';
  const scoreNum = typeof item.gradeOrScore === 'number' ? item.gradeOrScore : 0;
  const isGrade = ['S', 'A', 'B', 'C'].includes(grade);
  const isMenuOpen = openMenuId === item.id;

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group hover:-translate-y-1"
      style={{
        backgroundColor: '#121738',
        border: '1px solid #1e293b',
        boxShadow: isMenuOpen
          ? '0 8px 30px rgba(99,102,241,0.2)'
          : '0 4px 20px rgba(0,0,0,0.3)',
      }}
      onClick={() => onOpen(item)}
    >
      {/* Cover */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-500 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${typeColor}33 0%, #121738 100%)`,
          }}
        >
          <span style={{ color: typeColor, fontSize: 36, fontWeight: 700, letterSpacing: 2 }}>
            {typeLabelMap[item.type]?.charAt(0) ?? '?'}
          </span>
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent 40%, rgba(10,14,39,0.85) 100%)',
          }}
        />
        {/* Type label */}
        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-medium"
          style={{
            backgroundColor: `${typeColor}20`,
            color: typeColor,
            border: `1px solid ${typeColor}40`,
          }}
        >
          {typeLabelMap[item.type] ?? item.type}
        </div>
        {/* Favorite button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
          className="absolute top-3 right-3 p-1.5 rounded-md transition-colors"
          style={{
            backgroundColor: 'rgba(10,14,39,0.5)',
            color: item.isFavorite ? '#f59e0b' : '#e2e8f0',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Star size={16} fill={item.isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Card body */}
      <div className="p-5">
        <h3
          className="text-sm font-semibold mb-3 leading-snug"
          style={{
            color: '#e2e8f0',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 40,
          }}
        >
          {item.title}
        </h3>

        {/* Info row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* Grade / Score */}
          {isGrade ? (
            <span
              className="px-2 py-0.5 rounded text-xs font-bold"
              style={{
                backgroundColor: `${gradeColors[grade]}20`,
                color: gradeColors[grade],
                border: `1px solid ${gradeColors[grade]}40`,
              }}
            >
              {grade}级
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <StarRating score={scoreNum} />
              <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>
                {scoreNum}分
              </span>
            </div>
          )}
          {/* Status */}
          <span
            className="px-2 py-0.5 rounded text-xs"
            style={{
              backgroundColor: `${statusColor}20`,
              color: statusColor,
            }}
          >
            {item.status}
          </span>
        </div>

        {/* Bottom */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs" style={{ color: '#64748b' }}>
            <Clock size={12} />
            <span>{item.createdAt.split('T')[0]}</span>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle(item.id);
              }}
              className="p-1.5 rounded-md transition-colors hover:bg-white/5"
              style={{ color: isMenuOpen ? '#e2e8f0' : '#64748b' }}
            >
              <MoreHorizontal size={16} />
            </button>
            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 py-1 rounded-lg z-10 min-w-[120px]"
                style={{
                  backgroundColor: '#1a2050',
                  border: '1px solid #1e293b',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    onToggleFavorite(item.id);
                    onMenuToggle(item.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5"
                  style={{ color: item.isFavorite ? '#f59e0b' : '#e2e8f0' }}
                >
                  <Star size={14} fill={item.isFavorite ? 'currentColor' : 'none'} />
                  {item.isFavorite ? '取消收藏' : '收藏'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCopy(item.id);
                    onMenuToggle(item.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5"
                  style={{ color: '#00d4ff' }}
                >
                  {/* Copy icon inline to avoid import */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  复制项目
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(item.id);
                    onMenuToggle(item.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5"
                  style={{ color: '#ef4444' }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  删除项目
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectGridCard;
