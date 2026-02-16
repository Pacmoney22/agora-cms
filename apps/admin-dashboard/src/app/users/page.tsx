'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersApi, authApi, settingsApi, assignmentsApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';

const ROLES = [
  { value: 'customer', label: 'Customer', color: 'bg-green-100 text-green-700' },
  { value: 'viewer', label: 'Viewer', color: 'bg-gray-100 text-gray-700' },
  { value: 'editor', label: 'Editor', color: 'bg-blue-100 text-blue-700' },
  { value: 'store_manager', label: 'Store Manager', color: 'bg-purple-100 text-purple-700' },
  { value: 'admin', label: 'Admin', color: 'bg-amber-100 text-amber-700' },
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-100 text-red-700' },
  { value: 'instructor', label: 'Instructor', color: 'bg-teal-100 text-teal-700' },
  { value: 'course_administrator', label: 'Course Admin', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'exhibitor', label: 'Exhibitor', color: 'bg-pink-100 text-pink-700' },
  { value: 'event_staff', label: 'Event Staff', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'kiosk_user', label: 'Kiosk User', color: 'bg-slate-100 text-slate-700' },
];

const SCOPED_ROLES = new Set(['instructor', 'course_administrator', 'exhibitor', 'event_staff', 'kiosk_user']);

const roleColor = (role: string) =>
  ROLES.find((r) => r.value === role)?.color || 'bg-gray-100 text-gray-600';
const roleLabel = (role: string) =>
  ROLES.find((r) => r.value === role)?.label || role;

