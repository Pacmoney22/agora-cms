import type { UserRole, GlobalRole, ScopedRole } from '../types/user';

export const ROLES: Record<Uppercase<UserRole>, UserRole> = {
  CUSTOMER: 'customer',
  VIEWER: 'viewer',
  EDITOR: 'editor',
  STORE_MANAGER: 'store_manager',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  INSTRUCTOR: 'instructor',
  COURSE_ADMINISTRATOR: 'course_administrator',
  EXHIBITOR: 'exhibitor',
  EVENT_STAFF: 'event_staff',
  KIOSK_USER: 'kiosk_user',
} as const;

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  // Global hierarchy roles
  customer: 0,
  viewer: 1,
  editor: 2,
  store_manager: 3,
  admin: 4,
  super_admin: 5,
  // Scoped roles (hierarchy -1 = auto-denied by hasMinimumRole)
  instructor: -1,
  course_administrator: -1,
  exhibitor: -1,
  event_staff: -1,
  kiosk_user: -1,
};

export const GLOBAL_ROLES: GlobalRole[] = [
  'customer',
  'viewer',
  'editor',
  'store_manager',
  'admin',
  'super_admin',
];

export const SCOPED_ROLES: ScopedRole[] = [
  'instructor',
  'course_administrator',
  'exhibitor',
  'event_staff',
  'kiosk_user',
];

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function isGlobalRole(role: UserRole): role is GlobalRole {
  return GLOBAL_ROLES.includes(role as GlobalRole);
}

export function isScopedRole(role: UserRole): role is ScopedRole {
  return SCOPED_ROLES.includes(role as ScopedRole);
}

export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    customer: 'Customer',
    viewer: 'Viewer',
    editor: 'Editor',
    store_manager: 'Store Manager',
    admin: 'Administrator',
    super_admin: 'Super Administrator',
    instructor: 'Instructor',
    course_administrator: 'Course Administrator',
    exhibitor: 'Exhibitor',
    event_staff: 'Event Staff',
    kiosk_user: 'Kiosk User',
  };
  return displayNames[role];
}
