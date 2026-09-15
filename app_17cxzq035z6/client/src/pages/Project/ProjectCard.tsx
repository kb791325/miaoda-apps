import React, { useState } from 'react';
import { Heart, Copy, Trash2, ExternalLink } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { ProjectItem } from '@client/src/api/project';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { Image } from '@client/src/components/ui/image';

interface ProjectCardProps {
  item: ProjectItem;
  onToggleFavorite: (id: string, type: ProjectItem['type']) => Promise<void>;
  onCopy: (id: string, type: ProjectItem['type']) => Promise<void>;
  onDelete: (id: string, type: ProjectItem['type']) => Promise<void>;
  onOpen: (item: ProjectItem) => void;
}

const typeLabelMap: Record<ProjectItem['type'], string> = {
  video: '视频拆解',
  script: '脚本项目',
  production: '制作项目',
  gene: '爆款基因',
};

const typeColorMap: Record<ProjectItem['type'], string> = {
  video: '#00d4ff',
  script: '#6366f1',
  production: '#10b981',
  gene: '#f59e0b',
};

const gradeColors: Record<string, string> = {
  S: '#ef4444',
  A: '#f59e0b',
  B: '#10b981',
  C: '#64748b',
};

const ProjectCard: React.FC<ProjectCardProps> = ({
  item,
  onToggleFavorite,
  onCopy,
  onDelete,
  onOpen,
}) => {
  const [hovered, setHovered] = useState(false);
  const [favoriting, setFavoriting] = useState(false);

  const handleFavorite = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    if (favoriting) return;
    setFavoriting(true);
    try {
      await onToggleFavorite(item.id, item.type);
    } catch (err) {
      logger.error('收藏操作失败', err);
    } finally {
      setFavoriting(false);
    }
  };

  const handleCopy = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    try {
      await onCopy(item.id, item.type);
    } catch (err) {
      logger.error('复制操作失败', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation();
    const confirmed = await showConfirm('确定要删除这个项目吗？');
    if (confirmed) {
      onDelete(item.id, item.type).catch((err: unknown) => {
        logger.error('删除操作失败', err);
      });
    }
  };

  const handleOpen = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onOpen(item);
  };

  const grade = typeof item.gradeOrScore === 'string'
    ? item.gradeOrScore
    : String(Math.round(Number(item.gradeOrScore)));

  const isGrade = ['S', 'A', 'B', 'C'].includes(grade);

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group"
      style={{
        backgroundColor: '#121738',
        border: '1px solid #1e293b',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(item)}
    >
      {/* Cover */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: '16/10' }}
      >
        {item.coverUrl ? (
          <Image
            src={item.coverUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${typeColorMap[item.type]}33 0%, #121738 100%)`,
            }}
          >
            <span style={{ color: typeColorMap[item.type], fontSize: 32, fontWeight: 700 }}>
              {typeLabelMap[item.type].charAt(0)}
            </span>
          </div>
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 40%, rgba(10,14,39,0.9) 100%)',
          }}
        />

        {/* Type label - top left */}
        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-medium"
          style={{
            backgroundColor: `${typeColorMap[item.type]}20`,
            color: typeColorMap[item.type],
            border: `1px solid ${typeColorMap[item.type]}40`,
          }}
        >
          {typeLabelMap[item.type]}
        </div>

        {/* Grade badge - top right */}
        <div
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{
            backgroundColor: isGrade
              ? `${gradeColors[grade]}20`
              : 'rgba(99,102,241,0.2)',
            color: isGrade ? gradeColors[grade] : '#00d4ff',
            border: isGrade
              ? `1px solid ${gradeColors[grade]}60`
              : '1px solid rgba(0,212,255,0.4)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {isGrade ? grade : `${grade}分`}
        </div>

        {/* Hover action overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center gap-3 transition-opacity duration-300"
          style={{
            opacity: hovered ? 1 : 0,
            backgroundColor: 'rgba(10,14,39,0.5)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: '#6366f1',
              color: '#fff',
            }}
          >
            <ExternalLink size={16} />
            打开
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: 'rgba(0,212,255,0.15)',
              color: '#00d4ff',
              border: '1px solid rgba(0,212,255,0.3)',
            }}
          >
            <Copy size={16} />
            复制
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: 'rgba(239,68,68,0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.3)',
            }}
          >
            <Trash2 size={16} />
            删除
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        <h3
          className="text-sm font-medium mb-3 leading-snug"
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

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {item.category && (
              <span
                className="text-xs px-2 py-0.5 rounded-md truncate"
                style={{
                  backgroundColor: 'rgba(99,102,241,0.1)',
                  color: '#94a3b8',
                }}
              >
                {item.category}
              </span>
            )}
          </div>
          <span className="text-xs shrink-0" style={{ color: '#64748b' }}>
            {item.createdAt ? item.createdAt.split('T')[0] : ''}
          </span>
          <button
            type="button"
            onClick={handleFavorite}
            className="shrink-0 p-1.5 rounded-md transition-colors"
            style={{
              color: item.isFavorite ? '#ef4444' : '#64748b',
              backgroundColor: item.isFavorite ? 'rgba(239,68,68,0.1)' : 'transparent',
            }}
          >
            <Heart size={16} fill={item.isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
