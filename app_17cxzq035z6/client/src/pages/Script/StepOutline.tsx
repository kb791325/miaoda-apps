import React from 'react';
import { Target, Film, MessageCircle, ChevronRight, TrendingUp } from 'lucide-react';
import type { ScriptOutline } from '@shared/api.interface';
import StepCard, { type StepStatus } from './StepCard';

interface StepOutlineProps {
  outline: ScriptOutline;
  status?: StepStatus;
  onRegenerate?: () => void;
}

const parseBodySections = (body: string): { title: string; desc: string }[] => {
  // Try splitting by numbered items like "1. xxx" / "1、xxx" / "第一段：xxx"
  const lines = body.split(/\n/).filter((line) => line.trim());
  const sections: { title: string; desc: string }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^[\d一二三四五六七八九十]+[.、．:：]\s*(.+)$/);
    if (match) {
      const content = match[1];
      const colonMatch = content.match(/^(.+?)[：:]\s*(.+)$/);
      if (colonMatch) {
        sections.push({ title: colonMatch[1], desc: colonMatch[2] });
      } else {
        sections.push({
          title: content.slice(0, 10),
          desc: content,
        });
      }
    } else if (sections.length > 0) {
      sections[sections.length - 1].desc += ' ' + trimmed;
    }
  }

  if (sections.length >= 2) return sections;

  // Fallback: split body into paragraphs
  const paras = body.split(/\n{2,}/).filter((p) => p.trim());
  if (paras.length >= 2) {
    return paras.slice(0, 5).map((p, i) => ({
      title: `第${i + 1}段`,
      desc: p.trim(),
    }));
  }

  // Final fallback
  return [
    { title: '引入场景', desc: body.slice(0, Math.ceil(body.length / 3)) },
    { title: '核心内容', desc: body.slice(Math.ceil(body.length / 3), Math.ceil(body.length * 2 / 3)) },
    { title: '价值升华', desc: body.slice(Math.ceil(body.length * 2 / 3)) },
  ];
};

const emotionStages = [
  { name: '钩子', value: 70 },
  { name: '上升', value: 60 },
  { name: '高潮', value: 95 },
  { name: '转折', value: 75 },
  { name: 'CTA', value: 85 },
];

const StepOutline: React.FC<StepOutlineProps> = ({ outline, status, onRegenerate }) => {
  const bodySections = parseBodySections(outline.body);

  return (
    <StepCard stepNum={2} title="脚本大纲" status={status} onRegenerate={onRegenerate}>
      <div className="space-y-4">
        {/* Hook - highlighted */}
        <div
          className="p-4 rounded-lg relative overflow-hidden"
          style={{
            backgroundColor: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.5)',
          }}
        >
          <div
            className="absolute top-0 left-0 w-1 h-full"
            style={{ backgroundColor: '#6366f1' }}
          />
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} style={{ color: '#00d4ff' }} />
            <span className="text-sm font-semibold" style={{ color: '#00d4ff' }}>
              钩子话术
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(0,212,255,0.15)',
                color: '#00d4ff',
              }}
            >
              前3秒必看
            </span>
          </div>
          <p className="text-base font-medium leading-relaxed" style={{ color: '#e2e8f0' }}>
            「{outline.hook}」
          </p>
        </div>

        {/* Body sections */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'rgba(10,14,39,0.5)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Film size={16} style={{ color: '#6366f1' }} />
            <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
              主体结构
            </span>
          </div>
          <div className="space-y-3">
            {bodySections.map((section, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      backgroundColor: 'rgba(99,102,241,0.2)',
                      color: '#c7d2fe',
                    }}
                  >
                    {index + 1}
                  </div>
                  {index < bodySections.length - 1 && (
                    <div
                      className="w-px flex-1 mt-1"
                      style={{ backgroundColor: 'rgba(99,102,241,0.2)' }}
                    />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className="text-sm font-medium mb-1" style={{ color: '#e2e8f0' }}>
                    {section.title}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                    {section.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          className="p-4 rounded-lg"
          style={{
            backgroundColor: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={16} style={{ color: '#10b981' }} />
            <span className="text-sm font-semibold" style={{ color: '#10b981' }}>
              结尾 CTA
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#e2e8f0' }}>
            {outline.cta}
          </p>
        </div>

        {/* Emotion curve */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'rgba(10,14,39,0.5)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
              情绪曲线规划
            </span>
          </div>
          <div className="flex items-center justify-between">
            {emotionStages.map((stage, index) => (
              <React.Fragment key={stage.name}>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: `rgba(99,102,241,${0.2 + stage.value / 200})`,
                      color: stage.value >= 90 ? '#00d4ff' : '#c7d2fe',
                      border: `1px solid ${stage.value >= 90 ? '#00d4ff' : 'rgba(99,102,241,0.5)'}`,
                    }}
                  >
                    {stage.value}
                  </div>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>
                    {stage.name}
                  </span>
                </div>
                {index < emotionStages.length - 1 && (
                  <ChevronRight size={16} className="flex-shrink-0" style={{ color: '#334155' }} />
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="text-xs mt-4 text-center" style={{ color: '#64748b' }}>
            {outline.emotionPlan}
          </p>
        </div>
      </div>
    </StepCard>
  );
};

export default StepOutline;
