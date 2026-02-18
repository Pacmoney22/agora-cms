// Service URLs — in production, set these to the Kong gateway URL (http://localhost:8000).
// In dev, they default directly to each NestJS service so Docker/Kong isn't required.
const CONTENT_API = process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:3001';
const COMMERCE_API = process.env.NEXT_PUBLIC_COMMERCE_API_URL || 'http://localhost:3002';
const COURSE_API = process.env.NEXT_PUBLIC_COURSE_API_URL || 'http://localhost:3005';
const EVENTS_API = process.env.NEXT_PUBLIC_EVENTS_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

/** Try to refresh the access token using the stored refresh token. */
async function tryRefreshToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${CONTENT_API}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newAccess = data.accessToken ?? data.access_token;
    const newRefresh = data.refreshToken ?? data.refresh_token;
    if (newAccess) localStorage.setItem('auth_token', newAccess);
    if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
    return newAccess ?? null;
  } catch {
    return null;
  }
}

async function apiFetch<T>(
  baseUrl: string,
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${baseUrl}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) searchParams.set(key, String(value));
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const buildHeaders = (authToken: string | null) => ({
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(fetchOptions.headers as Record<string, string>),
  });

  const res = await fetch(url, {
    ...fetchOptions,
    headers: buildHeaders(token),
  });

  // On 401, attempt token refresh and retry once
  if (res.status === 401) {
    const freshToken = await tryRefreshToken();
    if (freshToken) {
      const retry = await fetch(url, {
        ...fetchOptions,
        headers: buildHeaders(freshToken),
      });
      if (!retry.ok) {
        const body = await retry.json().catch(() => ({}));
        throw new Error(body.message || `API error: ${retry.status}`);
      }
      if (retry.status === 204) return undefined as T;
      return retry.json();
    }
    // Refresh failed — clear stale tokens and throw
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Convenience wrappers for each service
function contentFetch<T>(path: string, options: FetchOptions = {}) {
  return apiFetch<T>(CONTENT_API, path, options);
}

function commerceFetch<T>(path: string, options: FetchOptions = {}) {
  return apiFetch<T>(COMMERCE_API, path, options);
}

function courseFetch<T>(path: string, options: FetchOptions = {}) {
  return apiFetch<T>(COURSE_API, path, options);
}

function eventsFetch<T>(path: string, options: FetchOptions = {}) {
  return apiFetch<T>(EVENTS_API, path, options);
}

// Pages
export const pagesApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    contentFetch<{ data: any[]; meta: any }>('/api/v1/pages', { params }),
  get: (id: string) => contentFetch<any>(`/api/v1/pages/${id}`),
  create: (data: any) =>
    contentFetch<any>('/api/v1/pages', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    contentFetch<any>(`/api/v1/pages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    contentFetch<void>(`/api/v1/pages/${id}`, { method: 'DELETE' }),
  publish: (id: string) =>
    contentFetch<any>(`/api/v1/pages/${id}/publish`, { method: 'POST' }),
  unpublish: (id: string) =>
    contentFetch<any>(`/api/v1/pages/${id}/unpublish`, { method: 'POST' }),
};

// Media
export const mediaApi = {
  list: (params?: { page?: number; limit?: number; mimeType?: string }) =>
    contentFetch<{ data: any[]; meta: any }>('/api/v1/media', { params }),
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(`${CONTENT_API}/api/v1/media/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  },
  delete: (id: string) =>
    contentFetch<void>(`/api/v1/media/${id}`, { method: 'DELETE' }),
};

// Navigation
export const navigationApi = {
  list: () => contentFetch<any[]>('/api/v1/navigation'),
  get: (location: string) => contentFetch<any>(`/api/v1/navigation/${location}`),
  upsert: (location: string, items: any[]) =>
    contentFetch<any>(`/api/v1/navigation/${location}`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),
};

// Redirects
export const redirectsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    contentFetch<{ data: any[]; meta: any }>('/api/v1/redirects', { params }),
  create: (data: { fromPath: string; toPath: string; statusCode?: number }) =>
    contentFetch<any>('/api/v1/redirects', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    contentFetch<void>(`/api/v1/redirects/${id}`, { method: 'DELETE' }),
};

// SEO
export const seoApi = {
  getPageSeo: (pageId: string) => contentFetch<any>(`/api/v1/seo/page/${pageId}`),
  updatePageSeo: (pageId: string, seo: any) =>
    contentFetch<any>(`/api/v1/seo/page/${pageId}`, { method: 'PUT', body: JSON.stringify(seo) }),
  getSitemap: () => contentFetch<any[]>('/api/v1/seo/sitemap'),
  analyze: (pageId: string) =>
    contentFetch<{
      pageId: string;
      overallScore: number;
      grade: 'A' | 'B' | 'C' | 'D' | 'F';
      checks: Array<{ check: string; status: 'pass' | 'warning' | 'fail'; message: string; score: number; maxScore: number }>;
      suggestions: string[];
    }>(`/api/v1/seo/analyze/${pageId}`),
};

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    contentFetch<{ user: any; accessToken: string; refreshToken: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => contentFetch<any>('/api/v1/auth/me'),
  refresh: (refreshToken: string) =>
    contentFetch<{ accessToken: string; refreshToken: string }>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};

// Users
export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string; role?: string; isActive?: string }) =>
    contentFetch<{ data: any[]; meta: any }>('/api/v1/users', { params }),
  get: (id: string) => contentFetch<any>(`/api/v1/users/${id}`),
  update: (id: string, data: { name?: string; role?: string; isActive?: boolean }) =>
    contentFetch<any>(`/api/v1/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  unlock: (id: string) =>
    contentFetch<any>(`/api/v1/users/${id}/unlock`, { method: 'POST' }),
};

// Settings
export const settingsApi = {
  getAll: () => contentFetch<Record<string, any>>('/api/v1/settings'),
  get: (key: string) => contentFetch<any>(`/api/v1/settings/${key}`),
  update: (key: string, value: Record<string, any>) =>
    contentFetch<any>(`/api/v1/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify(value),
    }),
  getPublic: () => contentFetch<Record<string, any>>('/api/v1/settings/public'),
};

