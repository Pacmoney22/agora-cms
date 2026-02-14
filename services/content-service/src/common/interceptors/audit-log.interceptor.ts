import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, params } = request;
    const user = request.user;
    const startTime = Date.now();

    // Only log mutating operations
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const duration = Date.now() - startTime;
          this.logAction({
            userId: user?.sub || 'anonymous',
            action: this.deriveAction(method, url),
            resource: this.deriveResource(url),
            resourceId: params?.id || responseBody?.id || null,
            details: {
              method,
              url,
              params,
              body: this.sanitizeBody(body),
              duration,
              statusCode: context.switchToHttp().getResponse().statusCode,
            },
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logAction({
            userId: user?.sub || 'anonymous',
            action: this.deriveAction(method, url),
            resource: this.deriveResource(url),
            resourceId: params?.id || null,
            details: {
              method,
              url,
              params,
              duration,
              error: error.message,
              statusCode: error.status || 500,
            },
          });
        },
      }),
    );
  }

  private async logAction(entry: {
    userId: string;
    action: string;
    resource: string;
    resourceId: string | null;
    details: Record<string, unknown>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resourceType: entry.resource,
          resourceId: entry.resourceId ?? '',
          details: entry.details as any,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      // Audit logging should never break the request flow
      this.logger.error(`Failed to write audit log: ${error}`);
    }
  }

  private deriveAction(method: string, url: string): string {
    // Check for specific action endpoints
    if (url.includes('/publish')) return 'publish';
    if (url.includes('/unpublish')) return 'unpublish';
    if (url.includes('/rollback')) return 'rollback';
    if (url.includes('/upload')) return 'upload';

    switch (method) {
      case 'POST':
        return 'create';
      case 'PUT':
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return method.toLowerCase();
    }
  }

  private deriveResource(url: string): string {
    // Extract the resource name from the URL path
    // e.g., /api/v1/pages/123/publish -> pages
    const match = url.match(/\/api\/v\d+\/(\w+)/);
    return match ? match[1]! : 'unknown';
  }

  private sanitizeBody(body: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!body) return undefined;

    // Remove sensitive fields from the logged body
    const sanitized = { ...body };
    const sensitiveKeys = ['password', 'secret', 'token', 'accessToken', 'refreshToken'];
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
