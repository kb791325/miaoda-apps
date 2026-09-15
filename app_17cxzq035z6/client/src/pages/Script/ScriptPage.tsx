import React, { useState, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Sparkles,
  RefreshCw,
  Wand2,
  Save,
  FileDown,
  ChevronRight,
  Video,
  FileText,
  Target,
  Clock,
  Star,
} from 'lucide-react';
import type {
  ScriptProject,
  StoryboardShot,
} from '@shared/api.interface';
import { scriptApi } from '@client/src/api';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import StepTopicEval from './StepTopicEval';
import StepOutline from './StepOutline';
import StepFullCopy from './StepFullCopy';
import StepStoryboard from './StepStoryboard';
import StepPrompts from './StepPrompts';
import type { StepStatus } from './StepCard';
import { Image } from '@client/src/components/ui/image';

const CATEGORIES = [
  '搞笑',
  '知识科普',
  '美食',
  '美妆',
  '穿搭',
  '游戏',
  '音乐',
  '影视',
  '科技数码',
  '情感',
  '母婴亲子',
  '教育',
  '职场',
  '汽车',
  '旅行',
];

const DURATIONS = [15, 30, 60, 90];

// Mock reference videos (would come from analyze results)
interface RefVideo {
  id: string;
  title: string;
  cover: string;
  duration: number;
  score: number;
}

const MOCK_REFERENCE_VIDEOS: RefVideo[] = [
  { id: 'v1', title: '夏日护肤秘诀大公开', cover: 'https://picsum.photos/seed/ref1/160/90', duration: 32, score: 92 },
  { id: 'v2', title: '职场新人逆袭指南', cover: 'https://picsum.photos/seed/ref2/160/90', duration: 45, score: 88 },
  { id: 'v3', title: '深夜食堂探店vlog', cover: 'https://picsum.photos/seed/ref3/160/90', duration: 28, score: 85 },
  { id: 'v4', title: '情感语录合集 治愈系', cover: 'https://picsum.photos/seed/ref4/160/90', duration: 60, score: 90 },
  { id: 'v5', title: '最新科技产品深度测评', cover: 'https://picsum.photos/seed/ref5/160/90', duration: 90, score: 95 },
  { id: 'v6', title: '一分钟学会穿搭技巧', cover: 'https://picsum.photos/seed/ref6/160/90', duration: 58, score: 83 },
];

interface StepStates {
  topicEval: StepStatus;
  outline: StepStatus;
  fullCopy: StepStatus;
  storyboard: StepStatus;
  prompts: StepStatus;
}

