'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { hasMinimumRole, getRoleDisplayName } from '@agora-cms/shared';
import type { UserRole } from '@agora-cms/shared';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  minRole?: UserRole; // Minimum global role required
  allowedRoles?: UserRole[]; // Specific roles allowed (for scoped roles)
}

interface NavSection {
  title: string;
  items: NavItem[];
  minRole?: UserRole; // Hide entire section if user doesn't meet minimum
}

const sections: NavSection[] = [
  { title: '', items: [{ label: 'Dashboard', href: '/', icon: '□' }] },

  {
    title: 'Content',
    minRole: 'editor', // Entire section requires editor+
    items: [
      { label: 'Pages', href: '/pages', icon: '☰' },
      { label: 'Articles', href: '/articles', icon: '✍' },
      { label: 'Article Categories', href: '/article-categories', icon: '🗂' },
      { label: 'Article Tags', href: '/article-tags', icon: '🏷' },
      { label: 'Comments', href: '/comments', icon: '💬' },
      { label: 'Reviews', href: '/reviews', icon: '⭐' },
      { label: 'Media', href: '/media', icon: '🖼' },
      { label: 'Forms', href: '/forms', icon: '📝' },
      { label: 'Gated Files', href: '/files', icon: '🔒' },
      { label: 'Navigation', href: '/navigation', icon: '🧭' },
      { label: 'Redirects', href: '/redirects', icon: '↪' },
      { label: 'Email Templates', href: '/email-templates', icon: '✉' },
    ],
  },

  {
    title: 'Commerce',
    minRole: 'store_manager',
    items: [
      { label: 'Products', href: '/products', icon: '☆' },
      { label: 'Categories', href: '/categories', icon: '📂' },
      { label: 'Product Tags', href: '/product-tags', icon: '🏷' },
      { label: 'Orders', href: '/orders', icon: '📦' },
      { label: 'Coupons', href: '/coupons', icon: '🎟' },
      { label: 'Customers', href: '/users', icon: '👥' },
      { label: 'Product Feeds', href: '/product-feeds', icon: '📡' },
    ],
  },

  {
    title: 'Events',
    items: [
      { label: 'Events', href: '/events', icon: '📅', minRole: 'admin', allowedRoles: ['event_staff'] },
      { label: 'Event Categories', href: '/event-categories', icon: '🗂', minRole: 'admin', allowedRoles: ['event_staff'] },
      { label: 'Event Tags', href: '/event-tags', icon: '🏷', minRole: 'admin', allowedRoles: ['event_staff'] },
      { label: 'Venues', href: '/venues', icon: '🏛', minRole: 'admin', allowedRoles: ['event_staff'] },
      { label: 'Check-in', href: '/check-in', icon: '✓', allowedRoles: ['kiosk_user', 'event_staff', 'admin', 'super_admin'] },
      { label: 'Session Scanner', href: '/session-scanner', icon: '📷', minRole: 'admin', allowedRoles: ['event_staff'] },
      { label: 'Exhibitor Scanner', href: '/exhibitor-scanner', icon: '📋', minRole: 'admin', allowedRoles: ['event_staff', 'exhibitor'] },
    ],
  },

  {
    title: 'Learning',
    items: [
      { label: 'Courses', href: '/courses', icon: '🎓', minRole: 'admin', allowedRoles: ['course_administrator', 'instructor'] },
      { label: 'Sections', href: '/course-sections', icon: '📚', minRole: 'admin', allowedRoles: ['course_administrator', 'instructor'] },
      { label: 'Enrollments', href: '/enrollments', icon: '📋', minRole: 'admin', allowedRoles: ['course_administrator'] },
      { label: 'Grading', href: '/grading', icon: '✏', minRole: 'admin', allowedRoles: ['course_administrator', 'instructor'] },
    ],
  },

  {
    title: 'Settings',
    minRole: 'admin',
    items: [
      { label: 'General', href: '/settings/general', icon: '⚙' },
      { label: 'Users', href: '/users', icon: '👤' },
      { label: 'Site Status', href: '/settings/site-status', icon: '🚦' },
      { label: 'Appearance', href: '/settings/appearance', icon: '🎨' },
      { label: 'Blog', href: '/settings/blog', icon: '📰' },
      { label: 'Content Routing', href: '/settings/content-routing', icon: '🔗' },
      { label: 'SEO', href: '/settings/seo', icon: '⌘' },
      { label: 'Analytics', href: '/settings/analytics', icon: '📈' },
      { label: 'Payments', href: '/settings/payments', icon: '💳' },
      { label: 'Shipping', href: '/settings/shipping', icon: '🚚' },
      { label: 'Tax', href: '/settings/tax', icon: '📄' },
      { label: 'Email', href: '/settings/email', icon: '✉' },
      { label: 'System', href: '/settings/system', icon: '⌘' },
    ],
  },
];

function canAccessItem(item: NavItem, userRole: UserRole | undefined): boolean {
  if (!userRole) return false;

  // Check if specific roles are allowed
  if (item.allowedRoles && item.allowedRoles.includes(userRole)) {
    return true;
  }

  // Check minimum role hierarchy
  if (item.minRole && hasMinimumRole(userRole, item.minRole)) {
    return true;
  }

  // If no restrictions, allow
  if (!item.minRole && !item.allowedRoles) {
    return true;
  }

  return false;
}

function canAccessSection(section: NavSection, userRole: UserRole | undefined): boolean {
  if (!userRole) return false;

  // Check section-level minimum role
  if (section.minRole && !hasMinimumRole(userRole, section.minRole)) {
    // Special case: scoped roles might still access individual items
    return section.items.some(item => canAccessItem(item, userRole));
  }

  return true;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const userRole = user?.role;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-gray-900">
      <div className="flex h-14 items-center px-5">
        <Link href="/" className="text-sm font-bold text-white tracking-wide">
          Agora CMS
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {sections.map((section, si) => {
          if (!canAccessSection(section, userRole)) return null;

          const visibleItems = section.items.filter(item => canAccessItem(item, userRole));
          if (visibleItems.length === 0) return null;

          return (
            <div key={si} className={si > 0 ? 'mt-4' : ''}>
              {section.title && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => (
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
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-gray-800 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-sm text-gray-300 truncate">{user.name}</div>
              <div className="text-[10px] text-gray-500 truncate">{user.email}</div>
              <div className="mt-1 text-[10px] text-gray-400">
                {getRoleDisplayName(user.role)}
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="ml-2 rounded p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {!user && (
        <div className="border-t border-gray-800 px-5 py-3">
          <p className="text-[10px] text-gray-500">v0.1.0</p>
        </div>
      )}
    </aside>
  );
}
