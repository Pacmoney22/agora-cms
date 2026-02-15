import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { hasMinimumRole } from '@agora-cms/shared';

/**
 * ExhibitorGuard - Verifies user has exhibitor access to an event
 *
 * Grants access if:
 * 1. User has admin+ global role (hierarchy >= 4), OR
 * 2. User has event_staff role AND has EventStaffAssignment for the event, OR
 * 3. User has exhibitor role AND has ExhibitorAssignment for the event
 *
 * Usage: @UseGuards(JwtAuthGuard, ExhibitorGuard)
 *
 * Expects: request.params.eventId
 */
@Injectable()
export class ExhibitorGuard implements CanActivate {
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

    // Event staff can access exhibitor features
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

    // Exhibitors must have assignment
    if (userRole !== 'exhibitor') {
      throw new ForbiddenException('Access denied: insufficient permissions');
    }

    // Verify exhibitor assignment
    const assignment = await this.prisma.exhibitorAssignment.findFirst({
      where: {
        userId,
        eventId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException('You are not assigned as an exhibitor for this event');
    }

    request.exhibitorAssignment = assignment;
    return true;
  }
}
