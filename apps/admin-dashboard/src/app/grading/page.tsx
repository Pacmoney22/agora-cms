'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface PendingAttempt {
  id: string;
  studentName: string;
  courseName: string;
  quizTitle: string;
  submittedAt: string;
  status: string;
  answers: Array<{
    questionId: string;
    questionText: string;
    answer: string;
    rubric?: string;
  }>;
}

export default function ManualGradingPage() {
  const queryClient = useQueryClient();
  const [selectedAttempt, setSelectedAttempt] = useState<PendingAttempt | null>(null);
  const [gradeData, setGradeData] = useState<Record<string, { points: number; feedback: string }>>({});

  // Fetch pending grading attempts
  const { data: attempts, isLoading } = useQuery({
    queryKey: ['pending-grading'],
    queryFn: () => coursesApi.getPendingGrading(),
  });

  // Grade essay mutation
  const gradeEssayMutation = useMutation({
    mutationFn: ({ attemptId, data }: { attemptId: string; data: any }) =>
      coursesApi.gradeEssay(attemptId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-grading'] });
      toast.success('Essay graded successfully');
      setSelectedAttempt(null);
      setGradeData({});
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to grade essay');
    },
  });

  const handleOpenGradingModal = (attempt: PendingAttempt) => {
    setSelectedAttempt(attempt);
    // Initialize grade data for each essay question
    const initialGradeData: Record<string, { points: number; feedback: string }> = {};
    attempt.answers.forEach((answer) => {
      initialGradeData[answer.questionId] = { points: 0, feedback: '' };
    });
    setGradeData(initialGradeData);
  };

  const handleSubmitGrade = () => {
    if (!selectedAttempt) return;

    // Calculate total points
    const totalPoints = Object.values(gradeData).reduce((sum, data) => sum + data.points, 0);

    // Combine feedback
    const combinedFeedback = Object.entries(gradeData)
      .map(([questionId, data]) => {
        const question = selectedAttempt.answers.find(a => a.questionId === questionId);
        return `${question?.questionText}: ${data.feedback}`;
      })
      .join('\n\n');

    gradeEssayMutation.mutate({
      attemptId: selectedAttempt.id,
      data: {
        pointsAwarded: totalPoints,
        gradedBy: 'instructor', // This should come from auth context
        feedback: combinedFeedback,
      },
    });
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
        <h1 className="text-3xl font-bold">Manual Grading</h1>
        <p className="mt-2 text-gray-600">Review and grade pending essay submissions</p>
      </div>

      {/* Attempts Table */}
      {attempts && attempts.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Quiz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Submitted Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {attempts.map((attempt: PendingAttempt) => (
                <tr key={attempt.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {attempt.studentName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {attempt.courseName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {attempt.quizTitle}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(attempt.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                      {attempt.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <button
                      onClick={() => handleOpenGradingModal(attempt)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Grade
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-500">No pending grading submissions at this time.</p>
        </div>
      )}

      {/* Grading Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">Grade Submission</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Student: {selectedAttempt.studentName} | Quiz: {selectedAttempt.quizTitle}
                </p>
              </div>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Essay Answers */}
            <div className="space-y-6">
              {selectedAttempt.answers.map((answer) => (
                <div key={answer.questionId} className="rounded-lg border border-gray-200 p-4">
                  <h3 className="mb-2 font-semibold text-gray-900">{answer.questionText}</h3>

                  {answer.rubric && (
                    <div className="mb-3 rounded-md bg-blue-50 p-3">
                      <p className="text-sm font-medium text-blue-900">Grading Rubric:</p>
                      <p className="mt-1 text-sm text-blue-800">{answer.rubric}</p>
                    </div>
                  )}

                  <div className="mb-4 rounded-md bg-gray-50 p-3">
                    <p className="text-sm font-medium text-gray-700">Student Answer:</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">{answer.answer}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Points Awarded
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={gradeData[answer.questionId]?.points || 0}
                        onChange={(e) =>
                          setGradeData((prev) => ({
                            ...prev,
                            [answer.questionId]: {
                              ...(prev[answer.questionId] ?? { points: 0, feedback: '' }),
                              points: parseInt(e.target.value, 10) || 0,
                            },
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Feedback
                      </label>
                      <textarea
                        rows={3}
                        value={gradeData[answer.questionId]?.feedback || ''}
                        onChange={(e) =>
                          setGradeData((prev) => ({
                            ...prev,
                            [answer.questionId]: {
                              ...(prev[answer.questionId] ?? { points: 0, feedback: '' }),
                              feedback: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        placeholder="Provide feedback for the student..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedAttempt(null)}
                className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitGrade}
                disabled={gradeEssayMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {gradeEssayMutation.isPending ? 'Submitting...' : 'Submit Grade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
