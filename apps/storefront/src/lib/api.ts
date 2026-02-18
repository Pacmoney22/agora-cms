import type {
  ProductDto,
  ProductType,
  CartDto,
  OrderDto,
  Address,
} from '@agora-cms/shared';

// ---------------------------------------------------------------------------
// Service-specific base URLs (bypass Kong in dev mode)
// ---------------------------------------------------------------------------

const COMMERCE_API =
  process.env.NEXT_PUBLIC_COMMERCE_API_URL || 'http://localhost:3002';
const COURSE_API =
  process.env.NEXT_PUBLIC_COURSE_API_URL || 'http://localhost:3005';
const CONTENT_API =
  process.env.NEXT_PUBLIC_CONTENT_API_URL || 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Shared response types
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  image: string | null;
  sortOrder: number;
  status: 'active' | 'inactive';
  seo: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `API ${init?.method ?? 'GET'} ${path} failed (${res.status}): ${body}`,
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json();
}

function commerceFetch<T>(path: string, init?: RequestInit) {
  return apiFetch<T>(COMMERCE_API, path, init);
}

function courseFetch<T>(path: string, init?: RequestInit) {
  return apiFetch<T>(COURSE_API, path, init);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface ListProductsParams {
  search?: string;
  type?: ProductType;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
}

export async function listProducts(
  params?: ListProductsParams,
): Promise<PaginatedResponse<ProductDto>> {
  const sp = new URLSearchParams();
  if (params?.search) sp.set('search', params.search);
  if (params?.type) sp.set('type', params.type);
  if (params?.category) sp.set('category', params.category);
  if (params?.minPrice !== undefined) sp.set('minPrice', String(params.minPrice));
  if (params?.maxPrice !== undefined) sp.set('maxPrice', String(params.maxPrice));
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.sortBy) sp.set('sortBy', params.sortBy);
  if (params?.sortOrder) sp.set('sortOrder', params.sortOrder);
  if (params?.status) sp.set('status', params.status);

  const qs = sp.toString();
  return commerceFetch<PaginatedResponse<ProductDto>>(
    `/api/v1/products${qs ? `?${qs}` : ''}`,
    { cache: 'no-store' },
  );
}

export async function getProduct(id: string): Promise<ProductDto> {
  return commerceFetch<ProductDto>(`/api/v1/products/${id}`, {
    next: { revalidate: 60 },
  });
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listCategories(): Promise<PaginatedResponse<CategoryDto>> {
  return commerceFetch<PaginatedResponse<CategoryDto>>(
    '/api/v1/categories?limit=100',
    { cache: 'no-store' },
  );
}

// ---------------------------------------------------------------------------
// Cart  (uses x-cart-id header per the CartController)
// ---------------------------------------------------------------------------

export async function getCart(cartId: string): Promise<CartDto> {
  return commerceFetch<CartDto>('/api/v1/cart', {
    cache: 'no-store',
    headers: { 'x-cart-id': cartId },
  });
}

export async function addCartItem(
  cartId: string,
  productId: string,
  quantity: number,
  variantId?: string,
): Promise<CartDto> {
  return commerceFetch<CartDto>('/api/v1/cart/items', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'x-cart-id': cartId },
    body: JSON.stringify({ productId, quantity, variantId }),
  });
}

