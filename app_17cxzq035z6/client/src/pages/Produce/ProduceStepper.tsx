import React from 'react';
import { Check, User, Image, Film, Mic, Music, Download } from 'lucide-react';

export type ProduceStepKey =
  | 'character'
  | 'storyboard'
  | 'clips'
  | 'voiceover'
  | 'bgm'
  | 'compose';

interface StepInfo {
  key: ProduceStepKey;
  label: string;
  icon: React.ReactNode;
}

const STEPS: StepInfo[] = [
  { key: 'character', label: '角色设定', icon: <User size={16} /> },
  { key: 'storyboard', label: '分镜图', icon: <Image size={16} /> },
  { key: 'clips', label: '视频片段', icon: <Film size={16} /> },
  { key: 'voiceover', label: '配音', icon: <Mic size={16} /> },
  { key: 'bgm', label: 'BGM音效', icon: <Music size={16} /> },
  { key: 'compose', label: '合成输出', icon: <Download size={16} /> },
];

interface ProduceStepperProps {
  currentStep: ProduceStepKey;
  completedSteps: ProduceStepKey[];
  onStepClick?: (key: ProduceStepKey) => void;
}

const ProduceStepper: React.FC<ProduceStepperProps> = ({
  currentStep,
  completedSteps,
  onStepClick,
}) => {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  const getNodeStyle = (
    step: StepInfo,
    index: number,
  ): { wrapper: React.CSSProperties; icon: React.CSSProperties; label: React.CSSProperties; glow?: boolean } => {
    const isCompleted = completedSteps.includes(step.key);
    const isCurrent = step.key === currentStep;
    const isPending = !isCompleted && !isCurrent;

    if (isCompleted) {
      return {
        wrapper: { cursor: onStepClick ? 'pointer' : 'default' },
        icon: {
          backgroundColor: 'rgba(16,185,129,0.15)',
          color: '#10b981',
          border: '1px solid rgba(16,185,129,0.5)',
        },
        label: { color: '#10b981' },
      };
    }
    if (isCurrent) {
      return {
        wrapper: {},
        icon: {
          background: 'linear-gradient(135deg, #6366f1 0%, #00d4ff 100%)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 0 16px rgba(0,212,255,0.5)',
        },
        label: { color: '#00d4ff' },
        glow: true,
      };
    }
    // pending
    return {
      wrapper: { opacity: 0.5 },
      icon: {
        backgroundColor: 'rgba(30,41,59,0.5)',
        color: '#64748b',
        border: '1px solid #1e293b',
      },
      label: { color: '#64748b' },
    };
  };

  return (
    <div
      className="flex items-center px-4 py-5 rounded-xl"
      style={{
        backgroundColor: '#121738',
        border: '1px solid #1e293b',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {STEPS.map((step, index) => {
        const styles = getNodeStyle(step, index);
        const isCompleted = completedSteps.includes(step.key);
        const canClick = isCompleted && onStepClick;

        return (
          <React.Fragment key={step.key}>
            <div
              className="flex flex-col items-center gap-2 flex-1"
              style={styles.wrapper}
              onClick={() => canClick && onStepClick?.(step.key)}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300"
                style={styles.icon}
              >
                {isCompleted ? <Check size={18} /> : step.icon}
              </div>
              <span
                className="text-xs font-medium whitespace-nowrap"
                style={styles.label}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-1 rounded-full"
                style={{
                  background:
                    index < currentIndex || completedSteps.includes(step.key)
                      ? 'linear-gradient(90deg, #10b981 0%, rgba(16,185,129,0.3) 100%)'
                      : '#1e293b',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ProduceStepper;
