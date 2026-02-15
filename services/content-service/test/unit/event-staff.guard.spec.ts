import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { EventStaffGuard } from '../../src/common/guards/event-staff.guard';

describe('EventStaffGuard', () => {
  let guard: EventStaffGuard;

  const mockPrisma = {
    eventStaffAssignment: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    guard = new EventStaffGuard(mockPrisma as any);
    jest.clearAllMocks();
  });

  function createMockContext(user: any, params: any = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw ForbiddenException when no user is on request', async () => {
    const ctx = createMockContext(undefined);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('User not authenticated');
  });

  it('should throw ForbiddenException when user has no sub', async () => {
    const ctx = createMockContext({ role: 'editor' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user has no role', async () => {
    const ctx = createMockContext({ sub: 'user-1' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow admin users without checking assignment', async () => {
    const ctx = createMockContext({ sub: 'user-1', role: 'admin' }, { eventId: 'event-1' });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockPrisma.eventStaffAssignment.findFirst).not.toHaveBeenCalled();
  });

  it('should allow super_admin users without checking assignment', async () => {
    const ctx = createMockContext({ sub: 'user-1', role: 'super_admin' }, { eventId: 'event-1' });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException for non-event_staff role (e.g., editor)', async () => {
    const ctx = createMockContext({ sub: 'user-1', role: 'editor' }, { eventId: 'event-1' });

    await expect(guard.canActivate(ctx)).rejects.toThrow('Access denied: insufficient permissions');
  });

  it('should throw ForbiddenException when event_staff has no eventId param', async () => {
    const ctx = createMockContext({ sub: 'user-1', role: 'event_staff' }, {});

    await expect(guard.canActivate(ctx)).rejects.toThrow('Event ID is required');
  });

  it('should allow event_staff with valid assignment', async () => {
    const assignment = { id: 'assign-1', userId: 'user-1', eventId: 'event-1' };
    mockPrisma.eventStaffAssignment.findFirst.mockResolvedValue(assignment);
    const request = { user: { sub: 'user-1', role: 'event_staff' }, params: { eventId: 'event-1' } } as any;
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.eventStaffAssignment).toEqual(assignment);
    expect(mockPrisma.eventStaffAssignment.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', eventId: 'event-1' },
    });
  });

  it('should throw ForbiddenException when event_staff has no assignment', async () => {
    mockPrisma.eventStaffAssignment.findFirst.mockResolvedValue(null);
    const ctx = createMockContext(
      { sub: 'user-1', role: 'event_staff' },
      { eventId: 'event-1' },
    );

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'You are not assigned as staff for this event',
    );
  });
});
