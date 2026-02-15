import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { AssignmentsService } from './assignments.service';

describe('AssignmentsService', () => {
  let service: AssignmentsService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    courseSection: {
      findUnique: jest.fn(),
    },
    instructorAssignment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createInstructorAssignment ────────────────────────────────────

  describe('createInstructorAssignment', () => {
    const dto = { userId: 'u1', courseSectionId: 's1' };

    it('should create an instructor assignment successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'instructor' });
      mockPrisma.courseSection.findUnique.mockResolvedValue({
        id: 's1',
        course: { id: 'c1' },
      });
      mockPrisma.instructorAssignment.findUnique.mockResolvedValue(null);
      const created = {
        id: 'ia1',
        userId: 'u1',
        courseSectionId: 's1',
        user: { id: 'u1', name: 'John', email: 'john@test.com', role: 'instructor' },
        courseSection: { id: 's1', title: 'Section 1', courseId: 'c1' },
      };
      mockPrisma.instructorAssignment.create.mockResolvedValue(created);

      const result = await service.createInstructorAssignment(dto, 'admin-1');

      expect(result).toEqual(created);
      expect(mockPrisma.instructorAssignment.create).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          courseSectionId: 's1',
          assignedBy: 'admin-1',
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          courseSection: { select: { id: true, title: true, courseId: true } },
        },
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createInstructorAssignment(dto, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createInstructorAssignment(dto, 'admin-1'),
      ).rejects.toThrow('User not found');
    });

    it('should throw ConflictException if user is not an instructor', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'customer' });

      await expect(
        service.createInstructorAssignment(dto, 'admin-1'),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.createInstructorAssignment(dto, 'admin-1'),
      ).rejects.toThrow('User must have instructor role to be assigned');
    });

    it('should throw NotFoundException if section does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'instructor' });
      mockPrisma.courseSection.findUnique.mockResolvedValue(null);

      await expect(
        service.createInstructorAssignment(dto, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createInstructorAssignment(dto, 'admin-1'),
      ).rejects.toThrow('Course section not found');
    });

    it('should throw ConflictException if assignment already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'instructor' });
      mockPrisma.courseSection.findUnique.mockResolvedValue({
        id: 's1',
        course: { id: 'c1' },
      });
      mockPrisma.instructorAssignment.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createInstructorAssignment(dto, 'admin-1'),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.createInstructorAssignment(dto, 'admin-1'),
      ).rejects.toThrow('Instructor is already assigned to this section');
    });
  });

  // ─── getInstructorAssignmentsByUser ────────────────────────────────

  describe('getInstructorAssignmentsByUser', () => {
    it('should return assignments for a user', async () => {
      const assignments = [
        {
          id: 'ia1',
          courseSection: {
            course: { id: 'c1', title: 'Course 1', slug: 'course-1' },
          },
        },
      ];
      mockPrisma.instructorAssignment.findMany.mockResolvedValue(assignments);

      const result = await service.getInstructorAssignmentsByUser('u1');

      expect(result).toEqual(assignments);
      expect(mockPrisma.instructorAssignment.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        include: expect.objectContaining({
          courseSection: expect.any(Object),
        }),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ─── getInstructorAssignmentsBySection ─────────────────────────────

  describe('getInstructorAssignmentsBySection', () => {
    it('should return assignments for a section', async () => {
      const assignments = [
        {
          id: 'ia1',
          user: { id: 'u1', name: 'John', email: 'john@test.com' },
        },
      ];
      mockPrisma.instructorAssignment.findMany.mockResolvedValue(assignments);

      const result = await service.getInstructorAssignmentsBySection('s1');

      expect(result).toEqual(assignments);
      expect(mockPrisma.instructorAssignment.findMany).toHaveBeenCalledWith({
        where: { courseSectionId: 's1' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ─── deleteInstructorAssignment ────────────────────────────────────

  describe('deleteInstructorAssignment', () => {
    it('should delete an assignment', async () => {
      mockPrisma.instructorAssignment.findUnique.mockResolvedValue({ id: 'ia1' });
      mockPrisma.instructorAssignment.delete.mockResolvedValue(undefined);

      const result = await service.deleteInstructorAssignment('ia1');

      expect(result).toEqual({ success: true, message: 'Instructor assignment removed' });
      expect(mockPrisma.instructorAssignment.delete).toHaveBeenCalledWith({
        where: { id: 'ia1' },
      });
    });

    it('should throw NotFoundException if assignment does not exist', async () => {
      mockPrisma.instructorAssignment.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteInstructorAssignment('nonexistent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.deleteInstructorAssignment('nonexistent'),
      ).rejects.toThrow('Assignment not found');
    });
  });
});