// Courses
export const coursesApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    courseFetch<{ data: any[]; meta: any }>('/api/v1/courses', { params }),
  get: (id: string) => courseFetch<any>(`/api/v1/courses/${id}`),
  create: (data: any) =>
    courseFetch<any>('/api/v1/courses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    courseFetch<any>(`/api/v1/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    courseFetch<void>(`/api/v1/courses/${id}`, { method: 'DELETE' }),
  publish: (id: string) =>
    courseFetch<any>(`/api/v1/courses/${id}/publish`, { method: 'POST' }),

  // Sections
  listSections: (courseId: string) =>
    courseFetch<any[]>(`/api/v1/courses/${courseId}/sections`),
  createSection: (courseId: string, data: any) =>
    courseFetch<any>(`/api/v1/courses/${courseId}/sections`, { method: 'POST', body: JSON.stringify(data) }),
  updateSection: (sectionId: string, data: any) =>
    courseFetch<any>(`/api/v1/courses/sections/${sectionId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSection: (sectionId: string) =>
    courseFetch<void>(`/api/v1/courses/sections/${sectionId}`, { method: 'DELETE' }),

  // Lessons
  listLessons: (sectionId: string) =>
    courseFetch<any[]>(`/api/v1/sections/${sectionId}/lessons`),
  createLesson: (sectionId: string, data: any) =>
    courseFetch<any>(`/api/v1/sections/${sectionId}/lessons`, { method: 'POST', body: JSON.stringify(data) }),
  updateLesson: (lessonId: string, data: any) =>
    courseFetch<any>(`/api/v1/lessons/${lessonId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLesson: (lessonId: string) =>
    courseFetch<void>(`/api/v1/lessons/${lessonId}`, { method: 'DELETE' }),

  // Quizzes
  listQuizzes: (lessonId: string) =>
    courseFetch<any[]>(`/api/v1/lessons/${lessonId}/quizzes`),
  createQuiz: (lessonId: string, data: any) =>
    courseFetch<any>(`/api/v1/lessons/${lessonId}/quizzes`, { method: 'POST', body: JSON.stringify(data) }),
  getQuiz: (quizId: string) =>
    courseFetch<any>(`/api/v1/quizzes/${quizId}`),
  updateQuiz: (quizId: string, data: any) =>
    courseFetch<any>(`/api/v1/quizzes/${quizId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuiz: (quizId: string) =>
    courseFetch<void>(`/api/v1/quizzes/${quizId}`, { method: 'DELETE' }),

  // Questions
  createQuestion: (quizId: string, data: any) =>
    courseFetch<any>(`/api/v1/quizzes/${quizId}/questions`, { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (questionId: string, data: any) =>
    courseFetch<any>(`/api/v1/questions/${questionId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuestion: (questionId: string) =>
    courseFetch<void>(`/api/v1/questions/${questionId}`, { method: 'DELETE' }),

  // Grading
  getPendingGrading: (instructorId?: string) =>
    courseFetch<any[]>('/api/v1/grading/pending', { params: { instructorId } }),
  gradeEssay: (attemptId: string, data: { pointsAwarded: number; gradedBy: string; feedback?: string }) =>
    courseFetch<any>(`/api/v1/attempts/${attemptId}/grade`, { method: 'POST', body: JSON.stringify(data) }),

  // Assignment Submissions
  getPendingSubmissions: (instructorId?: string) =>
    courseFetch<any[]>('/api/v1/grading/pending-submissions', { params: { instructorId } }),
  getSubmission: (id: string) =>
    courseFetch<any>(`/api/v1/submissions/${id}`),
  gradeSubmission: (id: string, data: { score: number; feedback?: string; gradedBy: string; status?: 'graded' | 'returned' }) =>
    courseFetch<any>(`/api/v1/submissions/${id}/grade`, { method: 'POST', body: JSON.stringify(data) }),
};

// Enrollments
export const enrollmentsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; courseId?: string; userId?: string }) =>
    courseFetch<{ data: any[]; meta: any }>('/api/v1/enrollments', { params }),
  get: (id: string) => courseFetch<any>(`/api/v1/enrollments/${id}`),
  create: (data: { userId: string; courseId: string; orderId?: string; expiresAt?: string }) =>
    courseFetch<any>('/api/v1/enrollments', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id: string) =>
    courseFetch<any>(`/api/v1/enrollments/${id}/cancel`, { method: 'POST' }),
  complete: (id: string) =>
    courseFetch<any>(`/api/v1/enrollments/${id}/complete`, { method: 'POST' }),
};

// Certificates
export const certificatesApi = {
  list: (params?: { page?: number; limit?: number; courseId?: string; userId?: string }) =>
    courseFetch<{ data: any[]; meta: any }>('/api/v1/certificates', { params }),
  getByEnrollment: (enrollmentId: string) =>
    courseFetch<any>(`/api/v1/certificates/enrollments/${enrollmentId}`),
  generate: (enrollmentId: string, template?: Record<string, any>) =>
    courseFetch<any>(`/api/v1/certificates/enrollments/${enrollmentId}`, {
      method: 'POST',
      ...(template ? { body: JSON.stringify({ template }), headers: { 'Content-Type': 'application/json' } } : {}),
    }),
  regenerate: (id: string, template?: Record<string, any>) =>
    courseFetch<any>(`/api/v1/certificates/${id}/regenerate`, {
      method: 'POST',
      ...(template ? { body: JSON.stringify({ template }), headers: { 'Content-Type': 'application/json' } } : {}),
    }),
  verify: (code: string) =>
    courseFetch<any>(`/api/v1/certificates/verify/${code}`),
  getByUser: (userId: string) =>
    courseFetch<any[]>(`/api/v1/certificates/user/${userId}`),
};

// Products
export const productsApi = {
  list: (params?: { page?: number; limit?: number; type?: string; status?: string; category?: string; search?: string; sortBy?: string; sortOrder?: string }) =>
    commerceFetch<{ data: any[]; meta: any }>('/api/v1/products', { params }),
  get: (id: string) => commerceFetch<any>(`/api/v1/products/${id}`),
  create: (data: any) =>
    commerceFetch<any>('/api/v1/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    commerceFetch<any>(`/api/v1/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    commerceFetch<void>(`/api/v1/products/${id}`, { method: 'DELETE' }),
  listVariants: (id: string) =>
    commerceFetch<any[]>(`/api/v1/products/${id}/variants`),
  createVariant: (id: string, data: any) =>
    commerceFetch<any>(`/api/v1/products/${id}/variants`, { method: 'POST', body: JSON.stringify(data) }),
  updateVariant: (id: string, variantId: string, data: any) =>
    commerceFetch<any>(`/api/v1/products/${id}/variants/${variantId}`, { method: 'PUT', body: JSON.stringify(data) }),
  generateVariants: (id: string, data?: { skuPattern?: string }) =>
    commerceFetch<any[]>(`/api/v1/products/${id}/variants/generate`, { method: 'POST', body: JSON.stringify(data || {}) }),
};

// Orders
export const ordersApi = {
  list: (params?: { page?: number; limit?: number; status?: string; userId?: string; sortBy?: string; sortOrder?: string }) =>
    commerceFetch<{ data: any[]; meta: any }>('/api/v1/orders', { params }),
  get: (id: string) => commerceFetch<any>(`/api/v1/orders/${id}`),
  refund: (id: string, data?: { reason?: string }) =>
    commerceFetch<any>(`/api/v1/orders/${id}/refund`, { method: 'POST', body: JSON.stringify(data || {}) }),
  fulfill: (id: string, data?: { trackingNumber?: string; carrier?: string }) =>
    commerceFetch<any>(`/api/v1/orders/${id}/fulfill`, { method: 'POST', body: JSON.stringify(data || {}) }),
};

// Categories
export const categoriesApi = {
  list: (params?: { page?: number; limit?: number; parentId?: string }) =>
    commerceFetch<{ data: any[]; meta: any }>('/api/v1/categories', { params }),
  tree: () => commerceFetch<any[]>('/api/v1/categories/tree'),
  get: (id: string) => commerceFetch<any>(`/api/v1/categories/${id}`),
  create: (data: any) =>
    commerceFetch<any>('/api/v1/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    commerceFetch<any>(`/api/v1/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    commerceFetch<void>(`/api/v1/categories/${id}`, { method: 'DELETE' }),
};

// Coupons
export const couponsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    commerceFetch<{ data: any[]; meta: any }>('/api/v1/coupons', { params }),
  get: (id: string) => commerceFetch<any>(`/api/v1/coupons/${id}`),
  create: (data: any) =>
    commerceFetch<any>('/api/v1/coupons', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    commerceFetch<any>(`/api/v1/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    commerceFetch<void>(`/api/v1/coupons/${id}`, { method: 'DELETE' }),
  validate: (code: string, context: { subtotal: number; productIds?: string[] }) =>
    commerceFetch<{ valid: boolean; discount: number; message?: string }>(`/api/v1/coupons/validate/${code}`, { method: 'POST', body: JSON.stringify(context) }),
};

// Events
export const eventsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; type?: string; search?: string }) =>
    eventsFetch<{ data: any[]; meta: any }>('/api/v1/events', { params }),
  get: (id: string) => eventsFetch<any>(`/api/v1/events/${id}`),
  create: (data: any) =>
    eventsFetch<any>('/api/v1/events', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    eventsFetch<any>(`/api/v1/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    eventsFetch<void>(`/api/v1/events/${id}`, { method: 'DELETE' }),
  publish: (id: string) =>
    eventsFetch<any>(`/api/v1/events/${id}/publish`, { method: 'POST' }),
  cancel: (id: string) =>
    eventsFetch<any>(`/api/v1/events/${id}/cancel`, { method: 'POST' }),
  duplicate: (id: string) =>
    eventsFetch<any>(`/api/v1/events/${id}/duplicate`, { method: 'POST' }),

  // Ticket Types
  listTicketTypes: (eventId: string) =>
    eventsFetch<any[]>(`/api/v1/events/${eventId}/ticket-types`),
  createTicketType: (eventId: string, data: any) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/ticket-types`, { method: 'POST', body: JSON.stringify(data) }),
  updateTicketType: (eventId: string, ticketTypeId: string, data: any) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/ticket-types/${ticketTypeId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTicketType: (eventId: string, ticketTypeId: string) =>
    eventsFetch<void>(`/api/v1/events/${eventId}/ticket-types/${ticketTypeId}`, { method: 'DELETE' }),

  // Attendees
  listAttendees: (eventId: string, params?: { page?: number; limit?: number; status?: string; ticketTypeId?: string }) =>
    eventsFetch<{ data: any[]; meta: any }>(`/api/v1/events/${eventId}/attendees`, { params }),
  checkIn: (eventId: string, attendeeId: string) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/attendees/${attendeeId}/check-in`, { method: 'POST' }),
  checkOut: (eventId: string, attendeeId: string) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/attendees/${attendeeId}/check-out`, { method: 'POST' }),

  // Waitlist
  listWaitlist: (eventId: string) =>
    eventsFetch<any[]>(`/api/v1/events/${eventId}/waitlist`),
  promoteWaitlist: (eventId: string, waitlistId: string) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/waitlist/${waitlistId}/promote`, { method: 'POST' }),

  // Sessions (Conference / Breakout)
  listSessions: (eventId: string) =>
    eventsFetch<any[]>(`/api/v1/events/${eventId}/sessions`),
  createSession: (eventId: string, data: any) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/sessions`, { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (eventId: string, sessionId: string, data: any) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/sessions/${sessionId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSession: (eventId: string, sessionId: string) =>
    eventsFetch<void>(`/api/v1/events/${eventId}/sessions/${sessionId}`, { method: 'DELETE' }),

  // Sponsors
  listSponsors: (eventId: string) =>
    eventsFetch<any[]>(`/api/v1/events/${eventId}/sponsors`),
  createSponsor: (eventId: string, data: any) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/sponsors`, { method: 'POST', body: JSON.stringify(data) }),
  updateSponsor: (eventId: string, sponsorId: string, data: any) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/sponsors/${sponsorId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSponsor: (eventId: string, sponsorId: string) =>
    eventsFetch<void>(`/api/v1/events/${eventId}/sponsors/${sponsorId}`, { method: 'DELETE' }),

  // Surveys
  listSurveys: (eventId: string) =>
    eventsFetch<any[]>(`/api/v1/events/${eventId}/surveys`),
  createSurvey: (eventId: string, data: any) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/surveys`, { method: 'POST', body: JSON.stringify(data) }),
  updateSurvey: (eventId: string, surveyId: string, data: any) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/surveys/${surveyId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSurvey: (eventId: string, surveyId: string) =>
    eventsFetch<void>(`/api/v1/events/${eventId}/surveys/${surveyId}`, { method: 'DELETE' }),
  getSurveyResponses: (eventId: string, surveyId: string) =>
    eventsFetch<any[]>(`/api/v1/events/${eventId}/surveys/${surveyId}/responses`),

  // Venues
  listVenues: (params?: { page?: number; limit?: number; search?: string }) =>
    eventsFetch<{ data: any[]; meta: any }>('/api/v1/venues', { params }),
  getVenue: (id: string) => eventsFetch<any>(`/api/v1/venues/${id}`),
  createVenue: (data: any) =>
    eventsFetch<any>('/api/v1/venues', { method: 'POST', body: JSON.stringify(data) }),
  updateVenue: (id: string, data: any) =>
    eventsFetch<any>(`/api/v1/venues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVenue: (id: string) =>
    eventsFetch<void>(`/api/v1/venues/${id}`, { method: 'DELETE' }),

  // Badges
  getBadgeTemplate: (eventId: string) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/badge-template`),
  updateBadgeTemplate: (eventId: string, data: any) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/badge-template`, { method: 'PUT', body: JSON.stringify(data) }),
  printBadges: (eventId: string, attendeeIds: string[]) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/badges/print`, { method: 'POST', body: JSON.stringify({ attendeeIds }) }),

  // Self-Check-In
  selfCheckIn: (eventId: string, data: { email?: string; qrCode?: string; confirmationCode?: string }) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/self-check-in`, { method: 'POST', body: JSON.stringify(data) }),
  getCheckInConfig: (eventId: string) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/check-in-config`),

  // Session Attendance (badge scanning)
  checkInToSession: (eventId: string, sessionId: string, attendeeId: string) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/sessions/${sessionId}/attendance`, { method: 'POST', body: JSON.stringify({ attendeeId }) }),
  getSessionAttendance: (eventId: string, sessionId: string) =>
    eventsFetch<any[]>(`/api/v1/events/${eventId}/sessions/${sessionId}/attendance`),
  scanBadge: (eventId: string, data: { qrCode: string; context: 'event' | 'session' | 'exhibitor'; sessionId?: string; exhibitorId?: string }) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/scan`, { method: 'POST', body: JSON.stringify(data) }),

  // Exhibitor Lead Capture
  exhibitorScanLead: (eventId: string, exhibitorId: string, data: { qrCode?: string; attendeeId?: string; notes?: string; rating?: number }) =>
    eventsFetch<any>(`/api/v1/events/${eventId}/exhibitors/${exhibitorId}/leads`, { method: 'POST', body: JSON.stringify(data) }),
  getExhibitorLeads: (eventId: string, exhibitorId: string) =>
    eventsFetch<any[]>(`/api/v1/events/${eventId}/exhibitors/${exhibitorId}/leads`),
  exportExhibitorLeads: (eventId: string, exhibitorId: string, format: 'csv' | 'json') =>
    eventsFetch<any>(`/api/v1/events/${eventId}/exhibitors/${exhibitorId}/leads/export?format=${format}`),
};

// Articles
export const articlesApi = {
  list: (params?: { page?: number; limit?: number; status?: string; category?: string; search?: string }) =>
    contentFetch<{ data: any[]; meta: any }>('/api/v1/articles', { params }),
  get: (id: string) => contentFetch<any>(`/api/v1/articles/${id}`),
  create: (data: any) =>
    contentFetch<any>('/api/v1/articles', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    contentFetch<any>(`/api/v1/articles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    contentFetch<void>(`/api/v1/articles/${id}`, { method: 'DELETE' }),
};

