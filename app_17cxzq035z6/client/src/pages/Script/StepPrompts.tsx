import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Image,
  Wand2,
  Sparkles,
} from 'lucide-react';
import type { StoryboardShot } from '@shared/api.interface';
import StepCard, { type StepStatus } from './StepCard';

interface StepPromptsProps {
  shots: StoryboardShot[];
  onUpdateShot: (
    shotId: number,
    field: keyof StoryboardShot,
    value: string,
  ) => void;
  status?: StepStatus;
  onRegenerate?: () => void;
}

// Generate an English version of the prompt (mock/simplified)
const toEnglishPrompt = (cnPrompt: string): string => {
  if (!cnPrompt) return '';
  const base =
    'Cinematic shot, high quality, detailed, 8k, professional lighting, dramatic composition, ';
  return base + cnPrompt.replace(/[，。！？、：；]/g, ', ').toLowerCase();
};

const PromptCard: React.FC<{
  shot: StoryboardShot;
  onUpdate: (field: keyof StoryboardShot, value: string) => void;
}> = ({ shot, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState<'cn' | 'en' | null>(null);

  const handleCopy = (text: string, lang: 'cn' | 'en'): void => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(lang);
    setTimeout(() => setCopied(null), 1500);
  };

  const enPrompt = toEnglishPrompt(shot.prompt);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'rgba(10,14,39,0.5)',
        border: '1px solid #1e293b',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:opacity-80 transition-opacity text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #00d4ff 100%)',
              color: '#fff',
            }}
          >
            {shot.id}
          </span>
          <div>
            <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
              镜头 {shot.id} · {shot.duration}s
            </div>
            <div className="text-xs truncate max-w-xs" style={{ color: '#64748b' }}>
              {shot.scene || '无画面描述'}
            </div>
          </div>
        </div>
        <div style={{ color: '#64748b' }}>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div
          className="p-3 pt-0 space-y-3"
          style={{ borderTop: '1px solid #1e293b' }}
        >
          <div className="pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium" style={{ color: '#c7d2fe' }}>
                  中文 Prompt
                </span>
              </div>
              <button
                onClick={() => handleCopy(shot.prompt, 'cn')}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors hover:opacity-80"
                style={{
                  backgroundColor: 'rgba(99,102,241,0.1)',
                  color: '#94a3b8',
                }}
              >
                {copied === 'cn' ? (
                  <>
                    <Check size={12} style={{ color: '#10b981' }} />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    复制
                  </>
                )}
              </button>
            </div>
            <textarea
              value={shot.prompt}
              onChange={(e) => onUpdate('prompt', e.target.value)}
              className="w-full px-3 py-2 rounded text-xs resize-none leading-relaxed"
              rows={3}
              style={{
                backgroundColor: 'rgba(10,14,39,0.8)',
                border: '1px solid #1e293b',
                color: '#e2e8f0',
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium" style={{ color: '#22d3ee' }}>
                  English Prompt
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'rgba(0,212,255,0.1)',
                    color: '#00d4ff',
                  }}
                >
                  AI翻译
                </span>
              </div>
              <button
                onClick={() => handleCopy(enPrompt, 'en')}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors hover:opacity-80"
                style={{
                  backgroundColor: 'rgba(0,212,255,0.1)',
                  color: '#94a3b8',
                }}
              >
                {copied === 'en' ? (
                  <>
                    <Check size={12} style={{ color: '#10b981' }} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div
              className="px-3 py-2 rounded text-xs leading-relaxed"
              style={{
                backgroundColor: 'rgba(0,212,255,0.05)',
                border: '1px solid rgba(0,212,255,0.2)',
                color: '#bae6fd',
                minHeight: '56px',
              }}
            >
              {enPrompt || '暂无内容'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StepPrompts: React.FC<StepPromptsProps> = ({
  shots,
  onUpdateShot,
  status,
  onRegenerate,
}) => {
  return (
    <StepCard stepNum={5} title="画面Prompt" status={status} onRegenerate={onRegenerate}>
      <div className="space-y-4">
        {/* Character anchor */}
        <div
          className="p-4 rounded-lg"
          style={{
            backgroundColor: 'rgba(0,212,255,0.06)',
            border: '1px solid rgba(0,212,255,0.25)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,212,255,0.15)' }}
            >
              <Wand2 size={16} style={{ color: '#00d4ff' }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: '#00d4ff' }}>
              角色外观锚点
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{
                backgroundColor: 'rgba(0,212,255,0.1)',
                color: '#00d4ff',
              }}
            >
              <Sparkles size={10} />
              保持一致性
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs mb-1" style={{ color: '#64748b' }}>
                角色描述
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#e2e8f0' }}>
                年轻女性，25岁左右，长发微卷，五官精致，气质清新自然，身穿简约白色上衣
              </p>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: '#64748b' }}>
                风格统一描述
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#e2e8f0' }}>
                真实人像风格，柔和自然光，浅景深，电影感色彩，画面质感细腻
              </p>
            </div>
          </div>
        </div>

        {/* Prompt list */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Image size={16} style={{ color: '#6366f1' }} />
            <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
              分镜 Prompt 列表
            </span>
            <span className="text-xs" style={{ color: '#64748b' }}>
              共 {shots.length} 个镜头
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {shots.map((shot) => (
              <PromptCard
                key={shot.id}
                shot={shot}
                onUpdate={(field, value) => onUpdateShot(shot.id, field, value)}
              />
            ))}
          </div>
        </div>
      </div>
    </StepCard>
  );
};

export default StepPrompts;
