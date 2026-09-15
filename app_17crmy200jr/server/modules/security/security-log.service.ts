import { Injectable, Logger } from '@nestjs/common';
import { SuspiciousRequestStore, type SuspiciousEvent } from '../../common/middleware/suspicious-request.store';

export type { SuspiciousEvent };

@Injectable()
export class SecurityLogService {
  private readonly logger = new Logger(SecurityLogService.name);
  private customEvents: SuspiciousEvent[] = [];
  private readonly maxEvents = 500;

  constructor(private readonly suspiciousStore: SuspiciousRequestStore) {}

  logEvent(event: Omit<SuspiciousEvent, 'timestamp'>): void {
    const entry: SuspiciousEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    this.customEvents.unshift(entry);
    if (this.customEvents.length > this.maxEvents) {
      this.customEvents = this.customEvents.slice(0, this.maxEvents);
    }
    this.logger.warn(
      `安全事件 [${entry.type}] ${entry.method} ${entry.url} — IP: ${entry.ip}`,
    );
  }

  getSuspiciousEvents(limit = 50): SuspiciousEvent[] {
    return this.suspiciousStore.getEvents(limit);
  }

  getCustomEvents(limit = 50): SuspiciousEvent[] {
    return this.customEvents.slice(0, limit);
  }

  getAllEvents(limit = 50): SuspiciousEvent[] {
    const merged = [
      ...this.customEvents,
      ...this.suspiciousStore.getEvents(),
    ];
    merged.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return merged.slice(0, limit);
  }

  getStats(): {
    totalBlocked: number;
    byType: Record<string, number>;
    customEventCount: number;
  } {
    const suspiciousStats = this.suspiciousStore.getStats();
    return {
      totalBlocked: suspiciousStats.totalBlocked,
      byType: suspiciousStats.byType,
      customEventCount: this.customEvents.length,
    };
  }

  getAuditReport(): Record<string, unknown> {
    return {
      generatedAt: new Date().toISOString(),
      suspiciousStats: this.suspiciousStore.getStats(),
      customEventCount: this.customEvents.length,
      recentEvents: this.getAllEvents(20),
      summary: {
        totalEvents: this.suspiciousStore.getStats().totalBlocked + this.customEvents.length,
        highSeverity: this.customEvents.filter((e) => e.type === 'AUTH_FAILURE' || e.type === 'PERMISSION_DENIED').length,
      },
    };
  }
}