// Comments
export const commentsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; articleId?: string; search?: string }) =>
    contentFetch<{ data: any[]; meta: any }>('/api/v1/comments', { params }),
  get: (id: string) => contentFetch<any>(`/api/v1/comments/${id}`),
  approve: (id: string) =>
    contentFetch<any>(`/api/v1/comments/${id}/approve`, { method: 'POST' }),
  reject: (id: string) =>
    contentFetch<any>(`/api/v1/comments/${id}/reject`, { method: 'POST' }),
  spam: (id: string) =>
    contentFetch<any>(`/api/v1/comments/${id}/spam`, { method: 'POST' }),
  delete: (id: string) =>
    contentFetch<void>(`/api/v1/comments/${id}`, { method: 'DELETE' }),
  reply: (id: string, data: { content: string; authorName: string }) =>
    contentFetch<any>(`/api/v1/comments/${id}/reply`, { method: 'POST', body: JSON.stringify(data) }),
  bulkAction: (ids: string[], action: 'approve' | 'reject' | 'spam' | 'delete') =>
    contentFetch<any>('/api/v1/comments/bulk', { method: 'POST', body: JSON.stringify({ ids, action }) }),
  stats: () =>
    contentFetch<{ pending: number; approved: number; spam: number; total: number }>('/api/v1/comments/stats'),
};

