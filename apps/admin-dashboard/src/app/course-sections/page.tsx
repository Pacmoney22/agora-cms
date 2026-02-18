'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi, coursesApi, usersApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';

// ── Types ──

interface SectionSchedule {
  startDate: string;
  endDate: string;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  timezone: string;
  location: string;
  recurrence: string; // 'weekly' | 'biweekly' | 'daily' | 'custom'
  notes: string;
}

interface CourseSection {
  id: string;
  courseId: string;
  courseName: string;
  name: string;
  code: string; // e.g. "SEC-001", "SPRING-2026-A"
  deliveryMode: 'on_demand' | 'scheduled';
  status: 'active' | 'inactive' | 'completed' | 'upcoming';
  instructorId: string;
  instructorName: string;
  description: string;
  maxEnrollment: number; // 0 = unlimited
  currentEnrollment: number;
  schedule: SectionSchedule;
  enrollmentOpen: boolean;
  enrollmentDeadline: string;
  createdAt: string;
  updatedAt: string;
}

interface SectionsRegistry {
  sections: CourseSection[];
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'UTC',
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-700',
  upcoming: 'bg-amber-100 text-amber-700',
};

const DEFAULT_SCHEDULE: SectionSchedule = {
  startDate: '',
  endDate: '',
  daysOfWeek: [],
  startTime: '09:00',
  endTime: '10:30',
  timezone: 'America/New_York',
  location: '',
  recurrence: 'weekly',
  notes: '',
};

const EMPTY_FORM = {
  courseId: '',
  name: '',
  code: '',
  deliveryMode: 'on_demand' as 'on_demand' | 'scheduled',
  status: 'active' as CourseSection['status'],
  instructorId: '',
  description: '',
  maxEnrollment: 0,
  enrollmentOpen: true,
  enrollmentDeadline: '',
  schedule: { ...DEFAULT_SCHEDULE },
};

// ── Instructor roles ──

const INSTRUCTOR_ROLES = ['editor', 'store_manager', 'admin', 'super_admin'];

// ── Component ──

