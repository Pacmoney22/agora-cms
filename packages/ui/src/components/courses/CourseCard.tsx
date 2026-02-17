import React from 'react';
import { clsx } from 'clsx';
import { BookOpen, Clock, User, Star, Users } from 'lucide-react';

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
}

export interface CourseCardProps {
  courseId?: string | null;
  courseData?: CourseData | null;
  detailBasePath?: string;
  cardStyle?: 'standard' | 'compact' | 'featured';
  showThumbnail?: boolean;
  showInstructor?: boolean;
  showDuration?: boolean;
  showPrice?: boolean;
  showLevel?: boolean;
  showRating?: boolean;
  className?: string;
}

const levelColors: Record<string, { bg: string; text: string }> = {
  beginner: { bg: 'bg-green-100', text: 'text-green-700' },
  intermediate: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  advanced: { bg: 'bg-red-100', text: 'text-red-700' },
};

function formatPrice(price?: number): string {
  if (price == null || price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

function renderStars(rating: number) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        className={clsx(
          'h-3.5 w-3.5',
          i <= Math.round(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-gray-200 text-gray-200',
        )}
      />,
    );
  }
  return stars;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  courseData: courseDataProp = null,
  detailBasePath = '/courses',
  cardStyle = 'standard',
  showThumbnail = true,
  showInstructor = true,
  showDuration = true,
  showPrice = true,
  showLevel = true,
  showRating = true,
  className,
}) => {
  const sampleCourse: CourseData = {
    title: 'Sample Course',
    description: 'This card displays the course from the current page URL at runtime.',
    instructor: 'Instructor Name',
    duration: '8 hours',
    price: 49.99,
    level: 'beginner',
    rating: 4.5,
    enrollmentCount: 150,
    slug: 'sample-course',
  };

  const courseData = courseDataProp ?? sampleCourse;

  const level = courseData.level ?? 'beginner';
  const levelStyle = levelColors[level] ?? { bg: 'bg-green-100', text: 'text-green-700' };

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
        {/* Rating and enrollment */}
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
