import { Test, TestingModule } from '@nestjs/testing';

import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

describe('AssignmentsController', () => {
  let controller: AssignmentsController;

  const mockAssignmentsService = {
    createInstructorAssignment: jest.fn(),
    getInstructorAssignmentsByUser: jest.fn(),
    getInstructorAssignmentsBySection: jest.fn(),
    deleteInstructorAssignment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssignmentsController],
      providers: [
        { provide: AssignmentsService, useValue: mockAssignmentsService },
      ],
    }).compile();

    controller = module.get<AssignmentsController>(AssignmentsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createInstructorAssignment', () => {
    it('should call assignmentsService.createInstructorAssignment', async () => {
      const dto = { userId: 'u1', courseSectionId: 's1' } as any;
      const req = { user: { sub: 'admin-1' } };
      mockAssignmentsService.createInstructorAssignment.mockResolvedValue({ id: 'ia1' });

      const response = await controller.createInstructorAssignment(dto, req);

      expect(response).toEqual({ id: 'ia1' });
      expect(mockAssignmentsService.createInstructorAssignment).toHaveBeenCalledWith(dto, 'admin-1');
    });
  });

  describe('getInstructorAssignmentsByUser', () => {
    it('should call assignmentsService.getInstructorAssignmentsByUser', async () => {
      mockAssignmentsService.getInstructorAssignmentsByUser.mockResolvedValue([{ id: 'ia1' }]);

      const response = await controller.getInstructorAssignmentsByUser('u1');

      expect(response).toEqual([{ id: 'ia1' }]);
    });
  });

  describe('getInstructorAssignmentsBySection', () => {
    it('should call assignmentsService.getInstructorAssignmentsBySection', async () => {
      mockAssignmentsService.getInstructorAssignmentsBySection.mockResolvedValue([{ id: 'ia1' }]);

      const response = await controller.getInstructorAssignmentsBySection('s1');

      expect(response).toEqual([{ id: 'ia1' }]);
    });
  });

  describe('deleteInstructorAssignment', () => {
    it('should call assignmentsService.deleteInstructorAssignment', async () => {
      mockAssignmentsService.deleteInstructorAssignment.mockResolvedValue({ success: true });

      const response = await controller.deleteInstructorAssignment('ia1');

      expect(response).toEqual({ success: true });
    });
  });
});
