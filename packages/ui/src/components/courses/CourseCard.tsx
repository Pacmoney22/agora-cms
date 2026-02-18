import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  BookOpen,
  Clock,
  User,
  Star,
  Users,
  ChevronDown,
  Check,
  ChevronRight,
  Play,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CourseLesson {
  id: string;
  title: string;
  position: number;
  videoDuration?: number;
  isFree?: boolean;
}

export interface CourseSection {
  id: string;
  title: string;
  description?: string;
  position: number;
  lessons: CourseLesson[];
}

export interface CourseReview {
  id: string;
  userName: string;
  rating: number;
  review: string;
  createdAt: string;
}

export interface CourseMetadata {
  difficulty?: string;
  estimatedHours?: number;
  learningObjectives?: string[];
  prerequisites?: string[];
}

export interface SectionOffering {
  id: string;
  courseId: string;
  name: string;
  code: string;
  deliveryMode: 'on_demand' | 'scheduled';
  status: 'active' | 'inactive' | 'completed' | 'upcoming';
  instructorName: string;
  description?: string;
  maxEnrollment: number;
  currentEnrollment: number;
  schedule?: {
    startDate?: string;
    endDate?: string;
    daysOfWeek?: string[];
    startTime?: string;
    endTime?: string;
    timezone?: string;
    location?: string;
  };
  enrollmentOpen: boolean;
  enrollmentDeadline?: string;
}

export interface CourseData {
  title: string;
  description?: string;
  thumbnail?: string;
  instructor?: string;
  duration?: string;
  price?: number;
  level?: 'beginner' | 'intermediate' | 'advanced';
  rating?: number;
  enrollmentCount?: number;
  slug: string;

  // Detail-mode fields
  id?: string;
  instructorBio?: string;
  thumbnailUrl?: string;
  courseMetadata?: CourseMetadata;
  sections?: CourseSection[];
  reviews?: CourseReview[];
  sectionOfferings?: SectionOffering[];
}

export interface CourseCardProps {
  courseId?: string | null;
  courseData?: CourseData | null;
  detailBasePath?: string;

  /** Display mode — 'card' for compact grid view, 'detail' for full course view. */
  mode?: 'card' | 'detail';

  // Card-mode props
  cardStyle?: 'standard' | 'compact' | 'featured';
  showThumbnail?: boolean;
  showInstructor?: boolean;
  showDuration?: boolean;
  showPrice?: boolean;
  showLevel?: boolean;
  showRating?: boolean;