export default function CourseSectionsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Load sections
  const { data: registry, isLoading } = useQuery({
    queryKey: ['settings', 'course_sections_registry'],
    queryFn: () => settingsApi.get('course_sections_registry').catch((): SectionsRegistry => ({ sections: [] })),
  });

  // Load courses for dropdown
  const { data: coursesData, error: coursesError } = useQuery({
    queryKey: ['courses', { limit: 200 }],
    queryFn: () => coursesApi.list({ limit: 200 }),
    retry: 1,
  });

  // Load eligible instructors
  const { data: usersData } = useQuery({
    queryKey: ['users', 'instructors'],
    queryFn: () => usersApi.list({ limit: 200, isActive: 'true' }),
  });

  // Load instructor profiles for display
  const { data: authorProfilesData } = useQuery({
    queryKey: ['settings', 'author_profiles'],
    queryFn: () => settingsApi.get('author_profiles').catch(() => ({ profiles: {} })),
  });
  const instructorProfiles: Record<string, { bio: string; profileImage: string }> = (authorProfilesData as any)?.profiles || {};

  const sections: CourseSection[] = (registry as SectionsRegistry)?.sections || [];
  const courses = coursesData?.data || [];
  const eligibleInstructors = (usersData?.data || []).filter((u: any) => INSTRUCTOR_ROLES.includes(u.role));

  // Filter
  const filtered = sections.filter((s) => {
    if (courseFilter && s.courseId !== courseFilter) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.courseName.toLowerCase().includes(q) ||
        s.instructorName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (updated: CourseSection[]) =>
      settingsApi.update('course_sections_registry', { sections: updated } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'course_sections_registry'] });
      toast.success(editingId ? 'Section updated' : 'Section created');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (section: CourseSection) => {
    setForm({
      courseId: section.courseId,
      name: section.name,
      code: section.code,
      deliveryMode: section.deliveryMode,
      status: section.status,
      instructorId: section.instructorId,
      description: section.description,
      maxEnrollment: section.maxEnrollment,
      enrollmentOpen: section.enrollmentOpen,
      enrollmentDeadline: section.enrollmentDeadline,
      schedule: { ...DEFAULT_SCHEDULE, ...section.schedule },
    });
    setEditingId(section.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseId || !form.name) return;

    const course = courses.find((c: any) => c.id === form.courseId);
    const instructor = eligibleInstructors.find((u: any) => u.id === form.instructorId);
    const now = new Date().toISOString();

    if (editingId) {
      const updated = sections.map((s) =>
        s.id === editingId
          ? {
              ...s,
              courseId: form.courseId,
              courseName: course?.title || s.courseName,
              name: form.name,
              code: form.code,
              deliveryMode: form.deliveryMode,
              status: form.status,
              instructorId: form.instructorId,
              instructorName: instructor?.name || '',
              description: form.description,
              maxEnrollment: form.maxEnrollment,
              enrollmentOpen: form.enrollmentOpen,
              enrollmentDeadline: form.enrollmentDeadline,
              schedule: form.deliveryMode === 'scheduled' ? form.schedule : DEFAULT_SCHEDULE,
              updatedAt: now,
            }
          : s
      );
      saveMutation.mutate(updated);
    } else {
      const newSection: CourseSection = {
        id: crypto.randomUUID(),
        courseId: form.courseId,
        courseName: course?.title || '',
        name: form.name,
        code: form.code || `SEC-${String(sections.length + 1).padStart(3, '0')}`,
        deliveryMode: form.deliveryMode,
        status: form.status,
        instructorId: form.instructorId,
        instructorName: instructor?.name || '',
        description: form.description,
        maxEnrollment: form.maxEnrollment,
        currentEnrollment: 0,
        enrollmentOpen: form.enrollmentOpen,
        enrollmentDeadline: form.enrollmentDeadline,
        schedule: form.deliveryMode === 'scheduled' ? form.schedule : DEFAULT_SCHEDULE,
        createdAt: now,
        updatedAt: now,
      };
      saveMutation.mutate([...sections, newSection]);
    }
  };

  const deleteSection = (id: string, name: string) => {
    if (!confirm(`Delete section "${name}"?`)) return;
    saveMutation.mutate(sections.filter((s) => s.id !== id));
  };

  const duplicateSection = (section: CourseSection) => {
    const now = new Date().toISOString();
    const dupe: CourseSection = {
      ...section,
      id: crypto.randomUUID(),
      name: `${section.name} (Copy)`,
      code: `${section.code}-COPY`,
      status: 'inactive',
      currentEnrollment: 0,
      createdAt: now,
      updatedAt: now,
    };
    saveMutation.mutate([...sections, dupe]);
  };

  const updateFormSchedule = (key: string, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, [key]: value },
    }));
  };

  const toggleDay = (day: string) => {
    const current = form.schedule.daysOfWeek;
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    updateFormSchedule('daysOfWeek', next);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatScheduleSummary = (section: CourseSection) => {
    if (section.deliveryMode === 'on_demand') return 'Always available';
    const s = section.schedule;
    if (!s.daysOfWeek?.length) return 'Schedule not set';
    const days = s.daysOfWeek.map((d) => DAYS_OF_WEEK.find((dw) => dw.value === d)?.label || d).join(', ');
    return `${days} ${s.startTime}–${s.endTime}`;
  };

  const isPending = saveMutation.isPending;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Sections</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage course offerings — on-demand or scheduled with instructors
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Section
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            {editingId ? 'Edit Section' : 'New Course Section'}
          </h2>

          {/* Course & Basic Info */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Course *</label>
              {coursesError ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-2">
                  <p className="text-xs text-red-600">
                    Failed to load courses: {(coursesError as Error).message}
                  </p>
                  <p className="text-[10px] text-red-500 mt-0.5">
                    Ensure the course service is running on the correct port.
                  </p>
                  <input
                    type="text"
                    value={form.courseId}
                    onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                    placeholder="Paste a Course ID manually"
                  />
                </div>
              ) : (
                <select
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select course...</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Section Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Spring 2026 - Section A"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Section Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                placeholder="Auto-generated if empty"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Optional description for this section offering"
            />
          </div>

          {/* Delivery Mode */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-2">Delivery Mode</label>
            <div className="flex gap-3">
              <label
                className={`flex-1 cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                  form.deliveryMode === 'on_demand'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  value="on_demand"
                  checked={form.deliveryMode === 'on_demand'}
                  onChange={() => setForm({ ...form, deliveryMode: 'on_demand' })}
                  className="sr-only"
                />
                <p className="text-sm font-semibold text-gray-900">On-Demand</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Always available. Students enroll and learn at their own pace.
                </p>
              </label>
              <label
                className={`flex-1 cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                  form.deliveryMode === 'scheduled'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  value="scheduled"
                  checked={form.deliveryMode === 'scheduled'}
                  onChange={() => setForm({ ...form, deliveryMode: 'scheduled' })}
                  className="sr-only"
                />
                <p className="text-sm font-semibold text-gray-900">Scheduled</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Runs on set days/times between a start and end date.
                </p>
              </label>
            </div>
          </div>

          {/* Schedule Details (only for scheduled) */}
          {form.deliveryMode === 'scheduled' && (
            <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4 space-y-4">
              <h3 className="text-xs font-semibold text-gray-700">Schedule</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.schedule.startDate?.slice(0, 10) || ''}
                    onChange={(e) => updateFormSchedule('startDate', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.schedule.endDate?.slice(0, 10) || ''}
                    onChange={(e) => updateFormSchedule('endDate', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Days of Week</label>
                <div className="flex gap-1.5">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`h-8 w-10 rounded-md text-xs font-medium transition-colors ${
                        form.schedule.daysOfWeek.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.schedule.startTime}
                    onChange={(e) => updateFormSchedule('startTime', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.schedule.endTime}
                    onChange={(e) => updateFormSchedule('endTime', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Recurrence</label>
                  <select
                    value={form.schedule.recurrence}
                    onChange={(e) => updateFormSchedule('recurrence', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="weekly">Every week</option>
                    <option value="biweekly">Every other week</option>
                    <option value="daily">Daily</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Timezone</label>
                  <select
                    value={form.schedule.timezone}
                    onChange={(e) => updateFormSchedule('timezone', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1">Location / Meeting Link</label>
                  <input
                    type="text"
                    value={form.schedule.location}
                    onChange={(e) => updateFormSchedule('location', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Room 204, Zoom link, etc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Schedule Notes</label>
                <textarea
                  value={form.schedule.notes}
                  onChange={(e) => updateFormSchedule('notes', e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. No class during spring break week, final exam on last day"
                />
              </div>

              {/* Schedule summary preview */}
              {form.schedule.daysOfWeek.length > 0 && form.schedule.startDate && (
                <div className="rounded-md bg-white border border-gray-200 p-3">
                  <p className="text-[10px] font-medium text-gray-400 uppercase mb-1">Schedule Summary</p>
                  <p className="text-xs text-gray-700">
                    {form.schedule.daysOfWeek.map((d) => DAYS_OF_WEEK.find((dw) => dw.value === d)?.label).join(', ')}
                    {' '}&middot;{' '}
                    {form.schedule.startTime}–{form.schedule.endTime}
                    {' '}&middot;{' '}
                    {form.schedule.recurrence === 'weekly' ? 'Weekly' : form.schedule.recurrence === 'biweekly' ? 'Biweekly' : form.schedule.recurrence === 'daily' ? 'Daily' : 'Custom'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {formatDate(form.schedule.startDate)} — {formatDate(form.schedule.endDate)}
                    {form.schedule.timezone && ` (${form.schedule.timezone.replace(/_/g, ' ')})`}
                  </p>
                  {form.schedule.location && (
                    <p className="text-[10px] text-gray-500 mt-0.5">Location: {form.schedule.location}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Instructor & Status */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Instructor</label>
              <select
                value={form.instructorId}
                onChange={(e) => setForm({ ...form, instructorId: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">No instructor assigned</option>
                {eligibleInstructors.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
              {/* Instructor preview */}
              {form.instructorId && (() => {
                const instructor = eligibleInstructors.find((u: any) => u.id === form.instructorId);
                const profile = instructorProfiles[form.instructorId];
                if (!instructor) return null;
                return (
                  <div className="flex items-center gap-2 mt-2 rounded-md border border-gray-200 bg-gray-50 p-2">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {profile?.profileImage ? (
                        <span className="text-[7px] text-gray-400">IMG</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-gray-500">
                          {instructor.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-gray-800">{instructor.name}</p>
                      <p className="text-[9px] text-gray-400">{instructor.email}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as CourseSection['status'] })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="inactive">Inactive</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Enrollment</label>
              <input
                type="number"
                value={form.maxEnrollment}
                onChange={(e) => setForm({ ...form, maxEnrollment: parseInt(e.target.value) || 0 })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                min={0}
                placeholder="0 = unlimited"
              />
              <p className="mt-0.5 text-[10px] text-gray-400">0 = unlimited capacity</p>
            </div>
          </div>

          {/* Enrollment Settings */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enrollmentOpen}
                onChange={(e) => setForm({ ...form, enrollmentOpen: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
              />
              Enrollment open (students can register)
            </label>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Enrollment Deadline</label>
              <input
                type="date"
                value={form.enrollmentDeadline?.slice(0, 10) || ''}
                onChange={(e) => setForm({ ...form, enrollmentDeadline: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : editingId ? 'Update Section' : 'Create Section'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Search sections..."
        />
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className={`rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none ${
            coursesError ? 'border-red-300 text-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">{coursesError ? 'Courses unavailable' : 'All Courses'}</option>
          {courses.map((c: any) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="upcoming">Upcoming</option>
          <option value="inactive">Inactive</option>
          <option value="completed">Completed</option>
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} sections</span>
      </div>

      {/* Sections Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
      ) : filtered.length ? (
        <div className="rounded-lg bg-white shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Section</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Course</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Delivery</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Schedule</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Instructor</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Enrollment</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((section) => (
                <tr key={section.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{section.name}</p>
                      <p className="text-[10px] font-mono text-gray-400">{section.code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-700">{section.courseName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      section.deliveryMode === 'on_demand'
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-cyan-50 text-cyan-700'
                    }`}>
                      {section.deliveryMode === 'on_demand' ? 'On-Demand' : 'Scheduled'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-xs text-gray-600">{formatScheduleSummary(section)}</p>
                      {section.deliveryMode === 'scheduled' && section.schedule.startDate && (
                        <p className="text-[10px] text-gray-400">
                          {formatDate(section.schedule.startDate)} — {formatDate(section.schedule.endDate)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {section.instructorName ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-semibold text-gray-500 shrink-0">
                          {section.instructorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-700">{section.instructorName}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      <span className="text-gray-700">{section.currentEnrollment}</span>
                      {section.maxEnrollment > 0 && (
                        <span className="text-gray-400"> / {section.maxEnrollment}</span>
                      )}
                      {!section.enrollmentOpen && (
                        <span className="ml-1 text-[9px] text-red-500">Closed</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[section.status] || ''}`}>
                      {section.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => startEdit(section)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => duplicateSection(section)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                        title="Duplicate section"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => deleteSection(section.id, section.name)}
                        className="text-xs text-red-500 hover:text-red-700"
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
      ) : sections.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">No course sections yet.</p>
          <p className="text-xs text-gray-400 mt-1">Create your first section to start offering courses.</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Create First Section
          </button>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-400">No sections match your filters.</p>
        </div>
      )}
    </div>
  );
}
