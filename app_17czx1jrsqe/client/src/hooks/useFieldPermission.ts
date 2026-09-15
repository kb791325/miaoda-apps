import { useMemo, useState } from 'react';
import { scopedStorage } from '@lark-apaas/client-toolkit';
import { useApp } from '@/context/AppContext';

export type FieldPermission = 'visible' | 'masked' | 'hidden';

export interface FieldPermissionConfig {
  key: string;           // 字段唯一标识，如 salary.basic、cost.amount
  label: string;         // 显示名称
  category: string;      // 分类
  module: string;        // 所属模块
}

const STORAGE_KEY = 'field_permissions_config';

// 默认字段配置（所有系统敏感字段登记）
export const FIELD_PERMISSION_FIELDS: FieldPermissionConfig[] = [
  // 人资 - 工资
  { key: 'salary.basic', label: '基本工资', category: '薪资', module: 'hr' },
  { key: 'salary.performance', label: '绩效工资', category: '薪资', module: 'hr' },
  { key: 'salary.allowance', label: '补贴', category: '薪资', module: 'hr' },
  { key: 'salary.deduction', label: '扣款', category: '薪资', module: 'hr' },
  { key: 'salary.net', label: '实发工资', category: '薪资', module: 'hr' },
  // 财务 - 成本/利润
  { key: 'finance.cost_amount', label: '成本金额', category: '财务', module: 'finance' },
  { key: 'finance.profit', label: '利润金额', category: '财务', module: 'finance' },
  { key: 'finance.income_amount', label: '收入金额', category: '财务', module: 'finance' },
  { key: 'finance.expense_amount', label: '支出金额', category: '财务', module: 'finance' },
  // 财务 - 余额/流水
  { key: 'finance.balance', label: '账户余额', category: '财务', module: 'finance' },
  { key: 'finance.bonus_balance', label: '赠款余额', category: '财务', module: 'finance' },
  { key: 'finance.cumulative_cost', label: '累计消耗', category: '财务', module: 'finance' },
  { key: 'finance.transaction_amount', label: '流水金额', category: '财务', module: 'finance' },
];

// 默认权限配置：admin 全部可见；其他角色按字段分级
const DEFAULT_PERMISSIONS: Record<string, Record<string, FieldPermission>> = {
  admin: Object.fromEntries(FIELD_PERMISSION_FIELDS.map(f => [f.key, 'visible'])),
  manager: Object.fromEntries(FIELD_PERMISSION_FIELDS.map(f => [f.key, 'visible'])),
  finance: Object.fromEntries(FIELD_PERMISSION_FIELDS.map(f => {
    if (f.module === 'hr' && f.category === '薪资') return [f.key, 'masked'];
    return [f.key, 'visible'];
  })),
  hr: Object.fromEntries(FIELD_PERMISSION_FIELDS.map(f => {
    if (f.module === 'finance') return [f.key, 'masked'];
    return [f.key, 'visible'];
  })),
  sales: Object.fromEntries(FIELD_PERMISSION_FIELDS.map(f => {
    if (f.category === '薪资') return [f.key, 'hidden'];
    if (f.key === 'finance.cost_amount' || f.key === 'finance.profit') return [f.key, 'masked'];
    if (f.key === 'finance.balance' || f.key === 'finance.bonus_balance') return [f.key, 'masked'];
    return [f.key, 'visible'];
  })),
};

// 从 localStorage 加载配置（用户修改过的）
function loadConfig(): Record<string, Record<string, FieldPermission>> {
  try {
    const raw = scopedStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

// 保存配置到 localStorage
function saveConfig(config: Record<string, Record<string, FieldPermission>>) {
  try {
    scopedStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}

// 合并：默认配置 + 用户自定义覆盖（含自定义角色）
function getMergedConfig(): Record<string, Record<string, FieldPermission>> {
  const custom = loadConfig();
  const merged: Record<string, Record<string, FieldPermission>> = {};
  Object.keys(DEFAULT_PERMISSIONS).forEach(role => {
    merged[role] = { ...DEFAULT_PERMISSIONS[role], ...(custom[role] || {}) };
  });
  // 自定义角色（custom_xxx）无默认配置，直接取已存覆盖项，未设置字段默认可见
  Object.keys(custom).forEach(role => {
    if (!merged[role]) merged[role] = { ...custom[role] };
  });
  return merged;
}

export function useFieldPermission() {
  const { user } = useApp();
  const role = user?.role || 'sales';

  // 版本号：更新/重置权限后触发 memo 重算，界面即时刷新
  const [version, setVersion] = useState(0);

  const permissions = useMemo(() => {
    const merged = getMergedConfig();
    return merged[role] || {};
  }, [role, version]);

  const allRolesConfig = useMemo(() => getMergedConfig(), [version]);

  // 查询单字段权限
  const getPermission = (fieldKey: string): FieldPermission => {
    return permissions[fieldKey] || 'visible';
  };

  // 是否可见（用于列显示判断）
  const isVisible = (fieldKey: string): boolean => {
    return permissions[fieldKey] !== 'hidden';
  };

  // 是否脱敏
  const isMasked = (fieldKey: string): boolean => {
    return permissions[fieldKey] === 'masked';
  };

  // 管理员修改角色权限
  const updateRolePermission = (roleKey: string, fieldKey: string, permission: FieldPermission) => {
    const config = loadConfig();
    if (!config[roleKey]) config[roleKey] = {};
    config[roleKey][fieldKey] = permission;
    saveConfig(config);
    setVersion((v) => v + 1);
  };

  // 重置为默认
  const resetDefaults = () => {
    try {
      scopedStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
    setVersion((v) => v + 1);
  };

  return {
    role,
    permissions,
    allRolesConfig,
    getPermission,
    isVisible,
    isMasked,
    updateRolePermission,
    resetDefaults,
  };
}

// 工具：脱敏金额
export function maskAmount(value: number | string, prefix = '¥'): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return `${prefix}****`;
  // 保留整数位的第一位，其余用 *
  const str = Math.floor(Math.abs(num)).toString();
  if (str.length <= 1) return `${prefix}*`;
  return `${prefix}${str[0]}${'*'.repeat(str.length - 1)}`;
}

// 工具：脱敏文本
export function maskText(value: string): string {
  if (!value) return '****';
  if (value.length <= 2) return value[0] + '*';
  return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
}
