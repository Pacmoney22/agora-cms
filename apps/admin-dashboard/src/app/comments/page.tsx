'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  authorName: string;
  authorEmail: string;
  authorAvatar: string;
  content: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  parentId: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  likes: number;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'spam', label: 'Spam' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  spam: 'bg-gray-100 text-gray-500',
};

export default function CommentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['comments', { page, status: statusFilter || undefined, search: search || undefined }],
    queryFn: () => commentsApi.list({ page, limit: 25, status: statusFilter || undefined, search: search || undefined }),
  });

  const { data: stats } = useQuery({
    queryKey: ['comments', 'stats'],
    queryFn: () => commentsApi.stats().catch(() => ({ pending: 0, approved: 0, spam: 0, total: 0 })),
  });

  const comments: Comment[] = commentsData?.data || [];
  const meta = commentsData?.meta || { total: 0, totalPages: 1 };

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => {
      if (action === 'approve') return commentsApi.approve(id);
      if (action === 'reject') return commentsApi.reject(id);
      if (action === 'spam') return commentsApi.spam(id);
      return commentsApi.delete(id);
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      toast.success(`Comment ${action === 'delete' ? 'deleted' : action + 'd'}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: 'approve' | 'reject' | 'spam' | 'delete' }) =>
      commentsApi.bulkAction(ids, action),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      setSelectedIds(new Set());
      toast.success(`${action === 'delete' ? 'Deleted' : action.charAt(0).toUpperCase() + action.slice(1) + 'd'} ${selectedIds.size} comments`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      commentsApi.reply(id, { content, authorName: 'Admin' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      setReplyingTo(null);
      setReplyContent('');
      toast.success('Reply posted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === comments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(comments.map((c) => c.id)));
    }
  };

  const handleReply = (id: string) => {
    if (!replyContent.trim()) return;
    replyMutation.mutate({ id, content: replyContent.trim() });
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Comment Moderation</h1>
        <p className="mt-1 text-sm text-gray-500">Review, approve, and manage article comments</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: stats?.pending ?? '--', color: 'bg-amber-500' },
          { label: 'Approved', value: stats?.approved ?? '--', color: 'bg-green-500' },
          { label: 'Spam', value: stats?.spam ?? '--', color: 'bg-gray-400' },
          { label: 'Total', value: stats?.total ?? '--', color: 'bg-blue-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-white p-4 shadow">
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-md ${s.color}`} />
              <div>
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
                <p className="text-xl font-semibold text-gray-900">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-white p-1 shadow">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1); setSelectedIds(new Set()); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === tab.key ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.key === 'pending' && stats?.pending ? ` (${stats.pending})` : ''}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Search comments..."
        />
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <span className="text-sm font-medium text-blue-800">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <button onClick={() => bulkMutation.mutate({ ids: [...selectedIds], action: 'approve' })} className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700">
              Approve
            </button>
            <button onClick={() => bulkMutation.mutate({ ids: [...selectedIds], action: 'reject' })} className="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600">
              Reject
            </button>
            <button onClick={() => bulkMutation.mutate({ ids: [...selectedIds], action: 'spam' })} className="rounded bg-gray-500 px-3 py-1 text-xs font-medium text-white hover:bg-gray-600">
              Spam
            </button>
            <button
              onClick={() => { if (confirm(`Delete ${selectedIds.size} comments?`)) bulkMutation.mutate({ ids: [...selectedIds], action: 'delete' }); }}
              className="rounded bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-800"
            >
              Delete
            </button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-blue-600 hover:text-blue-800">Clear</button>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">
            {statusFilter ? `No ${statusFilter} comments found.` : 'No comments yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={selectedIds.size === comments.length && comments.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-gray-300"
            />
            <span className="text-xs text-gray-500">Select all on page</span>
          </div>

          {comments.map((comment) => (
            <div key={comment.id} className={`rounded-lg bg-white shadow transition-all ${expandedId === comment.id ? 'ring-2 ring-blue-200' : ''}`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(comment.id)}
                    onChange={() => toggleSelect(comment.id)}
                    className="mt-1 rounded border-gray-300"
                  />
                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
                    {comment.authorName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
                      <span className="text-[10px] text-gray-400">{comment.authorEmail}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[comment.status] || 'bg-gray-100 text-gray-500'}`}>
                        {comment.status}
                      </span>
                      {comment.parentId && (
                        <span className="text-[10px] text-blue-500">Reply</span>
                      )}
                    </div>
                    {/* Article reference */}
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      on <span className="font-medium text-gray-500">{comment.articleTitle || 'Unknown article'}</span>
                      <span className="mx-1">&middot;</span>
                      {formatDate(comment.createdAt)}
                    </p>
                    {/* Comment content */}
                    <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-2">
                      {comment.status !== 'approved' && (
                        <button
                          onClick={() => actionMutation.mutate({ id: comment.id, action: 'approve' })}
                          className="rounded bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                        >
                          Approve
                        </button>
                      )}
                      {comment.status !== 'rejected' && (
                        <button
                          onClick={() => actionMutation.mutate({ id: comment.id, action: 'reject' })}
                          className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                        >
                          Reject
                        </button>
                      )}
                      {comment.status !== 'spam' && (
                        <button
                          onClick={() => actionMutation.mutate({ id: comment.id, action: 'spam' })}
                          className="rounded bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
                        >
                          Spam
                        </button>
                      )}
                      <button
                        onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyContent(''); }}
                        className="rounded bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => { if (confirm('Delete this comment?')) actionMutation.mutate({ id: comment.id, action: 'delete' }); }}
                        className="rounded px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-50 hover:text-red-600"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setExpandedId(expandedId === comment.id ? null : comment.id)}
                        className="ml-auto text-[10px] text-gray-400 hover:text-gray-600"
                      >
                        {expandedId === comment.id ? 'Less' : 'Details'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reply Form */}
                {replyingTo === comment.id && (
                  <div className="mt-3 ml-12 rounded-lg bg-gray-50 p-3">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Write a reply as admin..."
                      autoFocus
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleReply(comment.id)}
                        disabled={replyMutation.isPending || !replyContent.trim()}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {replyMutation.isPending ? 'Posting...' : 'Post Reply'}
                      </button>
                      <button
                        onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                        className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Details Panel */}
                {expandedId === comment.id && (
                  <div className="mt-3 ml-12 rounded-lg bg-gray-50 p-3 text-[10px] text-gray-500">
                    <div className="grid grid-cols-2 gap-2">
                      <div>IP: {comment.ipAddress || 'Unknown'}</div>
                      <div>Likes: {comment.likes || 0}</div>
                      <div className="col-span-2 truncate">UA: {comment.userAgent || 'Unknown'}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">{meta.total} comments total</p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-xs text-gray-500">
              Page {page} of {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
