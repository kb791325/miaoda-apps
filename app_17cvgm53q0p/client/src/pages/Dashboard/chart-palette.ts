/** 仪表盘图表统一调色板（品牌蓝主系列 + 语义状态色，遵循 AGENTS 色彩系统） */
export const CHART_COLORS = {
  primary: '#3C83F6',
  primaryLight: '#9EC1FA',
  success: '#28BD78',
  warning: '#F4A825',
  danger: '#EF4444',
  muted: '#8F959E',
} as const;

/** 订单状态 → 语义色（待出库/运输中=警告系、在安装=主色系、已完成=成功、已取消=中性） */
export const STATUS_PIE_COLORS: Record<string, string> = {
  待出库: CHART_COLORS.warning,
  运输中: CHART_COLORS.primaryLight,
  在安装: CHART_COLORS.primary,
  已完成: CHART_COLORS.success,
  已取消: CHART_COLORS.muted,
};

/** 销售漏斗阶段色阶（线索→谈判中 同色系由浅到深，已成交用深绿；均满足文字对比度 ≥4.5:1） */
export const FUNNEL_STAGE_COLORS: Record<string, string> = {
  线索: '#BFDBFE',
  初步接触: '#93C5FD',
  需求确认: '#60A5FA',
  方案报价: '#2563EB',
  谈判中: '#1D4ED8',
  已成交: '#15803D',
};

/** 销售漏斗层内文字颜色（浅色层用深字、深色层用白字，保证对比度 ≥4.5:1） */
export const FUNNEL_STAGE_LABEL_COLORS: Record<string, string> = {
  线索: '#172554',
  初步接触: '#172554',
  需求确认: '#172554',
  方案报价: '#FFFFFF',
  谈判中: '#FFFFFF',
  已成交: '#FFFFFF',
};
