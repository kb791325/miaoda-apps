import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { PerformanceMetricsStore } from './performance-metrics.store';

@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMiddleware.name);

  constructor(private readonly store: PerformanceMetricsStore) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();
    const requestSize = JSON.stringify(req.body ?? {}).length;

    const originalEnd = res.end.bind(res);
    res.end = ((...args: Parameters<Response['end']>) => {
      const elapsedNs = Number(process.hrtime.bigint() - start);
      const durationMs = Math.round(elapsedNs / 1e6);
      const responseSize = Number(res.getHeader('content-length') ?? 0);

      res.setHeader('X-Response-Time', `${durationMs}ms`);
      this.store.recordRequest(durationMs);

      if (durationMs > 500) {
        this.store.recordSlowRequest({
          method: req.method,
          url: req.originalUrl,
          durationMs,
          timestamp: new Date().toISOString(),
          requestSize,
          responseSize,
        });
        this.logger.warn(
          `慢请求 ${req.method} ${req.originalUrl} — ${durationMs}ms (req: ${requestSize}B, res: ${responseSize}B)`,
        );
      }

      return originalEnd(...args);
    }) as Response['end'];

    next();
  }
}