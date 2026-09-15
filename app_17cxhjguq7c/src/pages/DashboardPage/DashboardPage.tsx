import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, Cpu, FileText, History, PlayCircle, Sparkles } from 'lucide-react';

import ReportCard from '@/components/ReportCard';
import SectionHeader from '@/components/SectionHeader';
import { TaskStatusBadge } from '@/components/StatusBadge';
import { getQuickActions, recordQuickAction, useWorkshop } from '@/lib/store';

const QUICK_ACTIONS = [
  { label: '拆解视频', description: '抖音爆款素材 AI 拆解', path: '/materials', icon: Clapperboard },
  { label: '生成脚本', description: 'AI 生成分镜脚本', path: '/scripts', icon: Sparkles },
  { label: '创建任务', description: '发起视频生成任务', path: '/tasks', icon: Cpu },
  { label: '上传成品', description: '管理视频成品库', path: '/videos', icon: PlayCircle },
];

const ACTIVITY_DOT: Record<string, string> = {
  material: 'bg-[#0033A0]',
  script: 'bg-[#0066FF]',
  task: 'bg-[#4D94FF]',
  video: 'bg-[#99C2FF]',
  prompt: 'bg-slate-300',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { materials, scripts, tasks, videos, activities } = useWorkshop();
  const [history, setHistory] = useState<string[]>(() => getQuickActions());

  const runningTasks = tasks.filter((t) => t.status === 'running' || t.status === 'failed' || t.status === 'paused');
  const completedMaterials = materials.filter((m) => m.disassemblyStatus === 'completed').length;
  const totalShots = scripts.reduce((sum, s) => sum + s.shots.length, 0);
  const publishedVideos = videos.filter((v) => v.publishStatus === 'published').length;

  const kpis = [
    { label: '爆款素材 / MATERIALS', value: materials.length, aux: `已完成拆解 ${completedMaterials} 条` },
    { label: '分镜脚本 / SCRIPTS', value: scripts.length, aux: `共 ${totalShots} 个分镜` },
    { label: '生成任务 / TASKS', value: tasks.length, aux: `进行中 ${tasks.filter((t) => t.status === 'running').length} · 失败 ${tasks.filter((t) => t.status === 'failed').length}` },
    { label: '成品视频 / VIDEOS', value: videos.length, aux: `已发布 ${publishedVideos} 条` },
  ];

  function handleQuickAction(label: string, path: string) {
    recordQuickAction(label);
    setHistory(getQuickActions());
    navigate(path);
  }

  return (
    <div className="space-y-6">
      {/* 深蓝渐变 Banner（蓝图风格签名） */}
      <div className="relative overflow-hidden rounded-none bg-[linear-gradient(to_bottom_right,#001D4A,#0033A0,#004B93)] px-6 py-8 text-white shadow-md md:px-10 md:py-10">
        <div className="absolute top-0 right-0 h-full w-1/2 translate-x-1/4 skew-x-[-20deg] bg-white/5" />
        <div className="relative">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">AI Video Workshop · Overview</div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">AI视频创作工坊</h1>
          <p className="mt-2 text-sm font-medium tracking-wide text-blue-200/70">爆款拆解 → AI 脚本 → 视频生成 → 成品管理，全流程协作</p>
        </div>
      </div>

      {/* KPI 统计卡片 */}
      <section>
        <SectionHeader number="01" title="创作资产总览" subtitle="Creative asset overview from workspace data" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <ReportCard key={kpi.label} className="p-5">
              <div className="text-[9px] font-black uppercase tracking-tight text-slate-400">{kpi.label}</div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-slate-800">{kpi.value}</div>
              <div className="mt-1 text-[10px] font-medium text-slate-400">{kpi.aux}</div>
            </ReportCard>
          ))}
        </div>
      </section>

      {/* 快捷操作 */}
      <section>
        <SectionHeader number="02" title="快捷操作" subtitle="Quick actions to start creating" />
        <ReportCard>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => handleQuickAction(action.label, action.path)}
                  className="group flex flex-col items-start gap-2 border border-[#E2E8F0] p-4 text-left transition-colors hover:bg-slate-50"
                >
                  <Icon className="size-5 text-[#0033A0]" />
                  <div className="text-sm font-bold text-slate-800">{action.label}</div>
                  <div className="text-[10px] font-medium text-slate-400">{action.description}</div>
                </button>
              );
            })}
          </div>
          {history.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E2E8F0] pt-3">
              <History className="size-3 text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-tight text-slate-400">最近使用</span>
              {history.map((label) => (
                <span key={label} className="rounded-[2px] bg-[#0033A0]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#0033A0]">
                  {label}
                </span>
              ))}
            </div>
          )}
        </ReportCard>
      </section>

      {/* 最近动态 + 待处理任务 */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ReportCard className="lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">最近动态</div>
            <FileText className="size-3.5 text-slate-300" />
          </div>
          <ul className="space-y-3">
            {activities.slice(0, 5).map((activity) => (
              <li key={activity.id} className="flex gap-3 border-l-2 border-slate-100 pl-3">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${ACTIVITY_DOT[activity.type] ?? 'bg-slate-300'}`} />
                <div className="min-w-0">
                  <div className="text-[11px] font-medium leading-relaxed text-slate-600">{activity.message}</div>
                  <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                    {activity.operator} · {activity.time}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ReportCard>

        <ReportCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-black uppercase tracking-[0.15em] text-[#0033A0]">待处理任务</div>
              <span className="rounded-[2px] bg-[#FEF2F2] px-1.5 py-0.5 text-[10px] font-bold text-[#EF4444]">{runningTasks.length} 项待跟进</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/tasks?status=running')}
              className="text-[10px] font-bold uppercase tracking-widest text-[#0033A0] hover:underline"
            >
              查看全部
            </button>
          </div>
          {runningTasks.length === 0 ? (
            <div className="py-10 text-center text-[11px] font-medium text-slate-400">暂无进行中或失败的任务</div>
          ) : (
            <ul className="divide-y divide-[#E2E8F0]">
              {runningTasks.slice(0, 4).map((task) => (
                <li key={task.id}>
                  <button type="button" onClick={() => navigate(`/tasks/${task.id}`)} className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-bold text-slate-800">{task.taskName}</span>
                        <TaskStatusBadge status={task.status} />
                      </div>
                      <div className="mt-1 text-[10px] font-medium text-slate-400">
                        {task.currentStage} · 关联脚本「{task.linkedScript}」
                      </div>
                    </div>
                    <div className="w-28 shrink-0 text-right">
                      <div className="text-xs font-bold tabular-nums text-slate-800">{task.progressPercent}%</div>
                      <div className="mt-1 h-1 w-full bg-slate-100">
                        <div className="h-full bg-[#0033A0]" style={{ width: `${task.progressPercent}%` }} />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ReportCard>
      </section>
    </div>
  );
}
