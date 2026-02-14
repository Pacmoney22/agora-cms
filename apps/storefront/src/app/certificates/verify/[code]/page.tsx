'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_COURSE_API_URL || 'http://localhost:3005';

export default function VerifyCertificatePage() {
  const params = useParams();
  const code = params.code as string;

  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyCertificate = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/v1/certificates/verify/${code}`);
        if (!res.ok) {
          throw new Error('Certificate not found or invalid');
        }
        const data = await res.json();
        setVerification(data);
      } catch (err: any) {
        setError(err.message || 'Verification failed');
      } finally {
        setLoading(false);
      }
    };
    verifyCertificate();
  }, [code]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-lg">Verifying certificate...</div>
        </div>
      </div>
    );
  }

  if (error || !verification) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">❌</div>
          <h1 className="mb-2 text-2xl font-bold text-red-600">Invalid Certificate</h1>
          <p className="mb-6 text-gray-600">
            {error || 'This certificate could not be verified. Please check the verification code and try again.'}
          </p>
          <div className="rounded-lg bg-red-50 p-4 text-left">
            <div className="text-sm text-red-700">
              <strong>Verification Code:</strong> {code}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        {/* Success Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 text-6xl">✅</div>
          <h1 className="mb-2 text-3xl font-bold text-green-600">
            Certificate Verified
          </h1>
          <p className="text-lg text-gray-600">
            This is a valid certificate issued by our platform
          </p>
        </div>

        {/* Certificate Details */}
        <div className="mb-8 rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-xl font-bold text-gray-900">Certificate Information</h2>

          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <div className="text-sm text-gray-500">Course</div>
              <div className="text-lg font-semibold text-gray-900">
                {verification.courseTitle}
              </div>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <div className="text-sm text-gray-500">Issued Date</div>
              <div className="font-medium text-gray-900">
                {new Date(verification.issuedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>

            {verification.completedAt && (
              <div className="border-b border-gray-200 pb-4">
                <div className="text-sm text-gray-500">Completion Date</div>
                <div className="font-medium text-gray-900">
                  {new Date(verification.completedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            )}

            <div className="border-b border-gray-200 pb-4">
              <div className="text-sm text-gray-500">Verification Code</div>
              <div className="font-mono text-sm font-medium text-gray-900">
                {code}
              </div>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <div className="text-sm text-gray-500">Certificate ID</div>
              <div className="font-mono text-sm text-gray-700">
                {verification.certificateId}
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-green-700">
                  This certificate is valid and authentic
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Info */}
        <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-6">
          <h3 className="mb-2 font-semibold text-indigo-900">About Certificate Verification</h3>
          <p className="text-sm text-indigo-700">
            This certificate has been cryptographically verified against our database.
            The verification code uniquely identifies this certificate and confirms that
            it was issued by our platform to a student who successfully completed the course.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 text-center">
          <a
            href="/courses"
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700"
          >
            Browse Our Courses
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
