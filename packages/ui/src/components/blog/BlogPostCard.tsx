import React from 'react';
import { clsx } from 'clsx';
import { Calendar, Clock, User, Tag } from 'lucide-react';

export interface BlogPost {
  title: string;
  excerpt?: string;
  image?: string;
  author?: { name: string; avatar?: string };
  date?: string;
  category?: string;
  readTime?: string;
  slug: string;
}

export interface BlogPostCardProps {
  post?: BlogPost | null;
  detailBasePath?: string;
  showImage?: boolean;
  imageAspectRatio?: '16:9' | '4:3' | '1:1';
  showExcerpt?: boolean;
  excerptLength?: number;
  showAuthor?: boolean;
  showDate?: boolean;
  showCategory?: boolean;
  showReadTime?: boolean;
  cardStyle?: 'standard' | 'overlay' | 'horizontal' | 'minimal';
  className?: string;
}

const aspectRatioMap: Record<string, string> = {
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '1:1': 'aspect-square',
};

function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length).trimEnd() + '...';
}

export const BlogPostCard: React.FC<BlogPostCardProps> = ({
  post: postProp = null,
  detailBasePath = '/blog',
  showImage = true,
  imageAspectRatio = '16:9',
  showExcerpt = true,
  excerptLength = 150,
  showAuthor = true,
  showDate = true,
  showCategory = true,
  showReadTime = true,
  cardStyle = 'standard',
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
