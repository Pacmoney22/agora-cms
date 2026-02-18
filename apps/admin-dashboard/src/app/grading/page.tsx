'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/lib/api-client';
import toast from 'react-hot-toast';

type GradingTab = 'all' | 'essays' | 'assignments';

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

interface PendingSubmission {
  id: string;
  lessonId: string;
  enrollmentId: string;
  submissionNumber: number;
  content: string;
  links: Array<{ url: string; label?: string }> | null;
  totalPoints: number;
  gradingStatus: string;
  submittedAt: string;
  lesson?: { id: string; title: string; section?: { id: string; title: string; courseId: string; course?: { id: string; title: string } } };
  enrollment?: { id: string; user?: { id: string; name: string; email: string } };
}

export default function ManualGradingPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<GradingTab>('all');
  const [selectedAttempt, setSelectedAttempt] = useState<PendingAttempt | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<PendingSubmission | null>(null);
  const [gradeData, setGradeData] = useState<Record<string, { points: number; feedback: string }>>({});
  const [assignmentScore, setAssignmentScore] = useState(0);
  const [assignmentFeedback, setAssignmentFeedback] = useState('');

  // Fetch pending grading attempts (quiz essays)
  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['pending-grading'],
    queryFn: () => coursesApi.getPendingGrading(),
  });

  // Fetch pending assignment submissions
  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['pending-submissions'],
    queryFn: () => coursesApi.getPendingSubmissions(),
  });

  const isLoading = attemptsLoading || submissionsLoading;

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

  // Grade assignment submission mutation
  const gradeSubmissionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      coursesApi.gradeSubmission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-submissions'] });
      toast.success('Assignment graded successfully');
      setSelectedSubmission(null);
      setAssignmentScore(0);
      setAssignmentFeedback('');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to grade assignment');
    },
  });

  const handleOpenGradingModal = (attempt: PendingAttempt) => {
    setSelectedAttempt(attempt);
    const initialGradeData: Record<string, { points: number; feedback: string }> = {};
    attempt.answers.forEach((answer) => {
      initialGradeData[answer.questionId] = { points: 0, feedback: '' };
    });
    setGradeData(initialGradeData);
  };

  const handleOpenSubmissionModal = (submission: PendingSubmission) => {
    setSelectedSubmission(submission);
    setAssignmentScore(0);
    setAssignmentFeedback('');
  };

  const handleSubmitGrade = () => {
    if (!selectedAttempt) return;

    const totalPoints = Object.values(gradeData).reduce((sum, data) => sum + data.points, 0);
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
        gradedBy: 'instructor',
        feedback: combinedFeedback,
      },
    });
  };

  const handleGradeAssignment = (status: 'graded' | 'returned') => {
    if (!selectedSubmission) return;
    gradeSubmissionMutation.mutate({
      id: selectedSubmission.id,
      data: {
        score: assignmentScore,
        feedback: assignmentFeedback || undefined,
        gradedBy: 'instructor',
        status,
      },
    });
  };

  // Build unified list
  type UnifiedItem = { type: 'essay'; data: PendingAttempt } | { type: 'assignment'; data: PendingSubmission };
  const unifiedItems: UnifiedItem[] = [];
  if (activeTab !== 'assignments' && attempts) {
    attempts.forEach((a: PendingAttempt) => unifiedItems.push({ type: 'essay', data: a }));
  }
  if (activeTab !== 'essays' && submissions) {
    submissions.forEach((s: PendingSubmission) => unifiedItems.push({ type: 'assignment', data: s }));
  }
  unifiedItems.sort((a, b) => {
    const dateA = a.type === 'essay' ? a.data.submittedAt : a.data.submittedAt;
    const dateB = b.type === 'essay' ? b.data.submittedAt : b.data.submittedAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

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
        <p className="mt-2 text-gray-600">Review and grade pending essay and assignment submissions</p>
      </div>

      {/* Tab Filter */}
      <div className="mb-4 flex gap-2">
        {([
          { key: 'all' as GradingTab, label: 'All', count: (attempts?.length || 0) + (submissions?.length || 0) },
          { key: 'essays' as GradingTab, label: 'Quiz Essays', count: attempts?.length || 0 },
          { key: 'assignments' as GradingTab, label: 'Assignments', count: submissions?.length || 0 },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs ${
                activeTab === tab.key ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Unified Table */}
      {unifiedItems.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Course</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {unifiedItems.map((item) => {
                if (item.type === 'essay') {
                  const attempt = item.data;
                  return (
                    <tr key={`essay-${attempt.id}`} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">Essay</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{attempt.studentName}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{attempt.courseName}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{attempt.quizTitle}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{new Date(attempt.submittedAt).toLocaleDateString()}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">{attempt.status}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <button onClick={() => handleOpenGradingModal(attempt)} className="text-blue-600 hover:text-blue-800">Grade</button>
                      </td>
                    </tr>
                  );
                } else {
                  const sub = item.data;
                  const studentName = sub.enrollment?.user?.name || sub.enrollment?.user?.email || 'Unknown';
                  const courseName = sub.lesson?.section?.course?.title || 'Unknown';
                  const lessonTitle = sub.lesson?.title || 'Unknown';
                  return (
                    <tr key={`sub-${sub.id}`} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Assignment</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{studentName}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{courseName}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {lessonTitle}
                        <span className="ml-1 text-xs text-gray-400">#{sub.submissionNumber}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">{sub.gradingStatus}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <button onClick={() => handleOpenSubmissionModal(sub)} className="text-blue-600 hover:text-blue-800">Grade</button>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-500">No pending grading submissions at this time.</p>
        </div>
      )}

      {/* Essay Grading Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">Grade Essay</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Student: {selectedAttempt.studentName} | Quiz: {selectedAttempt.quizTitle}
                </p>
              </div>
              <button onClick={() => setSelectedAttempt(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

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
                      <label className="mb-1 block text-sm font-medium text-gray-700">Points Awarded</label>
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
                      <label className="mb-1 block text-sm font-medium text-gray-700">Feedback</label>
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

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setSelectedAttempt(null)} className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300">Cancel</button>
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

      {/* Assignment Grading Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">Grade Assignment</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Student: {selectedSubmission.enrollment?.user?.name || selectedSubmission.enrollment?.user?.email || 'Unknown'}
                  {' | '}Lesson: {selectedSubmission.lesson?.title || 'Unknown'}
                  {' | '}Submission #{selectedSubmission.submissionNumber}
                </p>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Student submission content */}
            <div className="mb-6 rounded-lg border border-gray-200 p-4">
              <h3 className="mb-2 font-semibold text-gray-900">Student Submission</h3>
              <div className="rounded-md bg-gray-50 p-4">
                <p className="whitespace-pre-wrap text-sm text-gray-900">{selectedSubmission.content}</p>
              </div>

              {/* Links */}
              {selectedSubmission.links && selectedSubmission.links.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-gray-700">Attached Links:</p>
                  <div className="space-y-1">
                    {selectedSubmission.links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {link.label || link.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Grading form */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Score (out of {selectedSubmission.totalPoints})
                </label>
                <input
                  type="number"
                  min="0"
                  max={selectedSubmission.totalPoints}
                  value={assignmentScore}
                  onChange={(e) => setAssignmentScore(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Feedback</label>
                <textarea
                  rows={4}
                  value={assignmentFeedback}
                  onChange={(e) => setAssignmentFeedback(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Provide feedback for the student..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setSelectedSubmission(null)} className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300">
                Cancel
              </button>
              <button
                onClick={() => handleGradeAssignment('returned')}
                disabled={gradeSubmissionMutation.isPending}
                className="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Return for Revision
              </button>
              <button
                onClick={() => handleGradeAssignment('graded')}
                disabled={gradeSubmissionMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {gradeSubmissionMutation.isPending ? 'Submitting...' : 'Grade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
