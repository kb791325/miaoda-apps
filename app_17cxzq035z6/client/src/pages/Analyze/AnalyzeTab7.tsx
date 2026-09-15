import React from 'react';
import { Target, FileText, Scissors, Rocket } from 'lucide-react';
import type { VideoRecord } from '@shared/api.interface';

// ============ Tab 7: 复刻SOP ============
export const RemakeSopTab: React.FC<{ video: VideoRecord }> = ({ video }) => {
  const sop = video.remakeSop;
  const cards = [
    {
      icon: <Target size={20} />,
      title: '选片标准',
      color: '#ef4444',
      content: sop?.selectionCriteria || '暂无数据',
    },
    {
      icon: <FileText size={20} />,
      title: '文案模板',
      color: '#00d4ff',
      content: sop?.copyTemplate || '暂无数据',
    },
    {
      icon: <Scissors size={20} />,
      title: '剪辑参数',
      color: '#6366f1',
      content: sop?.editingParams || '暂无数据',
    },
    {
      icon: <Rocket size={20} />,
      title: '发布策略',
      color: '#10b981',
      content: sop?.publishStrategy || '暂无数据',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="rounded-xl p-5 flex flex-col"
          style={{
            backgroundColor: '#121738',
            border: `1px solid ${card.color}30`,
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${card.color}20`, color: card.color }}
            >
              {card.icon}
            </div>
            <h3 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>
              {card.title}
            </h3>
          </div>
          <p
            className="text-sm leading-relaxed flex-1"
            style={{ color: '#94a3b8', whiteSpace: 'pre-line' }}
          >
            {card.content}
          </p>
        </div>
      ))}
    </div>
  );
};
