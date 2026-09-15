import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Edit3,
  Trash2,
  Plus,
  Check,
} from 'lucide-react';
import type { StoryboardShot } from '@shared/api.interface';
import StepCard, { type StepStatus } from './StepCard';

interface StepStoryboardProps {
  shots: StoryboardShot[];
  onUpdateShot: (
    shotId: number,
    field: keyof StoryboardShot,
    value: string | number,
  ) => void;
  onAddShot: () => void;
  onDeleteShot: (shotId: number) => void;
  onMoveShot: (shotId: number, direction: 'up' | 'down') => void;
  status?: StepStatus;
  onRegenerate?: () => void;
}

const StepStoryboard: React.FC<StepStoryboardProps> = ({
  shots,
  onUpdateShot,
  onAddShot,
  onDeleteShot,
  onMoveShot,
  status,
  onRegenerate,
}) => {
  const [editingShotId, setEditingShotId] = useState<number | null>(null);

  const toggleEdit = (shotId: number): void => {
    setEditingShotId(editingShotId === shotId ? null : shotId);
  };

  return (
    <StepCard stepNum={4} title="分镜表" status={status} onRegenerate={onRegenerate}>
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                <th
                  className="text-left py-2.5 px-2 font-medium whitespace-nowrap"
                  style={{ color: '#64748b', width: '50px' }}
                >
                  镜号
                </th>
                <th
                  className="text-left py-2.5 px-2 font-medium whitespace-nowrap"
                  style={{ color: '#64748b', width: '65px' }}
                >
                  时长(秒)
                </th>
                <th
                  className="text-left py-2.5 px-2 font-medium whitespace-nowrap"
                  style={{ color: '#64748b' }}
                >
                  画面描述
                </th>
                <th
                  className="text-left py-2.5 px-2 font-medium whitespace-nowrap"
                  style={{ color: '#64748b' }}
                >
                  台词
                </th>
                <th
                  className="text-left py-2.5 px-2 font-medium whitespace-nowrap"
                  style={{ color: '#64748b', width: '80px' }}
                >
                  运镜
                </th>
                <th
                  className="text-left py-2.5 px-2 font-medium whitespace-nowrap"
                  style={{ color: '#64748b', width: '70px' }}
                >
                  音效
                </th>
                <th
                  className="text-left py-2.5 px-2 font-medium whitespace-nowrap"
                  style={{ color: '#64748b' }}
                >
                  字幕
                </th>
                <th
                  className="text-left py-2.5 px-2 font-medium whitespace-nowrap"
                  style={{ color: '#64748b', width: '100px' }}
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {shots.map((shot) => (
                <tr
                  key={shot.id}
                  style={{
                    borderBottom: '1px solid rgba(30,41,59,0.5)',
                  }}
                  onDoubleClick={() => toggleEdit(shot.id)}
                >
                  <td className="py-2.5 px-2">
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold"
                      style={{
                        backgroundColor: 'rgba(99,102,241,0.2)',
                        color: '#00d4ff',
                      }}
                    >
                      {shot.id}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    {editingShotId === shot.id ? (
                      <input
                        type="number"
                        value={shot.duration}
                        onChange={(e) =>
                          onUpdateShot(
                            shot.id,
                            'duration',
                            Number(e.target.value),
                          )
                        }
                        className="w-12 px-1 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: '#0a0e27',
                          border: '1px solid #6366f1',
                          color: '#e2e8f0',
                        }}
                      />
                    ) : (
                      <span style={{ color: '#94a3b8' }}>{shot.duration}s</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 max-w-[200px]">
                    {editingShotId === shot.id ? (
                      <input
                        value={shot.scene}
                        onChange={(e) =>
                          onUpdateShot(shot.id, 'scene', e.target.value)
                        }
                        className="w-full px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: '#0a0e27',
                          border: '1px solid #6366f1',
                          color: '#e2e8f0',
                        }}
                      />
                    ) : (
                      <span
                        className="block truncate"
                        style={{ color: '#e2e8f0' }}
                        title={shot.scene}
                      >
                        {shot.scene}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 max-w-[180px]">
                    {editingShotId === shot.id ? (
                      <input
                        value={shot.line}
                        onChange={(e) =>
                          onUpdateShot(shot.id, 'line', e.target.value)
                        }
                        className="w-full px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: '#0a0e27',
                          border: '1px solid #6366f1',
                          color: '#e2e8f0',
                        }}
                      />
                    ) : (
                      <span
                        className="block truncate"
                        style={{ color: '#e2e8f0' }}
                        title={shot.line}
                      >
                        {shot.line}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2">
                    <span style={{ color: '#94a3b8' }}>{shot.camera}</span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span style={{ color: '#94a3b8' }}>{shot.sound}</span>
                  </td>
                  <td className="py-2.5 px-2 max-w-[140px]">
                    <span
                      className="block truncate"
                      style={{ color: '#94a3b8' }}
                      title={shot.subtitle}
                    >
                      {shot.subtitle}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => onMoveShot(shot.id, 'up')}
                        className="p-1 rounded hover:opacity-80"
                        style={{ color: '#64748b' }}
                        title="上移"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => onMoveShot(shot.id, 'down')}
                        className="p-1 rounded hover:opacity-80"
                        style={{ color: '#64748b' }}
                        title="下移"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={() => toggleEdit(shot.id)}
                        className="p-1 rounded hover:opacity-80"
                        style={{
                          color:
                            editingShotId === shot.id ? '#10b981' : '#64748b',
                        }}
                        title="编辑"
                      >
                        {editingShotId === shot.id ? (
                          <Check size={14} />
                        ) : (
                          <Edit3 size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => onDeleteShot(shot.id)}
                        className="p-1 rounded hover:opacity-80"
                        style={{ color: '#ef4444' }}
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={onAddShot}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
          style={{
            backgroundColor: 'rgba(99,102,241,0.1)',
            color: '#6366f1',
            border: '1px dashed rgba(99,102,241,0.3)',
          }}
        >
          <Plus size={14} />
          添加镜头
        </button>
      </div>
    </StepCard>
  );
};

export default StepStoryboard;
