import React, { useState, useMemo, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Video, Sparkles } from 'lucide-react';
import { produceApi } from '@client/src/api';
import ProduceStepper, { type ProduceStepKey } from './ProduceStepper';
import StepCharacter from './StepCharacter';
import StepStoryboardImg from './StepStoryboardImg';
import StepVideoClips from './StepVideoClips';
import StepVoiceover from './StepVoiceover';
import StepBgm from './StepBgm';
import StepCompose from './StepCompose';
import CostSidebar from './CostSidebar';

const ALL_STEPS: ProduceStepKey[] = [
  'character',
  'storyboard',
  'clips',
  'voiceover',
  'bgm',
  'compose',
];

const ProducePage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<ProduceStepKey>('character');
  const [completedSteps, setCompletedSteps] = useState<ProduceStepKey[]>([]);

  const handleStepComplete = useCallback((step: ProduceStepKey) => {
    setCompletedSteps((prev) => {
      if (prev.includes(step)) return prev;
      return [...prev, step];
    });
    const idx = ALL_STEPS.indexOf(step);
    if (idx < ALL_STEPS.length - 1) {
      setCurrentStep(ALL_STEPS[idx + 1]);
    }
    logger.info(`步骤完成: ${step}`);
  }, []);

  const handleStepPrev = useCallback(() => {
    const idx = ALL_STEPS.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(ALL_STEPS[idx - 1]);
    }
  }, [currentStep]);

  const handleStepClick = useCallback(
    (step: ProduceStepKey) => {
      if (completedSteps.includes(step)) {
        setCurrentStep(step);
      }
    },
    [completedSteps],
  );

  // Cost calculation
  const costItems = useMemo(() => {
    const shotCount = 5;
    const items = [
      {
        label: '角色图生成',
        amount: completedSteps.includes('character') ? 2.0 : 0,
        detail: '4 张候选',
      },
      {
        label: '分镜图生成',
        amount: completedSteps.includes('storyboard') ? shotCount * 0.5 : 0,
        detail: `${shotCount} 张分镜`,
      },
      {
        label: '视频片段生成',
        amount: completedSteps.includes('clips') ? shotCount * 3.0 : 0,
        detail: `${shotCount} 个片段`,
      },
      {
        label: '配音',
        amount: completedSteps.includes('voiceover') ? 1.5 : 0,
        detail: 'TTS 合成',
      },
      {
        label: 'BGM 音效',
        amount: completedSteps.includes('bgm') ? 0.8 : 0,
        detail: '授权使用费',
      },
      {
        label: '合成输出',
        amount: completedSteps.includes('compose') ? 1.0 : 0,
        detail: '视频渲染',
      },
    ];
    return items;
  }, [completedSteps]);

  const totalCost = useMemo(
    () => costItems.reduce((sum, item) => sum + item.amount, 0),
    [costItems],
  );

  const estimatedMinutes = useMemo(() => {
    const base = 2;
    const perStep = completedSteps.length * 0.5;
    const remaining = (ALL_STEPS.length - completedSteps.length) * 3;
    return Math.ceil(base + perStep + remaining);
  }, [completedSteps]);

  const renderCurrentStep = (): React.ReactNode => {
    switch (currentStep) {
      case 'character':
        return (
          <StepCharacter onComplete={() => handleStepComplete('character')} />
        );
      case 'storyboard':
        return (
          <StepStoryboardImg
            onComplete={() => handleStepComplete('storyboard')}
            onPrev={handleStepPrev}
          />
        );
      case 'clips':
        return (
          <StepVideoClips
            onComplete={() => handleStepComplete('clips')}
            onPrev={handleStepPrev}
          />
        );
      case 'voiceover':
        return (
          <StepVoiceover
            onComplete={() => handleStepComplete('voiceover')}
            onPrev={handleStepPrev}
          />
        );
      case 'bgm':
        return (
          <StepBgm onComplete={() => handleStepComplete('bgm')} onPrev={handleStepPrev} />
        );
      case 'compose':
        return (
          <StepCompose
            onComplete={() => handleStepComplete('compose')}
            onPrev={handleStepPrev}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-full p-6 space-y-5"
      style={{ backgroundColor: '#0a0e27' }}
    >
      {/* Page Header */}
      <div>
        <h1
          className="text-2xl font-semibold leading-tight mb-2"
          style={{ color: '#00d4ff' }}
        >
          AI 视频制作
        </h1>
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          分镜生成 + 配音 + 剪辑，一站式 AI 视频制作流水线
        </p>
      </div>

      {/* Step Navigation */}
      <ProduceStepper
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Main Content */}
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">{renderCurrentStep()}</div>
        <CostSidebar
          items={costItems}
          total={totalCost}
          estimatedMinutes={estimatedMinutes}
        />
      </div>
    </div>
  );
};

export default ProducePage;
