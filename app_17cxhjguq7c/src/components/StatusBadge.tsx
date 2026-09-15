import type { ITask } from '@/data/tasks';
import type { IVideo } from '@/data/videos';
import type { IMaterial } from '@/data/materials';
import { DISASSEMBLY_STATUS_LABELS } from '@/data/materials';
import { TASK_STATUS_OPTIONS } from '@/data/tasks';
import { PUBLISH_STATUS_OPTIONS } from '@/data/videos';

export type BadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'muted' | 'accent';

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-[#ECFDF5] text-[#10B981]',
  danger: 'bg-[#FEF2F2] text-[#EF4444]',
  warning: 'bg-[#FFFBEB] text-[#F59E0B]',
  info: 'bg-slate-100 text-slate-600',
  muted: 'bg-slate-100 text-slate-500',
  accent: 'bg-[#0033A0]/10 text-[#0033A0]',
};

export default function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return <span className={`inline-flex shrink-0 items-center rounded-[2px] px-1.5 py-0.5 text-[10px] font-bold ${TONE_CLASSES[tone]}`}>{label}</span>;
}

const TASK_TONES: Record<ITask['status'], BadgeTone> = {
  pending: 'muted',
  running: 'accent',
  paused: 'warning',
  completed: 'success',
  failed: 'danger',
  cancelled: 'muted',
};

export function taskStatusLabel(status: ITask['status']): string {
  return TASK_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function TaskStatusBadge({ status }: { status: ITask['status'] }) {
  return <StatusBadge label={taskStatusLabel(status)} tone={TASK_TONES[status]} />;
}

const PUBLISH_TONES: Record<IVideo['publishStatus'], BadgeTone> = {
  draft: 'muted',
  published: 'success',
  withdrawn: 'warning',
  archived: 'info',
};

export function publishStatusLabel(status: IVideo['publishStatus']): string {
  return PUBLISH_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function PublishStatusBadge({ status }: { status: IVideo['publishStatus'] }) {
  return <StatusBadge label={publishStatusLabel(status)} tone={PUBLISH_TONES[status]} />;
}

const MATERIAL_TONES: Record<IMaterial['disassemblyStatus'], BadgeTone> = {
  pending: 'muted',
  processing: 'warning',
  completed: 'success',
  failed: 'danger',
};

export function MaterialStatusBadge({ status }: { status: IMaterial['disassemblyStatus'] }) {
  return <StatusBadge label={DISASSEMBLY_STATUS_LABELS[status]} tone={MATERIAL_TONES[status]} />;
}

const LEVEL_TONES: Record<IMaterial['ratingLevel'], BadgeTone> = {
  S: 'accent',
  A: 'info',
  B: 'muted',
  C: 'muted',
};

export function RatingLevelBadge({ level }: { level: IMaterial['ratingLevel'] }) {
  return <StatusBadge label={`${level}级`} tone={LEVEL_TONES[level]} />;
}