  // Detail-mode props
  showCurriculum?: boolean;
  showReviews?: boolean;
  showObjectives?: boolean;
  showPrerequisites?: boolean;
  showInstructorBio?: boolean;
  showEnrollmentCard?: boolean;
  onEnroll?: (courseId: string) => void;
  onSelectSection?: (courseId: string, sectionId: string) => void;

  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const levelColors: Record<string, { bg: string; text: string }> = {
  beginner: { bg: 'bg-green-100', text: 'text-green-700' },
  intermediate: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  advanced: { bg: 'bg-red-100', text: 'text-red-700' },
};

function formatPrice(price?: number): string {
  if (price == null || price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

function renderStars(rating: number, size = 'h-3.5 w-3.5') {
  const stars: React.ReactElement[] = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        className={clsx(
          size,
          i <= Math.round(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-gray-200 text-gray-200',
        )}
      />,
    );
  }
  return stars;
}

// ---------------------------------------------------------------------------
// Detail View
// ---------------------------------------------------------------------------

function CourseDetailView({
  courseData,
  showThumbnail,
  showInstructor,
  showPrice,
  showLevel,
  showRating,
  showCurriculum,
  showReviews,
  showObjectives,
  showPrerequisites,
  showInstructorBio,
  showEnrollmentCard,
  onEnroll,
  onSelectSection,
  className,
}: {
  courseData: CourseData;
  showThumbnail: boolean;
  showInstructor: boolean;
  showPrice: boolean;
  showLevel: boolean;
  showRating: boolean;
  showCurriculum: boolean;
  showReviews: boolean;
  showObjectives: boolean;
  showPrerequisites: boolean;
  showInstructorBio: boolean;
  showEnrollmentCard: boolean;
  onEnroll?: (courseId: string) => void;
  onSelectSection?: (courseId: string, sectionId: string) => void;
  className?: string;
}) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    if (courseData.sections) {
      return new Set(courseData.sections.map((s) => s.id));
    }
    return new Set<string>();
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, review: '' });

  const metadata = courseData.courseMetadata ?? {};
  const difficulty = metadata.difficulty ?? courseData.level ?? 'beginner';
  const estimatedHours = metadata.estimatedHours ?? 0;
  const learningObjectives = metadata.learningObjectives ?? [];
  const prerequisites = metadata.prerequisites ?? [];
  const levelStyle = levelColors[difficulty] ?? levelColors.beginner!;

  const totalLessons = useMemo(() => {
    return courseData.sections
      ? courseData.sections.reduce((sum, s) => sum + s.lessons.length, 0)
      : 0;
  }, [courseData.sections]);

  const reviews = courseData.reviews ?? [];
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return courseData.rating ?? 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews, courseData.rating]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const thumbnailSrc = courseData.thumbnailUrl || courseData.thumbnail;

  return (
    <div className={clsx('w-full', className)}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Thumbnail */}
          {showThumbnail && (
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
              {thumbnailSrc ? (
                <img
                  src={thumbnailSrc}
                  alt={courseData.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BookOpen className="h-16 w-16 text-gray-300" />
                </div>
              )}
            </div>
          )}

          {/* Title + difficulty */}
          <div className="mt-6 flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{courseData.title}</h1>
            {showLevel && (
              <span
                className={clsx(
                  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                  levelStyle.bg,
                  levelStyle.text,
                )}
              >
                {difficulty}
              </span>
            )}
          </div>

          {/* Instructor + metadata */}
          {showInstructor && courseData.instructor && (
            <p className="mt-2 text-sm text-gray-600">
              Instructor: <span className="font-medium">{courseData.instructor}</span>
            </p>
          )}

          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
            {estimatedHours > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {estimatedHours} hours
              </span>
            )}
            {totalLessons > 0 && (
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {totalLessons} lessons
              </span>
            )}
            {showRating && averageRating > 0 && (
              <span className="flex items-center gap-1">
                <div className="flex">{renderStars(averageRating)}</div>
                <span className="text-xs text-gray-500">
                  ({averageRating.toFixed(1)})
                </span>
              </span>
            )}
          </div>

          {/* Description */}
          {courseData.description && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900">About this course</h2>
              <p className="mt-3 whitespace-pre-wrap text-gray-700">{courseData.description}</p>
            </div>
          )}

          {/* Learning Objectives */}
          {showObjectives && learningObjectives.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900">What you'll learn</h2>
              <ul className="mt-3 space-y-2">
                {learningObjectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                    <span className="text-gray-700">{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prerequisites */}
          {showPrerequisites && prerequisites.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900">Prerequisites</h2>
              <ul className="mt-3 space-y-2">
                {prerequisites.map((prereq, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                    <span className="text-gray-700">{prereq}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructor Bio */}
          {showInstructorBio && courseData.instructorBio && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900">About the instructor</h2>
              <p className="mt-3 whitespace-pre-wrap text-gray-700">
                {courseData.instructorBio}
              </p>
            </div>
          )}

          {/* Curriculum */}
          {showCurriculum &&
            courseData.sections &&
            courseData.sections.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900">Course Curriculum</h2>
                <div className="mt-4 space-y-3">
                  {courseData.sections
                    .sort((a, b) => a.position - b.position)
                    .map((section) => {
                      const isExpanded = expandedSections.has(section.id);
                      const lessons = [...section.lessons].sort(
                        (a, b) => a.position - b.position,
                      );

                      return (
                        <div
                          key={section.id}
                          className="rounded-lg border border-gray-200"
                        >
                          <button
                            onClick={() => toggleSection(section.id)}
                            className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left hover:bg-gray-100"
                          >
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">
                                {section.title}
                              </h3>
                              {section.description && (
                                <p className="mt-1 text-sm text-gray-600">
                                  {section.description}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-gray-500">
                                {lessons.length} lesson
                                {lessons.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <ChevronDown
                              className={clsx(
                                'h-5 w-5 flex-shrink-0 text-gray-400 transition-transform',
                                isExpanded && 'rotate-180',
                              )}
                            />
                          </button>

                          {isExpanded && (
                            <div className="divide-y divide-gray-200">
                              {lessons.map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="flex items-start justify-between px-4 py-3"
                                >
                                  <div className="flex items-start gap-3">
                                    <Play className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {lesson.title}
                                      </p>
                                      {lesson.videoDuration != null &&
                                        lesson.videoDuration > 0 && (
                                          <p className="mt-1 text-xs text-gray-500">
                                            {Math.ceil(lesson.videoDuration / 60)} min
                                          </p>
                                        )}
                                    </div>
                                  </div>
                                  {lesson.isFree && (
                                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                                      Free Preview
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

          {/* Reviews */}
          {showReviews && (
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Course Reviews
                  </h2>
                  {reviews.length > 0 && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex">
                        {renderStars(averageRating, 'h-5 w-5')}
                      </div>
                      <span className="text-sm text-gray-600">
                        {averageRating.toFixed(1)} ({reviews.length} review
                        {reviews.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Add Review
                </button>
              </div>

              <div className="space-y-4">
                {reviews.length > 0 ? (
                  [...reviews]
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime(),
                    )
                    .map((review) => (
                      <div
                        key={review.id}
                        className="rounded-lg border border-gray-200 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {review.userName}
                            </p>
                            <div className="mt-1 flex items-center gap-1">
                              {renderStars(review.rating, 'h-4 w-4')}
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{review.review}</p>
                      </div>
                    ))
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <p className="text-gray-500">
                      No reviews yet. Be the first to review this course!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Enrollment sidebar */}
        {showEnrollmentCard && (
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-4">
              {/* Course stats card */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                {showPrice && (
                  <p className="mb-4 text-center text-3xl font-bold text-gray-900">
                    {formatPrice(courseData.price)}
                  </p>
                )}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Difficulty</span>
                    <span className="font-medium capitalize text-gray-900">
                      {difficulty}
                    </span>
                  </div>
                  {estimatedHours > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Duration</span>
                      <span className="font-medium text-gray-900">
                        {estimatedHours} hours
                      </span>
                    </div>
                  )}
                  {totalLessons > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Lessons</span>
                      <span className="font-medium text-gray-900">
                        {totalLessons}
                      </span>
                    </div>
                  )}
                  {courseData.sections && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Modules</span>
                      <span className="font-medium text-gray-900">
                        {courseData.sections.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section offerings */}
              {courseData.sectionOfferings &&
                courseData.sectionOfferings.length > 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    Available Sections
                  </h3>
                  <p className="mb-4 text-xs text-gray-500">
                    Select one section to enroll in this course.
                  </p>
                  <div className="space-y-3">
                    {courseData.sectionOfferings.map((offering) => {
                      const spotsLeft =
                        offering.maxEnrollment > 0
                          ? offering.maxEnrollment - offering.currentEnrollment
                          : null;
                      const isFull = spotsLeft !== null && spotsLeft <= 0;
                      const isAvailable =
                        offering.enrollmentOpen && !isFull;

                      return (
                        <div
                          key={offering.id}
                          className={clsx(
                            'rounded-lg border p-4',
                            isAvailable
                              ? 'border-gray-200 hover:border-indigo-300'
                              : 'border-gray-100 bg-gray-50 opacity-60',
                          )}
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {offering.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {offering.code}
                              </p>
                            </div>
                            <span
                              className={clsx(
                                'rounded-full px-2 py-0.5 text-xs font-medium',
                                offering.deliveryMode === 'on_demand'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-purple-100 text-purple-700',
                              )}
                            >
                              {offering.deliveryMode === 'on_demand'
                                ? 'On Demand'
                                : 'Scheduled'}
                            </span>
                          </div>

                          <div className="mb-3 space-y-1 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>{offering.instructorName}</span>
                            </div>
                            {offering.schedule?.startDate && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>
                                  {new Date(
                                    offering.schedule.startDate,
                                  ).toLocaleDateString()}
                                  {offering.schedule.endDate &&
                                    ` – ${new Date(
                                      offering.schedule.endDate,
                                    ).toLocaleDateString()}`}
                                </span>
                              </div>
                            )}
                            {spotsLeft !== null && (
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>
                                  {isFull
                                    ? 'Full'
                                    : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
                                </span>
                              </div>
                            )}
                          </div>

                          <button
                            disabled={!isAvailable}
                            onClick={() =>
                              onSelectSection?.(
                                courseData.id ?? courseData.slug,
                                offering.id,
                              )
                            }
                            className={clsx(
                              'w-full rounded-md px-3 py-2 text-sm font-medium',
                              isAvailable
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'cursor-not-allowed bg-gray-200 text-gray-500',
                            )}
                          >
                            {isFull
                              ? 'Section Full'
                              : !offering.enrollmentOpen
                                ? 'Enrollment Closed'
                                : 'Select Section'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Enroll in this course</p>
                    <button
                      onClick={() =>
                        onEnroll?.(courseData.id ?? courseData.slug)
                      }
                      className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Enroll Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add a Review</h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close review modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Your Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview({ ...newReview, rating: star })}
                    className="focus:outline-none"
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                  >
                    <Star
                      className={clsx(
                        'h-8 w-8 cursor-pointer transition-colors hover:text-yellow-400',
                        star <= newReview.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-gray-200 text-gray-300',
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Your Review
              </label>
              <textarea
                rows={4}
                value={newReview.review}
                onChange={(e) =>
                  setNewReview({ ...newReview, review: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
                placeholder="Share your experience with this course..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                disabled={!newReview.review.trim()}
                className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const CourseCard: React.FC<CourseCardProps> = ({
  courseData: courseDataProp = null,
  detailBasePath = '/courses',
  mode = 'card',
  cardStyle = 'standard',
  showThumbnail = true,
  showInstructor = true,
  showDuration = true,
  showPrice = true,
  showLevel = true,
  showRating = true,
  showCurriculum = true,
  showReviews = true,
  showObjectives = true,
  showPrerequisites = true,
  showInstructorBio = true,
  showEnrollmentCard = true,
  onEnroll,
  onSelectSection,
  className,
}) => {
  const sampleCourse: CourseData = {
    id: 'sample-course-id',
    title: 'Sample Course',
    description: 'This card displays the course from the current page URL at runtime.',
    instructor: 'Instructor Name',
    instructorBio: 'An experienced educator with over 10 years of teaching experience.',
    duration: '8 hours',
    price: 49.99,
    level: 'beginner',
    rating: 4.5,
    enrollmentCount: 150,
    slug: 'sample-course',
    courseMetadata: {
      difficulty: 'beginner',
      estimatedHours: 8,
      learningObjectives: [
        'Understand the core fundamentals',
        'Build real-world projects',
        'Apply best practices',
      ],
      prerequisites: ['Basic computer skills'],
    },
    sections: [
      {
        id: 's1',
        title: 'Getting Started',
        description: 'Introduction and setup',
        position: 1,
        lessons: [
          { id: 'l1', title: 'Welcome & Overview', position: 1, videoDuration: 300, isFree: true },
          { id: 'l2', title: 'Environment Setup', position: 2, videoDuration: 600 },
        ],
      },
      {
        id: 's2',
        title: 'Core Concepts',
        position: 2,
        lessons: [
          { id: 'l3', title: 'Lesson 1: Fundamentals', position: 1, videoDuration: 900 },
          { id: 'l4', title: 'Lesson 2: Deep Dive', position: 2, videoDuration: 1200 },
        ],
      },
    ],
    sectionOfferings: [
      {
        id: 'offering-1',
        courseId: 'sample-course-id',
        name: 'Spring 2026 — Section A',
        code: 'SEC-001',
        deliveryMode: 'scheduled',
        status: 'active',
        instructorName: 'Dr. Jane Smith',
        maxEnrollment: 30,
        currentEnrollment: 22,
        schedule: {
          startDate: '2026-03-15',
          endDate: '2026-06-15',
          daysOfWeek: ['monday', 'wednesday'],
          startTime: '10:00',
          endTime: '11:30',
        },
        enrollmentOpen: true,
      },
      {
        id: 'offering-2',
        courseId: 'sample-course-id',
        name: 'Self-Paced',
        code: 'SEC-OD',
        deliveryMode: 'on_demand',
        status: 'active',
        instructorName: 'Prof. John Doe',
        maxEnrollment: 0,
        currentEnrollment: 48,
        enrollmentOpen: true,
      },
    ],
  };

  const courseData = courseDataProp ?? sampleCourse;

  // --- Detail mode ---
  if (mode === 'detail') {
    return (
      <CourseDetailView
        courseData={courseData}
        showThumbnail={showThumbnail}
        showInstructor={showInstructor}
        showPrice={showPrice}
        showLevel={showLevel}
        showRating={showRating}
        showCurriculum={showCurriculum}
        showReviews={showReviews}
        showObjectives={showObjectives}
        showPrerequisites={showPrerequisites}
        showInstructorBio={showInstructorBio}
        showEnrollmentCard={showEnrollmentCard}
        onEnroll={onEnroll}
        onSelectSection={onSelectSection}
        className={className}
      />
    );
  }

  // --- Card mode (existing behavior) ---
  const level = courseData.level ?? 'beginner';
  const levelStyle = levelColors[level] ?? levelColors.beginner!;

  if (cardStyle === 'compact') {
    return (
      <a
        href={`${detailBasePath}/${courseData.slug}`}
        className={clsx(
          'group flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md',
          className,
        )}
      >
        {showThumbnail && (
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
            {courseData.thumbnail ? (
              <img
                src={courseData.thumbnail}
                alt={courseData.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-indigo-50">
                <BookOpen className="h-6 w-6 text-indigo-300" />
              </div>
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-600">
            {courseData.title}
          </h3>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
            {showInstructor && courseData.instructor && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {courseData.instructor}
              </span>
            )}
            {showDuration && courseData.duration && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {courseData.duration}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          {showPrice && (
            <span className="text-sm font-bold text-gray-900">
              {formatPrice(courseData.price)}
            </span>
          )}
          {showLevel && (
            <span
              className={clsx(
                'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                levelStyle.bg,
                levelStyle.text,
              )}
            >
              {level}
            </span>
          )}
        </div>
      </a>
    );
  }

  if (cardStyle === 'featured') {
    return (
      <a
        href={`${detailBasePath}/${courseData.slug}`}
        className={clsx(
          'group relative block overflow-hidden rounded-xl',
          className,
        )}
      >
        {showThumbnail && courseData.thumbnail ? (
          <img
            src={courseData.thumbnail}
            alt={courseData.title}
            className="aspect-[2/1] w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex aspect-[2/1] w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
            <BookOpen className="h-16 w-16 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <div className="mb-2 flex items-center gap-2">
            {showLevel && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium capitalize backdrop-blur-sm">
                {level}
              </span>
            )}
            {showPrice && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm">
                {formatPrice(courseData.price)}
              </span>
            )}
          </div>
          <h3 className="mb-1 text-xl font-bold leading-tight">{courseData.title}</h3>
          <div className="flex items-center gap-3 text-sm text-white/80">
            {showInstructor && courseData.instructor && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {courseData.instructor}
              </span>
            )}
            {showRating && courseData.rating != null && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {courseData.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </a>
    );
  }

  // Standard card
  return (
    <a
      href={`${detailBasePath}/${courseData.slug}`}
      className={clsx(
        'group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      {showThumbnail && (
        <div className="relative overflow-hidden">
          {courseData.thumbnail ? (
            <img
              src={courseData.thumbnail}
              alt={courseData.title}
              className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
              <BookOpen className="h-12 w-12 text-indigo-300" />
            </div>
          )}
          {showLevel && (
            <span
              className={clsx(
                'absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                levelStyle.bg,
                levelStyle.text,
              )}
            >
              {level}
            </span>
          )}
          {showPrice && (
            <span className="absolute right-2 top-2 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-gray-900 shadow-sm">
              {formatPrice(courseData.price)}
            </span>
          )}
        </div>
      )}
      <div className="p-5">
        <h3 className="mb-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-indigo-600">
          {courseData.title}
        </h3>
        {courseData.description && (
          <p className="mb-3 text-sm text-gray-600 line-clamp-2">{courseData.description}</p>
        )}
        <div className="space-y-1.5 text-sm text-gray-500">
          {showInstructor && courseData.instructor && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <span>{courseData.instructor}</span>
            </div>
          )}
          {showDuration && courseData.duration && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <span>{courseData.duration}</span>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          {showRating && courseData.rating != null && (
            <div className="flex items-center gap-1">
              <div className="flex">{renderStars(courseData.rating)}</div>
              <span className="text-xs text-gray-500">({courseData.rating.toFixed(1)})</span>
            </div>
          )}
          {courseData.enrollmentCount != null && courseData.enrollmentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Users className="h-3.5 w-3.5" />
              {courseData.enrollmentCount.toLocaleString()} enrolled
            </span>
          )}
        </div>
      </div>
    </a>
  );
};
