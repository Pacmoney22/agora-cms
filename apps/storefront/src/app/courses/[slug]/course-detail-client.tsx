'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { CourseDto, ReviewDto, SectionOfferingDto } from '@/lib/api';
import {
  listCourseReviews,
  createCourseReview,
  getCourseSectionOfferings,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function difficultyBadgeClass(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'beginner':
      return 'bg-green-100 text-green-800';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800';
    case 'advanced':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface CourseDetailClientProps {
  course: CourseDto;
}

export function CourseDetailClient({ course }: CourseDetailClientProps) {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') || 'user-123';

  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [sectionOfferings, setSectionOfferings] = useState<SectionOfferingDto[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(course.sections?.map((s) => s.id) ?? []),
  );
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, review: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch reviews and section offerings
  useEffect(() => {
    Promise.all([
      listCourseReviews(course.id),
      getCourseSectionOfferings(course.id),
    ])
      .then(([reviewsData, offerings]) => {
        setReviews(reviewsData);
        setSectionOfferings(offerings);
      })
      .catch(() => {});
  }, [course.id]);

  const handleSubmitReview = async () => {
    if (!newReview.review.trim()) return;

    setSubmittingReview(true);
    try {
      const createdReview = await createCourseReview(course.id, {
        ...newReview,
        userId,
      });
      setReviews([createdReview, ...reviews]);
      setShowReviewModal(false);
      setNewReview({ rating: 5, review: '' });
    } catch (err: any) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const metadata = course.courseMetadata || {};
  const difficulty = metadata.difficulty || 'beginner';
  const estimatedHours = metadata.estimatedHours || 0;
  const learningObjectives = metadata.learningObjectives || [];
  const prerequisites = metadata.prerequisites || [];

  const totalLessons = course.sections
    ? course.sections.reduce((sum, section) => sum + section.lessons.length, 0)
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/courses" className="hover:text-indigo-600">
          Courses
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{course.title}</span>
      </nav>

      {/* Course Header */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Left column - Main content */}
        <div className="lg:col-span-2">
          {/* Course thumbnail */}
          <div className="aspect-video w-full rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
            {course.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <svg
                className="h-24 w-24 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </div>

          {/* Course title and info */}
          <div className="mt-6">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyBadgeClass(
                  difficulty,
                )}`}
              >
                {difficulty}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              {estimatedHours > 0 && (
                <span className="flex items-center gap-1">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {estimatedHours} hours
                </span>
              )}
              {totalLessons > 0 && (
                <span className="flex items-center gap-1">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  {totalLessons} lessons
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {course.description && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900">About this course</h2>
              <p className="mt-3 text-gray-700 whitespace-pre-wrap">{course.description}</p>
            </div>
          )}

          {/* Learning Objectives */}
          {learningObjectives.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900">What you&apos;ll learn</h2>
              <ul className="mt-3 space-y-2">
                {learningObjectives.map((objective: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-green-600 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-gray-700">{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prerequisites */}
          {prerequisites.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900">Prerequisites</h2>
              <ul className="mt-3 space-y-2">
                {prerequisites.map((prereq: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-gray-400 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span className="text-gray-700">{prereq}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Course Curriculum */}
          {course.sections && course.sections.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900">Course Curriculum</h2>
              <div className="mt-4 space-y-3">
                {course.sections
                  .sort((a, b) => a.position - b.position)
                  .map((section) => {
                    const isExpanded = expandedSections.has(section.id);
                    const lessons = section.lessons.sort(
                      (a, b) => a.position - b.position,
                    );

                    return (
                      <div
                        key={section.id}
                        className="rounded-lg border border-gray-200"
                      >
                        {/* Section header */}
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
                          <svg
                            className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {/* Lessons list */}
                        {isExpanded && (
                          <div className="divide-y divide-gray-200">
                            {lessons.map((lesson) => (
                              <div key={lesson.id} className="px-4 py-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3">
                                    <svg
                                      className="h-5 w-5 flex-shrink-0 text-gray-400 mt-0.5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                      />
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {lesson.title}
                                      </p>
                                      {lesson.videoDuration && (
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

          {/* Reviews Section */}
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Course Reviews
                </h2>
                {reviews.length > 0 && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`h-5 w-5 ${
                            star <= Math.round(averageRating)
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
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

            {/* Reviews List */}
            <div className="space-y-4">
              {reviews.length > 0 ? (
                reviews
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
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= review.rating
                                    ? 'text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
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
        </div>

        {/* Right column - Enrollment sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-4">
            {/* Course stats */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Difficulty</span>
                  <span className="font-medium text-gray-900 capitalize">
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
                {course.sections && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Modules</span>
                    <span className="font-medium text-gray-900">
                      {course.sections.length}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section offerings */}
            {sectionOfferings.length > 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  Available Sections
                </h3>
                <p className="mb-4 text-xs text-gray-500">
                  Select one section to enroll in this course.
                </p>
                <div className="space-y-3">
                  {sectionOfferings.map((offering) => {
                    const spotsLeft =
                      offering.maxEnrollment > 0
                        ? offering.maxEnrollment - offering.currentEnrollment
                        : null;
                    const isFull = spotsLeft !== null && spotsLeft <= 0;

                    return (
                      <div
                        key={offering.id}
                        className="rounded-lg border border-gray-200 p-4 hover:border-indigo-300"
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
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              offering.deliveryMode === 'on_demand'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {offering.deliveryMode === 'on_demand'
                              ? 'On Demand'
                              : 'Scheduled'}
                          </span>
                        </div>

                        <div className="mb-3 space-y-1 text-xs text-gray-600">
                          <p>Instructor: {offering.instructorName}</p>
                          {offering.schedule?.startDate && (
                            <p>
                              {new Date(
                                offering.schedule.startDate,
                              ).toLocaleDateString()}
                              {offering.schedule.endDate &&
                                ` – ${new Date(offering.schedule.endDate).toLocaleDateString()}`}
                            </p>
                          )}
                          {offering.schedule?.location && (
                            <p>{offering.schedule.location}</p>
                          )}
                          {spotsLeft !== null && (
                            <p
                              className={
                                isFull ? 'font-medium text-red-600' : ''
                              }
                            >
                              {isFull
                                ? 'Full'
                                : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
                            </p>
                          )}
                        </div>

                        <button
                          disabled={isFull}
                          className={`w-full rounded-md px-3 py-2 text-sm font-medium ${
                            isFull
                              ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {isFull ? 'Section Full' : 'Select Section'}
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
                  <button className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700">
                    Enroll Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-bold">Add a Review</h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Star Rating */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Your Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      setNewReview({ ...newReview, rating: star })
                    }
                    className="focus:outline-none"
                  >
                    <svg
                      className={`h-8 w-8 cursor-pointer transition-colors ${
                        star <= newReview.rating
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      } hover:text-yellow-400`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Review Text */}
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

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReviewModal(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview || !newReview.review.trim()}
                className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
