'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';

type CheckInMethod = 'email' | 'confirmation' | 'qr';

interface CheckInResult {
  success: boolean;
  attendee?: {
    id: string;
    name: string;
    email: string;
    ticketType: string;
    ticketTypeName: string;
    seatAssignment: string;
  };
  message?: string;
  alreadyCheckedIn?: boolean;
}

export default function SelfCheckInPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [method, setMethod] = useState<CheckInMethod>('email');
  const [email, setEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const { data: event } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
    enabled: !!eventId,
  });

  const checkInMutation = useMutation({
    mutationFn: (data: { email?: string; qrCode?: string; confirmationCode?: string }) =>
      eventsApi.selfCheckIn(eventId, data),
    onSuccess: (data: CheckInResult) => {
      setResult(data);
      if (data.success && !data.alreadyCheckedIn) {
        toast.success(`Welcome, ${data.attendee?.name}!`);
      } else if (data.alreadyCheckedIn) {
        toast.success('You are already checked in!');
      }
      setEmail('');
      setConfirmationCode('');
      setQrInput('');
    },
    onError: (err: Error) => {
      setResult({ success: false, message: err.message });
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (method === 'email') {
      if (!email.trim()) return;
      checkInMutation.mutate({ email: email.trim() });
    } else if (method === 'confirmation') {
      if (!confirmationCode.trim()) return;
      checkInMutation.mutate({ confirmationCode: confirmationCode.trim() });
    } else if (method === 'qr') {
      if (!qrInput.trim()) return;
      checkInMutation.mutate({ qrCode: qrInput.trim() });
    }
  };

  // Auto-focus QR input for scanner mode
  useEffect(() => {
    if (method === 'qr' && qrInputRef.current) {
      qrInputRef.current.focus();
    }
  }, [method]);

  // Auto-submit QR codes (barcode scanners typically send Enter)
  const handleQrKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && qrInput.trim()) {
      e.preventDefault();
      checkInMutation.mutate({ qrCode: qrInput.trim() });
    }
  };

  const resetForNext = () => {
    setResult(null);
    setEmail('');
    setConfirmationCode('');
    setQrInput('');
    if (method === 'qr' && qrInputRef.current) qrInputRef.current.focus();
  };

  const isPending = checkInMutation.isPending;
  const inputCls = 'w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <Link href={`/events/${eventId}`} className="text-xs text-gray-400 hover:text-gray-600">
            &larr; Back to Event Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {event?.title || 'Event'} — Self Check-In
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome! Please check in using one of the methods below.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Success / Error Result */}
        {result && (
          <div className={`mb-6 rounded-xl p-6 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.success ? (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-green-800">
                  {result.alreadyCheckedIn ? 'Already Checked In' : 'Check-In Successful!'}
                </h2>
                <p className="mt-1 text-lg text-green-700">{result.attendee?.name}</p>
                {result.attendee?.ticketTypeName && (
                  <span className="mt-2 inline-block rounded-full bg-green-200 px-3 py-1 text-sm font-medium text-green-800">
                    {result.attendee.ticketTypeName}
                  </span>
                )}
                {result.attendee?.seatAssignment && (
                  <p className="mt-2 text-sm text-green-600">
                    Seat: <span className="font-semibold">{result.attendee.seatAssignment}</span>
                  </p>
                )}
                <button
                  onClick={resetForNext}
                  className="mt-4 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Next Check-In
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-red-800">Check-In Failed</h2>
                <p className="mt-1 text-sm text-red-600">{result.message || 'Registration not found. Please try again or contact event staff.'}</p>
                <button
                  onClick={resetForNext}
                  className="mt-4 rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Method Selector */}
        {!result && (
          <>
            <div className="mb-6 flex gap-2 rounded-lg bg-white p-1 shadow">
              {([
                { key: 'email' as const, label: 'Email Address' },
                { key: 'confirmation' as const, label: 'Confirmation Code' },
                { key: 'qr' as const, label: 'QR / Badge Scan' },
              ]).map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={`flex-1 rounded-md px-4 py-3 text-sm font-medium transition-all ${
                    method === m.key
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Check-In Form */}
            <div className="rounded-xl bg-white p-6 shadow-lg">
              <form onSubmit={handleSubmit}>
                {method === 'email' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Enter your email address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputCls}
                      placeholder="you@example.com"
                      autoFocus
                    />
                    <p className="mt-2 text-xs text-gray-400">
                      Use the email address you registered with.
                    </p>
                  </div>
                )}

                {method === 'confirmation' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Enter your confirmation code
                    </label>
                    <input
                      type="text"
                      required
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                      className={`${inputCls} font-mono tracking-widest text-center`}
                      placeholder="ABC-12345"
                      autoFocus
                    />
                    <p className="mt-2 text-xs text-gray-400">
                      Find this in your registration confirmation email.
                    </p>
                  </div>
                )}

                {method === 'qr' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Scan your badge or ticket QR code
                    </label>
                    <input
                      ref={qrInputRef}
                      type="text"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      onKeyDown={handleQrKeyDown}
                      className={`${inputCls} font-mono`}
                      placeholder="Scan or paste QR code..."
                      autoFocus
                    />
                    <p className="mt-2 text-xs text-gray-400">
                      Point your badge at the scanner, or enter the code manually.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-4 w-full rounded-lg bg-blue-600 py-3 text-lg font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? 'Checking in...' : 'Check In'}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-gray-400">
              Need help? Ask event staff at the registration desk.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
