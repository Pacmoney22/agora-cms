'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { certificatesApi, coursesApi, settingsApi } from '@/lib/api-client';
import Link from 'next/link';
import type { CertificateTemplate } from './types';

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function CertificatesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [courseFilter, setCourseFilter] = useState<string>('');
  const [confirmRegenId, setConfirmRegenId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['certificates', page, courseFilter],
    queryFn: () =>
      certificatesApi.list({
        page,
        limit: 20,
        courseId: courseFilter || undefined,
      }),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses', 'certificate-picker'],
    queryFn: () => coursesApi.list({ limit: 100 }),
  });

  const { data: templatesData } = useQuery({
    queryKey: ['settings', 'certificate_templates'],
    queryFn: () => settingsApi.get('certificate_templates'),
  });

  const certTemplates: CertificateTemplate[] = templatesData?.value?.templates || [];

  const regenerateMutation = useMutation({
    mutationFn: ({ id, template }: { id: string; template?: Record<string, any> }) =>
      certificatesApi.regenerate(id, template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast.success('Certificate regenerated successfully');
      setConfirmRegenId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setConfirmRegenId(null);
    },
  });

  const certificates = data?.data || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };
  const courses = coursesData?.data || [];

  const formatDate = (d: string | null) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const copyVerifyLink = (code: string) => {
    const storefrontUrl =
      process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3200';
    const url = `${storefrontUrl}/certificates/verify/${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Verification link copied to clipboard'),
      () => toast.error('Failed to copy link'),
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage completion certificates across all courses
          </p>
        </div>
        <Link
          href="/certificates/designer"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Design Templates
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Courses</option>
          {courses.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-gray-400">
          {meta.total} certificate{meta.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          </div>
        ) : certificates.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">No certificates found</p>
            <p className="mt-1 text-xs text-gray-300">
              Certificates are generated when students complete a course
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">
                  Student
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">
                  Course
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">
                  Issued
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">
                  Verification Code
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert: any) => (
                <tr
                  key={cert.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {cert.enrollment?.user?.name || '\u2014'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {cert.enrollment?.user?.email || cert.enrollmentId}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800">
                      {cert.enrollment?.course?.title || '\u2014'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(cert.issuedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700">
                      {cert.verificationCode}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {cert.certificateUrl && isSafeUrl(cert.certificateUrl) && (
                        <a
                          href={cert.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View PDF
                        </a>
                      )}
                      <button
                        onClick={() => copyVerifyLink(cert.verificationCode)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Copy Link
                      </button>
                      <button
                        onClick={() => setConfirmRegenId(cert.id)}
                        className="text-xs text-amber-600 hover:text-amber-800"
                      >
                        Regenerate
                      </button>
                    </div>
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

      {/* Regenerate Confirmation Modal */}
      {confirmRegenId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Regenerate Certificate?
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              This will delete the existing certificate PDF and generate a new
              one with a new verification code. The old verification link will
              stop working.
            </p>

            {certTemplates.length > 0 && (
              <div className="mb-4">
                <label htmlFor="regen-template-select" className="block text-xs font-medium text-gray-700 mb-1">
                  Certificate Template
                </label>
                <select
                  id="regen-template-select"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Default (no template)</option>
                  {certTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.type}){t.isDefault ? ' — Default' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmRegenId(null);
                  setSelectedTemplateId('');
                }}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const tpl = certTemplates.find((t) => t.id === selectedTemplateId);
                  regenerateMutation.mutate({
                    id: confirmRegenId,
                    template: tpl || undefined,
                  });
                }}
                disabled={regenerateMutation.isPending}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {regenerateMutation.isPending
                  ? 'Regenerating...'
                  : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
