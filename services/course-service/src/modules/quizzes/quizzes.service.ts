import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateQuizDto } from './dto/create-quiz.dto';

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name);

  constructor(@Inject('PRISMA') private readonly prisma: PrismaClient) {}

  async findByLessonId(lessonId: string) {
    // Verify lesson exists
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with id "${lessonId}" not found`);
    }

    return this.prisma.quiz.findMany({
      where: { lessonId },
      include: {
        questions: true,
      },
    });
  }

  async findById(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            courseSectionId: true,
          },
        },
        questions: true,
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with id "${id}" not found`);
    }

    return quiz;
  }

  async create(lessonId: string, dto: CreateQuizDto) {
    // Verify lesson exists
    const lesson = await this.prisma.courseLesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with id "${lessonId}" not found`);
    }

    const quiz = await this.prisma.quiz.create({
      data: {
        lessonId,
        title: dto.title,
        description: dto.description,
        quizConfig: {
          passingScore: dto.passingScore || 70,
          maxAttempts: dto.maxAttempts || 3,
          timeLimit: dto.timeLimit,
          shuffleQuestions: false,
        },
      },
    });

    this.logger.log(`Quiz created: ${quiz.id} (${quiz.title}) for lesson ${lessonId}`);
    return quiz;
  }

  async update(id: string, dto: Partial<CreateQuizDto>) {
    const existing = await this.findById(id);

    // Build quizConfig update
    const configUpdates: any = {};
    if (dto.passingScore !== undefined) configUpdates.passingScore = dto.passingScore;
    if (dto.timeLimit !== undefined) configUpdates.timeLimit = dto.timeLimit;
    if (dto.maxAttempts !== undefined) configUpdates.maxAttempts = dto.maxAttempts;

    const updated = await this.prisma.quiz.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(Object.keys(configUpdates).length > 0 && {
          quizConfig: {
            ...(existing.quizConfig as any || {}),
            ...configUpdates,
          },
        }),
      },
    });

    this.logger.log(`Quiz updated: ${id}`);
    return updated;
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.quiz.delete({ where: { id } });
    this.logger.log(`Quiz deleted: ${id}`);
  }

  async submitAttempt(
    quizId: string,
    enrollmentId: string,
    answers: Array<{ questionId: string; answer: any }>,
  ) {
    const quiz = await this.findById(quizId);

    // Verify enrollment exists
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with id "${enrollmentId}" not found`);
    }

    // Check attempt count
    const attemptCount = await this.prisma.quizAttempt.count({
      where: {
        quizId,
        enrollmentId,
      },
    });

    const quizConfig = quiz.quizConfig as any;
    const maxAttempts = quizConfig?.maxAttempts || 3;
    const passingScore = quizConfig?.passingScore || 70;

    if (attemptCount >= maxAttempts) {
      throw new BadRequestException(
        `Maximum attempts (${maxAttempts}) reached for this quiz`,
      );
    }

    // Calculate total points from questions
    const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);

    // Grade answers
    const gradedAnswers: Array<{
      questionId: string;
      answer: any;
      isCorrect: boolean | null;
      pointsEarned: number;
      feedback?: string;
    }> = [];

    let totalScore = 0;
    let hasEssayQuestions = false;

    for (const answer of answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);

      if (!question) {
        throw new BadRequestException(`Question ${answer.questionId} not found in quiz ${quizId}`);
      }

      const questionData = question.questionData as any;
      const questionType = question.questionType;
      const points = question.points || 1;

      let isCorrect: boolean | null = null;
      let pointsEarned = 0;
      let feedback: string | undefined;

      // Auto-grade based on question type
      switch (questionType) {
        case 'multiple_choice':
          isCorrect = this.gradeMultipleChoice(answer.answer, questionData);
          pointsEarned = isCorrect ? points : 0;
          feedback = questionData.explanation;
          break;

        case 'true_false':
          isCorrect = this.gradeTrueFalse(answer.answer, questionData);
          pointsEarned = isCorrect ? points : 0;
          feedback = questionData.explanation;
          break;

        case 'fill_blank':
          isCorrect = this.gradeFillBlank(answer.answer, questionData);
          pointsEarned = isCorrect ? points : 0;
          feedback = questionData.explanation;
          break;

        case 'essay':
          // Essays require manual grading
          isCorrect = null;
          pointsEarned = 0;
          hasEssayQuestions = true;
          break;

        default:
          throw new BadRequestException(`Unsupported question type: ${questionType}`);
      }

      gradedAnswers.push({
        questionId: answer.questionId,
        answer: answer.answer,
        isCorrect,
        pointsEarned,
        feedback,
      });

      totalScore += pointsEarned;
    }

    // Determine grading status and pass/fail
    const gradingStatus = hasEssayQuestions ? 'pending' : 'auto_graded';
    const score = hasEssayQuestions ? null : totalScore;
    const passed = hasEssayQuestions
      ? null
      : totalPoints > 0
      ? (totalScore / totalPoints) * 100 >= passingScore
      : false;

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId,
        enrollmentId,
        answers: gradedAnswers as any,
        score,
        totalPoints,
        passed,
        attemptNumber: attemptCount + 1,
        startedAt: new Date(),
        completedAt: new Date(),
        gradingStatus,
      },
    });

    this.logger.log(
      `Quiz attempt submitted: Quiz ${quizId}, Enrollment ${enrollmentId}, Status: ${gradingStatus}`,
    );
    return attempt;
  }

  private gradeMultipleChoice(studentAnswer: string, questionData: any): boolean {
    const correctOption = questionData.options?.find((opt: any) => opt.isCorrect === true);
    return studentAnswer === correctOption?.id;
  }

  private gradeTrueFalse(studentAnswer: boolean, questionData: any): boolean {
    return studentAnswer === questionData.correctAnswer;
  }

  private gradeFillBlank(studentAnswer: string, questionData: any): boolean {
    const correctAnswers = questionData.correctAnswers || [];
    const caseSensitive = questionData.caseSensitive || false;

    if (caseSensitive) {
      return correctAnswers.includes(studentAnswer);
    } else {
      const normalizedAnswer = studentAnswer.toLowerCase().trim();
      return correctAnswers.some(
        (ans: string) => ans.toLowerCase().trim() === normalizedAnswer
      );
    }
  }

  async gradeEssay(
    attemptId: string,
    pointsAwarded: number,
    gradedBy: string,
    feedback?: string,
  ) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Quiz attempt with id "${attemptId}" not found`);
    }

    if (attempt.gradingStatus === 'auto_graded') {
      throw new BadRequestException('This attempt has already been auto-graded');
    }

    // Update answers with grading feedback
    const updatedAnswers = (attempt.answers as any[]).map((ans) => {
      if (ans.isCorrect === null) {
        // Essay question - add grading info
        return {
          ...ans,
          feedback: feedback || ans.feedback,
          manuallyGraded: true,
        };
      }
      return ans;
    });

    // Recalculate total score including essay points
    const autoGradedScore = (attempt.answers as any[])
      .filter((ans: any) => ans.isCorrect !== null)
      .reduce((sum: number, ans: any) => sum + (ans.pointsEarned || 0), 0);

    const finalScore = autoGradedScore + pointsAwarded;

    const quizConfig = attempt.quiz.quizConfig as any;
    const passingScore = quizConfig?.passingScore || 70;
    const passed =
      attempt.totalPoints > 0
        ? (finalScore / attempt.totalPoints) * 100 >= passingScore
        : false;

    const graded = await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        answers: updatedAnswers as any,
        score: finalScore,
        passed,
        gradingStatus: 'manually_graded',
        gradedBy,
      },
    });

    this.logger.log(
      `Essay graded for attempt ${attemptId}: ${pointsAwarded} points awarded, Final score: ${finalScore}/${attempt.totalPoints}`,
    );
    return graded;
  }

  async getAttempts(quizId: string, enrollmentId: string) {
    return this.prisma.quizAttempt.findMany({
      where: {
        quizId,
        enrollmentId,
      },
      orderBy: { attemptNumber: 'desc' },
    });
  }

  async getAttemptById(attemptId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: true,
          },
        },
        enrollment: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(`Quiz attempt with id "${attemptId}" not found`);
    }

    return attempt;
  }

  async createQuestion(quizId: string, dto: {
    questionType: string;
    questionText: string;
    questionData: any;
    points?: number;
    position?: number;
  }) {
    // Verify quiz exists
    const quiz = await this.findById(quizId);

    // Get next position if not provided
    let position = dto.position ?? 0;
    if (dto.position === undefined) {
      const maxPos = await this.prisma.quizQuestion.aggregate({
        where: { quizId },
        _max: { position: true },
      });
      position = (maxPos._max.position ?? -1) + 1;
    }

    const question = await this.prisma.quizQuestion.create({
      data: {
        quizId,
        questionType: dto.questionType,
        questionText: dto.questionText,
        questionData: dto.questionData as any,
        points: dto.points ?? 1,
        position,
      },
    });

    this.logger.log(`Question created: ${question.id} for quiz ${quizId}`);
    return question;
  }

  async updateQuestion(questionId: string, dto: Partial<{
    questionText: string;
    questionData: any;
    points: number;
    position: number;
  }>) {
    const existing = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });

    if (!existing) {
      throw new NotFoundException(`Question with id "${questionId}" not found`);
    }

    const updated = await this.prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        ...(dto.questionText !== undefined && { questionText: dto.questionText }),
        ...(dto.questionData !== undefined && { questionData: dto.questionData as any }),
        ...(dto.points !== undefined && { points: dto.points }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
    });

    this.logger.log(`Question updated: ${questionId}`);
    return updated;
  }

  async deleteQuestion(questionId: string) {
    const existing = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });

    if (!existing) {
      throw new NotFoundException(`Question with id "${questionId}" not found`);
    }

    await this.prisma.quizQuestion.delete({ where: { id: questionId } });
    this.logger.log(`Question deleted: ${questionId}`);
  }

  async getPendingGrading(instructorId?: string) {
    // Get all quiz attempts that need manual grading
    const attempts = await this.prisma.quizAttempt.findMany({
      where: {
        gradingStatus: 'pending',
      },
      include: {
        quiz: {
          include: {
            lesson: {
              include: {
                section: {
                  include: {
                    course: {
                      select: {
                        id: true,
                        title: true,
                        createdBy: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        enrollment: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'asc' },
    });

    // Filter by instructor if provided
    if (instructorId) {
      return attempts.filter(
        (a: any) => a.quiz?.lesson?.section?.course?.createdBy === instructorId
      );
    }

    return attempts;
  }
}
