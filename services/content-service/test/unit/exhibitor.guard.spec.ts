import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { ExhibitorGuard } from '../../src/common/guards/exhibitor.guard';

describe('ExhibitorGuard', () => {
  let guard: ExhibitorGuard;

  const mockPrisma = {
    eventStaffAssignment: {
      findFirst: jest.fn(),
    },
    exhibitorAssignment: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    guard = new ExhibitorGuard(mockPrisma as any);
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
    const ctx = createMockContext({ role: 'exhibitor' });

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
    expect(mockPrisma.exhibitorAssignment.findFirst).not.toHaveBeenCalled();
  });

  it('should allow super_admin users without checking assignment', async () => {
    const ctx = createMockContext({ sub: 'user-1', role: 'super_admin' }, { eventId: 'event-1' });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when non-admin, non-event_staff, non-exhibitor has no eventId', async () => {
    const ctx = createMockContext({ sub: 'user-1', role: 'editor' }, {});

    await expect(guard.canActivate(ctx)).rejects.toThrow('Event ID is required');
  });

  it('should allow event_staff with valid staff assignment', async () => {
    const staffAssignment = { id: 'assign-1', userId: 'user-1', eventId: 'event-1' };
    mockPrisma.eventStaffAssignment.findFirst.mockResolvedValue(staffAssignment);
    const request = { user: { sub: 'user-1', role: 'event_staff' }, params: { eventId: 'event-1' } } as any;
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.eventStaffAssignment).toEqual(staffAssignment);
  });

  it('should throw ForbiddenException for event_staff without assignment and not exhibitor role', async () => {
    mockPrisma.eventStaffAssignment.findFirst.mockResolvedValue(null);
    const ctx = createMockContext(
      { sub: 'user-1', role: 'event_staff' },
      { eventId: 'event-1' },
    );

    await expect(guard.canActivate(ctx)).rejects.toThrow('Access denied: insufficient permissions');
  });

  it('should throw ForbiddenException for non-exhibitor role without event_staff access', async () => {
    const ctx = createMockContext(
      { sub: 'user-1', role: 'editor' },
      { eventId: 'event-1' },
    );

    await expect(guard.canActivate(ctx)).rejects.toThrow('Access denied: insufficient permissions');
  });

  it('should allow exhibitor with valid exhibitor assignment', async () => {
    const assignment = { id: 'assign-1', userId: 'user-1', eventId: 'event-1', boothId: 'booth-1' };
    mockPrisma.exhibitorAssignment.findFirst.mockResolvedValue(assignment);
    const request = { user: { sub: 'user-1', role: 'exhibitor' }, params: { eventId: 'event-1' } } as any;
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.exhibitorAssignment).toEqual(assignment);
    expect(mockPrisma.exhibitorAssignment.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', eventId: 'event-1' },
    });
  });

  it('should throw ForbiddenException when exhibitor has no assignment', async () => {
    mockPrisma.exhibitorAssignment.findFirst.mockResolvedValue(null);
    const ctx = createMockContext(
      { sub: 'user-1', role: 'exhibitor' },
      { eventId: 'event-1' },
    );

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'You are not assigned as an exhibitor for this event',
    );
  });

  it('should throw ForbiddenException when exhibitor has no eventId', async () => {
    const ctx = createMockContext({ sub: 'user-1', role: 'exhibitor' }, {});

    await expect(guard.canActivate(ctx)).rejects.toThrow('Event ID is required');
  });
});