// Reviews (product & course reviews)
export const reviewsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; type?: string; rating?: number; search?: string }) =>
    contentFetch<{ data: any[]; meta: any }>('/api/v1/reviews', { params }),
  get: (id: string) => contentFetch<any>(`/api/v1/reviews/${id}`),
  approve: (id: string) =>
    contentFetch<any>(`/api/v1/reviews/${id}/approve`, { method: 'POST' }),
  reject: (id: string) =>
    contentFetch<any>(`/api/v1/reviews/${id}/reject`, { method: 'POST' }),
  flag: (id: string) =>
    contentFetch<any>(`/api/v1/reviews/${id}/flag`, { method: 'POST' }),
  delete: (id: string) =>
    contentFetch<void>(`/api/v1/reviews/${id}`, { method: 'DELETE' }),
  reply: (id: string, data: { content: string }) =>
    contentFetch<any>(`/api/v1/reviews/${id}/reply`, { method: 'POST', body: JSON.stringify(data) }),
  bulkAction: (ids: string[], action: 'approve' | 'reject' | 'flag' | 'delete') =>
    contentFetch<any>('/api/v1/reviews/bulk', { method: 'POST', body: JSON.stringify({ ids, action }) }),
  stats: () =>
    contentFetch<{ pending: number; approved: number; flagged: number; total: number; averageRating: number }>('/api/v1/reviews/stats'),
};

