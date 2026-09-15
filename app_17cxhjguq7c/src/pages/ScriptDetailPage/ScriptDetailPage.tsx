import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clapperboard, Clock, Film } from 'lucide-react';

import { Button } from '@/components/ui/button';
import ReportCard from '@/components/ReportCard';
import { TaskStatusBadge } from '@/components/StatusBadge';
import { useWorkshop } from '@/lib/store';

function ShotField({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="mb-1 text-[9px] font-black uppercase tracking-tight text-slate-400">{label}</div>
      <p className={`text-[11px] font-medium leading-relaxed text-slate-600 ${accent ? 'border-l-2 border-[#0033A0] pl-2' : ''}`}>{value || '—'}</p>
    </div>
  );
}

export default function ScriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { scripts, tasks } = useWorkshop();
  const script = scripts.find((s) => s.id === id);

  if (!script) {
    return (
      <ReportCard className="py-16 text-center">
        <div className="text-sm font-bold text-slate-700">脚本不存在或已被删除</div>
        <Button type="button" variant="outline" onClick={() => navigate('/scripts')} className="mt-4 rounded-none">
          <ArrowLeft className="size-4" /> 返回脚本库
        </Button>
      </ReportCard>
    );
  }

  const totalDuration = script.shots.reduce((sum, s) => sum + s.durationSec, 0);
  const relatedTasks = tasks.filter((t) => t.linkedScript === script.scriptTitle);

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 rounded-none text-slate-500">
            <ArrowLeft className="size-4" /> 返回
          </Button>
          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-slate-800">{script.scriptTitle}</h1>
          <div className="mt-1 text-[10px] font-medium text-slate-400">
            {script.contentType} · 主题「{script.theme}」 · 更新于 {script.updatedAt}
          </div>
        </div>
        <Button type="button" className="mb-6 shrink-0 rounded-none" onClick={() => navigate('/tasks', { state: { linkedScript: script.scriptTitle } })}>
          <Clapperboard className="size-4" /> 创建生成任务
        </Button>
      </div>

      {/* 概览指标 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <ReportCard className="p-4">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-tight text-slate-400"><Film className="size-3" /> 分镜数量</div>
          <div className="mt-2 text-xl font-bold tabular-nums text-slate-800">{script.shots.length}</div>
        </ReportCard>
        <ReportCard className="p-4">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-tight text-slate-400"><Clock className="size-3" /> 总时长</div>
          <div className="mt-2 text-xl font-bold tabular-nums text-slate-800">{totalDuration}s</div>
        </ReportCard>
        <ReportCard className="p-4">
          <div className="text-[9px] font-black uppercase tracking-tight text-slate-400">关联任务</div>
          <div className="mt-2 text-xl font-bold tabular-nums text-slate-800">{relatedTasks.length}</div>
        </ReportCard>
        <ReportCard className="p-4">
          <div className="text-[9px] font-black uppercase tracking-tight text-slate-400">创建时间</div>
          <div className="mt-2 text-xs font-bold text-slate-800">{script.createdAt}</div>
        </ReportCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 分镜时间线 */}
        <div className="lg:col-span-2">
          <div className="mb-4 text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">分镜时间线</div>
          <div className="relative">
            <div className="absolute top-5 bottom-5 left-[19px] w-[1px] bg-slate-100" />
            {script.shots.map((shot) => (
              <div key={shot.shotNumber} className="relative flex gap-4 pb-4 last:pb-0">
                <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] bg-white transition-colors hover:border-[#0033A0]">
                  <span className="size-2 rounded-full bg-[#0033A0]" />
                </div>
                <ReportCard className="min-w-0 flex-1">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">分镜 {shot.shotNumber}</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-[2px] bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{shot.durationSec}s</span>
                      <span className="rounded-[2px] bg-[#0033A0]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#0033A0]">转场：{shot.transition}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="md:col-span-2"><ShotField label="画面描述" value={shot.sceneDescription} /></div>
                    <ShotField label="镜头语言" value={shot.cameraLanguage} />
                    <ShotField label="BGM 建议" value={shot.bgmSuggestion} />
                    <div className="md:col-span-2"><ShotField label="台词文案" value={shot.dialogue} accent /></div>
                    {shot.referenceVideo ? (
                      <div className="md:col-span-2">
                        <div className="mb-1 text-[9px] font-black uppercase tracking-tight text-slate-400">参考视频</div>
                        <span className="text-[11px] font-medium text-[#0033A0]">{shot.referenceVideo}</span>
                      </div>
                    ) : null}
                  </div>
                </ReportCard>
              </div>
            ))}
          </div>
        </div>

        {/* 关联任务 */}
        <div>
          <div className="mb-4 text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">关联生成任务</div>
          <ReportCard>
            {relatedTasks.length === 0 ? (
              <div className="py-8 text-center text-[11px] font-medium text-slate-400">暂无基于该脚本的生成任务</div>
            ) : (
              <ul className="space-y-3">
                {relatedTasks.map((task) => (
                  <li key={task.id}>
                    <Link to={`/tasks/${task.id}`} className="block border border-[#E2E8F0] p-3 transition-colors hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-bold text-slate-800">{task.taskName}</span>
                        <TaskStatusBadge status={task.status} />
                      </div>
                      <div className="mt-2 text-[10px] font-medium text-slate-400">{task.currentStage} · {task.progressPercent}%</div>
                      <div className="mt-1.5 h-1 w-full bg-slate-100">
                        <div className="h-full bg-[#0033A0]" style={{ width: `${task.progressPercent}%` }} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ReportCard>
        </div>
      </div>
    </div>
  );
}
