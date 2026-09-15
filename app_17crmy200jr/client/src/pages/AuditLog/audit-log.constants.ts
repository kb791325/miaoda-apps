export const MODULES = [
  { value: '', label: '全部模块' },
  { value: 'expenses', label: '支出管理' },
  { value: 'fixed_assets', label: '资产管理' },
  { value: 'inventory', label: '盘点执行' },
  { value: 'categories', label: '类目管理' },
  { value: 'budget', label: '预算管理' },
  { value: 'system', label: '系统管理' },
  { value: 'auth', label: '认证登录' },
];

export const OPERATION_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'create', label: '新增' },
  { value: 'update', label: '修改' },
  { value: 'delete', label: '删除' },
  { value: 'approve', label: '审批' },
  { value: 'borrow', label: '借出' },
  { value: 'return', label: '归还' },
  { value: 'login', label: '登录' },
  { value: 'export', label: '导出' },
  { value: 'import', label: '导入' },
];

export const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'success', label: '成功' },
  { value: 'failure', label: '失败' },
];

export const TYPE_BADGE_MAP: Record<
  string,
  { label: string; className: string }
> = {
  create: {
    label: '新增',
    className: 'border-green-200 bg-green-50 text-green-700',
  },
  update: {
    label: '修改',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  delete: {
    label: '删除',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  approve: {
    label: '审批',
    className: 'border-purple-200 bg-purple-50 text-purple-700',
  },
  borrow: {
    label: '借出',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  return: {
    label: '归还',
    className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  login: {
    label: '登录',
    className: 'border-gray-200 bg-gray-50 text-gray-500',
  },
  export: {
    label: '导出',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  import: {
    label: '导入',
    className: 'border-green-200 bg-green-50 text-green-700',
  },
};

export const MODULE_LABEL_MAP: Record<string, string> = {
  expenses: '支出管理',
  fixed_assets: '资产管理',
  inventory: '盘点执行',
  categories: '类目管理',
  budget: '预算管理',
  system: '系统管理',
  auth: '认证登录',
};

export function getTypeBadge(type: string) {
  return (
    TYPE_BADGE_MAP[type] ?? {
      label: type || '未知',
      className: 'border-border bg-accent/50 text-muted-foreground',
    }
  );
}

export function getModuleLabel(module: string): string {
  return MODULE_LABEL_MAP[module] ?? (module || '—');
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}