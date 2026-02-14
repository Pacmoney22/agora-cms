'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: '',
    items: [{ label: 'Dashboard', href: '/', icon: '\u25A0' }],
  },
  {
    title: 'Content',
    items: [
      { label: 'Pages', href: '/pages', icon: '\u2630' },
      { label: 'Articles', href: '/articles', icon: '\u{270D}' },
      { label: 'Article Categories', href: '/article-categories', icon: '\u{1F4C2}' },
      { label: 'Article Tags', href: '/article-tags', icon: '\u{1F3F7}' },
      { label: 'Comments', href: '/comments', icon: '\u{1F4AC}' },
      { label: 'Reviews', href: '/reviews', icon: '\u2B50' },
      { label: 'Media', href: '/media', icon: '\u25A3' },
      { label: 'Forms', href: '/forms', icon: '\u{1F4DD}' },
      { label: 'Gated Files', href: '/files', icon: '\u{1F512}' },
      { label: 'Navigation', href: '/navigation', icon: '\u2261' },
      { label: 'Redirects', href: '/redirects', icon: '\u21B7' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { label: 'Products', href: '/products', icon: '\u2605' },
      { label: 'Categories', href: '/categories', icon: '\u2630' },
      { label: 'Product Tags', href: '/product-tags', icon: '\u{1F3F7}' },
      { label: 'Orders', href: '/orders', icon: '\u2709' },
      { label: 'Coupons', href: '/coupons', icon: '\u{1F3AB}' },
      { label: 'Customers', href: '/users', icon: '\u{1F465}' },
      { label: 'Product Feeds', href: '/product-feeds', icon: '\u{1F4E1}' },
    ],
  },
  {
    title: 'Events',
    items: [
      { label: 'Events', href: '/events', icon: '\u{1F4C5}' },
      { label: 'Event Categories', href: '/event-categories', icon: '\u{1F4C2}' },
      { label: 'Event Tags', href: '/event-tags', icon: '\u{1F3F7}' },
      { label: 'Venues', href: '/venues', icon: '\u{1F3DB}' },
      { label: 'Check-In', href: '/check-in', icon: '\u2714' },
      { label: 'Session Scanner', href: '/session-scanner', icon: '\u{1F4F7}' },
      { label: 'Exhibitor Scanner', href: '/exhibitor-scanner', icon: '\u{1F4CB}' },
    ],
  },
  {
    title: 'Learning',
    items: [
      { label: 'Courses', href: '/courses', icon: '\uD83C\uDF93' },
      { label: 'Sections', href: '/course-sections', icon: '\u{1F4C5}' },
      { label: 'Enrollments', href: '/enrollments', icon: '\u{1F4CB}' },
      { label: 'Grading', href: '/grading', icon: '\u2713' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'General', href: '/settings/general', icon: '\u2699' },
      { label: 'Site Status', href: '/settings/site-status', icon: '\u{1F6A6}' },
      { label: 'Appearance', href: '/settings/appearance', icon: '\u{1F3A8}' },
      { label: 'Blog', href: '/settings/blog', icon: '\u{1F4F0}' },
      { label: 'SEO', href: '/settings/seo', icon: '\u2315' },
      { label: 'Analytics', href: '/settings/analytics', icon: '\u2197' },
      { label: 'Payments', href: '/settings/payments', icon: '\u{1F4B3}' },
      { label: 'Shipping', href: '/settings/shipping', icon: '\u{1F69A}' },
      { label: 'Tax', href: '/settings/tax', icon: '\u{1F4C4}' },
      { label: 'Email', href: '/settings/email', icon: '\u2709' },
      { label: 'Email Templates', href: '/email-templates', icon: '\u{1F4E8}' },
      { label: 'System', href: '/settings/system', icon: '\u2318' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-gray-900">
      <div className="flex h-14 items-center px-5">
        <Link href="/" className="text-sm font-bold text-white tracking-wide">
          NextGen CMS
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-4' : ''}>
            {section.title && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive(item.href)
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <span className="w-4 text-center text-xs opacity-60">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-gray-800 px-5 py-3">
        <p className="text-[10px] text-gray-500">v0.1.0</p>
      </div>
    </aside>
  );
}
