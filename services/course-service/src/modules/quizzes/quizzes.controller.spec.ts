import { Test, TestingModule } from '@nestjs/testing';

import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';

describe('QuizzesController', () => {
  let controller: QuizzesController;

  const mockQuizzesService = {
    findByLessonId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    submitAttempt: jest.fn(),
    getAttempts: jest.fn(),
    getAttemptById: jest.fn(),
    createQuestion: jest.fn(),
    updateQuestion: jest.fn(),
    deleteQuestion: jest.fn(),
    gradeEssay: jest.fn(),
    getPendingGrading: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizzesController],
      providers: [
        { provide: QuizzesService, useValue: mockQuizzesService },
      ],
    }).compile();

    controller = module.get<QuizzesController>(QuizzesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findByLessonId', () => {
    it('should call quizzesService.findByLessonId', async () => {
      mockQuizzesService.findByLessonId.mockResolvedValue([{ id: 'q1' }]);

      const response = await controller.findByLessonId('l1');

      expect(response).toEqual([{ id: 'q1' }]);
    });
  });

  describe('create', () => {
    it('should call quizzesService.create', async () => {
      const dto = { title: 'Quiz 1', questions: [] } as any;
      mockQuizzesService.create.mockResolvedValue({ id: 'q1' });

      const response = await controller.create('l1', dto);

      expect(response).toEqual({ id: 'q1' });
      expect(mockQuizzesService.create).toHaveBeenCalledWith('l1', dto);
    });
  });

  describe('findById', () => {
    it('should call quizzesService.findById', async () => {
      mockQuizzesService.findById.mockResolvedValue({ id: 'q1' });

      const response = await controller.findById('q1');

      expect(response).toEqual({ id: 'q1' });
    });
  });

  describe('update', () => {
    it('should call quizzesService.update', async () => {
      const dto = { title: 'Updated' } as any;
      mockQuizzesService.update.mockResolvedValue({ id: 'q1' });

      const response = await controller.update('q1', dto);

      expect(response).toEqual({ id: 'q1' });
    });
  });

  describe('remove', () => {
    it('should call quizzesService.remove', async () => {
      mockQuizzesService.remove.mockResolvedValue(undefined);

      await controller.remove('q1');

      expect(mockQuizzesService.remove).toHaveBeenCalledWith('q1');
    });
  });

  describe('submitAttempt', () => {
    it('should call quizzesService.submitAttempt with correct args', async () => {
      const dto = { enrollmentId: 'e1', answers: [{ questionId: 'qn1', answer: 'a' }] } as any;
      mockQuizzesService.submitAttempt.mockResolvedValue({ id: 'a1' });

      const response = await controller.submitAttempt('q1', dto);

      expect(response).toEqual({ id: 'a1' });
      expect(mockQuizzesService.submitAttempt).toHaveBeenCalledWith('q1', 'e1', dto.answers);
    });
  });

  describe('getAttempts', () => {
    it('should call quizzesService.getAttempts', async () => {
      mockQuizzesService.getAttempts.mockResolvedValue([{ id: 'a1' }]);

      const response = await controller.getAttempts('q1', 'e1');

      expect(response).toEqual([{ id: 'a1' }]);
    });
  });

  describe('getAttemptById', () => {
    it('should call quizzesService.getAttemptById', async () => {
      mockQuizzesService.getAttemptById.mockResolvedValue({ id: 'a1' });

      const response = await controller.getAttemptById('a1');

      expect(response).toEqual({ id: 'a1' });
    });
  });

  describe('createQuestion', () => {
    it('should call quizzesService.createQuestion', async () => {
      const dto = { questionType: 'essay', questionText: 'Discuss.' } as any;
      mockQuizzesService.createQuestion.mockResolvedValue({ id: 'qn1' });

      const response = await controller.createQuestion('q1', dto);

      expect(response).toEqual({ id: 'qn1' });
    });
  });

  describe('updateQuestion', () => {
    it('should call quizzesService.updateQuestion', async () => {
      const dto = { questionText: 'Updated' } as any;
      mockQuizzesService.updateQuestion.mockResolvedValue({ id: 'qn1' });

      const response = await controller.updateQuestion('qn1', dto);

      expect(response).toEqual({ id: 'qn1' });
    });
  });

  describe('deleteQuestion', () => {
    it('should call quizzesService.deleteQuestion', async () => {
      mockQuizzesService.deleteQuestion.mockResolvedValue(undefined);

      await controller.deleteQuestion('qn1');

      expect(mockQuizzesService.deleteQuestion).toHaveBeenCalledWith('qn1');
    });
  });

  describe('gradeEssay', () => {
    it('should call quizzesService.gradeEssay with correct args', async () => {
      const dto = { pointsAwarded: 15, gradedBy: 'inst-1', feedback: 'Good' } as any;
      mockQuizzesService.gradeEssay.mockResolvedValue({ id: 'a1' });

      const response = await controller.gradeEssay('a1', dto);

      expect(response).toEqual({ id: 'a1' });
      expect(mockQuizzesService.gradeEssay).toHaveBeenCalledWith('a1', 15, 'inst-1', 'Good');
    });
  });

  describe('getPendingGrading', () => {
    it('should call quizzesService.getPendingGrading', async () => {
      mockQuizzesService.getPendingGrading.mockResolvedValue([{ id: 'a1' }]);

      const response = await controller.getPendingGrading('inst-1');

      expect(response).toEqual([{ id: 'a1' }]);
      expect(mockQuizzesService.getPendingGrading).toHaveBeenCalledWith('inst-1');
    });
  });
});
