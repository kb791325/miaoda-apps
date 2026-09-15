import React from 'react';
import { Users, TrendingUp, Award, Zap } from 'lucide-react';
import type { TopicEval } from '@shared/api.interface';
import StepCard, { type StepStatus } from './StepCard';

interface StepTopicEvalProps {
  topicEval: TopicEval;
  status?: StepStatus;
  onRegenerate?: () => void;
}

interface HookCard {
  title: string;
  desc: string;
}

const parseHookDirections = (directions: string[]): HookCard[] => {
  return directions.map((d) => {
    const sepIndex = d.indexOf('：');
    if (sepIndex > 0) {
      return { title: d.slice(0, sepIndex), desc: d.slice(sepIndex + 1) };
    }
    // fallback: split first space
    const parts = d.split(/[，。]/);
    return { title: parts[0] || d, desc: d };
  });
};

const getViralGrade = (score: number): { label: string; color: string; bg: string } => {
  if (score >= 85) return { label: 'S 级', color: '#00d4ff', bg: 'rgba(0,212,255,0.15)' };
  if (score >= 70) return { label: 'A 级', color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
  if (score >= 55) return { label: 'B 级', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  return { label: 'C 级', color: '#94a3b8', bg: 'rgba(100,116,139,0.15)' };
};

const StepTopicEval: React.FC<StepTopicEvalProps> = ({
  topicEval,
  status,
  onRegenerate,
}) => {
  const grade = getViralGrade(topicEval.feasibilityScore);
  const hooks = parseHookDirections(topicEval.hookDirections);

  return (
    <StepCard stepNum={1} title="选题评估" status={status} onRegenerate={onRegenerate}>
      <div className="space-y-5">
        {/* Feasibility + Grade */}
        <div className="grid grid-cols-3 gap-4">
          <div
            className="col-span-2 p-4 rounded-lg"
            style={{ backgroundColor: 'rgba(10,14,39,0.5)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center"
                style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}
              >
                <TrendingUp size={16} style={{ color: '#6366f1' }} />
              </div>
              <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
                可行性评分
              </span>
            </div>
            <div className="flex items-end gap-4 mb-3">
              <div
                className="text-4xl font-bold leading-none"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #00d4ff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {topicEval.feasibilityScore}
              </div>
              <span className="text-sm mb-1" style={{ color: '#64748b' }}>
                / 100
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(30,41,59,0.8)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${topicEval.feasibilityScore}%`,
                  background: 'linear-gradient(90deg, #6366f1 0%, #00d4ff 100%)',
                }}
              />
            </div>
          </div>

          <div
            className="p-4 rounded-lg flex flex-col items-center justify-center"
            style={{ backgroundColor: grade.bg, border: `1px solid ${grade.color}` }}
          >
            <div className="flex items-center gap-1 mb-2">
              <Award size={16} style={{ color: grade.color }} />
              <span className="text-xs" style={{ color: grade.color }}>
                爆款潜力
              </span>
            </div>
            <div
              className="text-3xl font-bold"
              style={{ color: grade.color }}
            >
              {grade.label}
            </div>
          </div>
        </div>

        {/* Audience */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: 'rgba(10,14,39,0.5)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,212,255,0.1)' }}
            >
              <Users size={16} style={{ color: '#00d4ff' }} />
            </div>
            <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
              受众画像
            </span>
          </div>
          <p
            className="text-sm leading-relaxed"
            style={{ color: '#94a3b8' }}
          >
            {topicEval.audience}
          </p>
        </div>

        {/* Hook Directions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}
            >
              <Zap size={16} style={{ color: '#f59e0b' }} />
            </div>
            <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
              钩子方向（{hooks.length} 种）
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {hooks.slice(0, 3).map((hook, index) => (
              <div
                key={index}
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.25)',
                }}
              >
                <div
                  className="text-sm font-semibold mb-1"
                  style={{ color: '#c7d2fe' }}
                >
                  {hook.title}
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: '#94a3b8' }}
                >
                  {hook.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StepCard>
  );
};

export default StepTopicEval;
