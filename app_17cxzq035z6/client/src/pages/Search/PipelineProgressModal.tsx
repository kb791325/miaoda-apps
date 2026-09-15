import React from 'react';
import {
  X,
  Search,
  Filter,
  Brain,
  Layers,
  FileText,
  Clapperboard,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { PipelineStatus, PipelineStage } from '@shared/api.interface';

interface PipelineProgressModalProps {
  isOpen: boolean;
  status: PipelineStatus | null;
  onClose: () => void;
  onGoToScript: (scriptId: string) => void;
}

interface StageDef {
  key: PipelineStage;
  label: string;
  icon: React.ReactNode;
  start: number;
  end: number;
}

const STAGES: StageDef[] = [
  { key: 'crawling', label: '抖音爬取', icon: <Search size={18} />, start: 0, end: 20 },
  { key: 'filtering', label: '筛选爆款', icon: <Filter size={18} />, start: 20, end: 30 },
  { key: 'analyzing', label: 'AI拆解', icon: <Brain size={18} />, start: 30, end: 50 },
  { key: 'comparing', label: '提炼规律', icon: <Layers size={18} />, start: 50, end: 60 },
  { key: 'scripting', label: '生成脚本', icon: <FileText size={18} />, start: 60, end: 80 },
  { key: 'storyboard', label: '生成分镜', icon: <Clapperboard size={18} />, start: 80, end: 100 },
];

function getStageIndex(stage: PipelineStage): number {
  const idx = STAGES.findIndex((s) => s.key === stage);
  if (idx >= 0) return idx;
  if (stage === 'done') return STAGES.length;
  if (stage === 'failed') return -1;
  return -1;
}

function computeProgress(status: PipelineStatus | null): number {
  if (!status) return 0;
  if (status.stage === 'done') return 100;
  if (status.stage === 'failed') return 0;
  const idx = getStageIndex(status.stage);
  if (idx < 0) return 0;
  const stageDef = STAGES[idx];
  const stageProgress = status.progress ? Math.min(Math.max(status.progress, 0), 100) : 0;
  return stageDef.start + (stageDef.end - stageDef.start) * (stageProgress / 100);
}

const PipelineProgressModal: React.FC<PipelineProgressModalProps> = ({
  isOpen,
  status,
  onClose,
  onGoToScript,
}) => {
  if (!isOpen) return null;

  const overallProgress = computeProgress(status);
  const currentStageIdx = status ? getStageIndex(status.stage) : -1;
  const isDone = status?.stage === 'done';
  const isFailed = status?.stage === 'failed';
  const canClose = isDone || isFailed;

  const currentStageLabel =
    isDone ? '生成完成' : isFailed ? '生成失败' : status ? STAGES[Math.max(currentStageIdx, 0)]?.label : '准备中...';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(10,14,39,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl p-8 mx-4"
        style={{
          backgroundColor: '#121738',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        {canClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 rounded-lg p-2 transition-all hover:scale-110"
            style={{ backgroundColor: 'rgba(148,163,184,0.1)', color: '#94a3b8' }}
          >
            <X size={18} />
          </button>
        )}

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={22} style={{ color: '#00d4ff' }} />
            <h2 className="text-2xl font-semibold" style={{ color: '#e2e8f0' }}>
              AI 爆款视频生成流水线
            </h2>
          </div>
          {status?.keyword && (
            <p className="text-sm" style={{ color: '#64748b' }}>
              关键词：<span style={{ color: '#00d4ff' }}>{status.keyword}</span>
            </p>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: '#94a3b8' }}>
              整体进度
            </span>
            <span className="text-sm font-semibold" style={{ color: '#00d4ff' }}>
              {Math.round(overallProgress)}%
            </span>
          </div>
          <div
            className="w-full h-3 rounded-full overflow-hidden"
            style={{ backgroundColor: '#0a0e27' }}
          >
            <div
              className="h-full transition-all duration-500 ease-out rounded-full"
              style={{
                width: `${overallProgress}%`,
                background: 'linear-gradient(90deg, #6366f1 0%, #00d4ff 100%)',
                boxShadow: '0 0 12px rgba(0,212,255,0.5)',
              }}
            />
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="text-lg font-semibold mb-1" style={{ color: isFailed ? '#ef4444' : '#00d4ff' }}>
            {isFailed && <AlertCircle size={18} className="inline-block mr-2" style={{ color: '#ef4444' }} />}
            {isDone && <Sparkles size={18} className="inline-block mr-2" style={{ color: '#00d4ff' }} />}
            {currentStageLabel}
          </div>
          {status?.currentStep && !isDone && (
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              {status.currentStep}
            </p>
          )}
          {isFailed && status?.error && (
            <p className="text-sm mt-1" style={{ color: '#f87171' }}>
              {status.error}
            </p>
          )}
          {status && status.videoCount > 0 && !isDone && !isFailed && (
            <p className="text-xs mt-2" style={{ color: '#64748b' }}>
              已爬取 <span style={{ color: '#00d4ff', fontWeight: 600 }}>{status.videoCount}</span> 条视频
            </p>
          )}
        </div>

        <div className="relative mb-8">
          <div
            className="absolute top-5 left-6 right-6 h-0.5"
            style={{ backgroundColor: '#1e293b' }}
          />
          <div
            className="absolute top-5 left-6 h-0.5 transition-all duration-500"
            style={{
              width: `${Math.min(overallProgress, 100)}%`,
              maxWidth: 'calc(100% - 48px)',
              background: 'linear-gradient(90deg, #6366f1 0%, #00d4ff 100%)',
            }}
          />
          <div className="flex items-center justify-between relative">
            {STAGES.map((stage, idx) => {
              const isCompleted = currentStageIdx > idx || isDone;
              const isCurrent = currentStageIdx === idx && !isDone && !isFailed;
              const isFuture = currentStageIdx < idx && !isDone;

              return (
                <div key={stage.key} className="flex flex-col items-center z-10">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      backgroundColor: isCompleted
                        ? '#10b981'
                        : isCurrent
                          ? '#00d4ff'
                          : '#1a2050',
                      boxShadow: isCurrent
                        ? '0 0 16px rgba(0,212,255,0.6)'
                        : isCompleted
                          ? '0 0 12px rgba(16,185,129,0.4)'
                          : 'none',
                      color: isCompleted || isCurrent ? '#0a0e27' : '#64748b',
                    }}
                  >
                    {isCompleted ? <Check size={18} strokeWidth={3} /> : stage.icon}
                  </div>
                  <span
                    className="text-xs mt-2 font-medium"
                    style={{
                      color: isCompleted
                        ? '#10b981'
                        : isCurrent
                          ? '#00d4ff'
                          : isFuture
                            ? '#64748b'
                            : '#64748b',
                    }}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {isDone && (
          <div className="text-center pt-4 border-t" style={{ borderColor: 'rgba(148,163,184,0.1)' }}>
            <div className="text-lg font-semibold mb-4" style={{ color: '#00d4ff' }}>
              🎉 生成完成
            </div>
            <button
              onClick={() => status?.scriptId && onGoToScript(status.scriptId)}
              className="px-8 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 mx-auto hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #00d4ff 0%, #06b6d4 100%)',
                color: '#0a0e27',
                boxShadow: '0 6px 20px rgba(0,212,255,0.4)',
              }}
            >
              前往脚本工坊
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {isFailed && (
          <div className="text-center pt-4 border-t" style={{ borderColor: 'rgba(148,163,184,0.1)' }}>
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: 'rgba(239,68,68,0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineProgressModal;
