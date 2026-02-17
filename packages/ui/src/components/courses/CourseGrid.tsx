import React from 'react';
import { clsx } from 'clsx';
import { BookOpen, List, LayoutGrid } from 'lucide-react';
import { CourseCard, type CourseData } from './CourseCard';

export interface CourseGridProps {
  source?: 'all' | 'featured' | 'newest' | 'popular';
  courses?: CourseData[];
  maxCourses?: number;
  columns?: number;
  layout?: 'grid' | 'list';
  showFilters?: boolean;
  cardStyle?: 'standard' | 'compact' | 'featured';
  showThumbnail?: boolean;
  showInstructor?: boolean;
  showPrice?: boolean;
  showLevel?: boolean;
  emptyMessage?: string;
  viewAllLink?: string | null;
  detailBasePath?: string;
  className?: string;
}

const columnClasses: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

// Sample courses for builder preview
const sampleCourses: CourseData[] = [
  {
    title: 'Introduction to Web Development',
    description: 'Learn the fundamentals of HTML, CSS, and JavaScript to build modern websites.',
    instructor: 'Jane Smith',
    duration: '8 weeks',
    price: 49.99,
    level: 'beginner',
    rating: 4.7,
    enrollmentCount: 1234,
    slug: 'intro-web-development',
  },
  {
    title: 'Advanced React Patterns',
    description: 'Master advanced React patterns including hooks, context, and performance optimization.',
    instructor: 'John Doe',
    duration: '6 weeks',
    price: 79.99,
    level: 'advanced',
    rating: 4.9,
    enrollmentCount: 567,
    slug: 'advanced-react-patterns',
  },
  {
    title: 'UX Design Fundamentals',
    description: 'Understand user experience design principles and create intuitive interfaces.',
    instructor: 'Sarah Johnson',
    duration: '4 weeks',
    price: 0,
    level: 'beginner',
    rating: 4.5,
    enrollmentCount: 2341,
    slug: 'ux-design-fundamentals',
  },
];

export const CourseGrid: React.FC<CourseGridProps> = ({
  source = 'all',
  courses,
  maxCourses = 6,
  columns = 3,
  layout = 'grid',
  showFilters = false,
  cardStyle = 'standard',
  showThumbnail = true,
  showInstructor = true,
  showPrice = true,
  showLevel = true,
  emptyMessage = 'No courses available',
  viewAllLink = null,
  detailBasePath = '/courses',
  className,
}) => {
  // Use provided courses or sample data for builder preview
  const displayCourses = (courses ?? sampleCourses).slice(0, maxCourses);

  if (displayCourses.length === 0) {
    return (
      <div className={clsx('py-12 text-center', className)}>
        <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  const colClass = columnClasses[columns] ?? columnClasses[3];

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header with optional filters */}
      {(showFilters || viewAllLink) && (
        <div className="flex items-center justify-between">
          {showFilters && (
            <div className="flex items-center gap-2">
              <button
                className={clsx(
                  'rounded-lg p-2 transition-colors',
                  layout === 'grid'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                className={clsx(
                  'rounded-lg p-2 transition-colors',
                  layout === 'list'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          )}
          {viewAllLink && (
            <a
              href={viewAllLink}
              className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
            >
              View All Courses &rarr;
            </a>
          )}
        </div>
      )}

      {/* Course grid/list */}
      {layout === 'list' ? (
        <div className="space-y-3">
          {displayCourses.map((course, index) => (
            <CourseCard
              key={course.slug || index}
              courseData={course}
              cardStyle="compact"
              showThumbnail={showThumbnail}
              showInstructor={showInstructor}
              showPrice={showPrice}
              showLevel={showLevel}
              detailBasePath={detailBasePath}
            />
          ))}
        </div>
      ) : (
        <div className={clsx('grid gap-6', colClass)}>
          {displayCourses.map((course, index) => (
            <CourseCard
              key={course.slug || index}
              courseData={course}
              cardStyle={cardStyle}
              showThumbnail={showThumbnail}
              showInstructor={showInstructor}
              showPrice={showPrice}
              showLevel={showLevel}
              detailBasePath={detailBasePath}
            />
          ))}
        </div>
      )}
    </div>
  );
};