// Assignments (scoped role management)
export const assignmentsApi = {
  // Instructor assignments (course-service)
  getInstructorAssignments: (userId: string) =>
    courseFetch<any[]>(`/api/v1/assignments/instructors/user/${userId}`),
  createInstructorAssignment: (data: { userId: string; courseSectionId: string }) =>
    courseFetch<any>('/api/v1/assignments/instructors', { method: 'POST', body: JSON.stringify(data) }),
  deleteInstructorAssignment: (assignmentId: string) =>
    courseFetch<void>(`/api/v1/assignments/instructors/${assignmentId}`, { method: 'DELETE' }),

  // Event staff assignments (content-service)
  getEventStaffAssignments: (userId: string) =>
    contentFetch<any[]>(`/api/v1/assignments/event-staff/user/${userId}`),
  createEventStaffAssignment: (data: { userId: string; eventId: string }) =>
    contentFetch<any>('/api/v1/assignments/event-staff', { method: 'POST', body: JSON.stringify(data) }),
  deleteEventStaffAssignment: (assignmentId: string) =>
    contentFetch<void>(`/api/v1/assignments/event-staff/${assignmentId}`, { method: 'DELETE' }),

  // Exhibitor assignments (content-service)
  getExhibitorAssignments: (userId: string) =>
    contentFetch<any[]>(`/api/v1/assignments/exhibitors/user/${userId}`),
  createExhibitorAssignment: (data: { userId: string; eventId: string; boothNumber?: string }) =>
    contentFetch<any>('/api/v1/assignments/exhibitors', { method: 'POST', body: JSON.stringify(data) }),
  deleteExhibitorAssignment: (assignmentId: string) =>
    contentFetch<void>(`/api/v1/assignments/exhibitors/${assignmentId}`, { method: 'DELETE' }),

  // Kiosk assignments (content-service)
  getKioskAssignments: (userId: string) =>
    contentFetch<any[]>(`/api/v1/assignments/kiosks/user/${userId}`),
  createKioskAssignment: (data: { userId: string; eventId: string; kioskIdentifier: string }) =>
    contentFetch<any>('/api/v1/assignments/kiosks', { method: 'POST', body: JSON.stringify(data) }),
  deleteKioskAssignment: (assignmentId: string) =>
    contentFetch<void>(`/api/v1/assignments/kiosks/${assignmentId}`, { method: 'DELETE' }),
};

// Email Templates
export const emailTemplatesApi = {
  list: (params?: { category?: string; status?: string; search?: string }) =>
    contentFetch<any[]>('/api/v1/email-templates', { params }),
  get: (id: string) => contentFetch<any>(`/api/v1/email-templates/${id}`),
  create: (data: any) =>
    contentFetch<any>('/api/v1/email-templates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    contentFetch<any>(`/api/v1/email-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    contentFetch<void>(`/api/v1/email-templates/${id}`, { method: 'DELETE' }),
  duplicate: (id: string) =>
    contentFetch<any>(`/api/v1/email-templates/${id}/duplicate`, { method: 'POST' }),
  preview: (id: string) =>
    contentFetch<{ html: string; text: string }>(`/api/v1/email-templates/${id}/preview`),
  sendTest: (id: string, email: string) =>
    contentFetch<any>(`/api/v1/email-templates/${id}/test`, { method: 'POST', body: JSON.stringify({ email }) }),
  resetToDefault: (id: string) =>
    contentFetch<any>(`/api/v1/email-templates/${id}/reset`, { method: 'POST' }),
  getDefaults: () =>
    contentFetch<any[]>('/api/v1/email-templates/defaults'),
};
