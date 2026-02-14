'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface Review {
  id: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  title: string;
  content: string;
  type: 'product' | 'course';
  itemId: string;
  itemTitle: string;
  verifiedPurchase: boolean;
  helpful: number;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  adminReply: string | null;
  media: string[];
  createdAt: string;
}

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'flagged', label: 'Flagged' },
];

const RATING_FILTERS = [
  { key: 0, label: 'All Ratings' },
  { key: 5, label: '5 Stars' },
  { key: 4, label: '4 Stars' },
  { key: 3, label: '3 Stars' },
  { key: 2, label: '2 Stars' },
  { key: 1, label: '1 Star' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  flagged: 'bg-orange-100 text-orange-700',
};

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`${size === 'md' ? 'text-base' : 'text-xs'} ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`}>
          &#9733;
        </span>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['reviews', { page, status: statusFilter || undefined, rating: ratingFilter || undefined, type: typeFilter || undefined, search: search || undefined }],
    queryFn: () => reviewsApi.list({
      page, limit: 20,
      status: statusFilter || undefined,
      rating: ratingFilter || undefined,
      type: typeFilter || undefined,
      search: search || undefined,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['reviews', 'stats'],
    queryFn: () => reviewsApi.stats().catch(() => ({ pending: 0, approved: 0, flagged: 0, total: 0, averageRating: 0 })),
  });

  const reviews: Review[] = reviewsData?.data || [];
  const meta = reviewsData?.meta || { total: 0, totalPages: 1 };

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => {
      if (action === 'approve') return reviewsApi.approve(id);
      if (action === 'reject') return reviewsApi.reject(id);
      if (action === 'flag') return reviewsApi.flag(id);
      return reviewsApi.delete(id);
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success(`Review ${action === 'delete' ? 'deleted' : action + (action.endsWith('e') ? 'd' : 'ed')}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bulkMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: string[]; action: 'approve' | 'reject' | 'flag' | 'delete' }) =>
      reviewsApi.bulkAction(ids, action),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} reviews ${action}${action.endsWith('e') ? 'd' : 'ed'}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      reviewsApi.reply(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
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
    if (selectedIds.size === reviews.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reviews.map((r) => r.id)));
    }
  };

  const handleReply = (id: string) => {
    if (!replyContent.trim()) return;
    replyMutation.mutate({ id, content: replyContent.trim() });
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Review Moderation</h1>
        <p className="mt-1 text-sm text-gray-500">Manage product and course reviews</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        {[
          { label: 'Pending', value: stats?.pending ?? '--', color: 'bg-amber-500' },
          { label: 'Approved', value: stats?.approved ?? '--', color: 'bg-green-500' },
          { label: 'Flagged', value: stats?.flagged ?? '--', color: 'bg-orange-500' },
          { label: 'Total', value: stats?.total ?? '--', color: 'bg-blue-500' },
          { label: 'Avg Rating', value: stats?.averageRating ? stats.averageRating.toFixed(1) : '--', color: 'bg-amber-400', isStar: true },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-white p-4 shadow">
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-md ${s.color}`} />
              <div>
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
                <div className="flex items-center gap-1">
                  <p className="text-xl font-semibold text-gray-900">{s.value}</p>
                  {(s as any).isStar && stats?.averageRating ? <Stars rating={Math.round(stats.averageRating)} /> : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
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
        <div className="flex items-center gap-3">
          <select
            value={ratingFilter}
            onChange={(e) => { setRatingFilter(+e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
          >
            {RATING_FILTERS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="product">Product Reviews</option>
            <option value="course">Course Reviews</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-56 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Search reviews..."
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <span className="text-sm font-medium text-blue-800">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <button onClick={() => bulkMutation.mutate({ ids: [...selectedIds], action: 'approve' })} className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700">Approve</button>
            <button onClick={() => bulkMutation.mutate({ ids: [...selectedIds], action: 'reject' })} className="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600">Reject</button>
            <button onClick={() => bulkMutation.mutate({ ids: [...selectedIds], action: 'flag' })} className="rounded bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600">Flag</button>
            <button
              onClick={() => { if (confirm(`Delete ${selectedIds.size} reviews?`)) bulkMutation.mutate({ ids: [...selectedIds], action: 'delete' }); }}
              className="rounded bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-800"
            >Delete</button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-blue-600 hover:text-blue-800">Clear</button>
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-400">
            {statusFilter ? `No ${statusFilter} reviews found.` : 'No reviews yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={selectedIds.size === reviews.length && reviews.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-gray-300"
            />
            <span className="text-xs text-gray-500">Select all on page</span>
          </div>

          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg bg-white shadow">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(review.id)}
                    onChange={() => toggleSelect(review.id)}
                    className="mt-1 rounded border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Stars rating={review.rating} size="md" />
                      {review.title && (
                        <span className="text-sm font-semibold text-gray-900">{review.title}</span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[review.status] || 'bg-gray-100 text-gray-500'}`}>
                        {review.status}
                      </span>
                      {review.verifiedPurchase && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">Verified Purchase</span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="font-medium text-gray-600">{review.authorName}</span>
                      <span>&middot;</span>
                      <span>{review.authorEmail}</span>
                      <span>&middot;</span>
                      <span className="capitalize">{review.type}</span>: <span className="font-medium text-gray-500">{review.itemTitle}</span>
                      <span>&middot;</span>
                      <span>{formatDate(review.createdAt)}</span>
                      {review.helpful > 0 && (
                        <>
                          <span>&middot;</span>
                          <span>{review.helpful} found helpful</span>
                        </>
                      )}
                    </div>

                    {/* Content */}
                    <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{review.content}</p>

                    {/* Media */}
                    {review.media && review.media.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {review.media.map((url, i) => (
                          <img key={i} src={url} alt="" className="h-16 w-16 rounded-md object-cover border border-gray-200" />
                        ))}
                      </div>
                    )}

                    {/* Admin Reply */}
                    {review.adminReply && (
                      <div className="mt-3 rounded-md bg-blue-50 p-3">
                        <p className="text-[10px] font-semibold text-blue-700 mb-1">Store Response</p>
                        <p className="text-xs text-blue-800">{review.adminReply}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-2">
                      {review.status !== 'approved' && (
                        <button
                          onClick={() => actionMutation.mutate({ id: review.id, action: 'approve' })}
                          className="rounded bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                        >Approve</button>
                      )}
                      {review.status !== 'rejected' && (
                        <button
                          onClick={() => actionMutation.mutate({ id: review.id, action: 'reject' })}
                          className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                        >Reject</button>
                      )}
                      {review.status !== 'flagged' && (
                        <button
                          onClick={() => actionMutation.mutate({ id: review.id, action: 'flag' })}
                          className="rounded bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600 hover:bg-orange-100"
                        >Flag</button>
                      )}
                      <button
                        onClick={() => { setReplyingTo(replyingTo === review.id ? null : review.id); setReplyContent(review.adminReply || ''); }}
                        className="rounded bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                      >
                        {review.adminReply ? 'Edit Reply' : 'Reply'}
                      </button>
                      <button
                        onClick={() => { if (confirm('Delete this review?')) actionMutation.mutate({ id: review.id, action: 'delete' }); }}
                        className="rounded px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-50 hover:text-red-600"
                      >Delete</button>
                    </div>
                  </div>
                </div>

                {/* Reply Form */}
                {replyingTo === review.id && (
                  <div className="mt-3 ml-6 rounded-lg bg-gray-50 p-3">
                    <label className="mb-1 block text-[10px] font-medium text-gray-500">
                      {review.adminReply ? 'Edit store response' : 'Write a public response'}
                    </label>
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Thank you for your feedback..."
                      autoFocus
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleReply(review.id)}
                        disabled={replyMutation.isPending || !replyContent.trim()}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {replyMutation.isPending ? 'Posting...' : review.adminReply ? 'Update Reply' : 'Post Reply'}
                      </button>
                      <button
                        onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                        className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                      >Cancel</button>
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
          <p className="text-xs text-gray-400">{meta.total} reviews total</p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-gray-50 disabled:opacity-50"
            >Previous</button>
            <span className="px-3 py-1.5 text-xs text-gray-500">Page {page} of {meta.totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-gray-50 disabled:opacity-50"
            >Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
