export const TASK_STATUS_MAP: Record<string, string> = { processing: '处理中', completed: '已完成', failed: '失败' };
export const TASK_STATUS_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  processing: 'info', completed: 'success', failed: 'danger',
};
export const TASK_STATUS_OPTS = [
  { label: '处理中', value: 'processing' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
];
