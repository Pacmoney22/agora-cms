'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { coursesApi, settingsApi } from '@/lib/api-client';
import { MediaPicker } from '@/components/MediaPicker';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface CourseMetadata {
  learningObjectives?: string[];
  prerequisites?: string[];
  estimatedHours?: number;
  difficulty?: string;
  category?: string;
  tags?: string[];
  certificateEnabled?: boolean;
  certificateTemplateId?: string;
  completionCriteria?: {
    requireAllLessons?: boolean;
    requiredLessonIds?: string[];
    requireQuizPassing?: boolean;
    minimumQuizScore?: number;
    requireAssignmentPassing?: boolean;
    minimumProgress?: number;
  };
}

export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [level, setLevel] = useState('beginner');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [objectivesText, setObjectivesText] = useState('');
  const [prerequisitesText, setPrerequisitesText] = useState('');

  // Certificate & completion state
  const [certEnabled, setCertEnabled] = useState(false);
  const [certTemplateId, setCertTemplateId] = useState('');
  const [requireAllLessons, setRequireAllLessons] = useState(true);
  const [requiredLessonIds, setRequiredLessonIds] = useState<string[]>([]);
  const [requireQuizPassing, setRequireQuizPassing] = useState(false);
  const [minimumQuizScore, setMinimumQuizScore] = useState(70);
  const [requireAssignmentPassing, setRequireAssignmentPassing] = useState(false);
  const [minimumProgress, setMinimumProgress] = useState(100);

  // Fetch course
  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => coursesApi.get(id),
  });

  // Fetch course categories and tags registries
  const { data: categoriesData } = useQuery({
    queryKey: ['settings', 'course_categories'],
    queryFn: () => settingsApi.get('course_categories').catch(() => ({ categories: [] })),
  });
  const courseCategories: { id: string; name: string; slug: string }[] = (categoriesData as any)?.categories || [];

  const { data: tagsData } = useQuery({
    queryKey: ['settings', 'course_tags'],
    queryFn: () => settingsApi.get('course_tags').catch(() => ({ tags: [] })),
  });
  const courseTags: { id: string; name: string; slug: string; color: string }[] = (tagsData as any)?.tags || [];

  // Fetch certificate templates
  const { data: certTemplatesData } = useQuery({
    queryKey: ['settings', 'certificate_templates'],
    queryFn: () => settingsApi.get('certificate_templates').catch(() => ({ templates: [] })),
  });
  const certTemplates: { id: string; name: string }[] = (certTemplatesData as any)?.templates || [];

  // Fetch sections + lessons for the lesson multi-select
  const { data: sectionsData } = useQuery({
    queryKey: ['course-sections', id],
    queryFn: () => coursesApi.listSections(id),
    enabled: !!id,
  });
  const sections: { id: string; title: string; lessons: { id: string; title: string }[] }[] = sectionsData || [];

  // Populate form when course loads
  useEffect(() => {
    if (!course) return;
    const meta = (course.courseMetadata || {}) as CourseMetadata;
    setTitle(course.title || '');
    setDescription(course.description || '');
    setThumbnail(course.thumbnailUrl || '');
    setLevel(meta.difficulty || 'beginner');
    setEstimatedHours(meta.estimatedHours ? String(meta.estimatedHours) : '');
    setCategory(meta.category || '');
    setTags(Array.isArray(meta.tags) ? meta.tags : []);
    setObjectivesText(
      Array.isArray(meta.learningObjectives) ? meta.learningObjectives.join('\n') : '',
    );
    setPrerequisitesText(
      Array.isArray(meta.prerequisites) ? meta.prerequisites.join('\n') : '',
    );

    // Certificate settings
    setCertEnabled(meta.certificateEnabled === true);
    setCertTemplateId(meta.certificateTemplateId || '');
    const criteria = meta.completionCriteria;
    if (criteria) {
      setRequireAllLessons(criteria.requireAllLessons !== false);
      setRequiredLessonIds(Array.isArray(criteria.requiredLessonIds) ? criteria.requiredLessonIds : []);
      setRequireQuizPassing(criteria.requireQuizPassing === true);
      setMinimumQuizScore(criteria.minimumQuizScore ?? 70);
      setRequireAssignmentPassing(criteria.requireAssignmentPassing === true);
      setMinimumProgress(criteria.minimumProgress ?? 100);
    }
  }, [course]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => coursesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course updated successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update course');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => coursesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course deleted');
      router.push('/courses');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete course');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }

    const parsedObjectives = objectivesText
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean);
    const parsedPrereqs = prerequisitesText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);

    updateMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      thumbnail: thumbnail.trim() || undefined,
      level,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      category: category.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      objectives: parsedObjectives.length > 0 ? parsedObjectives : [],
      prerequisites: parsedPrereqs.length > 0 ? parsedPrereqs : [],
      certificateSettings: {
        certificateEnabled: certEnabled,
        certificateTemplateId: certTemplateId || undefined,
        completionCriteria: certEnabled
          ? {
              requireAllLessons,
              requiredLessonIds: requireAllLessons ? undefined : requiredLessonIds,
              requireQuizPassing,
              minimumQuizScore: requireQuizPassing ? minimumQuizScore : undefined,
              requireAssignmentPassing,
              minimumProgress,
            }
          : undefined,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-96 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-600">Course not found</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
        <Link href="/courses" className="hover:text-blue-600">
          Courses
        </Link>
        <span>/</span>
        <span>{course.title}</span>
        <span>/</span>
        <span className="text-gray-900">Edit</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Course</h1>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              course.status === 'published'
                ? 'bg-green-100 text-green-800'
                : course.status === 'archived'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {course.status}
          </span>
          <Link
            href={`/courses/${id}/curriculum`}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700"
          >
            Manage Curriculum
          </Link>
          <Link
            href={`/courses/${id}/quizzes`}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            Quiz Builder
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <fieldset className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <legend className="px-2 text-lg font-semibold text-gray-900">Basic Information</legend>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="slug" className="mb-1 block text-sm font-medium text-gray-700">
                Slug
              </label>
              <input
                id="slug"
                type="text"
                value={course.slug}
                disabled
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-400">Auto-generated from title. Cannot be changed.</p>
            </div>
            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <MediaPicker
              label="Thumbnail Image"
              value={thumbnail}
              onChange={(v) => setThumbnail(v)}
              accept="image/*"
              helpText="Course thumbnail displayed in listings and catalog"
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="level" className="mb-1 block text-sm font-medium text-gray-700">
                  Level
                </label>
                <select
                  id="level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label htmlFor="estimatedHours" className="mb-1 block text-sm font-medium text-gray-700">
                  Estimated Hours
                </label>
                <input
                  id="estimatedHours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="category" className="mb-1 block text-sm font-medium text-gray-700">
                  Category
                </label>
                {courseCategories.length > 0 ? (
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select a category...</option>
                    {courseCategories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <input
                      id="category"
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Programming"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      <Link href="/course-categories" className="text-blue-500 hover:underline">Manage categories</Link> to use a dropdown selector
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="tags" className="mb-1 block text-sm font-medium text-gray-700">
                Tags
              </label>
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map((tag) => {
                  const tagObj = courseTags.find((t) => t.slug === tag || t.name === tag);
                  return (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: tagObj?.color ? `${tagObj.color}20` : '#f3f4f6',
                        color: tagObj?.color || '#4b5563',
                      }}
                    >
                      {tagObj?.color && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tagObj.color }} />
                      )}
                      {tagObj?.name || tag}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((t) => t !== tag))}
                        className="opacity-60 hover:opacity-100"
                      >
                        &times;
                      </button>
                    </span>
                  );
                })}
              </div>
              {courseTags.length > 0 ? (
                <select
                  id="tags"
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !tags.includes(e.target.value)) {
                      setTags([...tags, e.target.value]);
                    }
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Add a tag...</option>
                  {courseTags
                    .filter((t) => !tags.includes(t.slug) && !tags.includes(t.name))
                    .map((t) => (
                      <option key={t.id} value={t.slug}>{t.name}</option>
                    ))}
                </select>
              ) : (
                <p className="text-xs text-gray-400">
                  <Link href="/course-tags" className="text-blue-500 hover:underline">Manage tags</Link> to use the tag selector
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Learning Objectives & Prerequisites */}
        <fieldset className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <legend className="px-2 text-lg font-semibold text-gray-900">
            Learning Objectives & Prerequisites
          </legend>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="objectives" className="mb-1 block text-sm font-medium text-gray-700">
                Learning Objectives
              </label>
              <textarea
                id="objectives"
                value={objectivesText}
                onChange={(e) => setObjectivesText(e.target.value)}
                rows={6}
                placeholder="One objective per line:&#10;Understand TypeScript basics&#10;Build type-safe applications&#10;Use generics effectively"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">One objective per line</p>
            </div>
            <div>
              <label htmlFor="prerequisites" className="mb-1 block text-sm font-medium text-gray-700">
                Prerequisites
              </label>
              <textarea
                id="prerequisites"
                value={prerequisitesText}
                onChange={(e) => setPrerequisitesText(e.target.value)}
                rows={6}
                placeholder="One prerequisite per line:&#10;Basic JavaScript knowledge&#10;Familiarity with HTML/CSS"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">One prerequisite per line</p>
            </div>
          </div>
        </fieldset>

        {/* Certificate & Completion */}
        <fieldset className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <legend className="px-2 text-lg font-semibold text-gray-900">
            Certificate & Completion
          </legend>
          <div className="mt-4 space-y-4">
            {/* Enable certificate toggle */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={certEnabled}
                onChange={(e) => setCertEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Award certificate on course completion
              </span>
            </label>

            {certEnabled && (
              <div className="ml-7 space-y-5 border-l-2 border-blue-100 pl-4">
                {/* Template selector */}
                <div>
                  <label htmlFor="certTemplate" className="mb-1 block text-sm font-medium text-gray-700">
                    Certificate Template
                  </label>
                  {certTemplates.length > 0 ? (
                    <select
                      id="certTemplate"
                      value={certTemplateId}
                      onChange={(e) => setCertTemplateId(e.target.value)}
                      className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Default template</option>
                      {certTemplates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No templates found.{' '}
                      <Link href="/certificates" className="text-blue-500 hover:underline">
                        Create a template
                      </Link>{' '}
                      or leave blank to use the default.
                    </p>
                  )}
                </div>

                {/* Completion Criteria */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-gray-800">
                    Completion Criteria
                  </h4>
                  <div className="space-y-3">
                    {/* Minimum progress */}
                    <div className="flex items-center gap-3">
                      <label htmlFor="minProgress" className="text-sm text-gray-700">
                        Minimum overall progress
                      </label>
                      <input
                        id="minProgress"
                        type="number"
                        min={0}
                        max={100}
                        value={minimumProgress}
                        onChange={(e) => setMinimumProgress(Number(e.target.value))}
                        className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>

                    {/* Lesson completion */}
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={requireAllLessons}
                        onChange={(e) => setRequireAllLessons(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Require all lessons completed</span>
                    </label>

                    {!requireAllLessons && (
                      <div className="ml-7">
                        <p className="mb-2 text-xs font-medium text-gray-600">
                          Select specific required lessons:
                        </p>
                        <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 p-2">
                          {sections.length === 0 && (
                            <p className="text-xs text-gray-400 py-2 text-center">
                              No sections found. Add curriculum first.
                            </p>
                          )}
                          {sections.map((section) => (
                            <div key={section.id} className="mb-2">
                              <p className="text-xs font-semibold text-gray-600 mb-1">{section.title}</p>
                              {(section.lessons || []).map((lesson) => (
                                <label key={lesson.id} className="flex items-center gap-2 py-0.5 pl-3">
                                  <input
                                    type="checkbox"
                                    checked={requiredLessonIds.includes(lesson.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setRequiredLessonIds([...requiredLessonIds, lesson.id]);
                                      } else {
                                        setRequiredLessonIds(requiredLessonIds.filter((lid) => lid !== lesson.id));
                                      }
                                    }}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-700">{lesson.title}</span>
                                </label>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quiz passing */}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={requireQuizPassing}
                          onChange={(e) => setRequireQuizPassing(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Require all quizzes passed</span>
                      </label>
                      {requireQuizPassing && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">with minimum score</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={minimumQuizScore}
                            onChange={(e) => setMinimumQuizScore(Number(e.target.value))}
                            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      )}
                    </div>

                    {/* Assignment passing */}
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={requireAssignmentPassing}
                        onChange={(e) => setRequireAssignmentPassing(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Require all assignments passed</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to delete this course?')) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Course'}
          </button>
          <div className="flex gap-3">
            <Link
              href="/courses"
              className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
