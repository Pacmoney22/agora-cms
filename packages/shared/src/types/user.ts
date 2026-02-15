export type GlobalRole = 'customer' | 'viewer' | 'editor' | 'store_manager' | 'admin' | 'super_admin';
export type ScopedRole = 'instructor' | 'course_administrator' | 'exhibitor' | 'event_staff' | 'kiosk_user';
export type UserRole = GlobalRole | ScopedRole;

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface InstructorAssignment {
  id: string;
  userId: string;
  courseSectionId: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventStaffAssignment {
  id: string;
  userId: string;
  eventId: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExhibitorAssignment {
  id: string;
  userId: string;
  eventId: string;
  boothNumber?: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KioskAssignment {
  id: string;
  userId: string;
  eventId: string;
  kioskIdentifier: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}
