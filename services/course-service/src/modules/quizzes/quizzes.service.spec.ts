import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';

import { QuizzesService } from './quizzes.service';

describe('QuizzesService', () => {
  let service: QuizzesService;

  const mockPrisma = {
    courseLesson: {
      findUnique: jest.fn(),
    },
    quiz: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    quizQuestion: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    quizAttempt: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    courseEnrollment: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: 'PRISMA', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<QuizzesService>(QuizzesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findByLessonId ───────────────────────────────────────────────

  describe('findByLessonId', () => {
    it('should return quizzes for a given lesson', async () => {
      mockPrisma.courseLesson.findUnique.mockResolvedValue({ id: 'l1' });
      const quizzes = [{ id: 'q1', questions: [] }];
      mockPrisma.quiz.findMany.mockResolvedValue(quizzes);

      const result = await service.findByLessonId('l1');

      expect(result).toEqual(quizzes);
      expect(mockPrisma.quiz.findMany).toHaveBeenCalledWith({
        where: { lessonId: 'l1' },
        include: { questions: true },
      });
    });

    it('should throw NotFoundException if lesson does not exist', async () => {
      mockPrisma.courseLesson.findUnique.mockResolvedValue(null);

      await expect(service.findByLessonId('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findById ──────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return a quiz with lesson and questions', async () => {
      const quiz = {
        id: 'q1',
        lesson: { id: 'l1', title: 'Lesson 1', courseSectionId: 's1' },
        questions: [{ id: 'qn1' }],
      };
      mockPrisma.quiz.findUnique.mockResolvedValue(quiz);

      const result = await service.findById('q1');

      expect(result).toEqual(quiz);
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('nonexistent')).rejects.toThrow(
        'Quiz with id "nonexistent" not found',
      );
    });
  });

  // ─── create ────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a quiz with default config values', async () => {
      mockPrisma.courseLesson.findUnique.mockResolvedValue({ id: 'l1' });
      const created = { id: 'q1', title: 'Quiz 1' };
      mockPrisma.quiz.create.mockResolvedValue(created);

      const result = await service.create('l1', {
        title: 'Quiz 1',
        questions: [],
      });

      expect(result).toEqual(created);
      expect(mockPrisma.quiz.create).toHaveBeenCalledWith({
        data: {
          lessonId: 'l1',
          title: 'Quiz 1',
          description: undefined,
          quizConfig: {
            passingScore: 70,
            maxAttempts: 3,
            timeLimit: undefined,
            shuffleQuestions: false,
          },
        },
      });
    });

    it('should create a quiz with custom config values', async () => {
      mockPrisma.courseLesson.findUnique.mockResolvedValue({ id: 'l1' });
      mockPrisma.quiz.create.mockResolvedValue({ id: 'q1' });

      await service.create('l1', {
        title: 'Quiz 1',
        description: 'A quiz',
        questions: [],
        passingScore: 80,
        maxAttempts: 5,
        timeLimit: 30,
      });

      expect(mockPrisma.quiz.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quizConfig: {
            passingScore: 80,
            maxAttempts: 5,
            timeLimit: 30,
            shuffleQuestions: false,
          },
        }),
      });
    });

    it('should throw NotFoundException if lesson does not exist', async () => {
      mockPrisma.courseLesson.findUnique.mockResolvedValue(null);

      await expect(
        service.create('nonexistent', { title: 'Test', questions: [] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ────────────────────────────────────────────────────────

  describe('update', () => {
    const existingQuiz = {
      id: 'q1',
      quizConfig: { passingScore: 70, maxAttempts: 3, timeLimit: null, shuffleQuestions: false },
      lesson: { id: 'l1', title: 'L', courseSectionId: 's1' },
      questions: [],
    };

    it('should update quiz title and config', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(existingQuiz);
      mockPrisma.quiz.update.mockResolvedValue({ ...existingQuiz, title: 'Updated' });

      const result = await service.update('q1', {
        title: 'Updated',
        passingScore: 90,
        timeLimit: 45,
      });

      expect(mockPrisma.quiz.update).toHaveBeenCalledWith({
        where: { id: 'q1' },
        data: {
          title: 'Updated',
          quizConfig: {
            passingScore: 90,
            maxAttempts: 3,
            timeLimit: 45,
            shuffleQuestions: false,
          },
        },
      });
    });

    it('should update only title when no config changes', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(existingQuiz);
      mockPrisma.quiz.update.mockResolvedValue(existingQuiz);

      await service.update('q1', { title: 'New' });

      const updateCall = mockPrisma.quiz.update.mock.calls[0][0];
      expect(updateCall.data.title).toBe('New');
      expect(updateCall.data.quizConfig).toBeUndefined();
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { title: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── remove ────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a quiz', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        id: 'q1',
        lesson: { id: 'l1', title: 'L', courseSectionId: 's1' },
        questions: [],
      });
      mockPrisma.quiz.delete.mockResolvedValue(undefined);

      await service.remove('q1');

      expect(mockPrisma.quiz.delete).toHaveBeenCalledWith({ where: { id: 'q1' } });
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── submitAttempt ─────────────────────────────────────────────────

  describe('submitAttempt', () => {
    const quizWithQuestions = {
      id: 'q1',
      quizConfig: { passingScore: 70, maxAttempts: 3, timeLimit: null },
      lesson: { id: 'l1', title: 'L', courseSectionId: 's1' },
      questions: [
        {
          id: 'qn1',
          questionType: 'multiple_choice',
          questionData: {
            options: [
              { id: 'a', isCorrect: false },
              { id: 'b', isCorrect: true },
            ],
            explanation: 'B is correct',
          },
          points: 10,
        },
        {
          id: 'qn2',
          questionType: 'true_false',
          questionData: { correctAnswer: true, explanation: 'True is correct' },
          points: 5,
        },
      ],
    };

    it('should submit and auto-grade a quiz attempt (all correct)', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(quizWithQuestions);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ id: 'e1' });
      mockPrisma.quizAttempt.count.mockResolvedValue(0);
      const attempt = { id: 'a1', score: 15, passed: true };
      mockPrisma.quizAttempt.create.mockResolvedValue(attempt);

      const result = await service.submitAttempt('q1', 'e1', [
        { questionId: 'qn1', answer: 'b' },
        { questionId: 'qn2', answer: true },
      ]);

      expect(result).toEqual(attempt);
      expect(mockPrisma.quizAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quizId: 'q1',
          enrollmentId: 'e1',
          score: 15,
          totalPoints: 15,
          passed: true,
          attemptNumber: 1,
          gradingStatus: 'auto_graded',
        }),
      });
    });

    it('should mark attempt as failed when score below passing', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(quizWithQuestions);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ id: 'e1' });
      mockPrisma.quizAttempt.count.mockResolvedValue(0);
      mockPrisma.quizAttempt.create.mockResolvedValue({ id: 'a1', passed: false });

      await service.submitAttempt('q1', 'e1', [
        { questionId: 'qn1', answer: 'a' }, // wrong
        { questionId: 'qn2', answer: false }, // wrong
      ]);

      expect(mockPrisma.quizAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          score: 0,
          passed: false,
          gradingStatus: 'auto_graded',
        }),
      });
    });

    it('should handle fill_blank questions (case-insensitive)', async () => {
      const quizWithFillBlank = {
        ...quizWithQuestions,
        questions: [
          {
            id: 'qn1',
            questionType: 'fill_blank',
            questionData: {
              correctAnswers: ['TypeScript', 'TS'],
              caseSensitive: false,
              explanation: 'Answer is TypeScript or TS',
            },
            points: 10,
          },
        ],
      };
      mockPrisma.quiz.findUnique.mockResolvedValue(quizWithFillBlank);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ id: 'e1' });
      mockPrisma.quizAttempt.count.mockResolvedValue(0);
      mockPrisma.quizAttempt.create.mockResolvedValue({ id: 'a1' });

      await service.submitAttempt('q1', 'e1', [
        { questionId: 'qn1', answer: 'typescript' }, // case-insensitive match
      ]);

      expect(mockPrisma.quizAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          score: 10,
          passed: true,
        }),
      });
    });

    it('should handle fill_blank questions (case-sensitive)', async () => {
      const quizWithFillBlank = {
        ...quizWithQuestions,
        questions: [
          {
            id: 'qn1',
            questionType: 'fill_blank',
            questionData: {
              correctAnswers: ['TypeScript'],
              caseSensitive: true,
            },
            points: 10,
          },
        ],
      };
      mockPrisma.quiz.findUnique.mockResolvedValue(quizWithFillBlank);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ id: 'e1' });
      mockPrisma.quizAttempt.count.mockResolvedValue(0);
      mockPrisma.quizAttempt.create.mockResolvedValue({ id: 'a1' });

      await service.submitAttempt('q1', 'e1', [
        { questionId: 'qn1', answer: 'typescript' }, // wrong case
      ]);

      expect(mockPrisma.quizAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          score: 0,
          passed: false,
        }),
      });
    });

    it('should set grading to pending for essay questions', async () => {
      const quizWithEssay = {
        ...quizWithQuestions,
        questions: [
          {
            id: 'qn1',
            questionType: 'essay',
            questionData: {},
            points: 20,
          },
        ],
      };
      mockPrisma.quiz.findUnique.mockResolvedValue(quizWithEssay);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ id: 'e1' });
      mockPrisma.quizAttempt.count.mockResolvedValue(0);
      mockPrisma.quizAttempt.create.mockResolvedValue({ id: 'a1' });

      await service.submitAttempt('q1', 'e1', [
        { questionId: 'qn1', answer: 'My essay answer' },
      ]);

      expect(mockPrisma.quizAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          score: null,
          passed: null,
          gradingStatus: 'pending',
        }),
      });
    });

    it('should throw BadRequestException when max attempts reached', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(quizWithQuestions);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ id: 'e1' });
      mockPrisma.quizAttempt.count.mockResolvedValue(3);

      await expect(
        service.submitAttempt('q1', 'e1', [{ questionId: 'qn1', answer: 'a' }]),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submitAttempt('q1', 'e1', [{ questionId: 'qn1', answer: 'a' }]),
      ).rejects.toThrow('Maximum attempts (3) reached');
    });

    it('should throw NotFoundException if enrollment does not exist', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(quizWithQuestions);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.submitAttempt('q1', 'nonexistent', []),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for unknown question type', async () => {
      const quizWithUnknown = {
        ...quizWithQuestions,
        questions: [
          {
            id: 'qn1',
            questionType: 'unknown_type',
            questionData: {},
            points: 1,
          },
        ],
      };
      mockPrisma.quiz.findUnique.mockResolvedValue(quizWithUnknown);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ id: 'e1' });
      mockPrisma.quizAttempt.count.mockResolvedValue(0);

      await expect(
        service.submitAttempt('q1', 'e1', [{ questionId: 'qn1', answer: 'x' }]),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submitAttempt('q1', 'e1', [{ questionId: 'qn1', answer: 'x' }]),
      ).rejects.toThrow('Unsupported question type: unknown_type');
    });

    it('should throw BadRequestException for question not in quiz', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(quizWithQuestions);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ id: 'e1' });
      mockPrisma.quizAttempt.count.mockResolvedValue(0);

      await expect(
        service.submitAttempt('q1', 'e1', [{ questionId: 'not-in-quiz', answer: 'x' }]),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.submitAttempt('q1', 'e1', [{ questionId: 'not-in-quiz', answer: 'x' }]),
      ).rejects.toThrow('Question not-in-quiz not found in quiz q1');
    });

    it('should treat points: 0 as falsy and default to 1 point per question', async () => {
      // In the code, `q.points || 1` means points=0 is treated as 1
      const quizWithZeroPoints = {
        ...quizWithQuestions,
        questions: [
          {
            id: 'qn1',
            questionType: 'multiple_choice',
            questionData: { options: [{ id: 'a', isCorrect: true }] },
            points: 0,
          },
        ],
      };
      mockPrisma.quiz.findUnique.mockResolvedValue(quizWithZeroPoints);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ id: 'e1' });
      mockPrisma.quizAttempt.count.mockResolvedValue(0);
      mockPrisma.quizAttempt.create.mockResolvedValue({ id: 'a1' });

      await service.submitAttempt('q1', 'e1', [
        { questionId: 'qn1', answer: 'a' },
      ]);

      // points: 0 || 1 = 1, correct answer => score 1, total 1, 100% >= 70% => passed
      expect(mockPrisma.quizAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          score: 1,
          totalPoints: 1,
          passed: true,
        }),
      });
    });

    it('should use default points (1) for questions without explicit points', async () => {
      const quizNoPoints = {
        ...quizWithQuestions,
        questions: [
          {
            id: 'qn1',
            questionType: 'true_false',
            questionData: { correctAnswer: true },
            points: undefined,
          },
        ],
      };
      mockPrisma.quiz.findUnique.mockResolvedValue(quizNoPoints);
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({ id: 'e1' });
      mockPrisma.quizAttempt.count.mockResolvedValue(0);
      mockPrisma.quizAttempt.create.mockResolvedValue({ id: 'a1' });

      await service.submitAttempt('q1', 'e1', [
        { questionId: 'qn1', answer: true },
      ]);

      expect(mockPrisma.quizAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          score: 1,
          totalPoints: 1,
        }),
      });
    });
  });

  // ─── gradeEssay ────────────────────────────────────────────────────

  describe('gradeEssay', () => {
    const mockAttempt = {
      id: 'a1',
      gradingStatus: 'pending',
      totalPoints: 30,
      answers: [
        { questionId: 'qn1', answer: 'b', isCorrect: true, pointsEarned: 10 },
        { questionId: 'qn2', answer: 'My essay', isCorrect: null, pointsEarned: 0 },
      ],
      quiz: {
        quizConfig: { passingScore: 70 },
        questions: [
          { id: 'qn1', points: 10 },
          { id: 'qn2', points: 20 },
        ],
      },
    };

    it('should grade an essay and recalculate score', async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue(mockAttempt);
      const graded = { id: 'a1', score: 25, passed: true, gradingStatus: 'manually_graded' };
      mockPrisma.quizAttempt.update.mockResolvedValue(graded);

      const result = await service.gradeEssay('a1', 15, 'instructor-1', 'Good work');

      expect(result).toEqual(graded);
      expect(mockPrisma.quizAttempt.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: {
          answers: expect.arrayContaining([
            expect.objectContaining({ questionId: 'qn1', isCorrect: true }),
            expect.objectContaining({ questionId: 'qn2', feedback: 'Good work', manuallyGraded: true }),
          ]),
          score: 25, // 10 (auto) + 15 (essay)
          passed: true, // 25/30 = 83.3% >= 70%
          gradingStatus: 'manually_graded',
          gradedBy: 'instructor-1',
        },
      });
    });

    it('should mark as failed when combined score below passing', async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue(mockAttempt);
      mockPrisma.quizAttempt.update.mockResolvedValue({ id: 'a1' });

      await service.gradeEssay('a1', 5, 'instructor-1');

      expect(mockPrisma.quizAttempt.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: expect.objectContaining({
          score: 15, // 10 + 5
          passed: false, // 15/30 = 50% < 70%
        }),
      });
    });

    it('should throw NotFoundException if attempt does not exist', async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue(null);

      await expect(
        service.gradeEssay('nonexistent', 10, 'instructor-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if attempt is already auto-graded', async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue({
        ...mockAttempt,
        gradingStatus: 'auto_graded',
      });

      await expect(
        service.gradeEssay('a1', 10, 'instructor-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.gradeEssay('a1', 10, 'instructor-1'),
      ).rejects.toThrow('This attempt has already been auto-graded');
    });

    it('should handle zero totalPoints (passed = false)', async () => {
      const attemptZeroPoints = {
        ...mockAttempt,
        totalPoints: 0,
        answers: [{ questionId: 'qn2', isCorrect: null, pointsEarned: 0 }],
      };
      mockPrisma.quizAttempt.findUnique.mockResolvedValue(attemptZeroPoints);
      mockPrisma.quizAttempt.update.mockResolvedValue({ id: 'a1' });

      await service.gradeEssay('a1', 0, 'instructor-1');

      expect(mockPrisma.quizAttempt.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: expect.objectContaining({
          passed: false,
        }),
      });
    });
  });

  // ─── getAttempts ───────────────────────────────────────────────────

  describe('getAttempts', () => {
    it('should return attempts for a quiz and enrollment', async () => {
      const attempts = [
        { id: 'a2', attemptNumber: 2 },
        { id: 'a1', attemptNumber: 1 },
      ];
      mockPrisma.quizAttempt.findMany.mockResolvedValue(attempts);

      const result = await service.getAttempts('q1', 'e1');

      expect(result).toEqual(attempts);
      expect(mockPrisma.quizAttempt.findMany).toHaveBeenCalledWith({
        where: { quizId: 'q1', enrollmentId: 'e1' },
        orderBy: { attemptNumber: 'desc' },
      });
    });
  });

  // ─── getAttemptById ────────────────────────────────────────────────

  describe('getAttemptById', () => {
    it('should return an attempt with quiz and enrollment details', async () => {
      const attempt = {
        id: 'a1',
        quiz: { questions: [] },
        enrollment: { user: { id: 'u1', email: 'test@test.com', name: 'Test' } },
      };
      mockPrisma.quizAttempt.findUnique.mockResolvedValue(attempt);

      const result = await service.getAttemptById('a1');

      expect(result).toEqual(attempt);
    });

    it('should throw NotFoundException if attempt does not exist', async () => {
      mockPrisma.quizAttempt.findUnique.mockResolvedValue(null);

      await expect(service.getAttemptById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getAttemptById('nonexistent')).rejects.toThrow(
        'Quiz attempt with id "nonexistent" not found',
      );
    });
  });

  // ─── createQuestion ────────────────────────────────────────────────

  describe('createQuestion', () => {
    it('should create a question with auto-calculated position', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        id: 'q1',
        lesson: { id: 'l1', title: 'L', courseSectionId: 's1' },
        questions: [],
      });
      mockPrisma.quizQuestion.aggregate.mockResolvedValue({ _max: { position: 2 } });
      const created = { id: 'qn1', questionText: 'What is X?' };
      mockPrisma.quizQuestion.create.mockResolvedValue(created);

      const result = await service.createQuestion('q1', {
        questionType: 'multiple_choice',
        questionText: 'What is X?',
        questionData: { options: [] },
        points: 5,
      });

      expect(result).toEqual(created);
      expect(mockPrisma.quizQuestion.create).toHaveBeenCalledWith({
        data: {
          quizId: 'q1',
          questionType: 'multiple_choice',
          questionText: 'What is X?',
          questionData: { options: [] },
          points: 5,
          position: 3,
        },
      });
    });

    it('should create a question with explicit position', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        id: 'q1',
        lesson: { id: 'l1', title: 'L', courseSectionId: 's1' },
        questions: [],
      });
      mockPrisma.quizQuestion.create.mockResolvedValue({ id: 'qn1' });

      await service.createQuestion('q1', {
        questionType: 'true_false',
        questionText: 'Is this true?',
        questionData: {},
        position: 7,
      });

      expect(mockPrisma.quizQuestion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ position: 7 }),
      });
    });

    it('should default position to 0 when no existing questions', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        id: 'q1',
        lesson: { id: 'l1', title: 'L', courseSectionId: 's1' },
        questions: [],
      });
      mockPrisma.quizQuestion.aggregate.mockResolvedValue({ _max: { position: null } });
      mockPrisma.quizQuestion.create.mockResolvedValue({ id: 'qn1' });

      await service.createQuestion('q1', {
        questionType: 'essay',
        questionText: 'Discuss.',
        questionData: {},
      });

      expect(mockPrisma.quizQuestion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ position: 0, points: 1 }),
      });
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);

      await expect(
        service.createQuestion('nonexistent', {
          questionType: 'essay',
          questionText: 'Test',
          questionData: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateQuestion ────────────────────────────────────────────────

  describe('updateQuestion', () => {
    it('should update question fields', async () => {
      mockPrisma.quizQuestion.findUnique.mockResolvedValue({ id: 'qn1' });
      const updated = { id: 'qn1', questionText: 'Updated text' };
      mockPrisma.quizQuestion.update.mockResolvedValue(updated);

      const result = await service.updateQuestion('qn1', {
        questionText: 'Updated text',
        points: 10,
        position: 3,
      });

      expect(result).toEqual(updated);
      expect(mockPrisma.quizQuestion.update).toHaveBeenCalledWith({
        where: { id: 'qn1' },
        data: {
          questionText: 'Updated text',
          points: 10,
          position: 3,
        },
      });
    });

    it('should only update provided fields', async () => {
      mockPrisma.quizQuestion.findUnique.mockResolvedValue({ id: 'qn1' });
      mockPrisma.quizQuestion.update.mockResolvedValue({ id: 'qn1' });

      await service.updateQuestion('qn1', { points: 5 });

      const updateCall = mockPrisma.quizQuestion.update.mock.calls[0][0];
      expect(updateCall.data).toEqual({ points: 5 });
    });

    it('should throw NotFoundException if question does not exist', async () => {
      mockPrisma.quizQuestion.findUnique.mockResolvedValue(null);

      await expect(
        service.updateQuestion('nonexistent', { points: 5 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateQuestion('nonexistent', { points: 5 }),
      ).rejects.toThrow('Question with id "nonexistent" not found');
    });
  });

  // ─── deleteQuestion ────────────────────────────────────────────────

  describe('deleteQuestion', () => {
    it('should delete a question', async () => {
      mockPrisma.quizQuestion.findUnique.mockResolvedValue({ id: 'qn1' });
      mockPrisma.quizQuestion.delete.mockResolvedValue(undefined);

      await service.deleteQuestion('qn1');

      expect(mockPrisma.quizQuestion.delete).toHaveBeenCalledWith({ where: { id: 'qn1' } });
    });

    it('should throw NotFoundException if question does not exist', async () => {
      mockPrisma.quizQuestion.findUnique.mockResolvedValue(null);

      await expect(service.deleteQuestion('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getPendingGrading ─────────────────────────────────────────────

  describe('getPendingGrading', () => {
    it('should return all pending grading attempts', async () => {
      const attempts = [{ id: 'a1' }, { id: 'a2' }];
      mockPrisma.quizAttempt.findMany.mockResolvedValue(attempts);

      const result = await service.getPendingGrading();

      expect(result).toEqual(attempts);
      expect(mockPrisma.quizAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { gradingStatus: 'pending' },
          orderBy: { completedAt: 'asc' },
        }),
      );
    });

    it('should filter by instructorId when provided', async () => {
      const attempts = [
        {
          id: 'a1',
          quiz: {
            lesson: {
              section: {
                course: { id: 'c1', title: 'Course 1', createdBy: 'instructor-1' },
              },
            },
          },
        },
        {
          id: 'a2',
          quiz: {
            lesson: {
              section: {
                course: { id: 'c2', title: 'Course 2', createdBy: 'instructor-2' },
              },
            },
          },
        },
      ];
      mockPrisma.quizAttempt.findMany.mockResolvedValue(attempts);

      const result = await service.getPendingGrading('instructor-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a1');
    });

    it('should return empty array when no pending attempts match instructor', async () => {
      mockPrisma.quizAttempt.findMany.mockResolvedValue([]);

      const result = await service.getPendingGrading('instructor-1');

      expect(result).toEqual([]);
    });
  });
});