function ScopedAssignmentsPanel({ userId, role }: { userId: string; role: string }) {
  const queryClient = useQueryClient();
  const [newEventId, setNewEventId] = useState('');
  const [newSectionId, setNewSectionId] = useState('');
  const [newBoothNumber, setNewBoothNumber] = useState('');
  const [newKioskId, setNewKioskId] = useState('');

  const assignmentConfig: Record<string, {
    label: string;
    fetchFn: (id: string) => Promise<any[]>;
    createFn: (data: any) => Promise<any>;
    deleteFn: (id: string) => Promise<void>;
    resourceLabel: string;
    resourceIdField: string;
  }> = {
    instructor: {
      label: 'Course Section Assignments',
      fetchFn: assignmentsApi.getInstructorAssignments,
      createFn: assignmentsApi.createInstructorAssignment,
      deleteFn: assignmentsApi.deleteInstructorAssignment,
      resourceLabel: 'Course Section ID',
      resourceIdField: 'courseSectionId',
    },
    event_staff: {
      label: 'Event Staff Assignments',
      fetchFn: assignmentsApi.getEventStaffAssignments,
      createFn: assignmentsApi.createEventStaffAssignment,
      deleteFn: assignmentsApi.deleteEventStaffAssignment,
      resourceLabel: 'Event ID',
      resourceIdField: 'eventId',
    },
    exhibitor: {
      label: 'Exhibitor Assignments',
      fetchFn: assignmentsApi.getExhibitorAssignments,
      createFn: assignmentsApi.createExhibitorAssignment,
      deleteFn: assignmentsApi.deleteExhibitorAssignment,
      resourceLabel: 'Event ID',
      resourceIdField: 'eventId',
    },
    kiosk_user: {
      label: 'Kiosk Assignments',
      fetchFn: assignmentsApi.getKioskAssignments,
      createFn: assignmentsApi.createKioskAssignment,
      deleteFn: assignmentsApi.deleteKioskAssignment,
      resourceLabel: 'Event ID',
      resourceIdField: 'eventId',
    },
  };

  const config = assignmentConfig[role];
  if (!config) return null;

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments', role, userId],
    queryFn: () => config.fetchFn(userId),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => config.createFn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', role, userId] });
      toast.success('Assignment created');
      setNewEventId('');
      setNewSectionId('');
      setNewBoothNumber('');
      setNewKioskId('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: string) => config.deleteFn(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', role, userId] });
      toast.success('Assignment removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (role === 'instructor') {
      if (!newSectionId) return;
      createMutation.mutate({ userId, courseSectionId: newSectionId });
    } else if (role === 'exhibitor') {
      if (!newEventId) return;
      createMutation.mutate({ userId, eventId: newEventId, boothNumber: newBoothNumber || undefined });
    } else if (role === 'kiosk_user') {
      if (!newEventId || !newKioskId) return;
      createMutation.mutate({ userId, eventId: newEventId, kioskIdentifier: newKioskId });
    } else {
      if (!newEventId) return;
      createMutation.mutate({ userId, eventId: newEventId });
    }
  };

  const getResourceDisplay = (assignment: any) => {
    if (role === 'instructor') {
      const section = assignment.courseSection;
      return section
        ? `${section.course?.title || 'Course'} / ${section.title}`
        : assignment.courseSectionId;
    }
    return assignment.eventId;
  };

  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{config.label}</h3>
      <p className="text-[10px] text-gray-400 mb-3">
        Manage which resources this user has access to.
      </p>

      {/* Existing assignments */}
      {isLoading ? (
        <div className="text-xs text-gray-400 py-2">Loading assignments...</div>
      ) : assignments && assignments.length > 0 ? (
        <div className="space-y-1.5 mb-3">
          {assignments.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
              <div>
                <p className="text-xs font-medium text-gray-800">{getResourceDisplay(a)}</p>
                {role === 'exhibitor' && a.boothNumber && (
                  <p className="text-[10px] text-gray-400">Booth: {a.boothNumber}</p>
                )}
                {role === 'kiosk_user' && a.kioskIdentifier && (
                  <p className="text-[10px] text-gray-400">Kiosk: {a.kioskIdentifier}</p>
                )}
                <p className="text-[10px] text-gray-400">
                  Added {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(a.id)}
                disabled={deleteMutation.isPending}
                className="text-[10px] text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-3">No assignments yet.</p>
      )}

      {/* Add assignment form */}
      <div className="flex items-end gap-2">
        {role === 'instructor' ? (
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-gray-500 mb-1">Course Section ID</label>
            <input
              type="text"
              value={newSectionId}
              onChange={(e) => setNewSectionId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              placeholder="UUID of the course section"
            />
          </div>
        ) : (
          <>
            <div className="flex-1">
              <label className="block text-[10px] font-medium text-gray-500 mb-1">Event ID</label>
              <input
                type="text"
                value={newEventId}
                onChange={(e) => setNewEventId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                placeholder="UUID of the event"
              />
            </div>
            {role === 'exhibitor' && (
              <div className="w-28">
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Booth #</label>
                <input
                  type="text"
                  value={newBoothNumber}
                  onChange={(e) => setNewBoothNumber(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. A-12"
                />
              </div>
            )}
            {role === 'kiosk_user' && (
              <div className="w-36">
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Kiosk ID</label>
                <input
                  type="text"
                  value={newKioskId}
                  onChange={(e) => setNewKioskId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. KIOSK-ENTRANCE-A"
                />
              </div>
            )}
          </>
        )}
        <button
          onClick={handleCreate}
          disabled={createMutation.isPending}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {createMutation.isPending ? 'Adding...' : 'Add'}
        </button>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create user form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('viewer');

  // Author profile state
  const [authorBio, setAuthorBio] = useState('');
  const [authorProfileImage, setAuthorProfileImage] = useState('');
  const [authorProfileDirty, setAuthorProfileDirty] = useState(false);

  const AUTHOR_ROLES = ['editor', 'store_manager', 'admin', 'super_admin'];

  const { data: authorProfilesData } = useQuery({
    queryKey: ['settings', 'author_profiles'],
    queryFn: () => settingsApi.get('author_profiles').catch(() => ({ profiles: {} })),
  });
  const authorProfiles: Record<string, { bio: string; profileImage: string }> = (authorProfilesData as any)?.profiles || {};

  const saveAuthorProfileMutation = useMutation({
    mutationFn: async ({ userId, bio, profileImage }: { userId: string; bio: string; profileImage: string }) => {
      const updated = { ...authorProfiles, [userId]: { bio, profileImage } };
      await settingsApi.update('author_profiles', { profiles: updated } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'author_profiles'] });
      toast.success('Author profile saved');
      setAuthorProfileDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, roleFilter, activeFilter],
    queryFn: () =>
      usersApi.list({
        page,
        limit: 20,
        search: search || undefined,
        role: roleFilter || undefined,
        isActive: activeFilter || undefined,
      }),
  });

  // Fetch full user details when selected
  const { data: userDetail } = useQuery({
    queryKey: ['users', selectedUser?.id],
    queryFn: () => usersApi.get(selectedUser.id),
    enabled: !!selectedUser,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => usersApi.unlock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Account unlocked');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      authApi.login('', '').catch(() => null) as any, // placeholder — uses register endpoint
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      setShowCreateModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('customer');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const users = data?.data || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };
  const detail = userDetail || selectedUser;

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleCreateUser = async () => {
    if (!newName || !newEmail || !newPassword) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:3001'}/api/v1/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newName,
            email: newEmail,
            password: newPassword,
            role: newRole,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Error: ${res.status}`);
      }
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      setShowCreateModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('customer');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users &amp; Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or email..."
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <span className="ml-auto text-xs text-gray-400">{meta.total} users</span>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">No users found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">User</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Orders</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Enrollments</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Joined</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600 overflow-hidden shrink-0">
                        {authorProfiles[user.id]?.profileImage ? (
                          <span className="text-[7px] text-gray-400">IMG</span>
                        ) : (
                          user.name
                            ?.split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase() || '?'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-gray-900">{user.name}</p>
                          {AUTHOR_ROLES.includes(user.role) && authorProfiles[user.id]?.bio && (
                            <span className="inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-medium text-indigo-600">
                              Author
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColor(user.role)}`}
                    >
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {user._count?.orders ?? 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {user._count?.enrollments ?? 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        const profile = authorProfiles[user.id];
                        setAuthorBio(profile?.bio || '');
                        setAuthorProfileImage(profile?.profileImage || '');
                        setAuthorProfileDirty(false);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View
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

      {/* User Detail / Edit Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                  {detail?.name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || '?'}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{detail?.name}</h2>
                  <p className="text-xs text-gray-400">{detail?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-[10px] font-medium text-gray-400 uppercase">Role</p>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {roleLabel(detail?.role)}
                </p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-[10px] font-medium text-gray-400 uppercase">Status</p>
                <p className="mt-1 text-sm font-medium text-gray-800">
                  {detail?.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-[10px] font-medium text-gray-400 uppercase">Joined</p>
                <p className="mt-1 text-sm text-gray-700">{formatDate(detail?.createdAt)}</p>
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-[10px] font-medium text-gray-400 uppercase">Updated</p>
                <p className="mt-1 text-sm text-gray-700">{formatDate(detail?.updatedAt)}</p>
              </div>
              {detail?._count && (
                <>
                  <div className="rounded-md bg-gray-50 p-3">
                    <p className="text-[10px] font-medium text-gray-400 uppercase">Orders</p>
                    <p className="mt-1 text-sm font-medium text-gray-800">
                      {detail._count.orders ?? 0}
                    </p>
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <p className="text-[10px] font-medium text-gray-400 uppercase">Enrollments</p>
                    <p className="mt-1 text-sm font-medium text-gray-800">
                      {detail._count.enrollments ?? 0}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* External IDs */}
            {(detail?.stripeCustId || detail?.sfContactId) && (
              <div className="mb-5 rounded-md border border-gray-200 bg-gray-50 p-3 space-y-1">
                {detail.stripeCustId && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Stripe Customer</span>
                    <span className="font-mono text-gray-700">{detail.stripeCustId}</span>
                  </div>
                )}
                {detail.sfContactId && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Salesforce Contact</span>
                    <span className="font-mono text-gray-700">{detail.sfContactId}</span>
                  </div>
                )}
              </div>
            )}

            {/* Account lock warning */}
            {detail?.lockedUntil && new Date(detail.lockedUntil) > new Date() && (
              <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-700">Account Locked</p>
                  <p className="text-[10px] text-red-500">
                    Locked until {new Date(detail.lockedUntil).toLocaleString()} ({detail.failedLogins} failed attempts)
                  </p>
                </div>
                <button
                  onClick={() => unlockMutation.mutate(detail.id)}
                  disabled={unlockMutation.isPending}
                  className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Unlock
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Change Role
                  </label>
                  <select
                    value={detail?.role || 'viewer'}
                    onChange={(e) =>
                      updateMutation.mutate(
                        { id: detail.id, data: { role: e.target.value } },
                        {
                          onSuccess: () =>
                            setSelectedUser({ ...selectedUser, role: e.target.value }),
                        },
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-700">Account Active</p>
                  <p className="text-[10px] text-gray-400">
                    Inactive users cannot sign in
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateMutation.mutate(
                      {
                        id: detail.id,
                        data: { isActive: !detail?.isActive },
                      },
                      {
                        onSuccess: () =>
                          setSelectedUser({
                            ...selectedUser,
                            isActive: !detail?.isActive,
                          }),
                      },
                    )
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    detail?.isActive ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={detail?.isActive}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                      detail?.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Scoped Role Assignments */}
            {detail?.role && SCOPED_ROLES.has(detail.role) && (
              <ScopedAssignmentsPanel userId={detail.id} role={detail.role} />
            )}

            {/* Author Profile — only for users with authoring roles */}
            {detail?.role && AUTHOR_ROLES.includes(detail.role) && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Author Profile</h3>
                <p className="text-[10px] text-gray-400 mb-3">
                  This profile is displayed on articles where this user is the author.
                </p>
                <div className="space-y-3">
                  <MediaPicker
                    value={authorProfileImage}
                    onChange={(url) => {
                      setAuthorProfileImage(url);
                      setAuthorProfileDirty(true);
                    }}
                    label="Profile Picture"
                    accept="image/*"
                    helpText="Displayed as the author avatar on articles"
                  />
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bio</label>
                    <textarea
                      value={authorBio}
                      onChange={(e) => {
                        setAuthorBio(e.target.value);
                        setAuthorProfileDirty(true);
                      }}
                      rows={4}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="A short biography about this author..."
                    />
                    <p className="mt-0.5 text-[10px] text-gray-400">{authorBio.length}/500 characters</p>
                  </div>
                  <button
                    onClick={() =>
                      saveAuthorProfileMutation.mutate({
                        userId: detail.id,
                        bio: authorBio,
                        profileImage: authorProfileImage,
                      })
                    }
                    disabled={!authorProfileDirty || saveAuthorProfileMutation.isPending}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saveAuthorProfileMutation.isPending ? 'Saving...' : 'Save Author Profile'}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!newName || !newEmail || !newPassword}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
