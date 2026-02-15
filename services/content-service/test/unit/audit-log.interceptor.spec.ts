import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { AuditLogInterceptor } from '../../src/common/interceptors/audit-log.interceptor';

// Mock PrismaClient constructor
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  })),
}));

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let mockPrisma: any;

  beforeEach(() => {
    interceptor = new AuditLogInterceptor();
    // Access the internal prisma instance for assertions
    mockPrisma = (interceptor as any).prisma;
    jest.clearAllMocks();
  });

  function createMockContext(
    method: string,
    url: string,
    user?: any,
    body?: any,
    params?: any,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          user,
          body,
          params: params || {},
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  function createMockCallHandler(response?: any): CallHandler {
    return {
      handle: () => of(response ?? { id: 'resp-1' }),
    };
  }

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  // ── GET requests (should pass through without logging) ────────

  describe('GET requests', () => {
    it('should pass through GET requests without logging', (done) => {
      const ctx = createMockContext('GET', '/api/v1/pages');
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
        },
        complete: () => done(),
      });
    });

    it('should pass through HEAD requests without logging', (done) => {
      const ctx = createMockContext('HEAD', '/api/v1/pages');
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
        },
        complete: () => done(),
      });
    });

    it('should pass through OPTIONS requests without logging', (done) => {
      const ctx = createMockContext('OPTIONS', '/api/v1/pages');
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
        },
        complete: () => done(),
      });
    });
  });

  // ── Mutating requests (should log) ────────────────────────────

  describe('mutating requests', () => {
    it('should log POST requests as create action', (done) => {
      const ctx = createMockContext(
        'POST',
        '/api/v1/pages',
        { sub: 'user-1' },
        { title: 'New Page' },
        {},
      );
      const next = createMockCallHandler({ id: 'page-1' });

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          // Give async logAction time to complete
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  userId: 'user-1',
                  action: 'create',
                  resourceType: 'pages',
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('should log PUT requests as update action', (done) => {
      const ctx = createMockContext(
        'PUT',
        '/api/v1/pages/page-1',
        { sub: 'user-1' },
        { title: 'Updated' },
        { id: 'page-1' },
      );
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  action: 'update',
                  resourceId: 'page-1',
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('should log PATCH requests as update action', (done) => {
      const ctx = createMockContext(
        'PATCH',
        '/api/v1/users/user-1',
        { sub: 'admin-1' },
        { name: 'New Name' },
        { id: 'user-1' },
      );
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  action: 'update',
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('should log DELETE requests as delete action', (done) => {
      const ctx = createMockContext(
        'DELETE',
        '/api/v1/pages/page-1',
        { sub: 'admin-1' },
        undefined,
        { id: 'page-1' },
      );
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  action: 'delete',
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });
  });

  // ── Special action URLs ───────────────────────────────────────

  describe('special action URLs', () => {
    it('should derive publish action from URL', (done) => {
      const ctx = createMockContext(
        'POST',
        '/api/v1/pages/page-1/publish',
        { sub: 'user-1' },
      );
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  action: 'publish',
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('should derive unpublish action from URL', (done) => {
      const ctx = createMockContext(
        'POST',
        '/api/v1/pages/page-1/unpublish',
        { sub: 'user-1' },
      );
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  action: 'unpublish',
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('should derive rollback action from URL', (done) => {
      const ctx = createMockContext(
        'POST',
        '/api/v1/pages/page-1/rollback/2',
        { sub: 'user-1' },
      );
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  action: 'rollback',
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('should derive upload action from URL', (done) => {
      const ctx = createMockContext(
        'POST',
        '/api/v1/media/upload',
        { sub: 'user-1' },
      );
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  action: 'upload',
                  resourceType: 'media',
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });
  });

  // ── Anonymous user handling ───────────────────────────────────

  describe('anonymous user handling', () => {
    it('should log anonymous when no user on request', (done) => {
      const ctx = createMockContext('POST', '/api/v1/pages', undefined, { title: 'Test' });
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  userId: 'anonymous',
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });
  });

  // ── Error handling ────────────────────────────────────────────

  describe('error handling in request', () => {
    it('should log errors from the request pipeline', (done) => {
      const ctx = createMockContext(
        'POST',
        '/api/v1/pages',
        { sub: 'user-1' },
        { title: 'Test' },
        { id: 'page-1' },
      );
      const error = { message: 'Something went wrong', status: 400 };
      const next: CallHandler = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(ctx, next).subscribe({
        error: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  userId: 'user-1',
                  action: 'create',
                  details: expect.objectContaining({
                    error: 'Something went wrong',
                    statusCode: 400,
                  }),
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('should default to 500 status when error has no status', (done) => {
      const ctx = createMockContext(
        'DELETE',
        '/api/v1/pages/page-1',
        { sub: 'user-1' },
        undefined,
        { id: 'page-1' },
      );
      const error = { message: 'Internal error' };
      const next: CallHandler = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(ctx, next).subscribe({
        error: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  details: expect.objectContaining({
                    statusCode: 500,
                  }),
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });
  });

  // ── Body sanitization ─────────────────────────────────────────

  describe('body sanitization', () => {
    it('should redact sensitive fields in body', (done) => {
      const ctx = createMockContext(
        'POST',
        '/api/v1/auth/login',
        { sub: 'user-1' },
        { email: 'test@example.com', password: 'secret123', token: 'abc' },
      );
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  details: expect.objectContaining({
                    body: expect.objectContaining({
                      email: 'test@example.com',
                      password: '[REDACTED]',
                      token: '[REDACTED]',
                    }),
                  }),
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('should handle undefined body', (done) => {
      const ctx = createMockContext(
        'DELETE',
        '/api/v1/pages/page-1',
        { sub: 'user-1' },
        undefined,
        { id: 'page-1' },
      );
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  details: expect.objectContaining({
                    body: undefined,
                  }),
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });
  });

  // ── Resource derivation ───────────────────────────────────────

  describe('resource derivation', () => {
    it('should derive unknown for non-matching URLs', (done) => {
      const ctx = createMockContext(
        'POST',
        '/health',
        { sub: 'user-1' },
      );
      const next = createMockCallHandler();

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  resourceType: 'unknown',
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });
  });

  // ── Audit log failure handling ────────────────────────────────

  describe('audit log failure handling', () => {
    it('should not break the request when audit logging fails', (done) => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('DB error'));
      const ctx = createMockContext(
        'POST',
        '/api/v1/pages',
        { sub: 'user-1' },
        { title: 'Test' },
      );
      const next = createMockCallHandler({ id: 'page-1' });

      // Should not throw - the interceptor catches the error
      interceptor.intercept(ctx, next).subscribe({
        next: (value) => {
          expect(value).toEqual({ id: 'page-1' });
        },
        complete: () => done(),
      });
    });
  });

  // ── ResourceId fallback ───────────────────────────────────────

  describe('resourceId extraction', () => {
    it('should use params.id when available', (done) => {
      const ctx = createMockContext(
        'PUT',
        '/api/v1/pages/page-1',
        { sub: 'user-1' },
        { title: 'Updated' },
        { id: 'page-1' },
      );
      const next = createMockCallHandler({ id: 'page-1' });

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  resourceId: 'page-1',
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });

    it('should fall back to response body id when no params.id', (done) => {
      const ctx = createMockContext(
        'POST',
        '/api/v1/pages',
        { sub: 'user-1' },
        { title: 'New' },
        {},
      );
      const next = createMockCallHandler({ id: 'new-page-1' });

      interceptor.intercept(ctx, next).subscribe({
        next: () => {
          setTimeout(() => {
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  resourceId: 'new-page-1',
                }),
              }),
            );
            done();
          }, 10);
        },
      });
    });
  });
});
