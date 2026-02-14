import React, { useMemo } from 'react';
import { clsx } from 'clsx';

export interface RichTextProps {
  content?: string;
  maxWidth?: 'none' | 'prose' | 'narrow' | 'wide';
  typographyPreset?: 'editorial' | 'compact' | 'technical';
  enableTableOfContents?: boolean;
  enableFootnotes?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const maxWidthMap = {
  none: '',
  prose: 'max-w-prose',
  narrow: 'max-w-xl',
  wide: 'max-w-4xl',
};

const presetMap = {
  editorial: 'prose prose-lg prose-gray leading-relaxed',
  compact: 'prose prose-sm prose-gray leading-normal',
  technical: 'prose prose-base prose-gray font-mono leading-relaxed',
};

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const extractHeadings = (html: string): TocItem[] => {
  const headingRegex = /<h([1-6])(?:\s[^>]*)?>(.*?)<\/h[1-6]>/gi;
  const items: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]!, 10);
    const text = match[2]!.replace(/<[^>]*>/g, '');
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    items.push({ id, text, level });
  }

  return items;
};

const injectHeadingIds = (html: string, headings: TocItem[]): string => {
  let result = html;
  headings.forEach((heading) => {
    const regex = new RegExp(
      `(<h${heading.level})((?:\\s[^>]*)?>)`,
      'i',
    );
    result = result.replace(regex, `$1 id="${heading.id}"$2`);
  });
  return result;
};

export const RichText: React.FC<RichTextProps> = ({
  content = '',
  maxWidth = 'prose',
  typographyPreset = 'editorial',
  enableTableOfContents = false,
  enableFootnotes = false,
  children,
  className,
}) => {
  const headings = useMemo(
    () => (enableTableOfContents ? extractHeadings(content) : []),
    [content, enableTableOfContents],
  );

  const processedContent = useMemo(() => {
    let html = content;

    if (enableTableOfContents && headings.length > 0) {
      html = injectHeadingIds(html, headings);
    }

    return html;
  }, [content, enableTableOfContents, headings]);

  return (
    <div className={clsx(maxWidthMap[maxWidth], 'mx-auto', className)}>
      {enableTableOfContents && headings.length > 0 && (
        <nav
          aria-label="Table of Contents"
          className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Table of Contents
          </h2>
          <ul className="space-y-1">
            {headings.map((heading) => (
              <li
                key={heading.id}
                style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
              >
                <a
                  href={`#${heading.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div
        className={clsx(presetMap[typographyPreset])}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />

      {enableFootnotes && (
        <div className="mt-8 border-t border-gray-200 pt-4">
          <div className="prose prose-sm prose-gray">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
