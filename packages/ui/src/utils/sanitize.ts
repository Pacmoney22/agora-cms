/**
 * Escapes HTML special characters to prevent XSS attacks
 * Converts <, >, &, ", and ' to their HTML entity equivalents
 *
 * @param unsafe - Untrusted string
 * @returns Escaped string safe for HTML display
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe || typeof unsafe !== 'string') {
    return '';
  }

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes HTML content by removing dangerous elements and attributes
 * Uses a basic allow-list approach for security
 *
 * IMPORTANT: This is a basic sanitizer. For production use with rich content,
 * consider using DOMPurify on the client side or a server-side HTML sanitizer.
 *
 * @param html - Untrusted HTML string
 * @returns Sanitized HTML safe for rendering
 *
 * @example
 * ```tsx
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userContent) }} />
 * ```
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="');
  sanitized = sanitized.replace(/src\s*=\s*["']?\s*javascript:/gi, 'src="');

  // Remove data: protocol (potential XSS vector)
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*data:/gi, 'href="');
  sanitized = sanitized.replace(/src\s*=\s*["']?\s*data:/gi, 'src="');

  // Remove vbscript: protocol
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*vbscript:/gi, 'href="');

  // Remove dangerous tags
  const dangerousTags = ['iframe', 'object', 'embed', 'form', 'input', 'button', 'style'];
  dangerousTags.forEach((tag) => {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    sanitized = sanitized.replace(new RegExp(`<${tag}[^>]*>`, 'gi'), '');
  });

  return sanitized;
}

/**
 * Strict sanitization for JSON-LD and other script content
 * Only allows very basic text content, no HTML tags
 */
export function sanitizeJsonLd(jsonLd: Record<string, any>): string {
  return JSON.stringify(jsonLd)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
