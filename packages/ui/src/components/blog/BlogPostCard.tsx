import React from 'react';
import { clsx } from 'clsx';
import {
  Calendar,
  Clock,
  User,
  Tag,
  Share2,
  ChevronLeft,
  ChevronRight,
  Twitter,
  Facebook,
  Linkedin,
  Link as LinkIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlogPost {
  title: string;
  excerpt?: string;
  image?: string;
  author?: { name: string; avatar?: string; bio?: string };
  date?: string;
  category?: string;
  readTime?: string;
  slug: string;

  // Detail-mode fields
  content?: string;
  tags?: string[];
  relatedPosts?: Array<{
    title: string;
    slug: string;
    image?: string;
    date?: string;
    excerpt?: string;
  }>;
  previousPost?: { title: string; slug: string };
  nextPost?: { title: string; slug: string };
}

export interface BlogPostCardProps {
  post?: BlogPost | null;
  detailBasePath?: string;

  /** Display mode — 'card' for compact grid view, 'detail' for full article view. */
  mode?: 'card' | 'detail';

  // Card-mode props
  showImage?: boolean;
  imageAspectRatio?: '16:9' | '4:3' | '1:1';
  showExcerpt?: boolean;
  excerptLength?: number;
  showAuthor?: boolean;
  showDate?: boolean;
  showCategory?: boolean;
  showReadTime?: boolean;
  cardStyle?: 'standard' | 'overlay' | 'horizontal' | 'minimal';

  // Detail-mode props
  showContent?: boolean;
  showShareButtons?: boolean;
  showAuthorBio?: boolean;
  showRelatedPosts?: boolean;
  showPostNavigation?: boolean;
  showTags?: boolean;

  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const aspectRatioMap: Record<string, string> = {
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square',
};

function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length).trimEnd() + '...';
}

// ---------------------------------------------------------------------------
// Detail View
// ---------------------------------------------------------------------------

