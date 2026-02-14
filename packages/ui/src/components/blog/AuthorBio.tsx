import React from 'react';
import { clsx } from 'clsx';
import { User, ExternalLink } from 'lucide-react';

export interface AuthorSocialLink {
  platform: string;
  url: string;
}

export interface AuthorData {
  name: string;
  bio?: string;
  avatar?: string;
  socialLinks?: AuthorSocialLink[];
}

export interface AuthorBioProps {
  author?: AuthorData | null;
  authorSource?: 'auto' | 'manual';
  showAvatar?: boolean;
  showBio?: boolean;
  showSocialLinks?: boolean;
  layout?: 'horizontal' | 'vertical' | 'card';
  linkToAuthorPage?: boolean;
  className?: string;
}

export const AuthorBio: React.FC<AuthorBioProps> = ({
  author = null,
  authorSource = 'manual',
  showAvatar = true,
  showBio = true,
  showSocialLinks = true,
  layout = 'horizontal',
  linkToAuthorPage = true,
  className,
}) => {
  if (!author) {
    return (
      <div
        className={clsx(
          'flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4',
          className,
        )}
      >
        <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="mb-2 h-5 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  const authorSlug = author.name.toLowerCase().replace(/\s+/g, '-');

  const Avatar = () =>
    showAvatar ? (
      author.avatar ? (
        <img
          src={author.avatar}
          alt={author.name}
          className={clsx(
            'rounded-full object-cover',
            layout === 'vertical' ? 'h-20 w-20' : 'h-14 w-14',
          )}
        />
      ) : (
        <div
          className={clsx(
            'flex items-center justify-center rounded-full bg-gray-200',
            layout === 'vertical' ? 'h-20 w-20' : 'h-14 w-14',
          )}
        >
          <User className="h-8 w-8 text-gray-400" />
        </div>
      )
    ) : null;

  const NameElement = () => {
    const nameContent = (
      <h3 className="text-lg font-semibold text-gray-900">{author.name}</h3>
    );
    return linkToAuthorPage ? (
      <a
        href={`/author/${authorSlug}`}
        className="transition-colors hover:text-blue-600"
      >
        {nameContent}
      </a>
    ) : (
      nameContent
    );
  };

  const SocialLinks = () =>
    showSocialLinks && author.socialLinks && author.socialLinks.length > 0 ? (
      <div className="mt-2 flex gap-2">
        {author.socialLinks.map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${author.name} on ${link.platform}`}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ))}
      </div>
    ) : null;

  if (layout === 'vertical') {
    return (
      <div
        className={clsx(
          'flex flex-col items-center text-center',
          layout === 'vertical' && 'rounded-xl border border-gray-200 bg-white p-6',
          className,
        )}
      >
        <Avatar />
        <div className="mt-3">
          <NameElement />
          {showBio && author.bio && (
            <p className="mt-2 text-sm text-gray-600">{author.bio}</p>
          )}
          <SocialLinks />
        </div>
      </div>
    );
  }

  if (layout === 'card') {
    return (
      <div
        className={clsx(
          'flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
          className,
        )}
      >
        <Avatar />
        <div className="flex-1">
          <NameElement />
          {showBio && author.bio && (
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              {author.bio}
            </p>
          )}
          <SocialLinks />
        </div>
      </div>
    );
  }

  // Horizontal layout
  return (
    <div
      className={clsx('flex items-center gap-4', className)}
    >
      <Avatar />
      <div>
        <NameElement />
        {showBio && author.bio && (
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{author.bio}</p>
        )}
        <SocialLinks />
      </div>
    </div>
  );
};