const ScriptPage: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [category, setCategory] = useState<string>('科技数码');
  const [targetDuration, setTargetDuration] = useState<number>(30);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [project, setProject] = useState<ScriptProject | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isEditingCopy, setIsEditingCopy] = useState<boolean>(false);
  const [fullCopyDraft, setFullCopyDraft] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const [stepStates, setStepStates] = useState<StepStates>({
    topicEval: 'pending',
    outline: 'pending',
    fullCopy: 'pending',
    storyboard: 'pending',
    prompts: 'pending',
  });

  const handleToggleVideo = useCallback((videoId: string) => {
    setSelectedVideos((prev) => {
      if (prev.includes(videoId)) {
        return prev.filter((id) => id !== videoId);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, videoId];
    });
  }, []);

  const updateStepState = useCallback(
    (step: keyof StepStates, status: StepStatus) => {
      setStepStates((prev) => ({ ...prev, [step]: status }));
    },
    [],
  );

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      logger.warn('选题不能为空');
      return;
    }
    setIsGenerating(true);

    // Reset to pending, then simulate step-by-step generation
    setStepStates({
      topicEval: 'pending',
      outline: 'pending',
      fullCopy: 'pending',
      storyboard: 'pending',
      prompts: 'pending',
    });

    const steps: (keyof StepStates)[] = [
      'topicEval',
      'outline',
      'fullCopy',
      'storyboard',
      'prompts',
    ];

    try {
      // Step 1: start loading first step
      updateStepState('topicEval', 'loading');

      // Call the real API once for full generation
      const result = await scriptApi.generateScript({
        topic: topic.trim(),
        category,
        targetDuration,
        referenceVideoIds: selectedVideos,
      });

      // Simulate sequential step reveals
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        updateStepState(step, 'loading');

        // Wait 800-1500ms per step for visual effect
        const delay = 800 + Math.random() * 700;
        await new Promise<void>((resolve) => {
          setTimeout(resolve, delay);
        });

        updateStepState(step, 'completed');

        // After first step completes, set project so UI starts showing content
        if (i === 0) {
          setProject(result);
          if (result.fullCopy) {
            setFullCopyDraft(result.fullCopy);
          }
        }
      }

      logger.info(`脚本生成成功: ${result.id}`);
    } catch (error) {
      logger.error('生成脚本失败', error);
    } finally {
      setIsGenerating(false);
    }
  }, [topic, category, targetDuration, selectedVideos, updateStepState]);

  const handleUpdateField = useCallback(
    async (patch: Partial<ScriptProject>) => {
      if (!project) return;
      try {
        const updated = await scriptApi.updateScript(project.id, patch);
        setProject(updated);
        logger.info('脚本更新成功');
      } catch (error) {
        logger.error('更新脚本失败', error);
      }
    },
    [project],
  );

  const handleSaveProject = useCallback(async () => {
    if (!project) return;
    setSaving(true);
    try {
      // Persist any local edits (storyboard, etc.)
      await scriptApi.updateScript(project.id, {
        topic: project.topic,
        category: project.category,
        targetDuration: project.targetDuration,
        referenceVideoIds: project.referenceVideoIds,
        fullCopy: fullCopyDraft,
        storyboard: project.storyboard,
      });
      logger.info('项目已保存');
    } catch (error) {
      logger.error('保存项目失败', error);
    } finally {
      setSaving(false);
    }
  }, [project, fullCopyDraft]);

  const handleSaveCopy = useCallback(() => {
    handleUpdateField({ fullCopy: fullCopyDraft });
    setIsEditingCopy(false);
  }, [fullCopyDraft, handleUpdateField]);

  const handleToggleEditCopy = useCallback(() => {
    if (isEditingCopy) {
      handleSaveCopy();
    } else {
      setIsEditingCopy(true);
    }
  }, [isEditingCopy, handleSaveCopy]);

  const handleRegenerateStep = useCallback(
    async (step: keyof StepStates) => {
      logger.info(`重新生成步骤: ${step}`);
      updateStepState(step, 'loading');
      // Simulated regeneration - in production would call specific API
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1200);
      });
      updateStepState(step, 'completed');
    },
    [updateStepState],
  );

  // Storyboard handlers
  const handleUpdateShot = useCallback(
    (
      shotId: number,
      field: keyof StoryboardShot,
      value: string | number,
    ) => {
      if (!project?.storyboard) return;
      const newShots: StoryboardShot[] = project.storyboard.shots.map(
        (shot) => (shot.id === shotId ? { ...shot, [field]: value } : shot),
      );
      setProject({
        ...project,
        storyboard: { shots: newShots },
      });
    },
    [project],
  );

  const handleAddShot = useCallback(() => {
    if (!project?.storyboard) return;
    const newId = Math.max(...project.storyboard.shots.map((s) => s.id), 0) + 1;
    const newShot: StoryboardShot = {
      id: newId,
      duration: 5,
      scene: '',
      line: '',
      camera: '固定镜头',
      sound: '环境音',
      subtitle: '',
      prompt: '',
    };
    setProject({
      ...project,
      storyboard: { shots: [...project.storyboard.shots, newShot] },
    });
  }, [project]);

  const handleDeleteShot = useCallback(
    (shotId: number) => {
      if (!project?.storyboard) return;
      const newShots: StoryboardShot[] = project.storyboard.shots.filter(
        (s) => s.id !== shotId,
      );
      setProject({
        ...project,
        storyboard: { shots: newShots },
      });
    },
    [project],
  );

  const handleMoveShot = useCallback(
    (shotId: number, direction: 'up' | 'down') => {
      if (!project?.storyboard) return;
      const shots: StoryboardShot[] = [...project.storyboard.shots];
      const index = shots.findIndex((s) => s.id === shotId);
      if (index === -1) return;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= shots.length) return;
      [shots[index], shots[newIndex]] = [shots[newIndex], shots[index]];
      setProject({
        ...project,
        storyboard: { shots },
      });
    },
    [project],
  );

  const handleUpdatePrompt = useCallback(
    (shotId: number, field: keyof StoryboardShot, value: string) => {
      handleUpdateShot(shotId, field, value);
    },
    [handleUpdateShot],
  );

  const handleExportStoryboard = useCallback(() => {
    if (!project?.storyboard) return;
    logger.info('导出分镜表');
    // In production: generate CSV/XLSX and trigger download
  }, [project]);

  const handleGoToProduce = useCallback(() => {
    logger.info('进入视频制作');
    // In production: navigate to /produce with scriptId
  }, []);

  const hasAnyResult = project !== null;
  const allDone = stepStates.topicEval === 'completed';

  return (
    <div className="min-h-full" style={{ backgroundColor: '#0a0e27' }}>
      {/* Page Header */}
      <div className="px-6 pt-6 pb-4">
        <h1
          className="text-2xl font-semibold leading-tight mb-2"
          style={{ color: '#00d4ff' }}
        >
          AI脚本工坊
        </h1>
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          输入选题，AI 一键生成从选题评估到分镜表的完整脚本
        </p>
      </div>

      {/* Main Content: Left Config + Right Steps */}
      <div className="flex gap-6 px-6 pb-6">
        {/* Left: Input Config Panel (320px) */}
        <aside
          className="flex-shrink-0 rounded-xl p-5 space-y-5 overflow-y-auto"
          style={{
            width: 320,
            backgroundColor: '#121738',
            border: '1px solid #1e293b',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            maxHeight: 'calc(100vh - 140px)',
            position: 'sticky',
            top: 24,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}
            >
              <Wand2 size={20} style={{ color: '#6366f1' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>
                脚本创作参数
              </h2>
              <p className="text-xs" style={{ color: '#64748b' }}>
                配置选题和参考素材
              </p>
            </div>
          </div>

          {/* Topic input */}
          <div>
            <label
              className="block text-sm font-medium mb-2 flex items-center gap-1.5"
              style={{ color: '#94a3b8' }}
            >
              <FileText size={14} />
              选题描述
            </label>
            <Textarea
              placeholder="输入你的选题或产品卖点..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="resize-none"
              rows={3}
              style={{
                borderColor: '#1e293b',
                color: '#e2e8f0',
                backgroundColor: 'rgba(10,14,39,0.5)',
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label
              className="block text-sm font-medium mb-2 flex items-center gap-1.5"
              style={{ color: '#94a3b8' }}
            >
              <Target size={14} />
              赛道分类
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                className="w-full"
                style={{
                  borderColor: '#1e293b',
                  color: '#e2e8f0',
                  backgroundColor: 'rgba(10,14,39,0.5)',
                }}
              >
                <SelectValue placeholder="选择赛道" />
              </SelectTrigger>
              <SelectContent
                style={{
                  backgroundColor: '#121738',
                  borderColor: '#1e293b',
                  color: '#e2e8f0',
                }}
              >
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div>
            <label
              className="block text-sm font-medium mb-2 flex items-center gap-1.5"
              style={{ color: '#94a3b8' }}
            >
              <Clock size={14} />
              视频时长
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((dur) => (
                <button
                  key={dur}
                  onClick={() => setTargetDuration(dur)}
                  className="py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor:
                      targetDuration === dur
                        ? 'rgba(99,102,241,0.2)'
                        : 'rgba(10,14,39,0.5)',
                    color: targetDuration === dur ? '#e2e8f0' : '#94a3b8',
                    border: `1px solid ${
                      targetDuration === dur ? '#6366f1' : '#1e293b'
                    }`,
                  }}
                >
                  {dur}秒
                </button>
              ))}
            </div>
          </div>

          {/* Reference videos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className="text-sm font-medium flex items-center gap-1.5"
                style={{ color: '#94a3b8' }}
              >
                <Video size={14} />
                参考视频
              </label>
              <span className="text-xs" style={{ color: '#64748b' }}>
                已选 {selectedVideos.length}/5
              </span>
            </div>
            <div
              className="space-y-2 max-h-64 overflow-y-auto pr-1"
              style={{ scrollbarWidth: 'thin' }}
            >
              {MOCK_REFERENCE_VIDEOS.map((video) => {
                const selected = selectedVideos.includes(video.id);
                return (
                  <div
                    key={video.id}
                    onClick={() => handleToggleVideo(video.id)}
                    className="flex gap-2 p-2 rounded-lg cursor-pointer transition-all"
                    style={{
                      backgroundColor: selected
                        ? 'rgba(99,102,241,0.1)'
                        : 'rgba(10,14,39,0.5)',
                      border: `1px solid ${
                        selected ? 'rgba(99,102,241,0.5)' : '#1e293b'
                      }`,
                    }}
                  >
                    <div className="relative flex-shrink-0 w-20 h-11 rounded overflow-hidden">
                      <Image
                        src={video.cover}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      {selected && (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            backgroundColor: 'rgba(99,102,241,0.4)',
                          }}
                        >
                          <Sparkles size={16} style={{ color: '#fff' }} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs font-medium truncate"
                        style={{ color: '#e2e8f0' }}
                      >
                        {video.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-[10px] flex items-center gap-0.5"
                          style={{ color: '#64748b' }}
                        >
                          <Clock size={10} />
                          {video.duration}s
                        </span>
                        <span
                          className="text-[10px] flex items-center gap-0.5"
                          style={{ color: '#f59e0b' }}
                        >
                          <Star size={10} />
                          {video.score}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
            }}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                AI生成中...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles size={16} />
                开始生成脚本
              </span>
            )}
          </button>
        </aside>

        {/* Right: Step Results Area */}
        <main className="flex-1 min-w-0">
          {hasAnyResult ? (
            <div className="space-y-4 pb-24">
              {project?.topicEval && (
                <StepTopicEval
                  topicEval={project.topicEval}
                  status={stepStates.topicEval}
                  onRegenerate={() => handleRegenerateStep('topicEval')}
                />
              )}

              {project?.outline && (
                <StepOutline
                  outline={project.outline}
                  status={stepStates.outline}
                  onRegenerate={() => handleRegenerateStep('outline')}
                />
              )}

              {project?.fullCopy && (
                <StepFullCopy
                  fullCopy={project.fullCopy}
                  isEditing={isEditingCopy}
                  draft={fullCopyDraft}
                  onDraftChange={setFullCopyDraft}
                  onToggleEdit={handleToggleEditCopy}
                  status={stepStates.fullCopy}
                  onRegenerate={() => handleRegenerateStep('fullCopy')}
                />
              )}

              {project?.storyboard && (
                <StepStoryboard
                  shots={project.storyboard.shots}
                  onUpdateShot={handleUpdateShot}
                  onAddShot={handleAddShot}
                  onDeleteShot={handleDeleteShot}
                  onMoveShot={handleMoveShot}
                  status={stepStates.storyboard}
                  onRegenerate={() => handleRegenerateStep('storyboard')}
                />
              )}

              {project?.storyboard && (
                <StepPrompts
                  shots={project.storyboard.shots}
                  onUpdateShot={handleUpdatePrompt}
                  status={stepStates.prompts}
                  onRegenerate={() => handleRegenerateStep('prompts')}
                />
              )}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center h-full rounded-xl p-12"
              style={{
                backgroundColor: '#121738',
                border: '1px solid #1e293b',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                minHeight: 500,
              }}
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}
              >
                <Sparkles size={36} style={{ color: '#6366f1' }} />
              </div>
              <h3
                className="text-xl font-semibold mb-2"
                style={{ color: '#e2e8f0' }}
              >
                开始创作你的爆款脚本
              </h3>
              <p
                className="text-sm text-center max-w-md mb-6"
                style={{ color: '#64748b' }}
              >
                在左侧填写选题信息，选择赛道和时长，
                还可以添加参考视频作为风格参考。
                点击「开始生成脚本」，AI 将为你逐步生成包含
                选题评估、脚本大纲、口播文案、分镜表和画面
                Prompt 的完整创作方案。
              </p>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#475569' }}>
                <span>5步生成流程</span>
                <ChevronRight size={12} />
                <span>选题评估</span>
                <ChevronRight size={12} />
                <span>脚本大纲</span>
                <ChevronRight size={12} />
                <span>口播文案</span>
                <ChevronRight size={12} />
                <span>分镜表</span>
                <ChevronRight size={12} />
                <span>画面Prompt</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Bottom Action Bar */}
      {allDone && project && (
        <div
          className="fixed bottom-0 left-60 right-0 px-6 py-4 flex items-center justify-between z-20"
          style={{
            backgroundColor: 'rgba(10,14,39,0.95)',
            borderTop: '1px solid #1e293b',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveProject}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: 'rgba(99,102,241,0.15)',
                color: '#c7d2fe',
                border: '1px solid rgba(99,102,241,0.3)',
              }}
            >
              <Save size={16} />
              {saving ? '保存中...' : '保存到项目'}
            </button>
            <button
              onClick={handleExportStoryboard}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{
                backgroundColor: 'rgba(148,163,184,0.1)',
                color: '#94a3b8',
                border: '1px solid #1e293b',
              }}
            >
              <FileDown size={16} />
              导出分镜表
            </button>
          </div>
          <button
            onClick={handleGoToProduce}
            className="flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
            style={{
              backgroundColor: '#00d4ff',
              color: '#0a0e27',
              boxShadow: '0 4px 20px rgba(0,212,255,0.4)',
            }}
          >
            进入视频制作
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ScriptPage;
