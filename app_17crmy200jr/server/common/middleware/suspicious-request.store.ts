import { Injectable, Logger } from '@nestjs/common';

export interface SuspiciousEvent {
  type: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  pattern: string;
  timestamp: string;
}

@Injectable()
export class SuspiciousRequestStore {
  private readonly logger = new Logger(SuspiciousRequestStore.name);
  private events: SuspiciousEvent[] = [];
  private readonly maxEvents = 500;

  recordEvent(event: Omit<SuspiciousEvent, 'timestamp'>): void {
    const entry: SuspiciousEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    this.events.unshift(entry);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }
  }

  getEvents(limit = 50): SuspiciousEvent[] {
    return this.events.slice(0, limit);
  }

  getStats(): { totalBlocked: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const event of this.events) {
      byType[event.type] = (byType[event.type] ?? 0) + 1;
    }
    return { totalBlocked: this.events.length, byType };
  }
}