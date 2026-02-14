'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { enrollmentsApi, coursesApi, usersApi } from '@/lib/api-client';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  suspended: 'bg-red-100 text-red-700',
};

export default function EnrollmentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<string>('');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);

  // Enroll form state
  const [enrollUserId, setEnrollUserId] = useState('');
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [enrollExpires, setEnrollExpires] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['enrollments', page, statusFilter, courseFilter],
    queryFn: () =>
      enrollmentsApi.list({
        page,
        limit: 20,
        status: statusFilter || undefined,
        courseId: courseFilter || undefined,
      }),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses', 'enrollment-picker'],
    queryFn: () => coursesApi.list({ limit: 100 }),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'enrollment-picker', userSearch],
    queryFn: () => usersApi.list({ limit: 50, search: userSearch || undefined }),
    enabled: showEnrollModal,
  });

  const enrollMutation = useMutation({
    mutationFn: (data: { userId: string; courseId: string; expiresAt?: string }) =>
      enrollmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Student enrolled successfully');
      setShowEnrollModal(false);
      setEnrollUserId('');
      setEnrollCourseId('');
      setEnrollExpires('');
      setUserSearch('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => enrollmentsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Enrollment suspended');
      setSelectedEnrollment(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => enrollmentsApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast.success('Enrollment marked as completed');
      setSelectedEnrollment(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const enrollments = data?.data || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };
  const courses = coursesData?.data || [];
  const users = usersData?.data || [];

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage student enrollments across all courses
          </p>
        </div>
        <button
          onClick={() => setShowEnrollModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Enroll Student
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={courseFilter}
          onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Courses</option>
          {courses.map((c: any) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-gray-400">{meta.total} enrollments</span>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          </div>
        ) : enrollments.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">No enrollments found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Student</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Course</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Progress</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Enrolled</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Last Access</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Expires</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment: any) => (
                <tr key={enrollment.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {enrollment.user?.firstName} {enrollment.user?.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{enrollment.user?.email || enrollment.userId}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800">{enrollment.course?.title || enrollment.courseId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[enrollment.status] || 'bg-gray-100 text-gray-600'}`}>
                      {enrollment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${enrollment.progressPercent || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{enrollment.progressPercent || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(enrollment.enrolledAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(enrollment.lastAccessedAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {enrollment.expiresAt ? (
                      <span className={new Date(enrollment.expiresAt) < new Date() ? 'text-red-500' : ''}>
                        {formatDate(enrollment.expiresAt)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedEnrollment(enrollment)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border px-3 py-1 text-xs disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="rounded-md border px-3 py-1 text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enroll Student Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Enroll Student</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Student</label>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-1"
                  placeholder="Search by name or email..."
                />
                <select
                  value={enrollUserId}
                  onChange={(e) => setEnrollUserId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a student...</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                {users.length === 0 && userSearch && (
                  <p className="mt-1 text-[10px] text-amber-600">No users found matching &ldquo;{userSearch}&rdquo;</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
                <select
                  value={enrollCourseId}
                  onChange={(e) => setEnrollCourseId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a course...</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Expiration Date (optional)</label>
                <input
                  type="date"
                  value={enrollExpires}
                  onChange={(e) => setEnrollExpires(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEnrollModal(false)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  enrollMutation.mutate({
                    userId: enrollUserId,
                    courseId: enrollCourseId,
                    expiresAt: enrollExpires || undefined,
                  })
                }
                disabled={!enrollUserId || !enrollCourseId || enrollMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {enrollMutation.isPending ? 'Enrolling...' : 'Enroll'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Enrollment Modal */}
      {selectedEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Manage Enrollment</h2>
            <p className="text-xs text-gray-400 mb-6">
              {selectedEnrollment.user?.firstName} {selectedEnrollment.user?.lastName} &mdash; {selectedEnrollment.course?.title}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-[10px] font-medium text-gray-400 uppercase">Status</p>
                <p className="mt-1 text-sm font-medium text-gray-800">{selectedEnrollment.status}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-[10px] font-medium text-gray-400 uppercase">Progress</p>
                <p className="mt-1 text-sm font-medium text-gray-800">{selectedEnrollment.progressPercent || 0}%</p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-[10px] font-medium text-gray-400 uppercase">Enrolled</p>
                <p className="mt-1 text-sm text-gray-700">{formatDate(selectedEnrollment.enrolledAt)}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-[10px] font-medium text-gray-400 uppercase">Last Access</p>
                <p className="mt-1 text-sm text-gray-700">{formatDate(selectedEnrollment.lastAccessedAt)}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-[10px] font-medium text-gray-400 uppercase">Completed</p>
                <p className="mt-1 text-sm text-gray-700">{formatDate(selectedEnrollment.completedAt)}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-[10px] font-medium text-gray-400 uppercase">Expires</p>
                <p className="mt-1 text-sm text-gray-700">{formatDate(selectedEnrollment.expiresAt)}</p>
              </div>
            </div>

            {selectedEnrollment.orderId && (
              <div className="mb-6 rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="text-[10px] font-medium text-gray-400 uppercase">Linked Order</p>
                <p className="mt-1 text-xs font-mono text-gray-600">{selectedEnrollment.orderId}</p>
              </div>
            )}

            <div className="flex justify-between">
              <div className="flex gap-2">
                {selectedEnrollment.status === 'active' && (
                  <>
                    <button
                      onClick={() => completeMutation.mutate(selectedEnrollment.id)}
                      disabled={completeMutation.isPending}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {completeMutation.isPending ? 'Completing...' : 'Mark Complete'}
                    </button>
                    <button
                      onClick={() => cancelMutation.mutate(selectedEnrollment.id)}
                      disabled={cancelMutation.isPending}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancelMutation.isPending ? 'Suspending...' : 'Suspend'}
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setSelectedEnrollment(null)}
                className="rounded-md border border-gray-200 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
