'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { EnrollmentDto, CourseLessonDto, CourseSectionDto } from '@/lib/api';
import { getEnrollment, updateLessonProgress } from '@/lib/api';

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function getVideoEmbedUrl(videoUrl: string, provider: string | null): string | null {
  if (!videoUrl) return null;

  if (provider === 'youtube' || videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    // Extract video ID from various YouTube URL formats
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = videoUrl.match(youtubeRegex);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  if (provider === 'vimeo' || videoUrl.includes('vimeo.com')) {
    // Extract video ID from Vimeo URL
    const vimeoRegex = /vimeo\.com\/(\d+)/;
    const match = videoUrl.match(vimeoRegex);
    if (match && match[1]) {
      return `https://player.vimeo.com/video/${match[1]}`;
    }
  }

  // If already an embed URL, return as is
  if (videoUrl.includes('embed')) {
    return videoUrl;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CoursePlayerPage() {
  const params = useParams();
  const enrollmentId = params.enrollmentId as string;

  const [enrollment, setEnrollment] = useState<EnrollmentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentLesson, setCurrentLesson] = useState<CourseLessonDto | null>(null);
  const [saving, setSaving] = useState(false);
  const videoProgressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch enrollment
  useEffect(() => {
    setLoading(true);
    setError('');
    getEnrollment(enrollmentId)
      .then((data) => {
        setEnrollment(data);
        // Set first lesson as current if available
        if (data.course?.sections && data.course.sections.length > 0) {
          const firstSection = data.course.sections.sort((a, b) => a.position - b.position)[0];
          if (firstSection && firstSection.lessons.length > 0) {
            const firstLesson = firstSection.lessons.sort((a, b) => a.position - b.position)[0];
            if (firstLesson) setCurrentLesson(firstLesson);
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [enrollmentId]);

  // Save video progress every 30 seconds
  useEffect(() => {
    if (!currentLesson || !enrollment) return;

    const saveProgress = () => {
      // In a real implementation, you would track the actual video playback position
      // For now, we'll just update the lastViewedAt timestamp
      updateLessonProgress(enrollment.id, currentLesson.id, {
        videoProgress: 0, // Would come from video player
      }).catch(() => {
        // Silent fail for progress updates
      });
    };

    videoProgressIntervalRef.current = setInterval(saveProgress, 30000);

    return () => {
      if (videoProgressIntervalRef.current) {
        clearInterval(videoProgressIntervalRef.current);
      }
    };
  }, [currentLesson, enrollment]);

  const handleMarkComplete = async () => {
    if (!currentLesson || !enrollment) return;

    setSaving(true);
    try {
      await updateLessonProgress(enrollment.id, currentLesson.id, {
        isCompleted: true,
      });

      // Refresh enrollment to get updated progress
      const updatedEnrollment = await getEnrollment(enrollmentId);
      setEnrollment(updatedEnrollment);

      // Move to next lesson if available
      const nextLesson = getNextLesson();
      if (nextLesson) {
        setCurrentLesson(nextLesson);
      }
    } catch (err) {
      alert('Failed to mark lesson as complete');
    } finally {
      setSaving(false);
    }
  };

  const getLessonProgress = (lessonId: string) => {
    return enrollment?.progress?.find((p) => p.lessonId === lessonId);
  };

  const getNextLesson = (): CourseLessonDto | null => {
    if (!enrollment?.course?.sections || !currentLesson) return null;

    const allLessons: CourseLessonDto[] = [];
    enrollment.course.sections
      .sort((a, b) => a.position - b.position)
      .forEach((section) => {
        section.lessons.sort((a, b) => a.position - b.position).forEach((lesson) => {
          allLessons.push(lesson);
        });
      });

    const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
    if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
      return allLessons[currentIndex + 1] ?? null;
    }
    return null;
  };

  const getPreviousLesson = (): CourseLessonDto | null => {
    if (!enrollment?.course?.sections || !currentLesson) return null;

    const allLessons: CourseLessonDto[] = [];
    enrollment.course.sections
      .sort((a, b) => a.position - b.position)
      .forEach((section) => {
        section.lessons.sort((a, b) => a.position - b.position).forEach((lesson) => {
          allLessons.push(lesson);
        });
      });

    const currentIndex = allLessons.findIndex((l) => l.id === currentLesson.id);
    if (currentIndex > 0) {
      return allLessons[currentIndex - 1] ?? null;
    }
    return null;
  };

  // ----- Loading / Error states -----
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-center text-gray-500">Loading course...</p>
      </div>
    );
  }

  if (error || !enrollment || !enrollment.course) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Enrollment not found</h2>
        <p className="mt-2 text-sm text-gray-500">
          {error || 'The requested enrollment does not exist.'}
        </p>
        <Link
          href="/courses"
          className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Back to Courses
        </Link>
      </div>
    );
  }

  const course = enrollment.course;
  const embedUrl = currentLesson?.videoUrl
    ? getVideoEmbedUrl(currentLesson.videoUrl, currentLesson.videoProvider)
    : null;
  const isCurrentLessonComplete = currentLesson
    ? getLessonProgress(currentLesson.id)?.isCompleted
    : false;
  const nextLesson = getNextLesson();
  const previousLesson = getPreviousLesson();

  // ----- Render -----
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/courses"
                className="text-gray-400 hover:text-gray-600"
                title="Back to courses"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{course.title}</h1>
                <p className="text-sm text-gray-500">
                  Progress: {Math.round(enrollment.progressPercent)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{enrollment.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Video player and lesson content - 70% */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video player */}
            <div className="rounded-lg bg-white shadow-sm overflow-hidden">
              {embedUrl ? (
                <div className="aspect-video bg-black">
                  <iframe
                    src={embedUrl}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={currentLesson?.title || 'Video'}
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-900 flex items-center justify-center">
                  <p className="text-gray-400">No video available for this lesson</p>
                </div>
              )}
            </div>

            {/* Lesson info */}
            {currentLesson && (
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{currentLesson.title}</h2>
                    {currentLesson.videoDuration && (
                      <p className="mt-1 text-sm text-gray-500">
                        Duration: {Math.ceil(currentLesson.videoDuration / 60)} minutes
                      </p>
                    )}
                  </div>
                  {isCurrentLessonComplete && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                      <svg
                        className="mr-1 h-4 w-4"
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
                      Completed
                    </span>
                  )}
                </div>

                {currentLesson.content && (
                  <div className="mt-4 prose max-w-none text-gray-700">
                    <div dangerouslySetInnerHTML={{ __html: currentLesson.content }} />
                  </div>
                )}

                {/* Lesson navigation */}
                <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6">
                  <button
                    onClick={() => previousLesson && setCurrentLesson(previousLesson)}
                    disabled={!previousLesson}
                    className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Previous
                  </button>

                  <button
                    onClick={handleMarkComplete}
                    disabled={saving || isCurrentLessonComplete}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? 'Saving...'
                      : isCurrentLessonComplete
                        ? 'Completed'
                        : 'Mark as Complete'}
                  </button>

                  <button
                    onClick={() => nextLesson && setCurrentLesson(nextLesson)}
                    disabled={!nextLesson}
                    className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - 30% */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white shadow-sm">
              <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="font-semibold text-gray-900">Course Content</h3>
              </div>

              <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
                {course.sections
                  ?.sort((a, b) => a.position - b.position)
                  .map((section) => (
                    <div key={section.id} className="border-b border-gray-200">
                      <div className="bg-gray-50 px-4 py-2">
                        <h4 className="text-sm font-medium text-gray-900">{section.title}</h4>
                      </div>
                      <div>
                        {section.lessons
                          .sort((a, b) => a.position - b.position)
                          .map((lesson) => {
                            const progress = getLessonProgress(lesson.id);
                            const isCompleted = progress?.isCompleted || false;
                            const isCurrent = currentLesson?.id === lesson.id;

                            return (
                              <button
                                key={lesson.id}
                                onClick={() => setCurrentLesson(lesson)}
                                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                                  isCurrent
                                    ? 'bg-indigo-50 border-l-4 border-indigo-600'
                                    : 'hover:bg-gray-50'
                                }`}
                              >
                                {/* Completion checkbox */}
                                <div className="flex-shrink-0 mt-0.5">
                                  {isCompleted ? (
                                    <svg
                                      className="h-5 w-5 text-green-600"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="h-5 w-5 text-gray-300"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                </div>

                                {/* Lesson info */}
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm font-medium ${
                                      isCurrent ? 'text-indigo-900' : 'text-gray-900'
                                    }`}
                                  >
                                    {lesson.title}
                                  </p>
                                  {lesson.videoDuration && (
                                    <p className="mt-1 text-xs text-gray-500">
                                      {Math.ceil(lesson.videoDuration / 60)} min
                                    </p>
                                  )}
                                </div>

                                {/* Play icon */}
                                {isCurrent && (
                                  <svg
                                    className="h-5 w-5 flex-shrink-0 text-indigo-600"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
