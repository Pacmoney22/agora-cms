import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ThumbsUp, MessageCircle, ChevronDown, ChevronUp, Send, User } from 'lucide-react';

export interface Comment {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  date: string;
  likes: number;
  replies?: Comment[];
}

export interface CommentsProps {
  comments?: Comment[];
  provider?: 'native' | 'disqus';
  allowNested?: boolean;
  maxDepth?: number;
  sortDefault?: 'newest' | 'oldest' | 'most-liked';
  requireAuth?: boolean;
  moderation?: 'none' | 'pre-moderation' | 'post-moderation';
  showAvatars?: boolean;
  perPage?: number;
  className?: string;
}

function sortComments(comments: Comment[], sortBy: string): Comment[] {
  const sorted = [...comments];
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    case 'most-liked':
      return sorted.sort((a, b) => b.likes - a.likes);
    default:
      return sorted;
  }
}

function CommentItem({
  comment,
  depth,
  maxDepth,
  allowNested,
  showAvatars,
}: {
  comment: Comment;
  depth: number;
  maxDepth: number;
  allowNested: boolean;
  showAvatars: boolean;
}) {
  const [showReplies, setShowReplies] = useState(true);
  const [liked, setLiked] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const hasReplies = allowNested && comment.replies && comment.replies.length > 0;
  const canNest = depth < maxDepth;

  return (
    <div
      className={clsx(
        'relative',
        depth > 0 && 'ml-8 border-l-2 border-gray-100 pl-4',
      )}
    >
      <div className="py-4">
        <div className="flex items-start gap-3">
          {showAvatars && (
            comment.avatar ? (
              <img
                src={comment.avatar}
                alt={comment.author}
                className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                <User className="h-5 w-5 text-gray-400" />
              </div>
            )
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{comment.author}</span>
              <span className="text-sm text-gray-400">{comment.date}</span>
            </div>
            <p className="mt-1 text-gray-700 leading-relaxed">{comment.content}</p>
            <div className="mt-2 flex items-center gap-4">
              <button
                onClick={() => setLiked(!liked)}
                className={clsx(
                  'inline-flex items-center gap-1 text-sm transition-colors',
                  liked ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600',
                )}
                aria-label={`Like comment by ${comment.author}`}
              >
                <ThumbsUp className="h-4 w-4" />
                <span>{liked ? comment.likes + 1 : comment.likes}</span>
              </button>
              {allowNested && canNest && (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-gray-600"
                >
                  <MessageCircle className="h-4 w-4" />
                  Reply
                </button>
              )}
            </div>

            {showReplyForm && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Write a reply..."
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  className="rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700"
                  aria-label="Submit reply"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasReplies && (
        <>
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="mb-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            {showReplies ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
          </button>
          {showReplies &&
            comment.replies!.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                maxDepth={maxDepth}
                allowNested={allowNested}
                showAvatars={showAvatars}
              />
            ))}
        </>
      )}
    </div>
  );
}

export const Comments: React.FC<CommentsProps> = ({
  comments = [],
  provider = 'native',
  allowNested = true,
  maxDepth = 3,
  sortDefault = 'newest',
  requireAuth = false,
  moderation = 'none',
  showAvatars = true,
  perPage = 10,
  className,
}) => {
  const [sortBy, setSortBy] = useState(sortDefault);
  const [visibleCount, setVisibleCount] = useState(perPage);

  const sorted = sortComments(comments, sortBy);
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  return (
    <section
      className={clsx('w-full', className)}
      aria-label="Comments"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Comments ({comments.length})
        </h2>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "most-liked")}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Sort comments"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most-liked">Most Liked</option>
        </select>
      </div>

      {/* Comment Form */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3">
          <input
            type="text"
            placeholder="Your name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="mb-3">
          <textarea
            placeholder="Write a comment..."
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end">
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            <Send className="h-4 w-4" />
            Submit Comment
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="divide-y divide-gray-100">
        {visible.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            depth={0}
            maxDepth={maxDepth}
            allowNested={allowNested}
            showAvatars={showAvatars}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisibleCount((c) => c + perPage)}
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Load More Comments
          </button>
        </div>
      )}

      {comments.length === 0 && (
        <div className="py-12 text-center">
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-gray-500">No comments yet. Be the first to share your thoughts!</p>
        </div>
      )}
    </section>
  );
};
