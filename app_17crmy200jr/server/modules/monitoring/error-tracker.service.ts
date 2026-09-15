import { Injectable, Logger } from '@nestjs/common';
import { MonitoringStore } from './monitoring.store';
import type {
  ErrorEntry,
  ErrorStatus,
  ErrorStats,
} from '@shared/api.interface';

@Injectable()
export class ErrorTrackerService {
  private readonly logger = new Logger(ErrorTrackerService.name);
  private idCounter = 0;

  constructor(private readonly monitorStore: MonitoringStore) {}

  captureError(
    error: Error,
    context: { method: string; url: string; userId?: string },
  ): void {
    const type = error.constructor.name;
    const message = error.message;
    const stack = error.stack;

    const existing = this.monitorStore.findErrorByTypeAndMessage(type, message);

    if (existing) {
      this.monitorStore.updateError(existing.id, {
        count: existing.count + 1,
        lastSeen: new Date().toISOString(),
        stack: stack ?? existing.stack,
        context,
      });
      this.logger.log(
        `错误聚合: ${type} "${message}" (count: ${existing.count + 1})`,
      );
    } else {
      const entry: ErrorEntry = {
        id: this.generateId(),
        type,
        message,
        stack,
        context,
        count: 1,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        status: 'new',
      };
      this.monitorStore.recordError(entry);
      this.logger.warn(`新错误: ${type} "${message}"`);
    }
  }

  getErrors(
    page: number,
    pageSize: number,
    status?: ErrorStatus,
  ): { items: ErrorEntry[]; total: number } {
    return this.monitorStore.getErrors(page, pageSize, status);
  }

  getErrorById(id: string): ErrorEntry | undefined {
    return this.monitorStore.getErrorById(id);
  }

  getErrorStats(): ErrorStats {
    const allErrors = this.monitorStore.getAllErrors();
    const byStatus: Record<ErrorStatus, number> = {
      new: 0,
      acknowledged: 0,
      resolved: 0,
      ignored: 0,
    };
    const byType: Record<string, number> = {};

    for (const err of allErrors) {
      byStatus[err.status] = (byStatus[err.status] || 0) + 1;
      byType[err.type] = (byType[err.type] || 0) + 1;
    }

    const sorted = [...allErrors].sort(
      (a: ErrorEntry, b: ErrorEntry) => b.count - a.count,
    );
    const topErrors = sorted.slice(0, 10);

    // 趋势：最近 7 天每天错误数
    const trend: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = allErrors.filter(
        (e: ErrorEntry) => e.lastSeen.startsWith(dateStr),
      ).length;
      trend.push({ date: dateStr, count });
    }

    return {
      total: allErrors.length,
      byStatus,
      byType,
      topErrors,
      trend,
    };
  }

  updateErrorStatus(id: string, status: ErrorStatus): void {
    this.monitorStore.updateError(id, { status });
    this.logger.log(`错误 ${id} 状态更新为 ${status}`);
  }

  deleteError(id: string): void {
    this.monitorStore.deleteError(id);
    this.logger.log(`错误 ${id} 已删除`);
  }

  private generateId(): string {
    this.idCounter += 1;
    return `err_${Date.now()}_${this.idCounter}`;
  }
}