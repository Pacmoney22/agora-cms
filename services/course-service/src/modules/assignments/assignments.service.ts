import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { CreateInstructorAssignmentDto } from './dto/create-instructor-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async createInstructorAssignment(dto: CreateInstructorAssignmentDto, assignedBy: string) {
    // Verify user exists and has instructor role
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'instructor') {
      throw new ConflictException('User must have instructor role to be assigned');
    }

    // Verify section exists
    const section = await this.prisma.courseSection.findUnique({
      where: { id: dto.courseSectionId },
      include: { course: true },
    });

    if (!section) {
      throw new NotFoundException('Course section not found');
    }

    // Check for duplicate assignment
    const existing = await this.prisma.instructorAssignment.findUnique({
      where: {
        userId_courseSectionId: {
          userId: dto.userId,
          courseSectionId: dto.courseSectionId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Instructor is already assigned to this section');
    }

    // Create assignment
    return this.prisma.instructorAssignment.create({
      data: {
        userId: dto.userId,
        courseSectionId: dto.courseSectionId,
        assignedBy,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        courseSection: { select: { id: true, title: true, courseId: true } },
      },
    });
  }

  async getInstructorAssignmentsByUser(userId: string) {
    return this.prisma.instructorAssignment.findMany({
      where: { userId },
      include: {
        courseSection: {
          include: {
            course: { select: { id: true, title: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInstructorAssignmentsBySection(sectionId: string) {
    return this.prisma.instructorAssignment.findMany({
      where: { courseSectionId: sectionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteInstructorAssignment(assignmentId: string) {
    const assignment = await this.prisma.instructorAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    await this.prisma.instructorAssignment.delete({
      where: { id: assignmentId },
    });

    return { success: true, message: 'Instructor assignment removed' };
  }
}
