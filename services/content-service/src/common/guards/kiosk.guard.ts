import { hasMinimumRole } from '@agora-cms/shared';
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * KioskGuard - Verifies user has kiosk access to an event
 *
 * Grants access if:
 * 1. User has admin+ global role (hierarchy >= 4), OR
 * 2. User has event_staff role AND has EventStaffAssignment for the event, OR
 * 3. User has kiosk_user role AND has KioskAssignment for the event
 *
 * Usage: @UseGuards(JwtAuthGuard, KioskGuard)
 *
 * Expects: request.params.eventId
 *
 * Note: Kiosk users are system accounts for self-check-in terminals.
 * They should have very limited permissions - typically only check-in operations.
 */
@Injectable()
export class KioskGuard implements CanActivate {
  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    const userRole = request.user?.role;

    if (!userId || !userRole) {
      throw new ForbiddenException('User not authenticated');
    }

    // Admins and super_admins always have access
    if (hasMinimumRole(userRole, 'admin')) {
      return true;
    }

    // Extract eventId from params
    const eventId = request.params.eventId;

    if (!eventId) {
      throw new ForbiddenException('Event ID is required');
    }

    // Event staff can access kiosk features
    if (userRole === 'event_staff') {
      const staffAssignment = await this.prisma.eventStaffAssignment.findFirst({
        where: {
          userId,
          eventId,
        },
      });

      if (staffAssignment) {
        request.eventStaffAssignment = staffAssignment;
        return true;
      }
    }

    // Kiosk users must have assignment
    if (userRole !== 'kiosk_user') {
      throw new ForbiddenException('Access denied: insufficient permissions');
    }

    // Verify kiosk assignment
    const assignment = await this.prisma.kioskAssignment.findFirst({
      where: {
        userId,
        eventId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException('This kiosk is not assigned to this event');
    }

    request.kioskAssignment = assignment;
    return true;
  }
}
