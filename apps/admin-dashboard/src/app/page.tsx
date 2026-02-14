'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { pagesApi, mediaApi, ordersApi, productsApi, commentsApi, reviewsApi, articlesApi, eventsApi } from '@/lib/api-client';
import toast from 'react-hot-toast';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-[10px] ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`}>&#9733;</span>
      ))}
    </span>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: pagesData } = useQuery({
    queryKey: ['pages', { page: 1, limit: 5 }],
    queryFn: () => pagesApi.list({ page: 1, limit: 5 }),
  });

  const { data: mediaData } = useQuery({
    queryKey: ['media', { page: 1, limit: 5 }],
    queryFn: () => mediaApi.list({ page: 1, limit: 5 }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products', { page: 1, limit: 1 }],
    queryFn: () => productsApi.list({ page: 1, limit: 1 }).catch(() => ({ data: [], meta: { total: 0 } })),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders', { page: 1, limit: 1 }],
    queryFn: () => ordersApi.list({ page: 1, limit: 1 }).catch(() => ({ data: [], meta: { total: 0 } })),
  });

  const { data: articlesData } = useQuery({
    queryKey: ['articles', { page: 1, limit: 5 }],
    queryFn: () => articlesApi.list({ page: 1, limit: 5 }).catch(() => ({ data: [], meta: { total: 0 } })),
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events', { page: 1, limit: 1 }],
    queryFn: () => eventsApi.list({ page: 1, limit: 1 }).catch(() => ({ data: [], meta: { total: 0 } })),
  });

  const { data: commentStats } = useQuery({
    queryKey: ['comments', 'stats'],
    queryFn: () => commentsApi.stats().catch(() => ({ pending: 0, approved: 0, spam: 0, total: 0 })),
  });

  const { data: reviewStats } = useQuery({
    queryKey: ['reviews', 'stats'],
    queryFn: () => reviewsApi.stats().catch(() => ({ pending: 0, approved: 0, flagged: 0, total: 0, averageRating: 0 })),
  });

  const { data: pendingComments } = useQuery({
    queryKey: ['comments', { page: 1, limit: 5, status: 'pending' }],
    queryFn: () => commentsApi.list({ page: 1, limit: 5, status: 'pending' }).catch(() => ({ data: [], meta: { total: 0 } })),
  });

  const { data: pendingReviews } = useQuery({
    queryKey: ['reviews', { page: 1, limit: 5, status: 'pending' }],
    queryFn: () => reviewsApi.list({ page: 1, limit: 5, status: 'pending' }).catch(() => ({ data: [], meta: { total: 0 } })),
  });

  const commentAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => {
      if (action === 'approve') return commentsApi.approve(id);
      if (action === 'spam') return commentsApi.spam(id);
      return commentsApi.reject(id);
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      toast.success(`Comment ${action}d`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reviewAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => {
      if (action === 'approve') return reviewsApi.approve(id);
      return reviewsApi.reject(id);
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success(`Review ${action}d`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stats = [
    { title: 'Total Pages', value: pagesData?.meta?.total ?? '--', color: 'bg-blue-500', href: '/pages' },
    { title: 'Articles', value: articlesData?.meta?.total ?? '--', color: 'bg-indigo-500', href: '/articles' },
    { title: 'Media Files', value: mediaData?.meta?.total ?? '--', color: 'bg-green-500', href: '/media' },
    { title: 'Products', value: productsData?.meta?.total ?? '--', color: 'bg-purple-500', href: '/products' },
    { title: 'Orders', value: ordersData?.meta?.total ?? '--', color: 'bg-amber-500', href: '/orders' },
    { title: 'Events', value: eventsData?.meta?.total ?? '--', color: 'bg-rose-500', href: '/events' },
  ];

  const moderationAlerts = [
    { label: 'Pending Comments', count: commentStats?.pending || 0, color: 'text-amber-600', bg: 'bg-amber-50', href: '/comments' },
    { label: 'Pending Reviews', count: reviewStats?.pending || 0, color: 'text-orange-600', bg: 'bg-orange-50', href: '/reviews' },
    { label: 'Flagged Reviews', count: reviewStats?.flagged || 0, color: 'text-red-600', bg: 'bg-red-50', href: '/reviews' },
    { label: 'Spam Comments', count: commentStats?.spam || 0, color: 'text-gray-600', bg: 'bg-gray-50', href: '/comments' },
  ];

  const hasModerationWork = moderationAlerts.some((a) => a.count > 0);

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your content, commerce, and moderation queue</p>
      </div>

      {/* Moderation Alert Banner */}
      {hasModerationWork && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-amber-800">Items Awaiting Moderation</h2>
              <div className="mt-1 flex gap-4">
                {moderationAlerts.filter((a) => a.count > 0).map((a) => (
                  <Link key={a.label} href={a.href} className={`text-xs font-medium ${a.color} hover:underline`}>
                    {a.count} {a.label}
                  </Link>
                ))}
              </div>
            </div>
            <Link href="/comments" className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700">
              Review Queue
            </Link>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Link
            key={stat.title}
            href={stat.href}
            className="overflow-hidden rounded-lg bg-white shadow hover:shadow-md transition-shadow"
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-md ${stat.color}`} />
                <div>
                  <p className="text-[10px] font-medium text-gray-500">{stat.title}</p>
                  <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6">
        {/* Pending Comments */}
        <div className="rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Pending Comments</h2>
              {(commentStats?.pending || 0) > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  {commentStats?.pending}
                </span>
              )}
            </div>
            <Link href="/comments" className="text-xs text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingComments?.data?.length ? (
              pendingComments.data.map((c: any) => (
                <div key={c.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-900">{c.authorName}</span>
                        <span className="text-[10px] text-gray-400">on {c.articleTitle || 'article'}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{c.content}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{formatDate(c.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => commentAction.mutate({ id: c.id, action: 'approve' })}
                        className="rounded bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700 hover:bg-green-100"
                      >Approve</button>
                      <button
                        onClick={() => commentAction.mutate({ id: c.id, action: 'spam' })}
                        className="rounded bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-100"
                      >Spam</button>
                      <button
                        onClick={() => commentAction.mutate({ id: c.id, action: 'reject' })}
                        className="rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-100"
                      >Reject</button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-xs text-gray-400">No pending comments. You&apos;re all caught up!</p>
              </div>
            )}
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Pending Reviews</h2>
              {(reviewStats?.pending || 0) > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                  {reviewStats?.pending}
                </span>
              )}
            </div>
            <Link href="/reviews" className="text-xs text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingReviews?.data?.length ? (
              pendingReviews.data.map((r: any) => (
                <div key={r.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Stars rating={r.rating} />
                        <span className="text-xs font-medium text-gray-900">{r.authorName}</span>
                        {r.verifiedPurchase && (
                          <span className="text-[10px] text-blue-500">Verified</span>
                        )}
                      </div>
                      {r.title && <p className="text-xs font-medium text-gray-700">{r.title}</p>}
                      <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{r.content}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        <span className="capitalize">{r.type}</span>: {r.itemTitle} &middot; {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => reviewAction.mutate({ id: r.id, action: 'approve' })}
                        className="rounded bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700 hover:bg-green-100"
                      >Approve</button>
                      <button
                        onClick={() => reviewAction.mutate({ id: r.id, action: 'reject' })}
                        className="rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-100"
                      >Reject</button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-xs text-gray-400">No pending reviews. You&apos;re all caught up!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Pages + Recent Articles */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Recent Pages</h2>
            <Link href="/pages" className="text-xs text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {pagesData?.data?.length ? (
              pagesData.data.map((page: any) => (
                <div key={page.id} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{page.title}</p>
                    <p className="text-[10px] text-gray-400">/{page.slug}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    page.status === 'published' ? 'bg-green-100 text-green-700' :
                    page.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {page.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-5 py-6 text-center text-xs text-gray-400">No pages yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Recent Articles</h2>
            <Link href="/articles" className="text-xs text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {articlesData?.data?.length ? (
              articlesData.data.map((article: any) => (
                <div key={article.id} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{article.title}</p>
                    <p className="text-[10px] text-gray-400">{article.category || 'Uncategorized'}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    article.status === 'published' ? 'bg-green-100 text-green-700' :
                    article.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {article.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-5 py-6 text-center text-xs text-gray-400">No articles yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Link href="/pages" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all">
          <p className="text-sm font-medium text-gray-900">Create a Page</p>
          <p className="mt-0.5 text-xs text-gray-500">Drag-and-drop page builder</p>
        </Link>
        <Link href="/articles" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all">
          <p className="text-sm font-medium text-gray-900">Write an Article</p>
          <p className="mt-0.5 text-xs text-gray-500">Blog posts with rich text editor</p>
        </Link>
        <Link href="/media" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all">
          <p className="text-sm font-medium text-gray-900">Upload Media</p>
          <p className="mt-0.5 text-xs text-gray-500">Auto-convert to WebP with variants</p>
        </Link>
        <Link href="/events" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all">
          <p className="text-sm font-medium text-gray-900">Create an Event</p>
          <p className="mt-0.5 text-xs text-gray-500">Tickets, sessions, and check-in</p>
        </Link>
      </div>
    </div>
  );
}
