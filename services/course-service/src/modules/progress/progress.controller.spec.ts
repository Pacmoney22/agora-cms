import { Test, TestingModule } from '@nestjs/testing';

import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

describe('ProgressController', () => {
  let controller: ProgressController;

  const mockProgressService = {
    updateLessonProgress: jest.fn(),
    getLessonProgress: jest.fn(),
    getEnrollmentProgress: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressController],
      providers: [
        { provide: ProgressService, useValue: mockProgressService },
      ],
    }).compile();

    controller = module.get<ProgressController>(ProgressController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateLessonProgress', () => {
    it('should call progressService.updateLessonProgress', async () => {
      const dto = { completed: true, timeSpent: 15 };
      mockProgressService.updateLessonProgress.mockResolvedValue({ id: 'p1' });

      const response = await controller.updateLessonProgress('e1', 'l1', dto as any);

      expect(response).toEqual({ id: 'p1' });
      expect(mockProgressService.updateLessonProgress).toHaveBeenCalledWith('e1', 'l1', true, 15);
    });
  });

  describe('getLessonProgress', () => {
    it('should call progressService.getLessonProgress', async () => {
      mockProgressService.getLessonProgress.mockResolvedValue({ id: 'p1' });

      const response = await controller.getLessonProgress('e1', 'l1');

      expect(response).toEqual({ id: 'p1' });
    });
  });

  describe('getEnrollmentProgress', () => {
    it('should call progressService.getEnrollmentProgress', async () => {
      mockProgressService.getEnrollmentProgress.mockResolvedValue({ overallProgress: 67 });

      const response = await controller.getEnrollmentProgress('e1');

      expect(response).toEqual({ overallProgress: 67 });
    });
  });
});
