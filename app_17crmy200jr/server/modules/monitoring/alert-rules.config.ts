import type {
  PerformanceOverview,
  ErrorStats,
  BusinessMetricsOverview,
  SystemMetrics,
  AlertEvent,
} from '@shared/api.interface';

export interface AlertContext {
  performance: PerformanceOverview | null;
  errors: ErrorStats | null;
  business: BusinessMetricsOverview | null;
}

export interface AlertCheckResult {
  ruleId: string;
  ruleName: string;
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
}

export interface AlertRuleConfig {
  id: string;
  name: string;
  description: string;
  severity: 'warning' | 'critical';
  category: 'performance' | 'error' | 'business' | 'system';
  check: (context: AlertContext) => AlertCheckResult | null;
  cooldownMinutes: number;
}

export const ALERT_RULES: AlertRuleConfig[] = [
  // --- 性能规则 ---
  {
    id: 'perf-p95-high',
    name: 'P95响应时间过高',
    description: 'P95响应时间超过阈值',
    severity: 'warning',
    category: 'performance',
    check: (ctx: AlertContext): AlertCheckResult | null => {
      if (!ctx.performance) return null;
      const p95 = ctx.performance.p95Ms;
      if (p95 > 5000) {
        return {
          ruleId: 'perf-p95-high',
          ruleName: 'P95响应时间过高',
          severity: 'critical',
          message: `P95响应时间 ${p95}ms 超过严重阈值 5000ms`,
          value: p95,
          threshold: 5000,
        };
      }
      if (p95 > 2000) {
        return {
          ruleId: 'perf-p95-high',
          ruleName: 'P95响应时间过高',
          severity: 'warning',
          message: `P95响应时间 ${p95}ms 超过警告阈值 2000ms`,
          value: p95,
          threshold: 2000,
        };
      }
      return null;
    },
    cooldownMinutes: 10,
  },
  // --- 错误率规则 ---
  {
    id: 'error-rate-high',
    name: '错误率过高',
    description: '系统错误率超过阈值',
    severity: 'warning',
    category: 'error',
    check: (ctx: AlertContext): AlertCheckResult | null => {
      if (!ctx.performance || !ctx.errors) return null;
      const totalRequests = ctx.performance.totalRequests;
      if (totalRequests === 0) return null;
      const errorRate = (ctx.errors.total / totalRequests) * 100;
      if (errorRate > 10) {
        return {
          ruleId: 'error-rate-high',
          ruleName: '错误率过高',
          severity: 'critical',
          message: `错误率 ${errorRate.toFixed(1)}% 超过严重阈值 10%`,
          value: Math.round(errorRate * 100) / 100,
          threshold: 10,
        };
      }
      if (errorRate > 5) {
        return {
          ruleId: 'error-rate-high',
          ruleName: '错误率过高',
          severity: 'warning',
          message: `错误率 ${errorRate.toFixed(1)}% 超过警告阈值 5%`,
          value: Math.round(errorRate * 100) / 100,
          threshold: 5,
        };
      }
      return null;
    },
    cooldownMinutes: 15,
  },
  // --- 日支出超预算 ---
  {
    id: 'daily-expense-overrun',
    name: '日支出超预算',
    description: '日支出金额超过预算 120%',
    severity: 'warning',
    category: 'business',
    check: (ctx: AlertContext): AlertCheckResult | null => {
      if (!ctx.business) return null;
      const budget = ctx.business.budget;
      if (budget.totalBudget === 0) return null;
      const dailyBudget = budget.totalBudget / 30;
      const todayExpense = ctx.business.expenses.todayAmount;
      if (dailyBudget > 0 && todayExpense > dailyBudget * 1.2) {
        return {
          ruleId: 'daily-expense-overrun',
          ruleName: '日支出超预算',
          severity: 'warning',
          message: `今日支出 ${todayExpense} 超过日均预算 ${dailyBudget.toFixed(0)} 的 120%`,
          value: todayExpense,
          threshold: Math.round(dailyBudget * 1.2),
        };
      }
      return null;
    },
    cooldownMinutes: 60,
  },
  // --- 盘点完成率低 ---
  {
    id: 'inventory-completion-low',
    name: '盘点完成率过低',
    description: '盘点任务完成率低于 80%',
    severity: 'warning',
    category: 'business',
    check: (ctx: AlertContext): AlertCheckResult | null => {
      if (!ctx.business) return null;
      const inv = ctx.business.inventory;
      if (inv.totalTasks === 0) return null;
      if (inv.completionRate < 80) {
        return {
          ruleId: 'inventory-completion-low',
          ruleName: '盘点完成率过低',
          severity: 'warning',
          message: `盘点完成率 ${inv.completionRate.toFixed(1)}% 低于 80%`,
          value: Math.round(inv.completionRate * 100) / 100,
          threshold: 80,
        };
      }
      return null;
    },
    cooldownMinutes: 30,
  },
  // --- 内存使用率高 ---
  {
    id: 'memory-usage-high',
    name: '内存使用率过高',
    description: '系统内存使用率超过 80%',
    severity: 'warning',
    category: 'system',
    check: (ctx: AlertContext): AlertCheckResult | null => {
      if (!ctx.business) return null;
      const memUsage = ctx.business.system.memoryUsagePercent;
      if (memUsage > 80) {
        return {
          ruleId: 'memory-usage-high',
          ruleName: '内存使用率过高',
          severity: 'warning',
          message: `内存使用率 ${memUsage.toFixed(1)}% 超过 80%`,
          value: memUsage,
          threshold: 80,
        };
      }
      return null;
    },
    cooldownMinutes: 15,
  },
];