import { Injectable, Logger } from '@nestjs/common';
import { MonitoringStore } from './monitoring.store';
import {
  ALERT_RULES,
  type AlertRuleConfig,
  type AlertCheckResult,
} from './alert-rules.config';
import type {
  AlertEvent,
  AlertStats,
  PerformanceOverview,
  ErrorStats,
  BusinessMetricsOverview,
} from '@shared/api.interface';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private idCounter = 0;

  private latestPerformance: PerformanceOverview | null = null;
  private latestErrors: ErrorStats | null = null;
  private latestBusiness: BusinessMetricsOverview | null = null;

  constructor(private readonly monitorStore: MonitoringStore) {}

  updateContext(
    performance: PerformanceOverview | null,
    errors: ErrorStats | null,
    business: BusinessMetricsOverview | null,
  ): void {
    this.latestPerformance = performance;
    this.latestErrors = errors;
    this.latestBusiness = business;
  }

  checkAllRules(): AlertEvent[] {
    const triggered: AlertEvent[] = [];
    const now = new Date();

    for (const rule of ALERT_RULES) {
      const result: AlertCheckResult | null = rule.check({
        performance: this.latestPerformance,
        errors: this.latestErrors,
        business: this.latestBusiness,
      });

      if (!result) continue;

      // 冷却期检查
      const existing = this.monitorStore.findActiveAlertByRuleId(rule.id);
      if (existing) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        const triggeredTime = new Date(existing.triggeredAt).getTime();
        if (now.getTime() - triggeredTime < cooldownMs) {
          continue;
        }

        // 告警升级：warning 持续 60 分钟自动升级为 critical
        const ageMs = now.getTime() - triggeredTime;
        if (
          existing.severity === 'warning' &&
          result.severity === 'warning' &&
          ageMs >= 60 * 60 * 1000
        ) {
          this.monitorStore.updateAlert(existing.id, {
            severity: 'critical',
            message: `${existing.message} (自动升级: 持续超过60分钟)`,
          });
          this.logger.warn(`告警升级: ${existing.ruleName} warning → critical`);
        }
        continue;
      }

      const alert: AlertEvent = {
        id: this.generateId(),
        ruleId: result.ruleId,
        ruleName: result.ruleName,
        severity: result.severity,
        message: result.message,
        triggeredAt: now.toISOString(),
        status: 'active',
        value: result.value,
        threshold: result.threshold,
      };

      this.monitorStore.recordAlert(alert);
      triggered.push(alert);
      this.logger.warn(
        `告警触发: [${result.severity}] ${result.message}`,
      );
    }

    return triggered;
  }

  getActiveAlerts(): AlertEvent[] {
    return this.monitorStore.getActiveAlerts();
  }

  getAlerts(
    page: number,
    pageSize: number,
    status?: string,
  ): { items: AlertEvent[]; total: number } {
    return this.monitorStore.getAlerts(page, pageSize, status);
  }

  getAlertStats(): AlertStats {
    const allAlerts = this.monitorStore.getAllAlerts();
    let active = 0;
    let acknowledged = 0;
    let resolved = 0;
    let warning = 0;
    let critical = 0;

    for (const alert of allAlerts) {
      switch (alert.status) {
        case 'active':
          active += 1;
          break;
        case 'acknowledged':
          acknowledged += 1;
          break;
        case 'resolved':
          resolved += 1;
          break;
      }
      if (alert.severity === 'warning') warning += 1;
      else critical += 1;
    }

    return {
      active,
      acknowledged,
      resolved,
      total: allAlerts.length,
      bySeverity: { warning, critical },
    };
  }

  acknowledgeAlert(id: string): void {
    const alert = this.monitorStore.getAlertById(id);
    if (!alert) {
      this.logger.warn(`告警 ${id} 不存在`);
      return;
    }
    this.monitorStore.updateAlert(id, {
      status: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
    });
    this.logger.log(`告警 ${id} 已确认`);
  }

  resolveAlert(id: string): void {
    const alert = this.monitorStore.getAlertById(id);
    if (!alert) {
      this.logger.warn(`告警 ${id} 不存在`);
      return;
    }
    this.monitorStore.updateAlert(id, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
    this.logger.log(`告警 ${id} 已解决`);
  }

  private generateId(): string {
    this.idCounter += 1;
    return `alert_${Date.now()}_${this.idCounter}`;
  }
}