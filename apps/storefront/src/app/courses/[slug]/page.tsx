import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCourseBySlug } from '@/lib/api';
import { getPublicSettings } from '@/lib/content-client';
import { CourseDetailClient } from './course-detail-client';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const [course, settings] = await Promise.all([
      getCourseBySlug(slug),
      getPublicSettings(),
    ]);
    const siteUrl = settings?.general?.siteUrl || 'http://localhost:3000';

    return {
      title: course.title,
      description: course.description || `${course.title} course`,
      alternates: { canonical: `${siteUrl}/courses/${course.slug}` },
      openGraph: {
        title: course.title,
        description: course.description || undefined,
        url: `${siteUrl}/courses/${course.slug}`,
        images: course.thumbnailUrl ? [course.thumbnailUrl] : undefined,
        type: 'website',
      },
    };
  } catch {
    return { title: 'Course not found' };
  }
}

export default async function CourseLandingPage({ params }: PageProps) {
  const { slug } = await params;

  const [course, settings] = await Promise.all([
    getCourseBySlug(slug).catch((): null => null),
    getPublicSettings(),
  ]);

  if (!course) notFound();

  const siteUrl = settings?.general?.siteUrl || 'http://localhost:3000';
  const siteName = settings?.general?.siteName || 'Site';
  const metadata = course.courseMetadata || {};

  // Course JSON-LD
  const courseJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description || undefined,
    provider: { '@type': 'Organization', name: siteName },
    image: course.thumbnailUrl || undefined,
  };

  if (metadata.difficulty) {
    courseJsonLd.educationalLevel = metadata.difficulty;
  }
  if (metadata.learningObjectives?.length) {
    courseJsonLd.teaches = metadata.learningObjectives;
  }
  if (metadata.prerequisites?.length) {
    courseJsonLd.coursePrerequisites = metadata.prerequisites;
  }
  if (metadata.estimatedHours) {
    courseJsonLd.timeRequired = `PT${metadata.estimatedHours}H`;
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Courses',
        item: `${siteUrl}/courses`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: course.title,
        item: `${siteUrl}/courses/${course.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CourseDetailClient course={course} />
    </>
  );
}
