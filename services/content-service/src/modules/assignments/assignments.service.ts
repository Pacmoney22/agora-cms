import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import {
  CreateEventStaffAssignmentDto,
  CreateExhibitorAssignmentDto,
  CreateKioskAssignmentDto,
} from './dto/create-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  // ── Event Staff ──────────────────────────────────────────────────────

  async getEventStaffByUser(userId: string) {
    return this.prisma.eventStaffAssignment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEventStaff(dto: CreateEventStaffAssignmentDto, assignedBy: string) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.eventStaffAssignment.findFirst({
      where: { userId: dto.userId, eventId: dto.eventId },
    });
    if (existing) throw new ConflictException('User is already assigned as staff for this event');

    return this.prisma.eventStaffAssignment.create({
      data: { userId: dto.userId, eventId: dto.eventId, assignedBy },
    });
  }

  async deleteEventStaff(assignmentId: string) {
    const assignment = await this.prisma.eventStaffAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.prisma.eventStaffAssignment.delete({ where: { id: assignmentId } });
    return { success: true };
  }

  // ── Exhibitor ────────────────────────────────────────────────────────

  async getExhibitorsByUser(userId: string) {
    return this.prisma.exhibitorAssignment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createExhibitor(dto: CreateExhibitorAssignmentDto, assignedBy: string) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.exhibitorAssignment.findFirst({
      where: { userId: dto.userId, eventId: dto.eventId },
    });
    if (existing) throw new ConflictException('User is already an exhibitor for this event');

    return this.prisma.exhibitorAssignment.create({
      data: {
        userId: dto.userId,
        eventId: dto.eventId,
        boothNumber: dto.boothNumber,
        assignedBy,
      },
    });
  }

  async deleteExhibitor(assignmentId: string) {
    const assignment = await this.prisma.exhibitorAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.prisma.exhibitorAssignment.delete({ where: { id: assignmentId } });
    return { success: true };
  }

  // ── Kiosk ────────────────────────────────────────────────────────────

  async getKiosksByUser(userId: string) {
    return this.prisma.kioskAssignment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createKiosk(dto: CreateKioskAssignmentDto, assignedBy: string) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.kioskAssignment.findFirst({
      where: { userId: dto.userId, eventId: dto.eventId },
    });
    if (existing) throw new ConflictException('User already has a kiosk assignment for this event');

    return this.prisma.kioskAssignment.create({
      data: {
        userId: dto.userId,
        eventId: dto.eventId,
        kioskIdentifier: dto.kioskIdentifier,
        assignedBy,
      },
    });
  }

  async deleteKiosk(assignmentId: string) {
    const assignment = await this.prisma.kioskAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.prisma.kioskAssignment.delete({ where: { id: assignmentId } });
    return { success: true };
  }
}
