'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { DiscussionDto } from '@/lib/api';
import { listDiscussions, createDiscussion, replyToDiscussion } from '@/lib/api';

export default function DiscussionsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const enrollmentId = params.enrollmentId as string;
  const lessonId = params.lessonId as string;
  const userId = searchParams.get('userId') || 'user-123'; // Hardcoded fallback

  const [discussions, setDiscussions] = useState<DiscussionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [expandedDiscussions, setExpandedDiscussions] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newDiscussion, setNewDiscussion] = useState({ title: '', content: '' });
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    loadDiscussions();
  }, [lessonId]);

  const loadDiscussions = () => {
    setLoading(true);
    setError('');
    listDiscussions(lessonId)
      .then((data) => setDiscussions(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleCreateDiscussion = async () => {
    if (!newDiscussion.title.trim() || !newDiscussion.content.trim()) return;

    setSubmitting(true);
    try {
      const created = await createDiscussion(lessonId, {
        ...newDiscussion,
        userId,
      });
      setDiscussions([created, ...discussions]);
      setNewDiscussion({ title: '', content: '' });
      setShowNewDiscussion(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create discussion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (discussionId: string) => {
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      const reply = await replyToDiscussion(discussionId, {
        content: replyContent,
        userId,
      });

      // Update the discussion with the new reply
      setDiscussions((prev) =>
        prev.map((d) =>
          d.id === discussionId
            ? { ...d, replies: [...(d.replies || []), reply] }
            : d
        )
      );
      setReplyContent('');
      setReplyingTo(null);
    } catch (err: any) {
      alert(err.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDiscussion = (discussionId: string) => {
    setExpandedDiscussions((prev) => {
      const next = new Set(prev);
      if (next.has(discussionId)) {
        next.delete(discussionId);
      } else {
        next.add(discussionId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-center text-gray-500">Loading discussions...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
          <Link href={`/learn/${enrollmentId}`} className="hover:text-indigo-600">
            Back to Course
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Lesson Discussions</h1>
          <button
            onClick={() => setShowNewDiscussion(!showNewDiscussion)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {showNewDiscussion ? 'Cancel' : 'New Discussion'}
          </button>
        </div>
      </div>

      {/* New Discussion Form */}
      {showNewDiscussion && (
        <div className="mb-6 rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4">
          <h2 className="mb-3 text-lg font-semibold">Start a Discussion</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Discussion Title"
              value={newDiscussion.title}
              onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
            <textarea
              rows={4}
              placeholder="What would you like to discuss?"
              value={newDiscussion.content}
              onChange={(e) => setNewDiscussion({ ...newDiscussion, content: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateDiscussion}
                disabled={submitting || !newDiscussion.title.trim() || !newDiscussion.content.trim()}
                className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post Discussion'}
              </button>
              <button
                onClick={() => setShowNewDiscussion(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discussions List */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {discussions.length > 0 ? (
        <div className="space-y-4">
          {discussions
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((discussion) => {
              const isExpanded = expandedDiscussions.has(discussion.id);
              const replyCount = discussion.replies?.length || 0;

              return (
                <div key={discussion.id} className="rounded-lg border border-gray-200 bg-white">
                  {/* Discussion Header */}
                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {discussion.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                          <span className="font-medium">{discussion.userName}</span>
                          <span>•</span>
                          <span>{new Date(discussion.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <button
                            onClick={() => toggleDiscussion(discussion.id)}
                            className="hover:text-indigo-600"
                          >
                            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{discussion.content}</p>

                    <div className="mt-3">
                      <button
                        onClick={() =>
                          replyingTo === discussion.id
                            ? setReplyingTo(null)
                            : setReplyingTo(discussion.id)
                        }
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Reply
                      </button>
                    </div>
                  </div>

                  {/* Replies */}
                  {isExpanded && discussion.replies && discussion.replies.length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <div className="space-y-3">
                        {discussion.replies.map((reply) => (
                          <div key={reply.id} className="rounded-lg bg-white p-3 shadow-sm">
                            <div className="mb-1 flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-900">{reply.userName}</span>
                              <span className="text-gray-500">
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {reply.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reply Form */}
                  {replyingTo === discussion.id && (
                    <div className="border-t border-gray-200 bg-indigo-50 p-4">
                      <textarea
                        rows={3}
                        placeholder="Write your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handleReply(discussion.id)}
                          disabled={submitting || !replyContent.trim()}
                          className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {submitting ? 'Posting...' : 'Post Reply'}
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                          className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No discussions yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Start the conversation! Be the first to post a discussion.
          </p>
        </div>
      )}
    </div>
  );
}
