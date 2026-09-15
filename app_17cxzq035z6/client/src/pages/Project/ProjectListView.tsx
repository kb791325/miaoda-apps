import React from 'react';
import { Star, Heart } from 'lucide-react';
import type { ProjectItem } from '@client/src/api/project';

interface ProjectListViewProps {
  items: ProjectItem[];
  onOpen: (item: ProjectItem) => void;
  onToggleFavorite: (id: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
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

const StarRating: React.FC<{ score: number; size?: number }> = ({ score, size = 12 }) => {
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

const CopyIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
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
);

const TrashIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
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
);

const ProjectListView: React.FC<ProjectListViewProps> = ({
  items,
  onOpen,
  onToggleFavorite,
  onCopy,
  onDelete,
}) => (
  <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#121738', border: '1px solid #1e293b' }}>
    {/* Table header */}
    <div
      className="grid items-center px-5 py-3 text-xs font-medium"
      style={{
        gridTemplateColumns: '80px 2fr 100px 140px 100px 120px 120px',
        borderBottom: '1px solid #1e293b',
        color: '#64748b',
      }}
    >
      <span>封面</span>
      <span>标题</span>
      <span>类型</span>
      <span>评级/评分</span>
      <span>状态</span>
      <span>创建时间</span>
      <span className="text-right">操作</span>
    </div>
    {items.map((item: ProjectItem, index: number) => {
      const typeColor = typeColorMap[item.type] ?? '#6366f1';
      const statusColor = statusColors[item.status] ?? '#64748b';
      const grade = typeof item.gradeOrScore === 'string' ? item.gradeOrScore : '';
      const scoreNum = typeof item.gradeOrScore === 'number' ? item.gradeOrScore : 0;
      const isGrade = ['S', 'A', 'B', 'C'].includes(grade);
      return (
        <div
          key={item.id}
          className="grid items-center px-5 py-3 cursor-pointer transition-colors hover:bg-white/5"
          style={{
            gridTemplateColumns: '80px 2fr 100px 140px 100px 120px 120px',
            borderBottom: index < items.length - 1 ? '1px solid rgba(30,41,59,0.5)' : 'none',
          }}
          onClick={() => onOpen(item)}
        >
          <div
            className="w-16 h-10 rounded flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${typeColor}33 0%, #121738 100%)`,
            }}
          >
            <span style={{ color: typeColor, fontSize: 16, fontWeight: 700 }}>
              {typeLabelMap[item.type]?.charAt(0) ?? '?'}
            </span>
          </div>
          <span
            className="text-sm truncate pr-4"
            style={{ color: '#e2e8f0' }}
          >
            {item.title}
          </span>
          <span
            className="text-xs px-2 py-1 rounded w-fit"
            style={{
              backgroundColor: `${typeColor}20`,
              color: typeColor,
            }}
          >
            {typeLabelMap[item.type] ?? item.type}
          </span>
          <div className="flex items-center gap-1.5">
            {isGrade ? (
              <span
                className="px-2 py-0.5 rounded text-xs font-bold"
                style={{
                  backgroundColor: `${gradeColors[grade]}20`,
                  color: gradeColors[grade],
                }}
              >
                {grade}级
              </span>
            ) : (
              <>
                <StarRating score={scoreNum} />
                <span className="text-xs" style={{ color: '#f59e0b' }}>
                  {scoreNum}分
                </span>
              </>
            )}
          </div>
          <span
            className="text-xs px-2 py-1 rounded w-fit"
            style={{
              backgroundColor: `${statusColor}20`,
              color: statusColor,
            }}
          >
            {item.status}
          </span>
          <span className="text-xs" style={{ color: '#64748b' }}>
            {item.createdAt.split('T')[0]}
          </span>
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.id);
              }}
              className="p-1.5 rounded-md transition-colors hover:bg-white/5"
              style={{ color: item.isFavorite ? '#f59e0b' : '#64748b' }}
              title={item.isFavorite ? '取消收藏' : '收藏'}
            >
              <Heart size={14} fill={item.isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(item.id);
              }}
              className="p-1.5 rounded-md transition-colors hover:bg-white/5"
              style={{ color: '#00d4ff' }}
              title="复制"
            >
              <CopyIcon size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="p-1.5 rounded-md transition-colors hover:bg-white/5"
              style={{ color: '#ef4444' }}
              title="删除"
            >
              <TrashIcon size={14} />
            </button>
          </div>
        </div>
      );
    })}
  </div>
);

export default ProjectListView;
