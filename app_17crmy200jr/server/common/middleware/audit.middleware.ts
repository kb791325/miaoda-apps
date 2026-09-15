import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '@server/modules/audit-log/audit-log.service';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const traceId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();

    (req as unknown as Record<string, unknown>).traceId = traceId;

    const originalEnd = res.end.bind(res);
    res.end = ((...args: Parameters<Response['end']>) => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const auditStatus = statusCode >= 400 ? 'failed' : 'success';

      const userContext = (req as unknown as Record<string, unknown>).userContext as
        | { userId?: string; userName?: string }
        | undefined;

      this.auditLogService
        .logAction({
          traceId,
          userId: userContext?.userId || 'anonymous',
          userName: userContext?.userName || 'Anonymous',
          userDepartment: '',
          module: 'system',
          action: `${req.method} ${req.path}`,
          targetType: 'http_request',
          targetId: undefined,
          targetName: req.originalUrl,
          description: undefined,
          ipAddress: req.ip || req.socket.remoteAddress || undefined,
          userAgent: req.get('user-agent') || undefined,
          requestMethod: req.method,
          requestPath: req.originalUrl,
          status: auditStatus,
          errorMessage: statusCode >= 400 ? `HTTP ${statusCode}` : undefined,
          duration,
        })
        .catch((err: unknown) => {
          this.logger.error(
            `审计中间件写入失败: ${err instanceof Error ? err.message : String(err)}`,
          );
        });

      return originalEnd(...args);
    }) as Response['end'];

    next();
  }
}