import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { SuspiciousRequestStore } from './suspicious-request.store';

const SQL_INJECTION_PATTERNS = [
  /(\bUNION\b.*\bSELECT\b)|(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i,
  /(\bDROP\b\s+\bTABLE\b)|(\bALTER\b\s+\bTABLE\b)/i,
  /(\bINSERT\b\s+\bINTO\b)|(\bDELETE\b\s+\bFROM\b)/i,
  /(';\s*--)/,
  /(\bOR\b\s+['"]?[^'"\s]+['"]?\s*=\s*['"]?[^'"\s]+['"]?)/i,
  /(\bUNION\b\s+ALL\b\s+\bSELECT\b)/i,
  /(%27|%22|%3B|%2D%2D)/i,
];

const XSS_PATTERNS = [
  /<script\b[^>]*>/i,
  /javascript\s*:/i,
  /\bon\w+\s*=\s*['"]?[^'"]*['"]?/i,
  /<iframe\b[^>]*>/i,
  /document\.cookie/i,
];

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\/|\.\.\\/,
  /\/etc\/passwd/i,
  /\/windows\/win\.ini/i,
  /%2e%2e%2f|%2e%2e%5c|%252e%252e%252f/i,
];

const SUSPICIOUS_UA_PATTERNS = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /burpsuite/i,
  /acunetix/i,
  /netsparker/i,
];

@Injectable()
export class SuspiciousRequestMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SuspiciousRequestMiddleware.name);

  constructor(private readonly store: SuspiciousRequestStore) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const url = req.originalUrl;
    const method = req.method;
    const ip = this.getClientIp(req);
    const userAgent = (req.headers['user-agent'] as string) ?? 'unknown';

    const queryString = req.url.includes('?') ? decodeURIComponent(req.url.split('?')[1]) : '';
    const bodyString = req.body && typeof req.body === 'string'
      ? decodeURIComponent(req.body)
      : decodeURIComponent(JSON.stringify(req.body ?? {}));
    const checkTarget = `${url} ${queryString} ${bodyString}`;

    const patterns = this.checkPatterns(checkTarget, userAgent);
    if (patterns.length > 0) {
      for (const pattern of patterns) {
        this.store.recordEvent({
          type: pattern.type,
          method,
          url,
          ip,
          userAgent,
          pattern: pattern.pattern,
        });
        this.logger.warn(
          `可疑请求 [${pattern.type}] ${method} ${url} — IP: ${ip} — Pattern: ${pattern.pattern}`,
        );
      }

      res.status(403).json({
        statusCode: 403,
        message: '请求被安全策略拦截',
      });
      return;
    }

    next();
  }

  private checkPatterns(target: string, userAgent: string): Array<{ type: string; pattern: string }> {
    const results: Array<{ type: string; pattern: string }> = [];

    for (const regex of SQL_INJECTION_PATTERNS) {
      if (regex.test(target)) {
        results.push({ type: 'SQL_INJECTION', pattern: regex.source });
        break;
      }
    }

    for (const regex of XSS_PATTERNS) {
      if (regex.test(target)) {
        results.push({ type: 'XSS', pattern: regex.source });
        break;
      }
    }

    for (const regex of PATH_TRAVERSAL_PATTERNS) {
      if (regex.test(target)) {
        results.push({ type: 'PATH_TRAVERSAL', pattern: regex.source });
        break;
      }
    }

    for (const regex of SUSPICIOUS_UA_PATTERNS) {
      if (regex.test(userAgent)) {
        results.push({ type: 'SUSPICIOUS_UA', pattern: regex.source });
        break;
      }
    }

    return results;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    return typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.ip ?? 'unknown';
  }
}