import { toast } from 'sonner';

import { ITask } from '@/data/tasks';
import { persistErrorText, updateTask } from '@/lib/store';

export type TaskAction = 'start' | 'pause' | 'resume' | 'retry' | 'cancel';

/** 任务状态流转：先写入多维表格，成功后才更新 UI 并提示 */
export async function transitionTask(task: ITask, action: TaskAction): Promise<void> {
  const patch: Partial<ITask> = {};
  let successText = '';
  switch (action) {
    case 'start':
      Object.assign(patch, { status: 'running', currentStage: '生成参考图', progressPercent: 5 });
      successText = `任务「${task.taskName}」已开始`;
      break;
    case 'pause':
      Object.assign(patch, { status: 'paused' });
      successText = `任务「${task.taskName}」已暂停`;
      break;
    case 'resume':
      Object.assign(patch, { status: 'running' });
      successText = `任务「${task.taskName}」已继续`;
      break;
    case 'retry':
      Object.assign(patch, { status: 'running', currentStage: '待生成', progressPercent: 0, errorLog: '' });
      successText = `任务「${task.taskName}」已重新排队`;
      break;
    case 'cancel':
      Object.assign(patch, { status: 'cancelled', currentStage: '待生成' });
      successText = `任务「${task.taskName}」已取消`;
      break;
  }
  toast.info('正在更新任务状态…');
  try {
    await updateTask(task.id, patch);
    toast.success(successText);
  } catch (error) {
    toast.error(persistErrorText(error, '任务状态更新失败'));
  }
}
