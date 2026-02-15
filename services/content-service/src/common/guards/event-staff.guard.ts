import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { hasMinimumRole } from '@agora-cms/shared';

/**
 * EventStaffGuard - Verifies user has event staff access to an event
 *
 * Grants access if:
 * 1. User has admin+ global role (hierarchy >= 4), OR
 * 2. User has event_staff role AND has EventStaffAssignment for the event
 *
 * Usage: @UseGuards(JwtAuthGuard, EventStaffGuard)
 *
 * Expects: request.params.eventId
 */
@Injectable()
export class EventStaffGuard implements CanActivate {
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

    // Event staff must have assignment
    if (userRole !== 'event_staff') {
      throw new ForbiddenException('Access denied: insufficient permissions');
    }

    // Extract eventId from params
    const eventId = request.params.eventId;

    if (!eventId) {
      throw new ForbiddenException('Event ID is required');
    }

    // Verify event staff assignment
    const assignment = await this.prisma.eventStaffAssignment.findFirst({
      where: {
        userId,
        eventId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException('You are not assigned as staff for this event');
    }

    request.eventStaffAssignment = assignment;
    return true;
  }
}
