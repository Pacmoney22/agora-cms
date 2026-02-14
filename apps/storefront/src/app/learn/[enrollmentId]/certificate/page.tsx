'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCertificate, getEnrollment } from '@/lib/api';

export default function CertificatePage() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.enrollmentId as string;

  const [certificate, setCertificate] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [certData, enrollData] = await Promise.all([
          getCertificate(enrollmentId),
          getEnrollment(enrollmentId),
        ]);
        setCertificate(certData);
        setEnrollment(enrollData);
      } catch (err: any) {
        setError(err.message || 'Failed to load certificate');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [enrollmentId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">Loading certificate...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg text-red-600">{error}</div>
          <button
            onClick={() => router.push(`/learn/${enrollmentId}`)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">🎓</div>
          <h1 className="mb-2 text-2xl font-bold">Certificate Not Available</h1>
          <p className="mb-6 text-gray-600">
            Complete all course requirements to receive your certificate.
          </p>
          <button
            onClick={() => router.push(`/learn/${enrollmentId}`)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Continue Learning
          </button>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    window.open(certificate.certificateUrl, '_blank');
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/certificates/verify/${certificate.verificationCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate - ${enrollment?.course?.title}`,
          text: `I completed ${enrollment?.course?.title}!`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert('Certificate verification link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 text-6xl">🎉</div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Congratulations!
          </h1>
          <p className="text-lg text-gray-600">
            You've successfully completed {enrollment?.course?.title}
          </p>
        </div>

        {/* Certificate Preview */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white shadow-lg">
          <iframe
            src={certificate.certificateUrl}
            className="h-96 w-full border-0"
            title="Certificate Preview"
          />
        </div>

        {/* Certificate Info */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-bold">Certificate Details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-gray-500">Course</div>
              <div className="font-medium">{enrollment?.course?.title}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Issued Date</div>
              <div className="font-medium">
                {new Date(certificate.issuedAt).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Verification Code</div>
              <div className="font-mono text-sm font-medium">
                {certificate.verificationCode}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  ✓ Verified
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 rounded-md bg-gray-200 px-6 py-3 text-gray-700 hover:bg-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Certificate
          </button>
          <button
            onClick={() => router.push('/courses')}
            className="flex items-center gap-2 rounded-md bg-gray-200 px-6 py-3 text-gray-700 hover:bg-gray-300"
          >
            Browse More Courses
          </button>
        </div>

        {/* Verification Info */}
        <div className="mt-8 rounded-lg border-2 border-gray-200 bg-gray-50 p-6 text-center">
          <h3 className="mb-2 font-semibold text-gray-900">Verify This Certificate</h3>
          <p className="mb-4 text-sm text-gray-600">
            Anyone can verify the authenticity of this certificate using the verification code above.
          </p>
          <a
            href={`/certificates/verify/${certificate.verificationCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:text-indigo-800 underline"
          >
            {window.location.origin}/certificates/verify/{certificate.verificationCode}
          </a>
        </div>
      </div>
    </div>
  );
}
