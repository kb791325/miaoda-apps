import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  private readonly defaultMaxRequests = 100;
  private readonly windowMs = 60_000;
  private readonly maxEntries = 10_000;

  constructor() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (entry.resetAt <= now) {
          this.store.delete(key);
        }
      }
    }, 60_000);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const key = this.getClientKey(req);
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.windowMs };
      if (this.store.size >= this.maxEntries) {
        const firstKey = this.store.keys().next().value;
        if (firstKey) this.store.delete(firstKey);
      }
      this.store.set(key, entry);
    }

    const maxRequests = this.getMaxRequests(req);
    entry.count += 1;

    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > maxRequests) {
      this.logger.warn(`Rate limit exceeded for ${key} on ${req.method} ${req.originalUrl}`);
      res.status(429).json({
        statusCode: 429,
        message: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }

    next();
  }

  private getClientKey(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.ip ?? 'unknown';
    const ctx = (req as unknown as Record<string, unknown>).userContext as Record<string, string> | undefined;
    const userId = ctx?.userId;
    return userId ? `${ip}:${userId}` : ip;
  }

  private getMaxRequests(req: Request): number {
    const path = req.path;
    if (path.startsWith('/api/auth') || path.startsWith('/api/login')) {
      return 10;
    }
    if (path.startsWith('/api/performance/frontend')) {
      return 200;
    }
    return this.defaultMaxRequests;
  }
}