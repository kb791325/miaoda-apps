import { Injectable, Logger } from '@nestjs/common';
import { MonitoringStore } from './monitoring.store';
import type { LogEntry, LogQueryParams, LogStats } from '@shared/api.interface';

@Injectable()
export class StructuredLoggerService {
  private readonly logger = new Logger(StructuredLoggerService.name);
  private idCounter = 0;

  constructor(private readonly monitorStore: MonitoringStore) {}

  log(
    level: LogEntry['level'],
    category: LogEntry['category'],
    message: string,
    context?: LogEntry['context'],
  ): void {
    const entry: LogEntry = {
      id: this.generateId(),
      level,
      category,
      message,
      context: context ?? {},
      timestamp: new Date().toISOString(),
    };

    this.monitorStore.appendLog(entry);

    // 同步输出到 NestJS Logger
    const ctxStr = context?.path
      ? ` [${context.path}]`
      : '';
    const userStr = context?.userId
      ? ` [user:${context.userId}]`
      : '';

    switch (level) {
      case 'error':
      case 'fatal':
        this.logger.error(`${category}${ctxStr}${userStr}: ${message}`);
        break;
      case 'warn':
        this.logger.warn(`${category}${ctxStr}${userStr}: ${message}`);
        break;
      case 'debug':
        this.logger.debug(`${category}${ctxStr}${userStr}: ${message}`);
        break;
      default:
        this.logger.log(`${category}${ctxStr}${userStr}: ${message}`);
        break;
    }
  }

  query(params: LogQueryParams): { items: LogEntry[]; total: number } {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    return this.monitorStore.queryLogs({
      startTime: params.startTime,
      endTime: params.endTime,
      level: params.level,
      category: params.category,
      keyword: params.keyword,
      page,
      pageSize,
    });
  }

  getStats(): LogStats {
    const stats = this.monitorStore.getLogStats();
    return {
      total: this.monitorStore.getLogCount(),
      byLevel: stats.byLevel,
      byCategory: stats.byCategory,
      lastError: stats.lastError,
    };
  }

  private generateId(): string {
    this.idCounter += 1;
    return `log_${Date.now()}_${this.idCounter}`;
  }
}