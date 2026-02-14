'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function CoursesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  // Fetch courses
  const { data, isLoading } = useQuery({
    queryKey: ['courses', { page, status: statusFilter }],
    queryFn: () => coursesApi.list({ page, limit: 20, status: statusFilter }),
  });

  // Create course mutation
  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string }) =>
      coursesApi.create({
        title: data.title,
        description: data.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course created successfully');
      setShowCreate(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create course');
    },
  });

  // Delete course mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => coursesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course deleted successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete course');
    },
  });

  // Publish course mutation
  const publishMutation = useMutation({
    mutationFn: (id: string) => coursesApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course published successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to publish course');
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = (formData.get('title') as string).trim();
    const description = (formData.get('description') as string).trim();
    if (title && description) {
      createMutation.mutate({ title, description });
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Courses</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'New Course'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
          <h2 className="mb-3 text-lg font-semibold">Create New Course</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              name="title"
              type="text"
              placeholder="Course Title"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
            <textarea
              name="description"
              placeholder="Course Description"
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Course'}
            </button>
          </form>
        </div>
      )}

      {/* Status Filters */}
      <div className="mb-4 flex gap-2">
        {['all', 'draft', 'published', 'archived'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status === 'all' ? undefined : status)}
            className={`rounded-md px-3 py-1 text-sm ${
              (status === 'all' && !statusFilter) || statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Courses Table */}
      {isLoading ? (
        <div className="text-center">Loading...</div>
      ) : data?.data && data.data.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Published
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.data.map((course: any) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{course.title}</div>
                        <div className="text-sm text-gray-500">{course.slug}</div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          course.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : course.status === 'archived'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {course.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {course.publishedAt
                        ? new Date(course.publishedAt).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <Link
                          href={`/courses/${course.id}/edit`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/courses/${course.id}/curriculum`}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          Curriculum
                        </Link>
                        {course.status === 'draft' && (
                          <button
                            onClick={() => publishMutation.mutate(course.id)}
                            disabled={publishMutation.isPending}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            Publish
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this course?')) {
                              deleteMutation.mutate(course.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.meta && data.meta.totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {page} of {data.meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                disabled={page === data.meta.totalPages}
                className="rounded-md bg-gray-200 px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-500">No courses found. Create your first course to get started.</p>
        </div>
      )}
    </div>
  );
}
