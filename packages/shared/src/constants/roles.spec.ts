import {
  ROLES,
  ROLE_HIERARCHY,
  GLOBAL_ROLES,
  SCOPED_ROLES,
  hasMinimumRole,
  isGlobalRole,
  isScopedRole,
  getRoleDisplayName,
} from './roles';

describe('roles constants and helpers', () => {
  describe('ROLES', () => {
    it('should have all 11 roles', () => {
      expect(Object.keys(ROLES)).toHaveLength(11);
    });

    it('should map uppercase keys to lowercase values', () => {
      expect(ROLES.CUSTOMER).toBe('customer');
      expect(ROLES.SUPER_ADMIN).toBe('super_admin');
      expect(ROLES.INSTRUCTOR).toBe('instructor');
    });
  });

  describe('ROLE_HIERARCHY', () => {
    it('should assign ascending hierarchy to global roles', () => {
      expect(ROLE_HIERARCHY.customer).toBe(0);
      expect(ROLE_HIERARCHY.viewer).toBe(1);
      expect(ROLE_HIERARCHY.editor).toBe(2);
      expect(ROLE_HIERARCHY.store_manager).toBe(3);
      expect(ROLE_HIERARCHY.admin).toBe(4);
      expect(ROLE_HIERARCHY.super_admin).toBe(5);
    });

    it('should assign -1 to all scoped roles', () => {
      expect(ROLE_HIERARCHY.instructor).toBe(-1);
      expect(ROLE_HIERARCHY.course_administrator).toBe(-1);
      expect(ROLE_HIERARCHY.exhibitor).toBe(-1);
      expect(ROLE_HIERARCHY.event_staff).toBe(-1);
      expect(ROLE_HIERARCHY.kiosk_user).toBe(-1);
    });
  });

  describe('GLOBAL_ROLES', () => {
    it('should contain exactly 6 global roles', () => {
      expect(GLOBAL_ROLES).toHaveLength(6);
    });

    it('should include all global roles in order', () => {
      expect(GLOBAL_ROLES).toEqual([
        'customer', 'viewer', 'editor', 'store_manager', 'admin', 'super_admin',
      ]);
    });
  });

  describe('SCOPED_ROLES', () => {
    it('should contain exactly 5 scoped roles', () => {
      expect(SCOPED_ROLES).toHaveLength(5);
    });

    it('should include all scoped roles', () => {
      expect(SCOPED_ROLES).toEqual([
        'instructor', 'course_administrator', 'exhibitor', 'event_staff', 'kiosk_user',
      ]);
    });
  });

  describe('hasMinimumRole', () => {
    it('should return true when user role meets requirement', () => {
      expect(hasMinimumRole('admin', 'admin')).toBe(true);
    });

    it('should return true when user role exceeds requirement', () => {
      expect(hasMinimumRole('super_admin', 'editor')).toBe(true);
    });

    it('should return false when user role is below requirement', () => {
      expect(hasMinimumRole('viewer', 'editor')).toBe(false);
    });

    it('should return true for customer requiring customer', () => {
      expect(hasMinimumRole('customer', 'customer')).toBe(true);
    });

    it('should return false for scoped roles against any global role', () => {
      expect(hasMinimumRole('instructor', 'customer')).toBe(false);
      expect(hasMinimumRole('course_administrator', 'viewer')).toBe(false);
      expect(hasMinimumRole('exhibitor', 'customer')).toBe(false);
      expect(hasMinimumRole('event_staff', 'customer')).toBe(false);
      expect(hasMinimumRole('kiosk_user', 'customer')).toBe(false);
    });

    it('should return true for super_admin against any global role', () => {
      expect(hasMinimumRole('super_admin', 'customer')).toBe(true);
      expect(hasMinimumRole('super_admin', 'viewer')).toBe(true);
      expect(hasMinimumRole('super_admin', 'editor')).toBe(true);
      expect(hasMinimumRole('super_admin', 'store_manager')).toBe(true);
      expect(hasMinimumRole('super_admin', 'admin')).toBe(true);
      expect(hasMinimumRole('super_admin', 'super_admin')).toBe(true);
    });

    it('should handle editor vs store_manager correctly', () => {
      expect(hasMinimumRole('editor', 'store_manager')).toBe(false);
      expect(hasMinimumRole('store_manager', 'editor')).toBe(true);
    });
  });

  describe('isGlobalRole', () => {
    it('should return true for global roles', () => {
      expect(isGlobalRole('customer')).toBe(true);
      expect(isGlobalRole('admin')).toBe(true);
      expect(isGlobalRole('super_admin')).toBe(true);
    });

    it('should return false for scoped roles', () => {
      expect(isGlobalRole('instructor')).toBe(false);
      expect(isGlobalRole('course_administrator')).toBe(false);
      expect(isGlobalRole('kiosk_user')).toBe(false);
    });
  });

  describe('isScopedRole', () => {
    it('should return true for scoped roles', () => {
      expect(isScopedRole('instructor')).toBe(true);
      expect(isScopedRole('course_administrator')).toBe(true);
      expect(isScopedRole('exhibitor')).toBe(true);
      expect(isScopedRole('event_staff')).toBe(true);
      expect(isScopedRole('kiosk_user')).toBe(true);
    });

    it('should return false for global roles', () => {
      expect(isScopedRole('customer')).toBe(false);
      expect(isScopedRole('admin')).toBe(false);
    });
  });

  describe('getRoleDisplayName', () => {
    it('should return display names for global roles', () => {
      expect(getRoleDisplayName('customer')).toBe('Customer');
      expect(getRoleDisplayName('viewer')).toBe('Viewer');
      expect(getRoleDisplayName('editor')).toBe('Editor');
      expect(getRoleDisplayName('store_manager')).toBe('Store Manager');
      expect(getRoleDisplayName('admin')).toBe('Administrator');
      expect(getRoleDisplayName('super_admin')).toBe('Super Administrator');
    });

    it('should return display names for scoped roles', () => {
      expect(getRoleDisplayName('instructor')).toBe('Instructor');
      expect(getRoleDisplayName('course_administrator')).toBe('Course Administrator');
      expect(getRoleDisplayName('exhibitor')).toBe('Exhibitor');
      expect(getRoleDisplayName('event_staff')).toBe('Event Staff');
      expect(getRoleDisplayName('kiosk_user')).toBe('Kiosk User');
    });
  });
});
