import React from 'react';
import { FileText, Clock, Hash, Volume2 } from 'lucide-react';
import StepCard, { type StepStatus } from './StepCard';
import { Textarea } from '@client/src/components/ui/textarea';

interface StepFullCopyProps {
  fullCopy: string;
  isEditing: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onToggleEdit: () => void;
  status?: StepStatus;
  onRegenerate?: () => void;
}

const renderCopyWithEmotion = (text: string): React.ReactNode => {
  const parts = text.split(/(【[^】]+】|\[停顿\d+s\]|\[加速\]|\[重音\]|\[低沉\]|\[上扬\])/g);
  return parts.map((part, index) => {
    if (part.startsWith('【') && part.endsWith('】')) {
      return (
        <span
          key={index}
          className="font-bold"
          style={{ color: '#00d4ff' }}
        >
          {part}
        </span>
      );
    }
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span
          key={index}
          className="text-xs px-1.5 py-0.5 rounded mx-1 align-middle"
          style={{
            backgroundColor: 'rgba(99,102,241,0.25)',
            color: '#a5b4fc',
          }}
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const estimateDuration = (text: string): number => {
  // Approx 4 chars per second for Chinese speech
  const cleanLen = text.replace(/[【\[\]（）\n\s\dA-Za-z]/g, '').length;
  return Math.ceil(cleanLen / 4);
};

const countWords = (text: string): number => {
  return text.replace(/\s/g, '').length;
};

const StepFullCopy: React.FC<StepFullCopyProps> = ({
  fullCopy,
  isEditing,
  draft,
  onDraftChange,
  onToggleEdit,
  status,
  onRegenerate,
}) => {
  const displayText = isEditing ? draft : fullCopy;
  const wordCount = countWords(displayText);
  const duration = estimateDuration(displayText);
  const speed = Math.round((wordCount / Math.max(duration, 1)) * 10) / 10;

  return (
    <StepCard
      stepNum={3}
      title="完整口播文案"
      status={status}
      onEdit={onToggleEdit}
      isEditing={isEditing}
      onRegenerate={onRegenerate}
    >
      <div className="space-y-4">
        <div
          className="p-4 rounded-lg"
          style={{
            backgroundColor: 'rgba(10,14,39,0.5)',
            border: '1px solid #1e293b',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} style={{ color: '#6366f1' }} />
            <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
              口播正文
            </span>
          </div>
          {isEditing ? (
            <Textarea
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              className="resize-none min-h-[220px] leading-relaxed"
              style={{
                borderColor: '#1e293b',
                color: '#e2e8f0',
                backgroundColor: 'transparent',
                lineHeight: '1.8',
              }}
            />
          ) : (
            <div
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: '#e2e8f0', lineHeight: '2', minHeight: '180px' }}
            >
              {renderCopyWithEmotion(fullCopy)}
            </div>
          )}
        </div>

        {/* Stats */}
        <div
          className="flex items-center gap-6 px-4 py-3 rounded-lg"
          style={{
            backgroundColor: 'rgba(10,14,39,0.5)',
            border: '1px solid #1e293b',
          }}
        >
          <div className="flex items-center gap-2">
            <Hash size={14} style={{ color: '#64748b' }} />
            <span className="text-xs" style={{ color: '#64748b' }}>
              字数
            </span>
            <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
              {wordCount}
            </span>
          </div>
          <div
            className="w-px h-4"
            style={{ backgroundColor: 'rgba(148,163,184,0.2)' }}
          />
          <div className="flex items-center gap-2">
            <Clock size={14} style={{ color: '#64748b' }} />
            <span className="text-xs" style={{ color: '#64748b' }}>
              预估时长
            </span>
            <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
              {duration}s
            </span>
          </div>
          <div
            className="w-px h-4"
            style={{ backgroundColor: 'rgba(148,163,184,0.2)' }}
          />
          <div className="flex items-center gap-2">
            <Volume2 size={14} style={{ color: '#64748b' }} />
            <span className="text-xs" style={{ color: '#64748b' }}>
              语速
            </span>
            <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
              {speed} 字/秒
            </span>
          </div>
        </div>
      </div>
    </StepCard>
  );
};

export default StepFullCopy;
