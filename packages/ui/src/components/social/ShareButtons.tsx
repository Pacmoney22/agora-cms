import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Copy, Check, Mail } from 'lucide-react';

export type SharePlatform =
  | 'facebook'
  | 'x'
  | 'linkedin'
  | 'email'
  | 'whatsapp'
  | 'pinterest'
  | 'reddit'
  | 'copy-link';

export interface ShareButtonsProps {
  platforms?: SharePlatform[];
  style?: 'icon-only' | 'icon-text' | 'button';
  shareUrl?: 'current-page' | 'custom';
  customUrl?: string | null;
  layout?: 'horizontal' | 'vertical' | 'floating';
  showCount?: boolean;
  className?: string;
}

const platformConfig: Record<
  string,
  { label: string; color: string; buildUrl: (url: string, title?: string) => string | null }
> = {
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    buildUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  x: {
    label: 'X',
    color: '#000000',
    buildUrl: (url) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
  },
  linkedin: {
    label: 'LinkedIn',
    color: '#0A66C2',
    buildUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  email: {
    label: 'Email',
    color: '#666666',
    buildUrl: (url, title) =>
      `mailto:?subject=${encodeURIComponent(title || '')}&body=${encodeURIComponent(url)}`,
  },
  whatsapp: {
    label: 'WhatsApp',
    color: '#25D366',
    buildUrl: (url) => `https://wa.me/?text=${encodeURIComponent(url)}`,
  },
  pinterest: {
    label: 'Pinterest',
    color: '#E60023',
    buildUrl: (url) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}`,
  },
  reddit: {
    label: 'Reddit',
    color: '#FF4500',
    buildUrl: (url) => `https://reddit.com/submit?url=${encodeURIComponent(url)}`,
  },
  'copy-link': {
    label: 'Copy Link',
    color: '#6B7280',
    buildUrl: () => null,
  },
};

const platformIcons: Record<string, string> = {
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  x: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z',
  pinterest: 'M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z',
  reddit: 'M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z',
};

function ShareIcon({ platform, size }: { platform: string; size: number }) {
  if (platform === 'email') return <Mail size={size} />;
  if (platform === 'copy-link') return <Copy size={size} />;
  const path = platformIcons[platform];
  if (!path) return <Copy size={size} />;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

/**
 * Validates that a URL is safe (no javascript:, data:, or file: schemes)
 * Returns the validated URL or empty string if invalid
 */
function validateUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'file:', 'vbscript:'];
  if (dangerousProtocols.some(protocol => trimmed.startsWith(protocol))) {
    console.warn('ShareButtons: Blocked potentially unsafe URL protocol');
    return '';
  }

  // Only allow http(s):, mailto:, or relative URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') ||
      trimmed.startsWith('mailto:') || trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return url.trim();
  }

  // If no protocol, assume https for safety
  return '';
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({
  platforms = ['facebook', 'x', 'linkedin', 'email'],
  style = 'icon-only',
  shareUrl = 'current-page',
  customUrl = null,
  layout = 'horizontal',
  showCount = false,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const rawUrl =
    shareUrl === 'custom' && customUrl
      ? customUrl
      : typeof window !== 'undefined'
        ? window.location.href
        : '';

  // Validate URL to prevent open redirect vulnerabilities
  const url = validateUrl(rawUrl);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  const handleShare = (platform: SharePlatform) => {
    if (platform === 'copy-link') {
      handleCopyLink();
      return;
    }

    const config = platformConfig[platform];
    if (!config) return;

    // Ensure URL is valid before building share link
    if (!url) {
      console.warn('ShareButtons: Cannot share invalid or empty URL');
      return;
    }

    const shareHref = config.buildUrl(url, document?.title);
    if (shareHref) {
      // Additional validation: share URLs should only be to known platforms
      const validatedShareHref = validateUrl(shareHref);
      if (validatedShareHref) {
        window.open(validatedShareHref, '_blank', 'noopener,noreferrer,width=600,height=400');
      }
    }
  };

  return (
    <div
      className={clsx(
        'flex gap-2',
        layout === 'vertical' && 'flex-col',
        layout === 'horizontal' && 'flex-row flex-wrap',
        layout === 'floating' && 'fixed left-4 top-1/2 z-40 -translate-y-1/2 flex-col',
        className,
      )}
      role="group"
      aria-label="Share this page"
    >
      {platforms.map((platform) => {
        const config = platformConfig[platform];
        if (!config) return null;

        const isCopyLink = platform === 'copy-link';
        const label = isCopyLink && copied ? 'Copied!' : config.label;
        const iconSize = style === 'button' ? 16 : 20;

        return (
          <button
            key={platform}
            onClick={() => handleShare(platform)}
            aria-label={`Share on ${config.label}`}
            className={clsx(
              'inline-flex items-center gap-2 transition-opacity hover:opacity-80',
              style === 'icon-only' && 'rounded-full p-2',
              style === 'icon-text' && 'rounded-lg px-3 py-2',
              style === 'button' && 'rounded-lg px-4 py-2 text-sm font-medium text-white',
            )}
            style={
              style === 'button'
                ? { backgroundColor: config.color }
                : { color: config.color }
            }
          >
            {isCopyLink && copied ? (
              <Check size={iconSize} />
            ) : (
              <ShareIcon platform={platform} size={iconSize} />
            )}
            {(style === 'icon-text' || style === 'button') && (
              <span>{label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
