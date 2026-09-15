import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Circle, Clock, Film, Image as ImageIcon, Loader2, Pause, Play, RotateCcw, SquareSlash, Volume2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { capabilityClient, logger } from '@lark-apaas/client-toolkit-lite';
import type {
  AiVideoCreationWorkshopStoryboardImageGeneratorOneInput,
  AiVideoCreationWorkshopStoryboardImageGeneratorOneOutput,
  AiVideoCreationWorkshopTtsDubbingSynthesisOneInput,
  AiVideoCreationWorkshopTtsDubbingSynthesisOneOutput,
} from '@shared/plugin-types';

import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import ReportCard from '@/components/ReportCard';
import { TaskStatusBadge } from '@/components/StatusBadge';
import { transitionTask, type TaskAction } from '@/lib/task-actions';
import { persistErrorText, updateTask, useWorkshop } from '@/lib/store';

const STORYBOARD_IMAGE_PLUGIN_ID = 'ai_video_creation_workshop_storyboard_image_generator_1';
const TTS_PLUGIN_ID = 'ai_video_creation_workshop_tts_dubbing_synthesis_1';
const FEMALE_VOICE_LABELS = ['温柔女声', '活力女声', '可爱童声'];

const STAGES = [
  { name: '生成参考图', threshold: 20 },
  { name: '图生视频', threshold: 45 },
  { name: '配音中', threshold: 65 },
  { name: '字幕中', threshold: 85 },
  { name: '合成中', threshold: 100 },
];

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] py-2.5 last:border-b-0">
      <span className="shrink-0 text-[10px] font-black uppercase tracking-tight text-slate-400">{label}</span>
      <span className={`min-w-0 break-all text-right text-xs font-bold text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tasks, scripts, videos } = useWorkshop();
  const [imageGenerating, setImageGenerating] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  /** 任务状态流转：等待多维表格写入完成，期间按钮 loading */
  async function runTransition(action: TaskAction) {
    setTransitioning(true);
    try {
      await transitionTask(task, action);
    } finally {
      setTransitioning(false);
    }
  }
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return (
      <ReportCard className="py-16 text-center">
        <div className="text-sm font-bold text-slate-700">任务不存在或已被删除</div>
        <Button type="button" variant="outline" onClick={() => navigate('/tasks')} className="mt-4 rounded-none">
          <ArrowLeft className="size-4" /> 返回任务表
        </Button>
      </ReportCard>
    );
  }

  const script = scripts.find((s) => s.scriptTitle === task.linkedScript);
  const relatedVideos = videos.filter((v) => v.linkedTask === task.taskName);

  /** 调用内置 AI 生图插件，基于关联脚本分镜生成视频参考图 */
  async function handleGenerateStoryboardImage() {
    if (!script || script.shots.length === 0) {
      toast.error('未找到关联脚本或脚本无分镜，无法生成参考图');
      return;
    }
    setImageGenerating(true);
    try {
      // 先写入多维表格，成功后才更新本地状态
      await updateTask(task.id, {
        status: task.status === 'pending' ? 'running' : task.status,
        currentStage: '生成参考图',
        progressPercent: Math.max(task.progressPercent, 10),
      });
      const description = script.shots
        .slice(0, 3)
        .map((s) => `镜头${s.shotNumber}（${s.cameraLanguage}）：${s.sceneDescription}`)
        .join('\n');
      const input = {
        storyboard_description: description,
        aspect_ratio: task.resolution.includes('横屏') ? '16:9' : '9:16',
      } satisfies AiVideoCreationWorkshopStoryboardImageGeneratorOneInput;
      const result = await capabilityClient
        .load(STORYBOARD_IMAGE_PLUGIN_ID)
        .call<AiVideoCreationWorkshopStoryboardImageGeneratorOneOutput>('textToImage', input);
      const imageUrl = result.images?.[0];
      if (!imageUrl) {
        throw new Error('生图插件未返回图片');
      }
      await updateTask(task.id, {
        referenceImage: imageUrl,
        progressPercent: Math.max(task.progressPercent, 20),
        currentStage: '生成参考图',
      });
      toast.success('分镜参考图已生成并保存至任务');
    } catch (error) {
      logger.error('storyboard image generation failed:', String(error));
      toast.error(persistErrorText(error, '参考图生成失败'));
    } finally {
      setImageGenerating(false);
    }
  }

  /** 调用内置 TTS 插件合成关联脚本台词并试听 */
  async function handlePlayTts() {
    if (!script) {
      toast.error('未找到关联脚本，无法合成配音');
      return;
    }
    const lines = script.shots.map((s) => s.dialogue).filter((d) => d && d !== '—');
    const text = (lines.length > 0 ? lines.join('。') : task.taskName).slice(0, 3000);
    setTtsPlaying(true);
    try {
      const input = {
        script_text: text,
        voice_type: FEMALE_VOICE_LABELS.includes(task.ttsVoice)
          ? 'zh_female_qingxinnvsheng_mars_bigtts'
          : 'zh_male_qingshuangnanda_mars_bigtts',
      } satisfies AiVideoCreationWorkshopTtsDubbingSynthesisOneInput;
      const result = await capabilityClient
        .load(TTS_PLUGIN_ID)
        .call<AiVideoCreationWorkshopTtsDubbingSynthesisOneOutput>('speechSynthesis', input);
      if (!result.audioUrl) {
        throw new Error('TTS 插件未返回音频');
      }
      const audio = new Audio(result.audioUrl);
      audio.onended = () => setTtsPlaying(false);
      audio.onerror = () => setTtsPlaying(false);
      await audio.play();
      toast.success('TTS 配音已生成，正在播放试听');
    } catch (error) {
      setTtsPlaying(false);
      logger.error('tts synthesis failed:', String(error));
      toast.error(persistErrorText(error, 'TTS 合成失败'));
    }
  }

  function primaryAction(): { action: 'start' | 'pause' | 'resume' | 'retry'; label: string; icon: ReactNode } | null {
    switch (task.status) {
      case 'pending': return { action: 'start', label: '开始任务', icon: <Play className="size-4" /> };
      case 'running': return { action: 'pause', label: '暂停任务', icon: <Pause className="size-4" /> };
      case 'paused': return { action: 'resume', label: '继续任务', icon: <Play className="size-4" /> };
      case 'failed': return { action: 'retry', label: '重新生成', icon: <RotateCcw className="size-4" /> };
      default: return null;
    }
  }

  const primary = primaryAction();

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 rounded-none text-slate-500">
            <ArrowLeft className="size-4" /> 返回
          </Button>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800">{task.taskName}</h1>
            <TaskStatusBadge status={task.status} />
          </div>
          <div className="mt-1 text-[10px] font-medium text-slate-400">
            创建于 {task.createdAt} · 更新于 {task.updatedAt}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {primary && (
            <Button type="button" className="rounded-none" onClick={() => runTransition(primary.action)} disabled={transitioning}>
              {transitioning ? <Loader2 className="size-4 animate-spin" /> : primary.icon} {transitioning ? '处理中…' : primary.label}
            </Button>
          )}
          {task.status !== 'cancelled' && task.status !== 'completed' && (
            <Button type="button" variant="outline" className="rounded-none text-[#EF4444]" onClick={() => runTransition('cancel')} disabled={transitioning}>
              {transitioning ? <Loader2 className="size-4 animate-spin" /> : <SquareSlash className="size-4" />} {transitioning ? '处理中…' : '取消'}
            </Button>
          )}
          {task.status === 'completed' && (
            <Button type="button" className="rounded-none" onClick={() => navigate('/videos')}>
              <Film className="size-4" /> 查看成品视频
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 左列：进度 + 阶段时间线 */}
        <div className="space-y-6 lg:col-span-2">
          <ReportCard className="p-0">
            <div className="flex items-center justify-between p-4 pb-0">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">任务进度</div>
              {task.status === 'running' && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#0033A0]">
                  <Loader2 className="size-3 animate-spin" /> {task.currentStage}
                </span>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums tracking-tight text-slate-800">{task.progressPercent}</span>
                <span className="text-xs font-bold text-slate-400">%</span>
              </div>
              <div className="mt-3 h-1.5 w-full bg-slate-100">
                <div
                  className={`h-full transition-all ${task.status === 'failed' ? 'bg-[#EF4444]' : task.status === 'completed' ? 'bg-emerald-600' : 'bg-[#0033A0]'}`}
                  style={{ width: `${task.progressPercent}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[10px] font-medium text-slate-400">
                <span className="flex items-center gap-1"><Clock className="size-3" /> 预计完成：{task.estimatedFinishTime || '—'}</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="size-3" /> 实际完成：{task.actualFinishTime || '—'}</span>
              </div>
            </div>
            <div className="border-t border-[#E2E8F0]">
              {STAGES.map((stage, index) => {
                const done = task.progressPercent >= stage.threshold || task.status === 'completed';
                const active = !done && task.progressPercent >= (STAGES[index - 1]?.threshold ?? 0) && task.status === 'running';
                return (
                  <div key={stage.name} className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-2.5 last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      {done ? (
                        <CheckCircle2 className="size-3.5 text-[#0033A0]" />
                      ) : active ? (
                        <Loader2 className="size-3.5 animate-spin text-[#0033A0]" />
                      ) : (
                        <Circle className="size-3.5 text-slate-300" />
                      )}
                      <span className={`text-xs font-bold ${done || active ? 'text-slate-800' : 'text-slate-400'}`}>{stage.name}</span>
                      {active && <span className="rounded-[2px] bg-[#0033A0]/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-[#0033A0]">当前</span>}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{done ? '已完成' : active ? '进行中' : '待执行'}</span>
                  </div>
                );
              })}
            </div>
          </ReportCard>

          {/* 产出物 */}
          <ReportCard>
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">产出物</div>
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-tight text-slate-400">分段视频（{task.segmentVideos.length}）</div>
                {task.segmentVideos.length === 0 ? (
                  <div className="py-3 text-center text-[11px] font-medium text-slate-400">暂无分段视频</div>
                ) : (
                  <ul className="divide-y divide-[#E2E8F0] border border-[#E2E8F0]">
                    {task.segmentVideos.map((seg) => (
                      <li key={seg} className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-slate-600">
                        <Film className="size-3.5 shrink-0 text-slate-400" /> {seg}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-tight text-slate-400">成品视频</div>
                {task.finalVideo ? (
                  <div className="flex items-center gap-2 border border-[#E2E8F0] bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="size-3.5" /> {task.finalVideo}
                  </div>
                ) : (
                  <div className="border border-dashed border-[#E2E8F0] px-3 py-2 text-[11px] font-medium text-slate-400">暂未生成成品</div>
                )}
              </div>
              {relatedVideos.length > 0 && (
                <div>
                  <div className="mb-1 text-[10px] font-black uppercase tracking-tight text-slate-400">关联成品（{relatedVideos.length}）</div>
                  <div className="flex flex-wrap gap-2">
                    {relatedVideos.map((v) => (
                      <Link key={v.id} to={`/videos`} className="border border-[#E2E8F0] px-2 py-1 text-[11px] font-bold text-[#0033A0] transition-colors hover:bg-slate-50">
                        {v.videoTitle}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ReportCard>

          {/* 错误日志 */}
          {task.errorLog && (
            <ReportCard className="border-l-2 !border-l-[#EF4444]">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-[#EF4444]">
                <AlertTriangle className="size-3.5" /> 错误日志
              </div>
              <p className="font-mono text-[11px] leading-relaxed text-slate-600">{task.errorLog}</p>
            </ReportCard>
          )}
        </div>

        {/* 右列：配置信息 */}
        <div className="space-y-6">
          <ReportCard>
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">生成配置</div>
            <InfoRow label="关联脚本" value={script ? task.linkedScript : `${task.linkedScript}（未找到）`} />
            {script && (
              <div className="pb-2">
                <Link to={`/scripts/${script.id}`} className="text-[11px] font-bold text-[#0033A0] hover:underline">查看脚本详情 →</Link>
              </div>
            )}
            <InfoRow label="视频生成模型" value={task.videoModel} />
            <InfoRow label="图像生成模型" value={task.imageModel} />
            <InfoRow label="TTS 音色" value={task.ttsVoice} />
            <InfoRow label="分辨率" value={task.resolution} />
            <InfoRow label="参考图" value={task.referenceImage || '未设置'} />
          </ReportCard>

          {/* 内置 AI 能力 */}
          <ReportCard className="border-l-2 !border-l-[#0033A0]">
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">内置 AI 能力</div>
            <p className="mb-4 text-[10px] font-medium leading-relaxed text-slate-400">
              基于关联脚本分镜直接调用飞书妙搭内置 AI 插件（AI 生图 / 语音合成），无需任何第三方 API 配置。
            </p>
            <div className="flex flex-col gap-2">
              <Button type="button" className="rounded-none" onClick={handleGenerateStoryboardImage} disabled={imageGenerating}>
                {imageGenerating ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
                {imageGenerating ? '参考图生成中…' : 'AI 生成分镜参考图'}
              </Button>
              <Button type="button" variant="outline" className="rounded-none" onClick={handlePlayTts} disabled={ttsPlaying}>
                {ttsPlaying ? <Loader2 className="size-4 animate-spin" /> : <Volume2 className="size-4" />} {ttsPlaying ? '配音合成中…' : 'TTS 配音试听'}
              </Button>
            </div>
            {task.referenceImage && (
              <div className="mt-3 border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                <div className="mb-1.5 text-[10px] font-black uppercase tracking-tight text-slate-400">分镜参考图预览</div>
                <Image src={task.referenceImage} alt="分镜参考图" className="block max-h-64 w-full object-cover" />
              </div>
            )}
          </ReportCard>

          <ReportCard>
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">备注</div>
            <p className="text-[11px] font-medium leading-relaxed text-slate-600">{task.notes || '暂无备注'}</p>
          </ReportCard>
        </div>
      </div>
    </div>
  );
}
