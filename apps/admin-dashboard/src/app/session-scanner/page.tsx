'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface Session {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  room: string;
  speaker: string;
}

interface ScanResult {
  success: boolean;
  attendee?: { id: string; name: string; email: string; ticketTypeName: string };
  message?: string;
  alreadyScanned?: boolean;
}

interface AttendanceRecord {
  id: string;
  attendeeId: string;
  attendeeName: string;
  attendeeEmail: string;
  scannedAt: string;
}

export default function SessionScannerPage() {
  const queryClient = useQueryClient();
  const [eventId, setEventId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [scanLog, setScanLog] = useState<Array<{ time: string; name: string; success: boolean; message: string }>>([]);
  const qrRef = useRef<HTMLInputElement>(null);

  const { data: eventsData } = useQuery({
    queryKey: ['events', { limit: 100 }],
    queryFn: () => eventsApi.list({ limit: 100 }),
  });

  const events = eventsData?.data || [];
  const selectedEvent = events.find((e: any) => e.id === eventId);

  const { data: sessionsData } = useQuery({
    queryKey: ['events', eventId, 'sessions'],
    queryFn: () => eventsApi.listSessions(eventId),
    enabled: !!eventId,
  });

  const sessions: Session[] = sessionsData || [];

  const { data: attendanceData, refetch: refetchAttendance } = useQuery({
    queryKey: ['events', eventId, 'sessions', selectedSessionId, 'attendance'],
    queryFn: () => eventsApi.getSessionAttendance(eventId, selectedSessionId),
    enabled: !!eventId && !!selectedSessionId,
  });

  const attendance: AttendanceRecord[] = attendanceData || [];

  const scanMutation = useMutation({
    mutationFn: (qrCode: string) =>
      eventsApi.scanBadge(eventId, { qrCode, context: 'session', sessionId: selectedSessionId }),
    onSuccess: (data: ScanResult) => {
      setLastResult(data);
      setScanLog((prev) => [
        { time: new Date().toLocaleTimeString(), name: data.attendee?.name || 'Unknown', success: true, message: data.alreadyScanned ? 'Already recorded' : 'Checked in' },
        ...prev,
      ]);
      if (data.success && !data.alreadyScanned) {
        toast.success(`${data.attendee?.name} checked in`);
      } else if (data.alreadyScanned) {
        toast(`${data.attendee?.name} already scanned`, { icon: '\u2139\uFE0F' });
      }
      refetchAttendance();
      setQrInput('');
      qrRef.current?.focus();
    },
    onError: (err: Error) => {
      setLastResult({ success: false, message: err.message });
      setScanLog((prev) => [
        { time: new Date().toLocaleTimeString(), name: 'Error', success: false, message: err.message },
        ...prev,
      ]);
      toast.error(err.message);
      setQrInput('');
      qrRef.current?.focus();
    },
  });

  const handleScan = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!qrInput.trim() || !selectedSessionId) return;
    scanMutation.mutate(qrInput.trim());
  };

  const handleQrKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && qrInput.trim()) {
      e.preventDefault();
      handleScan();
    }
  };

  useEffect(() => {
    if (selectedSessionId && qrRef.current) qrRef.current.focus();
  }, [selectedSessionId]);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Session Attendance Scanner</h1>
        <p className="mt-1 text-sm text-gray-500">Scan badges to track session attendance at conference sessions</p>
      </div>

      {/* Event + Session Selector */}
      <div className="mb-6 rounded-lg bg-white p-5 shadow">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Select Event</label>
            <select
              value={eventId}
              onChange={(e) => { setEventId(e.target.value); setSelectedSessionId(''); setLastResult(null); setScanLog([]); }}
              className={inputCls}
            >
              <option value="">— Choose an event —</option>
              {events.map((ev: any) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} {ev.startDate ? `(${new Date(ev.startDate).toLocaleDateString()})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Select Session</label>
            <select
              value={selectedSessionId}
              onChange={(e) => { setSelectedSessionId(e.target.value); setLastResult(null); setScanLog([]); }}
              className={inputCls}
              disabled={!eventId}
            >
              <option value="">— Choose a session —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} {s.room ? `(${s.room})` : ''} {s.startTime ? `— ${new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                </option>
              ))}
            </select>
            {eventId && sessions.length === 0 && (
              <p className="mt-1 text-xs text-gray-400">No sessions found. Create sessions in the event schedule first.</p>
            )}
          </div>
        </div>
      </div>

      {selectedSessionId && (
        <div className="grid grid-cols-3 gap-6">
          {/* Scanner Panel */}
          <div className="col-span-2 space-y-4">
            {/* Active Session Info */}
            {selectedSession && (
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4">
                <h2 className="text-lg font-semibold text-indigo-900">{selectedSession.title}</h2>
                <div className="mt-1 flex gap-4 text-sm text-indigo-700">
                  {selectedSession.room && <span>Room: {selectedSession.room}</span>}
                  {selectedSession.speaker && <span>Speaker: {selectedSession.speaker}</span>}
                  {selectedSession.startTime && (
                    <span>
                      {new Date(selectedSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {selectedSession.endTime && ` – ${new Date(selectedSession.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Scanner Input */}
            <div className="rounded-lg bg-white p-5 shadow">
              <form onSubmit={handleScan}>
                <label className="mb-2 block text-sm font-medium text-gray-700">Scan Badge QR Code</label>
                <div className="flex gap-3">
                  <input
                    ref={qrRef}
                    type="text"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    onKeyDown={handleQrKeyDown}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-lg font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Scan badge or enter code..."
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={scanMutation.isPending || !qrInput.trim()}
                    className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {scanMutation.isPending ? 'Scanning...' : 'Record'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-400">Point badge at scanner — auto-submits on scan.</p>
              </form>

              {/* Last Scan Result */}
              {lastResult && (
                <div className={`mt-4 rounded-lg p-4 ${lastResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {lastResult.success ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-green-800">{lastResult.attendee?.name}</p>
                        <p className="text-xs text-green-600">
                          {lastResult.alreadyScanned ? 'Already recorded for this session' : 'Attendance recorded'}
                          {lastResult.attendee?.ticketTypeName && ` — ${lastResult.attendee.ticketTypeName}`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                        <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-red-800">Scan Failed</p>
                        <p className="text-xs text-red-600">{lastResult.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scan Log */}
            {scanLog.length > 0 && (
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Scan Log</h3>
                  <button onClick={() => setScanLog([])} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {scanLog.map((entry, i) => (
                    <div key={i} className={`flex items-center gap-3 rounded px-3 py-2 text-sm ${entry.success ? 'bg-green-50' : 'bg-red-50'}`}>
                      <span className="text-xs text-gray-400 font-mono">{entry.time}</span>
                      <span className={`font-medium ${entry.success ? 'text-green-700' : 'text-red-700'}`}>{entry.name}</span>
                      <span className="text-xs text-gray-500">{entry.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attendance Sidebar */}
          <div className="space-y-4">
            <div className="rounded-lg bg-white p-5 shadow">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Session Attendance</h3>
              <div className="mb-3 rounded-lg bg-indigo-50 p-3 text-center">
                <p className="text-3xl font-bold text-indigo-700">{attendance.length}</p>
                <p className="text-xs text-indigo-500">attendees checked in</p>
              </div>
              {attendance.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">No attendees scanned yet.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {attendance.map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-gray-50">
                      <div>
                        <p className="text-xs font-medium text-gray-900">{rec.attendeeName}</p>
                        <p className="text-[10px] text-gray-400">{rec.attendeeEmail}</p>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(rec.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!eventId && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">Select an event and session above to start scanning badges.</p>
        </div>
      )}
      {eventId && !selectedSessionId && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">Select a session above to start scanning badges for attendance.</p>
        </div>
      )}
    </div>
  );
}
