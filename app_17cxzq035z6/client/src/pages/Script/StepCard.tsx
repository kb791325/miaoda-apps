import React from 'react';
import { Sparkles, RefreshCw, Edit3, Check, Loader2 } from 'lucide-react';

export type StepStatus = 'completed' | 'current' | 'pending' | 'loading';

interface StepCardProps {
  stepNum: number;
  title: string;
  status?: StepStatus;
  onRegenerate?: () => void;
  onEdit?: () => void;
  isEditing?: boolean;
  children: React.ReactNode;
}

const StepCard: React.FC<StepCardProps> = ({
  stepNum,
  title,
  status = 'completed',
  onRegenerate,
  onEdit,
  isEditing,
  children,
}) => {
  const getBorderColor = (): string => {
    switch (status) {
      case 'current':
        return '#00d4ff';
      case 'completed':
        return '#1e293b';
      case 'loading':
        return '#6366f1';
      case 'pending':
      default:
        return '#1e293b';
    }
  };

  const getStepBadgeStyle = (): React.CSSProperties => {
    switch (status) {
      case 'completed':
        return {
          background: 'rgba(16,185,129,0.15)',
          color: '#10b981',
          border: '1px solid rgba(16,185,129,0.4)',
        };
      case 'current':
      case 'loading':
        return {
          background: 'linear-gradient(135deg, #6366f1 0%, #00d4ff 100%)',
          color: '#fff',
          border: 'none',
        };
      case 'pending':
      default:
        return {
          background: 'rgba(30,41,59,0.5)',
          color: '#64748b',
          border: '1px solid #1e293b',
        };
    }
  };

  const isPending = status === 'pending';
  const isLoading = status === 'loading';

  return (
    <div
      className="rounded-xl relative overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: isPending ? 'rgba(18,23,56,0.5)' : '#121738',
        border: `1px solid ${getBorderColor()}`,
        boxShadow:
          status === 'current'
            ? '0 0 24px rgba(0,212,255,0.15), 0 4px 20px rgba(0,0,0,0.3)'
            : '0 4px 20px rgba(0,0,0,0.3)',
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {/* AI Generated Tag */}
      {status === 'completed' && (
        <div
          className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium z-10"
          style={{
            backgroundColor: 'rgba(0,212,255,0.1)',
            color: '#00d4ff',
            border: '1px solid rgba(0,212,255,0.3)',
          }}
        >
          <Sparkles size={12} />
          AI生成
        </div>
      )}

      <div className="p-5">
        {/* Step Header */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={getStepBadgeStyle()}
          >
            {status === 'completed' ? <Check size={18} /> : stepNum}
          </div>
          <div className="flex-1">
            <h3
              className="text-lg font-semibold leading-tight"
              style={{ color: isPending ? '#64748b' : '#e2e8f0' }}
            >
              {title}
            </h3>
            {isLoading && (
              <div className="flex items-center gap-2 mt-1">
                <Loader2 size={12} className="animate-spin" style={{ color: '#6366f1' }} />
                <span className="text-xs" style={{ color: '#6366f1' }}>
                  AI 正在生成中...
                </span>
              </div>
            )}
            {isPending && (
              <span className="text-xs" style={{ color: '#64748b' }}>
                等待开始
              </span>
            )}
          </div>
          {status === 'completed' && (
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{
                    backgroundColor: isEditing
                      ? 'rgba(16,185,129,0.15)'
                      : 'rgba(99,102,241,0.1)',
                    color: isEditing ? '#10b981' : '#94a3b8',
                    border: `1px solid ${
                      isEditing
                        ? 'rgba(16,185,129,0.3)'
                        : 'rgba(99,102,241,0.2)'
                    }`,
                  }}
                >
                  {isEditing ? <Check size={14} /> : <Edit3 size={14} />}
                  {isEditing ? '保存' : '编辑'}
                </button>
              )}
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                  style={{
                    backgroundColor: 'rgba(99,102,241,0.15)',
                    color: '#6366f1',
                    border: '1px solid rgba(99,102,241,0.3)',
                  }}
                >
                  <RefreshCw size={14} />
                  重新生成
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {!isPending && children}
        {isPending && (
          <div
            className="flex items-center justify-center py-8 text-sm"
            style={{ color: '#64748b' }}
          >
            完成上一步后自动开始
          </div>
        )}
      </div>
    </div>
  );
};

export default StepCard;
