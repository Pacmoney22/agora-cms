import type { UserRole } from '../types/user';

export const ROLES: Record<Uppercase<UserRole>, UserRole> = {
  CUSTOMER: 'customer',
  VIEWER: 'viewer',
  EDITOR: 'editor',
  STORE_MANAGER: 'store_manager',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  customer: 0,
  viewer: 1,
  editor: 2,
  store_manager: 3,
  admin: 4,
  super_admin: 5,
};

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
