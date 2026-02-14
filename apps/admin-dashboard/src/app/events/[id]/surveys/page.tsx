'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Survey {
  id: string;
  title: string;
  description: string;
  type: 'event' | 'session';
  sessionId: string;
  status: 'draft' | 'active' | 'closed';
  questions: SurveyQuestion[];
  responseCount: number;
  createdAt: string;
}

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'rating' | 'single_choice' | 'multiple_choice' | 'nps';
  required: boolean;
  options: string[];
  order: number;
}

interface SurveyResponse {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  answers: Record<string, string | string[] | number>;
  submittedAt: string;
}

const QUESTION_TYPES = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'rating', label: 'Star Rating (1-5)' },
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'nps', label: 'NPS (0-10)' },
];

const EMPTY_FORM = {
  title: '', description: '', type: 'event' as Survey['type'], sessionId: '',
  status: 'draft' as Survey['status'], questions: [] as SurveyQuestion[],
};

export default function SurveysPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [viewingResponses, setViewingResponses] = useState<string | null>(null);

  const { data: event } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.get(eventId),
    enabled: !!eventId,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['events', eventId, 'sessions'],
    queryFn: () => eventsApi.listSessions(eventId),
    enabled: !!eventId,
  });

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ['events', eventId, 'surveys'],
    queryFn: () => eventsApi.listSurveys(eventId),
    enabled: !!eventId,
  });

  const { data: responses = [] } = useQuery({
    queryKey: ['events', eventId, 'surveys', viewingResponses, 'responses'],
    queryFn: () => eventsApi.getSurveyResponses(eventId, viewingResponses!),
    enabled: !!viewingResponses,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => eventsApi.createSurvey(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'surveys'] });
      toast.success('Survey created');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ surveyId, data }: { surveyId: string; data: any }) =>
      eventsApi.updateSurvey(eventId, surveyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'surveys'] });
      toast.success('Survey updated');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (surveyId: string) => eventsApi.deleteSurvey(eventId, surveyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'surveys'] });
      toast.success('Survey deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (survey: Survey) => {
    setForm({
      title: survey.title, description: survey.description || '',
      type: survey.type, sessionId: survey.sessionId || '',
      status: survey.status, questions: survey.questions || [],
    });
    setEditingId(survey.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editingId) {
      updateMutation.mutate({ surveyId: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  // Question helpers
  const addQuestion = () => {
    setForm((f) => ({
      ...f,
      questions: [...f.questions, {
        id: crypto.randomUUID(), text: '', type: 'text' as const,
        required: false, options: [], order: f.questions.length,
      }],
    }));
  };

  const updateQuestion = (id: string, updates: Partial<SurveyQuestion>) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q) => q.id === id ? { ...q, ...updates } : q),
    }));
  };

  const removeQuestion = (id: string) => {
    setForm((f) => ({ ...f, questions: f.questions.filter((q) => q.id !== id) }));
  };

  const moveQuestion = (id: string, dir: -1 | 1) => {
    setForm((f) => {
      const idx = f.questions.findIndex((q) => q.id === id);
      if (idx < 0) return f;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= f.questions.length) return f;
      const qs = [...f.questions];
      const a = qs[idx];
      const b = qs[newIdx];
      if (!a || !b) return f;
      [qs[idx], qs[newIdx]] = [b, a];
      return { ...f, questions: qs.map((q, i) => ({ ...q, order: i })) };
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-xs font-medium text-gray-700 mb-1';
  const smallLabelCls = 'block text-[10px] font-medium text-gray-500 mb-1';

  // If viewing responses, show that panel
  if (viewingResponses) {
    const survey = (surveys as Survey[]).find((s) => s.id === viewingResponses);
    return (
      <div className="p-8">
        <button onClick={() => setViewingResponses(null)} className="text-xs text-gray-400 hover:text-gray-600 mb-4">&larr; Back to Surveys</button>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{survey?.title || 'Survey'} Responses</h1>
        <p className="text-sm text-gray-500 mb-6">{(responses as SurveyResponse[]).length} responses</p>

        {(responses as SurveyResponse[]).length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No responses yet.</p>
        ) : (
          <div className="space-y-4">
            {(responses as SurveyResponse[]).map((resp) => (
              <div key={resp.id} className="rounded-lg bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{resp.attendeeName}</p>
                    <p className="text-xs text-gray-400">{resp.attendeeEmail}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {resp.submittedAt ? new Date(resp.submittedAt).toLocaleString() : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {survey?.questions.map((q) => {
                    const answer = resp.answers?.[q.id];
                    return (
                      <div key={q.id} className="border-t border-gray-100 pt-2">
                        <p className="text-xs font-medium text-gray-600">{q.text}</p>
                        <p className="text-sm text-gray-900 mt-0.5">
                          {q.type === 'rating' ? '\u2605'.repeat(Number(answer) || 0) + '\u2606'.repeat(5 - (Number(answer) || 0)) :
                           q.type === 'nps' ? `${answer}/10` :
                           Array.isArray(answer) ? answer.join(', ') :
                           String(answer || '\u2014')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {survey && (responses as SurveyResponse[]).length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              {survey.questions.filter((q) => q.type === 'rating' || q.type === 'nps').map((q) => {
                const values = (responses as SurveyResponse[]).map((r) => Number(r.answers?.[q.id] || 0)).filter((v) => v > 0);
                const avg = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 'N/A';
                return (
                  <div key={q.id} className="rounded-lg bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500">{q.text}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {avg}{q.type === 'nps' ? '/10' : '/5'}
                    </p>
                    <p className="text-[10px] text-gray-400">{values.length} responses</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/events/${eventId}`} className="text-xs text-gray-400 hover:text-gray-600">&larr; Back to Event</Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Surveys</h1>
            <p className="mt-1 text-sm text-gray-500">{event?.title || 'Event'} — event and session feedback</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Create Survey
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">{editingId ? 'Edit Survey' : 'New Survey'}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Title *</label>
              <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="e.g. Post-Event Feedback" />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })} className={inputCls}>
                <option value="event">Event Survey</option>
                <option value="session">Session Survey</option>
              </select>
            </div>
            {form.type === 'session' && (sessions as any[]).length > 0 && (
              <div>
                <label className={labelCls}>Session</label>
                <select value={form.sessionId} onChange={(e) => setForm({ ...form, sessionId: e.target.value })} className={inputCls}>
                  <option value="">Select session...</option>
                  {(sessions as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className={inputCls}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls} placeholder="Brief intro shown to respondents" />
            </div>
          </div>

          {/* Questions */}
          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className={labelCls}>Questions</label>
              <button type="button" onClick={addQuestion} className="text-xs text-blue-600 hover:text-blue-800">+ Add Question</button>
            </div>
            {form.questions.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No questions yet. Add at least one question.</p>
            ) : (
              <div className="space-y-3">
                {form.questions.map((q, idx) => (
                  <div key={q.id} className="rounded-md border border-gray-200 p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-1 mt-1">
                        <button type="button" onClick={() => moveQuestion(q.id, -1)} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">&uarr;</button>
                        <button type="button" onClick={() => moveQuestion(q.id, 1)} disabled={idx === form.questions.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs">&darr;</button>
                      </div>
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className={smallLabelCls}>Question Text</label>
                          <input type="text" value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} className={inputCls} placeholder="Your question..." />
                        </div>
                        <div>
                          <label className={smallLabelCls}>Type</label>
                          <select value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value as any })} className={inputCls}>
                            {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                          <div className="col-span-2">
                            <label className={smallLabelCls}>Options (one per line)</label>
                            <textarea
                              value={q.options.join('\n')}
                              onChange={(e) => updateQuestion(q.id, { options: e.target.value.split('\n') })}
                              rows={3}
                              className={inputCls}
                              placeholder="Option 1&#10;Option 2&#10;Option 3"
                            />
                          </div>
                        )}
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })} className="rounded border-gray-300" />
                            Required
                          </label>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeQuestion(q.id)} className="text-red-400 hover:text-red-600 mt-1">&times;</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {/* Surveys List */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading surveys...</div>
      ) : (surveys as Survey[]).length > 0 ? (
        <div className="space-y-3">
          {(surveys as Survey[]).map((survey) => (
            <div key={survey.id} className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm hover:shadow">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900">{survey.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    survey.status === 'active' ? 'bg-green-100 text-green-700' :
                    survey.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {survey.status}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    survey.type === 'event' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                  }`}>
                    {survey.type}
                  </span>
                </div>
                {survey.description && <p className="text-xs text-gray-400 mt-0.5">{survey.description}</p>}
                <p className="text-xs text-gray-500 mt-1">{survey.questions?.length || 0} questions &middot; {survey.responseCount || 0} responses</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setViewingResponses(survey.id)} className="text-xs text-green-600 hover:text-green-800">
                  Responses
                </button>
                <button onClick={() => startEdit(survey)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                <button onClick={() => { if (confirm(`Delete "${survey.title}"?`)) deleteMutation.mutate(survey.id); }} className="text-xs text-red-500 hover:text-red-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No surveys yet.</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            Create First Survey
          </button>
        </div>
      )}
    </div>
  );
}
