// 图表专用 hex 色板（蓝青主色调，专业商务风格）
// 注意：ECharts 不解析 CSS var，必须传 hex 字面量
export const CHART_COLORS = {
  primary: '#0EA5E9',      // 主色 - 天蓝
  secondary: '#06B6D4',    // 次色 - 青色
  success: '#10B981',      // 成功/上升 - 翠绿
  warning: '#F59E0B',      // 警告 - 琥珀
  danger: '#EF4444',       // 危险/下降 - 红色
  info: '#3B82F6',         // 信息 - 蓝色
  muted: '#94A3B8',        // 灰蓝 - 次要
  purple: '#8B5CF6',       // 紫色补充
  pink: '#EC4899',         // 粉色补充
  teal: '#14B8A6',         // 青绿补充
}

// 系列颜色数组（按顺序使用）
export const CHART_SERIES = [
  '#0EA5E9',
  '#06B6D4',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#F59E0B',
  '#EC4899',
  '#94A3B8',
]

// 渐变起始色（用于面积图 areaStyle）
export const CHART_GRADIENT = {
  primaryStart: 'rgba(14, 165, 233, 0.25)',
  primaryEnd: 'rgba(14, 165, 233, 0.02)',
  successStart: 'rgba(16, 185, 129, 0.2)',
  successEnd: 'rgba(16, 185, 129, 0.02)',
  warningStart: 'rgba(245, 158, 11, 0.2)',
  warningEnd: 'rgba(245, 158, 11, 0.02)',
}
