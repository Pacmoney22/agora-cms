import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import Prism from 'prismjs';
import { Copy, Check } from 'lucide-react';

export interface CodeBlockProps {
  code?: string;
  language?: string;
  theme?: 'dark' | 'light' | 'auto';
  showLineNumbers?: boolean;
  highlightLines?: string;
  showCopyButton?: boolean;
  caption?: string;
  maxHeight?: number;
  wrapLines?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const parseHighlightLines = (highlightLines: string): Set<number> => {
  const lines = new Set<number>();
  if (!highlightLines) return lines;

  highlightLines.split(',').forEach((part) => {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number) as [number, number];
      for (let i = start; i <= end; i++) {
        lines.add(i);
      }
    } else {
      lines.add(Number(trimmed));
    }
  });

  return lines;
};

const themeMap = {
  dark: 'bg-gray-900 text-gray-100',
  light: 'bg-gray-50 text-gray-900 border border-gray-200',
  auto: 'bg-gray-900 text-gray-100 dark:bg-gray-900 dark:text-gray-100',
};

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code = '',
  language = 'plaintext',
  theme = 'dark',
  showLineNumbers = true,
  highlightLines = '',
  showCopyButton = true,
  caption,
  maxHeight,
  wrapLines = false,
  children,
  className,
}) => {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const highlightedLines = parseHighlightLines(highlightLines);
  const codeLines = code.split('\n');

  return (
    <figure className={clsx('my-6', className)}>
      <div className={clsx('relative rounded-lg overflow-hidden', themeMap[theme])}>
        {/* Header bar with language label and copy button */}
        <div
          className={clsx(
            'flex items-center justify-between px-4 py-2 text-xs',
            theme === 'light'
              ? 'bg-gray-100 text-gray-600 border-b border-gray-200'
              : 'bg-gray-800 text-gray-400',
          )}
        >
          <span className="font-mono uppercase tracking-wide">{language}</span>
          {showCopyButton && (
            <button
              onClick={handleCopy}
              className={clsx(
                'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
                theme === 'light'
                  ? 'hover:bg-gray-200 text-gray-600'
                  : 'hover:bg-gray-700 text-gray-400',
              )}
              aria-label={copied ? 'Copied' : 'Copy code'}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Code content */}
        <div
          className="overflow-auto"
          style={maxHeight ? { maxHeight: `${maxHeight}px` } : undefined}
        >
          <pre
            className={clsx(
              'p-4 text-sm leading-relaxed',
              wrapLines && 'whitespace-pre-wrap break-words',
              !wrapLines && 'whitespace-pre',
            )}
          >
            {showLineNumbers ? (
              <code ref={codeRef} className={`language-${language}`}>
                {codeLines.map((line, index) => {
                  const lineNum = index + 1;
                  const isHighlighted = highlightedLines.has(lineNum);

                  return (
                    <span
                      key={index}
                      className={clsx(
                        'block',
                        isHighlighted && (theme === 'light'
                          ? 'bg-yellow-100 -mx-4 px-4'
                          : 'bg-white/10 -mx-4 px-4'),
                      )}
                    >
                      <span
                        className={clsx(
                          'inline-block w-8 mr-4 text-right select-none opacity-40',
                        )}
                      >
                        {lineNum}
                      </span>
                      {line}
                      {index < codeLines.length - 1 ? '\n' : ''}
                    </span>
                  );
                })}
              </code>
            ) : (
              <code ref={codeRef} className={`language-${language}`}>
                {code}
              </code>
            )}
          </pre>
        </div>
      </div>

      {caption && (
        <figcaption className="mt-2 text-center text-sm text-gray-500">
          {caption}
        </figcaption>
      )}

      {children}
    </figure>
  );
};
