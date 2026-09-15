// 各一级模块下的特殊形态页面(待办聚合 / 树形 / 配置页等, 非普通数据表列表)
export interface SpecialEntry {
  path: string;
  label: string;
}

export const SPECIAL_NAV: Record<string, SpecialEntry[]> = {
  task: [
    { path: '/special/my-todo', label: '我的待办' },
    { path: '/approval', label: '审批中心' },
    { path: '/kanban', label: '任务看板' },
  ],
  hr: [
    { path: '/interview-calendar', label: '面试日历' },
  ],
  system: [
    { path: '/special/settings', label: '系统设置' },
    { path: '/special/role', label: '角色权限' },
    { path: '/system/audit-log', label: '操作日志' },
  ],
};