export async function updateCartItem(
  cartId: string,
  cartItemId: string,
  quantity: number,
): Promise<CartDto> {
  return commerceFetch<CartDto>(`/api/v1/cart/items/${cartItemId}`, {
    method: 'PUT',
    cache: 'no-store',
    headers: { 'x-cart-id': cartId },
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(
  cartId: string,
  cartItemId: string,
): Promise<CartDto> {
  return commerceFetch<CartDto>(`/api/v1/cart/items/${cartItemId}`, {
    method: 'DELETE',
    cache: 'no-store',
    headers: { 'x-cart-id': cartId },
  });
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export interface CheckoutPayload {
  cartId: string;
  guestEmail?: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  notes?: string;
}

export async function processCheckout(
  payload: CheckoutPayload,
): Promise<OrderDto> {
  return commerceFetch<OrderDto>('/api/v1/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export interface CourseDto {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  courseMetadata: any;
  thumbnailUrl: string | null;
  instructorName: string | null;
  instructorBio: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sections?: CourseSectionDto[];
}

export interface CourseSectionDto {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  position: number;
  lessons: CourseLessonDto[];
}

export interface CourseLessonDto {
  id: string;
  courseSectionId: string;
  title: string;
  lessonType: string;
  content: string;
  videoUrl: string | null;
  videoProvider: string | null;
  videoDuration: number | null;
  attachments: any;
  position: number;
  isFree: boolean;
}

export interface EnrollmentDto {
  id: string;
  courseId: string;
  userId: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  lastAccessedAt: string | null;
  expiresAt: string | null;
  progressPercent: number;
  course?: CourseDto;
  progress?: CourseProgressDto[];
}

export interface CourseProgressDto {
  id: string;
  enrollmentId: string;
  lessonId: string;
  isCompleted: boolean;
  completedAt: string | null;
  videoProgress: number | null;
  lastViewedAt: string;
}

export interface QuizDto {
  id: string;
  lessonId: string;
  title: string;
  description: string | null;
  quizConfig: any;
  position: number;
  questions: QuizQuestionDto[];
}

export interface QuizQuestionDto {
  id: string;
  quizId: string;
  questionType: string;
  questionText: string;
  questionData: any;
  points: number;
  position: number;
}

export interface QuizAttemptDto {
  id: string;
  quizId: string;
  enrollmentId: string;
  attemptNumber: number;
  answers: any;
  score: number | null;
  totalPoints: number;
  passed: boolean | null;
  startedAt: string;
  completedAt: string;
  gradingStatus: string;
}

export interface SectionOfferingDto {
  id: string;
  courseId: string;
  courseName: string;
  name: string;
  code: string;
  deliveryMode: 'on_demand' | 'scheduled';
  status: 'active' | 'inactive' | 'completed' | 'upcoming';
  instructorId: string;
  instructorName: string;
  description: string;
  maxEnrollment: number;
  currentEnrollment: number;
  schedule: {
    startDate: string;
    endDate: string;
    daysOfWeek: string[];
    startTime: string;
    endTime: string;
    timezone: string;
    location: string;
    recurrence: string;
    notes: string;
  };
  enrollmentOpen: boolean;
  enrollmentDeadline: string;
}

export async function getCourseSectionOfferings(courseId: string): Promise<SectionOfferingDto[]> {
  try {
    const res = await fetch(`${CONTENT_API}/api/v1/settings/public`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const settings = await res.json();
    const allSections: SectionOfferingDto[] = settings.courseSections ?? [];
    return allSections.filter(
      (s) =>
        s.courseId === courseId &&
        (s.status === 'active' || s.status === 'upcoming') &&
        s.enrollmentOpen,
    );
  } catch {
    return [];
  }
}

export async function listCourses(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<CourseDto>> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.search) sp.set('search', params.search);

  const qs = sp.toString();
  return courseFetch<PaginatedResponse<CourseDto>>(
    `/api/v1/courses${qs ? `?${qs}` : ''}`,
    { cache: 'no-store' },
  );
}

export async function getCourseBySlug(slug: string): Promise<CourseDto> {
  return courseFetch<CourseDto>(`/api/v1/courses/slug/${slug}`, {
    next: { revalidate: 60 },
  });
}

export async function getCourse(id: string): Promise<CourseDto> {
  return courseFetch<CourseDto>(`/api/v1/courses/${id}`, {
    cache: 'no-store',
  });
}

export async function getEnrollment(enrollmentId: string): Promise<EnrollmentDto> {
  return courseFetch<EnrollmentDto>(`/api/v1/enrollments/${enrollmentId}`, {
    cache: 'no-store',
  });
}

export async function updateLessonProgress(
  enrollmentId: string,
  lessonId: string,
  data: {
    isCompleted?: boolean;
    videoProgress?: number;
  }
): Promise<CourseProgressDto> {
  return courseFetch<CourseProgressDto>(`/api/v1/enrollments/${enrollmentId}/progress`, {
    method: 'PUT',
    body: JSON.stringify({ lessonId, ...data }),
  });
}

export async function getQuiz(quizId: string): Promise<QuizDto> {
  return courseFetch<QuizDto>(`/api/v1/quizzes/${quizId}`, {
    cache: 'no-store',
  });
}

export async function submitQuizAttempt(
  quizId: string,
  enrollmentId: string,
  answers: Array<{ questionId: string; answer: any }>
): Promise<QuizAttemptDto> {
  return courseFetch<QuizAttemptDto>(`/api/v1/quizzes/${quizId}/attempts`, {
    method: 'POST',
    body: JSON.stringify({ enrollmentId, answers }),
  });
}

export async function getQuizAttempts(
  quizId: string,
  enrollmentId: string
): Promise<QuizAttemptDto[]> {
  return courseFetch<QuizAttemptDto[]>(
    `/api/v1/quizzes/${quizId}/attempts/${enrollmentId}`,
    { cache: 'no-store' },
  );
}

export async function getCertificate(enrollmentId: string): Promise<any> {
  return courseFetch<any>(`/api/v1/certificates/${enrollmentId}`, {
    cache: 'no-store',
  });
}

// ---------------------------------------------------------------------------
// Assignment Submissions
// ---------------------------------------------------------------------------

export interface AssignmentSubmissionDto {
  id: string;
  lessonId: string;
  enrollmentId: string;
  submissionNumber: number;
  content: string;
  links: Array<{ url: string; label?: string }> | null;
  score: number | null;
  totalPoints: number;
  passed: boolean | null;
  gradingStatus: 'pending' | 'graded' | 'returned';
  feedback: string | null;
  gradedBy: string | null;
  gradedAt: string | null;
  submittedAt: string;
  updatedAt: string;
}

export async function submitAssignment(
  lessonId: string,
  data: { enrollmentId: string; content: string; links?: Array<{ url: string; label?: string }> },
): Promise<AssignmentSubmissionDto> {
  return courseFetch<AssignmentSubmissionDto>(`/api/v1/lessons/${lessonId}/submissions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAssignmentSubmissions(
  lessonId: string,
  enrollmentId: string,
): Promise<AssignmentSubmissionDto[]> {
  return courseFetch<AssignmentSubmissionDto[]>(
    `/api/v1/lessons/${lessonId}/submissions/${enrollmentId}`,
    { cache: 'no-store' },
  );
}

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

export async function listMyEnrollments(userId: string): Promise<EnrollmentDto[]> {
  return courseFetch<EnrollmentDto[]>(`/api/v1/enrollments?userId=${userId}`, {
    cache: 'no-store',
  });
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export interface ReviewDto {
  id: string;
  courseId: string;
  userId: string;
  userName: string;
  rating: number;
  review: string;
  createdAt: string;
}

export async function listCourseReviews(courseId: string): Promise<ReviewDto[]> {
  return courseFetch<ReviewDto[]>(`/api/v1/courses/${courseId}/reviews`, {
    cache: 'no-store',
  });
}

export async function createCourseReview(
  courseId: string,
  data: { rating: number; review: string; userId: string }
): Promise<ReviewDto> {
  return courseFetch<ReviewDto>(`/api/v1/courses/${courseId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Discussions
// ---------------------------------------------------------------------------

export interface DiscussionReplyDto {
  id: string;
  discussionId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface DiscussionDto {
  id: string;
  lessonId: string;
  userId: string;
  userName: string;
  title: string;
  content: string;
  createdAt: string;
  replies?: DiscussionReplyDto[];
}

export async function listDiscussions(lessonId: string): Promise<DiscussionDto[]> {
  return courseFetch<DiscussionDto[]>(`/api/v1/lessons/${lessonId}/discussions`, {
    cache: 'no-store',
  });
}

export async function createDiscussion(
  lessonId: string,
  data: { title: string; content: string; userId: string }
): Promise<DiscussionDto> {
  return courseFetch<DiscussionDto>(`/api/v1/lessons/${lessonId}/discussions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function replyToDiscussion(
  discussionId: string,
  data: { content: string; userId: string }
): Promise<DiscussionReplyDto> {
  return courseFetch<DiscussionReplyDto>(`/api/v1/discussions/${discussionId}/replies`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