function BlogDetailView({
  post,
  detailBasePath,
  showImage,
  showAuthor,
  showDate,
  showCategory,
  showReadTime,
  showContent,
  showShareButtons,
  showAuthorBio,
  showRelatedPosts,
  showPostNavigation,
  showTags,
  className,
}: {
  post: BlogPost;
  detailBasePath: string;
  showImage: boolean;
  showAuthor: boolean;
  showDate: boolean;
  showCategory: boolean;
  showReadTime: boolean;
  showContent: boolean;
  showShareButtons: boolean;
  showAuthorBio: boolean;
  showRelatedPosts: boolean;
  showPostNavigation: boolean;
  showTags: boolean;
  className?: string;
}) {
  return (
    <article className={clsx('w-full', className)}>
      {/* Featured image */}
      {showImage && post.image && (
        <div className="mb-8 overflow-hidden rounded-xl">
          <img
            src={post.image}
            alt={post.title}
            className="aspect-video w-full object-cover"
          />
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
        {post.title}
      </h1>

      {/* Meta bar */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
        {showAuthor && post.author && (
          <div className="flex items-center gap-2">
            {post.author.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 rounded-full bg-gray-100 p-1.5 text-gray-400" />
            )}
            <span className="font-medium text-gray-700">{post.author.name}</span>
          </div>
        )}
        {showDate && post.date && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {post.date}
          </span>
        )}
        {showCategory && post.category && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-0.5 text-xs font-medium text-blue-700">
            {post.category}
          </span>
        )}
        {showReadTime && post.readTime && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {post.readTime}
          </span>
        )}
      </div>

      {/* Full article body */}
      {showContent && post.content && (
        <div
          className="prose prose-gray mt-8 max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-img:rounded-lg"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      )}

      {/* Tags */}
      {showTags && post.tags && post.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Share buttons */}
      {showShareButtons && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="flex items-center gap-3">
            <Share2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Share</span>
            <div className="flex gap-2">
              <button
                className="rounded-full bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-blue-100 hover:text-blue-600"
                aria-label="Share on Twitter"
              >
                <Twitter className="h-4 w-4" />
              </button>
              <button
                className="rounded-full bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-blue-100 hover:text-blue-700"
                aria-label="Share on Facebook"
              >
                <Facebook className="h-4 w-4" />
              </button>
              <button
                className="rounded-full bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-blue-100 hover:text-blue-800"
                aria-label="Share on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </button>
              <button
                className="rounded-full bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200"
                aria-label="Copy link"
              >
                <LinkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Author bio */}
      {showAuthorBio && post.author?.bio && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <div className="flex items-start gap-4">
            {post.author.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <User className="h-16 w-16 flex-shrink-0 rounded-full bg-gray-200 p-3 text-gray-400" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Written by</p>
              <h3 className="text-lg font-semibold text-gray-900">
                {post.author.name}
              </h3>
              <p className="mt-1 text-sm text-gray-600">{post.author.bio}</p>
            </div>
          </div>
        </div>
      )}

      {/* Post navigation */}
      {showPostNavigation &&
        (post.previousPost || post.nextPost) && (
          <div className="mt-8 grid grid-cols-1 gap-4 border-t border-gray-200 pt-8 sm:grid-cols-2">
            {post.previousPost ? (
              <a
                href={`${detailBasePath}/${post.previousPost.slug}`}
                className="group flex items-center gap-2 rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
              >
                <ChevronLeft className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">Previous</p>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                    {post.previousPost.title}
                  </p>
                </div>
              </a>
            ) : (
              <div />
            )}
            {post.nextPost && (
              <a
                href={`${detailBasePath}/${post.nextPost.slug}`}
                className="group flex items-center justify-end gap-2 rounded-lg border border-gray-200 p-4 text-right transition-shadow hover:shadow-md"
              >
                <div>
                  <p className="text-xs text-gray-500">Next</p>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                    {post.nextPost.title}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-blue-600" />
              </a>
            )}
          </div>
        )}

      {/* Related posts */}
      {showRelatedPosts &&
        post.relatedPosts &&
        post.relatedPosts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Related Posts</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {post.relatedPosts.map((rel) => (
                <a
                  key={rel.slug}
                  href={`${detailBasePath}/${rel.slug}`}
                  className="group overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md"
                >
                  {rel.image && (
                    <img
                      src={rel.image}
                      alt={rel.title}
                      className="aspect-video w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    {rel.date && (
                      <p className="text-xs text-gray-500">{rel.date}</p>
                    )}
                    <h3 className="mt-1 text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                      {rel.title}
                    </h3>
                    {rel.excerpt && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {rel.excerpt}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const BlogPostCard: React.FC<BlogPostCardProps> = ({
  post: postProp = null,
  detailBasePath = '/blog',
  mode = 'card',
  showImage = true,
  imageAspectRatio = '16:9',
  showExcerpt = true,
  excerptLength = 150,
  showAuthor = true,
  showDate = true,
  showCategory = true,
  showReadTime = true,
  cardStyle = 'standard',
  showContent = true,
  showShareButtons = true,
  showAuthorBio = true,
  showRelatedPosts = true,
  showPostNavigation = true,
  showTags = true,
  className,
}) => {
  const samplePost: BlogPost = {
    title: 'Sample Blog Post',
    excerpt: 'This card displays the blog post from the current page URL at runtime.',
    image: '',
    author: { name: 'Author Name' },
    date: 'Jan 15, 2026',
    category: 'Category',
    readTime: '5 min read',
    slug: 'sample',
  };

  const post = postProp ?? samplePost;

  // --- Detail mode ---
  if (mode === 'detail') {
    return (
      <BlogDetailView
        post={post}
        detailBasePath={detailBasePath}
        showImage={showImage}
        showAuthor={showAuthor}
        showDate={showDate}
        showCategory={showCategory}
        showReadTime={showReadTime}
        showContent={showContent}
        showShareButtons={showShareButtons}
        showAuthorBio={showAuthorBio}
        showRelatedPosts={showRelatedPosts}
        showPostNavigation={showPostNavigation}
        showTags={showTags}
        className={className}
      />
    );
  }

  // --- Card mode (existing behavior) ---
  const MetaInfo = () => (
    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
      {showCategory && post.category && (
        <span className="inline-flex items-center gap-1">
          <Tag className="h-3.5 w-3.5" />
          {post.category}
        </span>
      )}
      {showDate && post.date && (
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {post.date}
        </span>
      )}
      {showReadTime && post.readTime && (
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {post.readTime}
        </span>
      )}
    </div>
  );

  const AuthorInfo = () =>
    showAuthor && post.author ? (
      <div className="flex items-center gap-2">
        {post.author.avatar ? (
          <img
            src={post.author.avatar}
            alt={post.author.name}
            className="h-6 w-6 rounded-full object-cover"
          />
        ) : (
          <User className="h-6 w-6 rounded-full bg-gray-100 p-1 text-gray-400" />
        )}
        <span className="text-sm font-medium text-gray-700">{post.author.name}</span>
      </div>
    ) : null;

  if (cardStyle === 'overlay') {
    return (
      <article
        className={clsx(
          'group relative overflow-hidden rounded-xl',
          className,
        )}
      >
        <a href={`${detailBasePath}/${post.slug}`} className="block">
          {post.image && (
            <img
              src={post.image}
              alt={post.title}
              className={clsx(
                'w-full object-cover transition-transform duration-300 group-hover:scale-105',
                aspectRatioMap[imageAspectRatio],
              )}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            {showCategory && post.category && (
              <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                {post.category}
              </span>
            )}
            <h3 className="mb-2 text-xl font-bold leading-tight">{post.title}</h3>
            <div className="flex items-center gap-3 text-sm text-white/80">
              {showDate && post.date && <span>{post.date}</span>}
              {showReadTime && post.readTime && <span>{post.readTime}</span>}
            </div>
          </div>
        </a>
      </article>
    );
  }

  if (cardStyle === 'horizontal') {
    return (
      <article
        className={clsx(
          'group flex gap-4 overflow-hidden rounded-xl border border-gray-200 bg-white',
          className,
        )}
      >
        {showImage && post.image && (
          <a href={`${detailBasePath}/${post.slug}`} className="flex-shrink-0">
            <img
              src={post.image}
              alt={post.title}
              className="h-full w-48 object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </a>
        )}
        <div className="flex flex-col justify-center py-4 pr-4">
          <MetaInfo />
          <a href={`${detailBasePath}/${post.slug}`}>
            <h3 className="mt-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
              {post.title}
            </h3>
          </a>
          {showExcerpt && post.excerpt && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              {truncateText(post.excerpt, excerptLength)}
            </p>
          )}
          <div className="mt-3">
            <AuthorInfo />
          </div>
        </div>
      </article>
    );
  }

  if (cardStyle === 'minimal') {
    return (
      <article className={clsx('group', className)}>
        <a href={`${detailBasePath}/${post.slug}`}>
          <MetaInfo />
          <h3 className="mt-1 text-lg font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
            {post.title}
          </h3>
          {showExcerpt && post.excerpt && (
            <p className="mt-1 text-sm text-gray-600">
              {truncateText(post.excerpt, excerptLength)}
            </p>
          )}
        </a>
      </article>
    );
  }

  // Standard card style
  return (
    <article
      className={clsx(
        'group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      {showImage && post.image && (
        <a href={`${detailBasePath}/${post.slug}`} className="block overflow-hidden">
          <img
            src={post.image}
            alt={post.title}
            className={clsx(
              'w-full object-cover transition-transform duration-300 group-hover:scale-105',
              aspectRatioMap[imageAspectRatio],
            )}
          />
        </a>
      )}
      <div className="p-5">
        <MetaInfo />
        <a href={`${detailBasePath}/${post.slug}`}>
          <h3 className="mt-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
            {post.title}
          </h3>
        </a>
        {showExcerpt && post.excerpt && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-3">
            {truncateText(post.excerpt, excerptLength)}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between">
          <AuthorInfo />
        </div>
      </div>
    </article>
  );
};
