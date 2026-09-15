import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { AuditLogService } from '@server/modules/audit-log/audit-log.service';

export const AUDIT_ACTION_KEY = 'audit_action';

export interface AuditActionMetadata {
  module: string;
  action: string;
  targetType: string;
}

export const AuditAction = (
  module: string,
  action: string,
  targetType: string,
) => SetMetadata(AUDIT_ACTION_KEY, { module, action, targetType });

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const metadata = this.reflector.get<AuditActionMetadata>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const traceId =
      ((request as unknown as Record<string, unknown>).traceId as string) ||
      `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();

    const userContext = (request as unknown as Record<string, unknown>).userContext as
      | { userId?: string; userName?: string }
      | undefined;

    const beforeData = { ...request.body } as Record<string, unknown>;

    return next.handle().pipe(
      tap({
        next: (responseData: unknown) => {
          this.auditLogService
            .logAction({
              traceId,
              userId: userContext?.userId || 'anonymous',
              userName: userContext?.userName || 'Anonymous',
              userDepartment: '',
              module: metadata.module,
              action: metadata.action,
              targetType: metadata.targetType,
              targetId: undefined,
              targetName: undefined,
              description: undefined,
              beforeData,
              afterData: responseData as Record<string, unknown>,
              ipAddress: request.ip || undefined,
              userAgent: request.get('user-agent') || undefined,
              requestMethod: request.method,
              requestPath: request.path,
              status: 'success',
              duration: Date.now() - startTime,
            })
            .catch((err: unknown) => {
              this.logger.error(
                `审计拦截器写入失败: ${err instanceof Error ? err.message : String(err)}`,
              );
            });
        },
        error: (error: Error) => {
          this.auditLogService
            .logAction({
              traceId,
              userId: userContext?.userId || 'anonymous',
              userName: userContext?.userName || 'Anonymous',
              userDepartment: '',
              module: metadata.module,
              action: metadata.action,
              targetType: metadata.targetType,
              targetId: undefined,
              targetName: undefined,
              description: undefined,
              beforeData,
              ipAddress: request.ip || undefined,
              userAgent: request.get('user-agent') || undefined,
              requestMethod: request.method,
              requestPath: request.path,
              status: 'failed',
              errorMessage: error.message,
              duration: Date.now() - startTime,
            })
            .catch((err: unknown) => {
              this.logger.error(
                `审计拦截器写入失败: ${err instanceof Error ? err.message : String(err)}`,
              );
            });
        },
      }),
    );
  }
}