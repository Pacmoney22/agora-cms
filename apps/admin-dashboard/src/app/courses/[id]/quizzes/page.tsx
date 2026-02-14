'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Question {
  id: string;
  questionType: 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay';
  questionText: string;
  questionData: any;
  points: number;
  position: number;
}

interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  quizConfig: {
    passingScore?: number;
    maxAttempts?: number;
    timeLimit?: number;
  };
  position: number;
  questions?: Question[];
}

export default function QuizBuilderPage() {
  const params = useParams();
  const courseId = params.id as string;
  const queryClient = useQueryClient();

  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [addingQuestionToQuiz, setAddingQuestionToQuiz] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<string>('multiple_choice');

  // Fetch course details
  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesApi.get(courseId),
  });

  // Fetch sections with lessons
  const { data: sections, isLoading } = useQuery({
    queryKey: ['sections', courseId],
    queryFn: () => coursesApi.listSections(courseId),
  });

  // Fetch all quizzes for the course
  const allLessonIds = sections?.flatMap((s: any) => s.lessons?.map((l: any) => l.id) || []) || [];

  const quizzesQueries = useQuery({
    queryKey: ['all-quizzes', courseId],
    queryFn: async () => {
      const quizzes: Quiz[] = [];
      for (const lessonId of allLessonIds) {
        const lessonQuizzes = await coursesApi.listQuizzes(lessonId);
        quizzes.push(...lessonQuizzes);
      }
      return quizzes;
    },
    enabled: allLessonIds.length > 0,
  });

  // Create quiz mutation
  const createQuizMutation = useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: string; data: any }) =>
      coursesApi.createQuiz(lessonId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-quizzes', courseId] });
      toast.success('Quiz created successfully');
      setEditingQuizId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create quiz');
    },
  });

  // Update quiz mutation
  const updateQuizMutation = useMutation({
    mutationFn: ({ quizId, data }: { quizId: string; data: any }) =>
      coursesApi.updateQuiz(quizId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-quizzes', courseId] });
      toast.success('Quiz updated successfully');
      setEditingQuizId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update quiz');
    },
  });

  // Delete quiz mutation
  const deleteQuizMutation = useMutation({
    mutationFn: (quizId: string) => coursesApi.deleteQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-quizzes', courseId] });
      toast.success('Quiz deleted successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete quiz');
    },
  });

  // Create question mutation
  const createQuestionMutation = useMutation({
    mutationFn: ({ quizId, data }: { quizId: string; data: any }) =>
      coursesApi.createQuestion(quizId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-quizzes', courseId] });
      toast.success('Question created successfully');
      setAddingQuestionToQuiz(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create question');
    },
  });

  // Update question mutation
  const updateQuestionMutation = useMutation({
    mutationFn: ({ questionId, data }: { questionId: string; data: any }) =>
      coursesApi.updateQuestion(questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-quizzes', courseId] });
      toast.success('Question updated successfully');
      setEditingQuestionId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update question');
    },
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: string) => coursesApi.deleteQuestion(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-quizzes', courseId] });
      toast.success('Question deleted successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete question');
    },
  });

  const handleCreateQuestion = (e: React.FormEvent<HTMLFormElement>, quizId: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const questionText = formData.get('questionText') as string;
    const points = parseInt(formData.get('points') as string, 10);
    const explanation = formData.get('explanation') as string;

    let questionData: any = {};

    if (questionType === 'multiple_choice') {
      const options = [];
      let i = 0;
      while (formData.has(`option_${i}_text`)) {
        options.push({
          text: formData.get(`option_${i}_text`) as string,
          isCorrect: formData.get(`option_${i}_correct`) === 'true',
        });
        i++;
      }
      questionData = { options, explanation };
    } else if (questionType === 'true_false') {
      questionData = {
        correctAnswer: formData.get('correctAnswer') === 'true',
        explanation,
      };
    } else if (questionType === 'fill_blank') {
      const correctAnswers = (formData.get('correctAnswers') as string).split(',').map(a => a.trim());
      questionData = {
        correctAnswers,
        caseSensitive: formData.get('caseSensitive') === 'true',
        explanation,
      };
    } else if (questionType === 'essay') {
      questionData = {
        rubric: formData.get('rubric') as string,
        minWords: parseInt(formData.get('minWords') as string, 10) || undefined,
        maxWords: parseInt(formData.get('maxWords') as string, 10) || undefined,
      };
    }

    createQuestionMutation.mutate({
      quizId,
      data: {
        questionType,
        questionText,
        questionData,
        points,
        position: 1, // Backend should handle this
      },
    });
  };

  const getQuestionTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      multiple_choice: 'bg-blue-100 text-blue-800',
      true_false: 'bg-green-100 text-green-800',
      fill_blank: 'bg-yellow-100 text-yellow-800',
      essay: 'bg-purple-100 text-purple-800',
    };
    const labels: Record<string, string> = {
      multiple_choice: 'Multiple Choice',
      true_false: 'True/False',
      fill_blank: 'Fill Blank',
      essay: 'Essay',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badges[type]}`}>
        {labels[type]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
          <Link href="/courses" className="hover:text-blue-600">
            Courses
          </Link>
          <span>/</span>
          <Link href={`/courses/${courseId}/curriculum`} className="hover:text-blue-600">
            {course?.title}
          </Link>
          <span>/</span>
          <span>Quizzes</span>
        </div>
        <h1 className="text-3xl font-bold">Quiz Builder</h1>
      </div>

      {/* Quizzes List */}
      <div className="space-y-4">
        {quizzesQueries.data && quizzesQueries.data.length > 0 ? (
          quizzesQueries.data.map((quiz) => (
            <div key={quiz.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{quiz.title}</h2>
                  {quiz.description && (
                    <p className="mt-1 text-sm text-gray-600">{quiz.description}</p>
                  )}
                  <div className="mt-2 flex gap-4 text-sm text-gray-500">
                    {quiz.quizConfig.passingScore && (
                      <span>Passing Score: {quiz.quizConfig.passingScore}%</span>
                    )}
                    {quiz.quizConfig.maxAttempts && (
                      <span>Max Attempts: {quiz.quizConfig.maxAttempts}</span>
                    )}
                    {quiz.quizConfig.timeLimit && (
                      <span>Time Limit: {quiz.quizConfig.timeLimit} min</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingQuizId(quiz.id)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this quiz?')) {
                        deleteQuizMutation.mutate(quiz.id);
                      }
                    }}
                    disabled={deleteQuizMutation.isPending}
                    className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {quiz.questions && quiz.questions.length > 0 && (
                <div className="mb-4 space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Questions:</h3>
                  {quiz.questions.map((question) => (
                    <div key={question.id} className="flex items-start justify-between rounded-lg border border-gray-200 p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getQuestionTypeBadge(question.questionType)}
                          <span className="text-sm font-medium">{question.questionText}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Points: {question.points}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this question?')) {
                              deleteQuestionMutation.mutate(question.id);
                            }
                          }}
                          disabled={deleteQuestionMutation.isPending}
                          className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Question Form */}
              {addingQuestionToQuiz === quiz.id ? (
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                  <h3 className="mb-3 text-lg font-semibold">Add Question</h3>
                  <form onSubmit={(e) => handleCreateQuestion(e, quiz.id)} className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Question Type
                      </label>
                      <select
                        value={questionType}
                        onChange={(e) => setQuestionType(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True/False</option>
                        <option value="fill_blank">Fill in the Blank</option>
                        <option value="essay">Essay</option>
                      </select>
                    </div>

                    <textarea
                      name="questionText"
                      placeholder="Question Text"
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                      required
                    />

                    {questionType === 'multiple_choice' && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Options:</label>
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              name={`option_${i}_text`}
                              type="text"
                              placeholder={`Option ${i + 1}`}
                              className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              required
                            />
                            <label className="flex items-center gap-2">
                              <input
                                name={`option_${i}_correct`}
                                type="checkbox"
                                value="true"
                                className="h-4 w-4"
                              />
                              <span className="text-sm">Correct</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {questionType === 'true_false' && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Correct Answer
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              name="correctAnswer"
                              type="radio"
                              value="true"
                              className="h-4 w-4"
                              required
                            />
                            <span className="text-sm">True</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              name="correctAnswer"
                              type="radio"
                              value="false"
                              className="h-4 w-4"
                              required
                            />
                            <span className="text-sm">False</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {questionType === 'fill_blank' && (
                      <div className="space-y-2">
                        <input
                          name="correctAnswers"
                          type="text"
                          placeholder="Correct answers (comma-separated)"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          required
                        />
                        <label className="flex items-center gap-2">
                          <input
                            name="caseSensitive"
                            type="checkbox"
                            value="true"
                            className="h-4 w-4"
                          />
                          <span className="text-sm">Case Sensitive</span>
                        </label>
                      </div>
                    )}

                    {questionType === 'essay' && (
                      <div className="space-y-2">
                        <textarea
                          name="rubric"
                          placeholder="Grading Rubric (optional)"
                          rows={3}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                        <div className="flex gap-4">
                          <input
                            name="minWords"
                            type="number"
                            placeholder="Min Words"
                            className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                          <input
                            name="maxWords"
                            type="number"
                            placeholder="Max Words"
                            className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {questionType !== 'essay' && (
                      <textarea
                        name="explanation"
                        placeholder="Explanation (optional)"
                        rows={2}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                      />
                    )}

                    <input
                      name="points"
                      type="number"
                      placeholder="Points"
                      min="1"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                      required
                    />

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={createQuestionMutation.isPending}
                        className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {createQuestionMutation.isPending ? 'Creating...' : 'Create Question'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingQuestionToQuiz(null)}
                        className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <button
                  onClick={() => setAddingQuestionToQuiz(quiz.id)}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                >
                  Add Question
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <p className="text-gray-500">No quizzes found. Add lessons first, then create quizzes from the curriculum page.</p>
          </div>
        )}
      </div>
    </div>
  );
}
