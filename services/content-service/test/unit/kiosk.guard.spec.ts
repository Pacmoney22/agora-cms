import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { KioskGuard } from '../../src/common/guards/kiosk.guard';

describe('KioskGuard', () => {
  let guard: KioskGuard;

  const mockPrisma = {
    eventStaffAssignment: {
      findFirst: jest.fn(),
    },
    kioskAssignment: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    guard = new KioskGuard(mockPrisma as any);
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
    const ctx = createMockContext({ role: 'kiosk_user' });

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
    expect(mockPrisma.kioskAssignment.findFirst).not.toHaveBeenCalled();
  });

  it('should allow super_admin users without checking assignment', async () => {
    const ctx = createMockContext({ sub: 'user-1', role: 'super_admin' }, { eventId: 'event-1' });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when non-admin role has no eventId', async () => {
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

  it('should throw ForbiddenException for event_staff without assignment and not kiosk_user role', async () => {
    mockPrisma.eventStaffAssignment.findFirst.mockResolvedValue(null);
    const ctx = createMockContext(
      { sub: 'user-1', role: 'event_staff' },
      { eventId: 'event-1' },
    );

    await expect(guard.canActivate(ctx)).rejects.toThrow('Access denied: insufficient permissions');
  });

  it('should throw ForbiddenException for non-kiosk_user role without event_staff access', async () => {
    const ctx = createMockContext(
      { sub: 'user-1', role: 'editor' },
      { eventId: 'event-1' },
    );

    await expect(guard.canActivate(ctx)).rejects.toThrow('Access denied: insufficient permissions');
  });

  it('should allow kiosk_user with valid kiosk assignment', async () => {
    const assignment = { id: 'assign-1', userId: 'user-1', eventId: 'event-1', kioskId: 'kiosk-1' };
    mockPrisma.kioskAssignment.findFirst.mockResolvedValue(assignment);
    const request = { user: { sub: 'user-1', role: 'kiosk_user' }, params: { eventId: 'event-1' } } as any;
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.kioskAssignment).toEqual(assignment);
    expect(mockPrisma.kioskAssignment.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', eventId: 'event-1' },
    });
  });

  it('should throw ForbiddenException when kiosk_user has no assignment', async () => {
    mockPrisma.kioskAssignment.findFirst.mockResolvedValue(null);
    const ctx = createMockContext(
      { sub: 'user-1', role: 'kiosk_user' },
      { eventId: 'event-1' },
    );

    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'This kiosk is not assigned to this event',
    );
  });

  it('should throw ForbiddenException when kiosk_user has no eventId', async () => {
    const ctx = createMockContext({ sub: 'user-1', role: 'kiosk_user' }, {});

    await expect(guard.canActivate(ctx)).rejects.toThrow('Event ID is required');
  });
});
