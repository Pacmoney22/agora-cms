'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi, mediaApi } from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { RichTextEditor } from '@/components/RichTextEditor';

interface LessonAttachment {
  type: string;
  title: string;
  mediaId?: string;
  url?: string;
}

interface Lesson {
  id: string;
  title: string;
  lessonType?: string;
  content?: string;
  videoUrl?: string;
  videoDuration?: number;
  position: number;
  attachments?: LessonAttachment[];
}

interface Section {
  id: string;
  title: string;
  description?: string;
  position: number;
  lessons?: Lesson[];
}

/** Small wrapper to embed RichTextEditor inside a form (needs own state) */
function InlineRichContentField({ defaultValue }: { defaultValue: string }) {
  const [html, setHtml] = useState(defaultValue);
  return (
    <>
      <input type="hidden" name="content" value={html} />
      <RichTextEditor value={html} onChange={setHtml} placeholder="Write your lesson content..." />
    </>
  );
}

export default function CourseCurriculumPage() {
  const params = useParams();
  const courseId = params.id as string;
  const queryClient = useQueryClient();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showAddSection, setShowAddSection] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [addingLessonToSection, setAddingLessonToSection] = useState<string | null>(null);

  // Fetch course details
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesApi.get(courseId),
  });

  // Fetch sections with lessons
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['sections', courseId],
    queryFn: () => coursesApi.listSections(courseId),
  });

  // Create section mutation
  const createSectionMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) => {
      const position = sections ? sections.length + 1 : 1;
      return coursesApi.createSection(courseId, { ...data, position });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', courseId] });
      toast.success('Section created successfully');
      setShowAddSection(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create section');
    },
  });

  // Update section mutation
  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      coursesApi.updateSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', courseId] });
      toast.success('Section updated successfully');
      setEditingSection(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update section');
    },
  });

  // Delete section mutation
  const deleteSectionMutation = useMutation({
    mutationFn: (id: string) => coursesApi.deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', courseId] });
      toast.success('Section deleted successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete section');
    },
  });

  // Create lesson mutation
  const createLessonMutation = useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: any }) => {
      const section = sections?.find((s: Section) => s.id === sectionId);
      const position = section?.lessons ? section.lessons.length + 1 : 1;
      return coursesApi.createLesson(sectionId, { ...data, position });
    },
    onSuccess: async (lesson: any) => {
      queryClient.invalidateQueries({ queryKey: ['sections', courseId] });
      toast.success('Lesson created successfully');
      setAddingLessonToSection(null);

      // Auto-create a quiz for quiz-type lessons
      if (lesson?.lessonType === 'quiz' && lesson?.id) {
        try {
          await coursesApi.createQuiz(lesson.id, {
            title: `${lesson.title} Quiz`,
            description: '',
            passingScore: 70,
            maxAttempts: 3,
            questions: [],
          });
          queryClient.invalidateQueries({ queryKey: ['all-quizzes', courseId] });
          toast.success('Quiz auto-created — open Quiz Builder to add questions');
        } catch {
          toast.error('Lesson created but quiz auto-creation failed. Create it manually in Quiz Builder.');
        }
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create lesson');
    },
  });

  // Update lesson mutation
  const updateLessonMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      coursesApi.updateLesson(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', courseId] });
      toast.success('Lesson updated successfully');
      setEditingLesson(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update lesson');
    },
  });

  // Delete lesson mutation
  const deleteLessonMutation = useMutation({
    mutationFn: (id: string) => coursesApi.deleteLesson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', courseId] });
      toast.success('Lesson deleted successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete lesson');
    },
  });

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

  const handleCreateSection = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (title.trim()) {
      createSectionMutation.mutate({
        title: title.trim(),
        description: description.trim() || undefined,
      });
    }
  };

  const handleUpdateSection = (e: React.FormEvent<HTMLFormElement>, sectionId: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (title.trim()) {
      updateSectionMutation.mutate({
        id: sectionId,
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
        },
      });
    }
  };

  const handleCreateLesson = (e: React.FormEvent<HTMLFormElement>, sectionId: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = (formData.get('title') as string | null) || '';
    const lessonType = (formData.get('lessonType') as string | null) || 'video';
    const content = (formData.get('content') as string | null) || '';
    const videoUrl = (formData.get('videoUrl') as string | null) || '';
    const videoDuration = (formData.get('videoDuration') as string | null) || '';
    const isFreePreview = formData.get('isFreePreview') === 'on';
    const attachmentsJson = (formData.get('attachments') as string | null) || '[]';

    let attachments: LessonAttachment[] | undefined;
    try {
      const parsed = JSON.parse(attachmentsJson);
      if (Array.isArray(parsed) && parsed.length > 0) attachments = parsed;
    } catch { /* ignore parse errors */ }

    if (title.trim()) {
      createLessonMutation.mutate({
        sectionId,
        data: {
          title: title.trim(),
          type: lessonType,
          content: content.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
          duration: videoDuration ? Number.parseInt(videoDuration, 10) : undefined,
          isFreePreview,
          attachments,
        },
      });
    }
  };

  const handleUpdateLesson = (e: React.FormEvent<HTMLFormElement>, lessonId: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = (formData.get('title') as string | null) || '';
    const content = (formData.get('content') as string | null) || '';
    const videoUrl = (formData.get('videoUrl') as string | null) || '';
    const videoDuration = (formData.get('videoDuration') as string | null) || '';
    const attachmentsJson = (formData.get('attachments') as string | null) || '';

    let attachments: LessonAttachment[] | undefined;
    if (attachmentsJson) {
      try {
        const parsed = JSON.parse(attachmentsJson);
        if (Array.isArray(parsed)) attachments = parsed;
      } catch { /* ignore parse errors */ }
    }

    if (title.trim()) {
      updateLessonMutation.mutate({
        id: lessonId,
        data: {
          title: title.trim(),
          content: content.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
          duration: videoDuration ? parseInt(videoDuration, 10) : undefined,
          ...(attachments !== undefined && { attachments }),
        },
      });
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (courseLoading || sectionsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
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
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
          <Link href="/courses" className="hover:text-blue-600">
            Courses
          </Link>
          <span>/</span>
          <span>{course.title}</span>
        </div>
        <h1 className="mb-2 text-3xl font-bold">{course.title}</h1>
        {course.description && (
          <p className="text-gray-600">{course.description}</p>
        )}
      </div>

      {/* Sections List */}
      <div className="mb-6 space-y-4">
        {sections && sections.length > 0 ? (
          sections.map((section: Section) => (
            <div
              key={section.id}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow"
            >
              {/* Section Header */}
              <div className="bg-gray-50 p-4">
                {editingSection === section.id ? (
                  <form
                    onSubmit={(e) => handleUpdateSection(e, section.id)}
                    className="space-y-3"
                  >
                    <input
                      name="title"
                      type="text"
                      defaultValue={section.title}
                      placeholder="Section Title"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                      required
                    />
                    <textarea
                      name="description"
                      defaultValue={section.description || ''}
                      placeholder="Section Description (optional)"
                      rows={2}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={updateSectionMutation.isPending}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updateSectionMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSection(null)}
                        className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="mb-1 flex items-center gap-2 text-left"
                      >
                        <svg
                          className={`h-5 w-5 transition-transform ${
                            expandedSections.has(section.id) ? 'rotate-90' : ''
                          }`}
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
                        <h2 className="text-xl font-semibold">{section.title}</h2>
                      </button>
                      {section.description && (
                        <p className="ml-7 text-sm text-gray-600">{section.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingSection(section.id)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this section?')) {
                            deleteSectionMutation.mutate(section.id);
                          }
                        }}
                        disabled={deleteSectionMutation.isPending}
                        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lessons List */}
              {expandedSections.has(section.id) && (
                <div className="p-4">
                  {section.lessons && section.lessons.length > 0 ? (
                    <div className="mb-4 space-y-2">
                      {section.lessons.map((lesson: Lesson) => (
                        <div
                          key={lesson.id}
                          className="rounded-lg border border-gray-200 p-3"
                        >
                          {editingLesson === lesson.id ? (
                            <form
                              onSubmit={(e) => handleUpdateLesson(e, lesson.id)}
                              className="space-y-3"
                            >
                              <input
                                name="title"
                                type="text"
                                defaultValue={lesson.title}
                                placeholder="Lesson Title"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                                required
                              />
                              {lesson.lessonType === 'text' ? (
                                <InlineRichContentField defaultValue={lesson.content || ''} />
                              ) : (
                                <textarea
                                  name="content"
                                  defaultValue={lesson.content || ''}
                                  placeholder="Lesson Content (optional)"
                                  rows={3}
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                                />
                              )}
                              <input
                                name="videoUrl"
                                type="text"
                                defaultValue={lesson.videoUrl || ''}
                                placeholder="Video URL (YouTube/Vimeo embed)"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                              <input
                                name="videoDuration"
                                type="number"
                                defaultValue={lesson.videoDuration || ''}
                                placeholder="Video Duration (seconds)"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  disabled={updateLessonMutation.isPending}
                                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {updateLessonMutation.isPending ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingLesson(null)}
                                  className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {/* Lesson type icon */}
                                {lesson.lessonType === 'quiz' ? (
                                  <svg className="mt-1 h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                ) : lesson.lessonType === 'assignment' ? (
                                  <svg className="mt-1 h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                ) : lesson.lessonType === 'text' ? (
                                  <svg className="mt-1 h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                ) : lesson.lessonType === 'resource' ? (
                                  <svg className="mt-1 h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                ) : (lesson.videoUrl || lesson.lessonType === 'video') ? (
                                  <svg
                                    className="mt-1 h-5 w-5 text-purple-600"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                                  </svg>
                                ) : null}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-medium">{lesson.title}</h3>
                                    {lesson.lessonType && (
                                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                        lesson.lessonType === 'video' ? 'bg-purple-100 text-purple-700' :
                                        lesson.lessonType === 'text' ? 'bg-blue-100 text-blue-700' :
                                        lesson.lessonType === 'quiz' ? 'bg-orange-100 text-orange-700' :
                                        lesson.lessonType === 'assignment' ? 'bg-green-100 text-green-700' :
                                        lesson.lessonType === 'resource' ? 'bg-gray-100 text-gray-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {lesson.lessonType.charAt(0).toUpperCase() + lesson.lessonType.slice(1)}
                                      </span>
                                    )}
                                  </div>
                                  {lesson.videoDuration && (
                                    <p className="text-sm text-gray-500">
                                      Duration: {formatDuration(lesson.videoDuration)}
                                    </p>
                                  )}
                                  {lesson.lessonType === 'resource' && Array.isArray(lesson.attachments) && lesson.attachments.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                        {lesson.attachments.length} file{lesson.attachments.length !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {lesson.lessonType === 'quiz' && (
                                  <Link
                                    href={`/courses/${courseId}/quizzes`}
                                    className="text-sm text-orange-600 hover:text-orange-800"
                                  >
                                    Manage Quiz
                                  </Link>
                                )}
                                {lesson.lessonType === 'assignment' && (
                                  <Link
                                    href="/grading"
                                    className="text-sm text-green-600 hover:text-green-800"
                                  >
                                    Submissions
                                  </Link>
                                )}
                                <button
                                  onClick={() => setEditingLesson(lesson.id)}
                                  className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this lesson?')) {
                                      deleteLessonMutation.mutate(lesson.id);
                                    }
                                  }}
                                  disabled={deleteLessonMutation.isPending}
                                  className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-4 text-sm text-gray-500">No lessons yet</p>
                  )}

                  {/* Add Lesson Form */}
                  {addingLessonToSection === section.id ? (
                    <LessonForm
                      onSubmit={(e) => handleCreateLesson(e, section.id)}
                      isPending={createLessonMutation.isPending}
                      onCancel={() => setAddingLessonToSection(null)}
                      submitLabel="Create Lesson"
                      pendingLabel="Creating..."
                    />
                  ) : (
                    <button
                      onClick={() => setAddingLessonToSection(section.id)}
                      className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                    >
                      Add Lesson
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <p className="text-gray-500">No sections yet. Create your first section to get started.</p>
          </div>
        )}
      </div>

      {/* Add Section Button/Form */}
      {showAddSection ? (
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
          <h2 className="mb-3 text-lg font-semibold">Create New Section</h2>
          <form onSubmit={handleCreateSection} className="space-y-3">
            <input
              name="title"
              type="text"
              placeholder="Section Title"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
            <textarea
              name="description"
              placeholder="Section Description (optional)"
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createSectionMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {createSectionMutation.isPending ? 'Creating...' : 'Create Section'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddSection(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowAddSection(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Add Section
        </button>
      )}
    </div>
  );
}

// ── Lesson Form Component ──

const LESSON_TYPES = [
  { value: 'video', label: 'Video Lesson', description: 'Lesson centered around a video with optional text content' },
  { value: 'text', label: 'Text / Reading', description: 'Written content, articles, or reading material' },
  { value: 'quiz', label: 'Quiz', description: 'Assessment or knowledge-check quiz' },
  { value: 'assignment', label: 'Assignment', description: 'Hands-on exercise or homework assignment' },
  { value: 'resource', label: 'Resource', description: 'Downloadable files, links, or reference materials' },
];

function LessonForm({
  onSubmit,
  isPending,
  onCancel,
  submitLabel,
  pendingLabel,
  defaults,
}: {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  onCancel: () => void;
  submitLabel: string;
  pendingLabel: string;
  defaults?: { title?: string; content?: string; videoUrl?: string; videoDuration?: number; isFreePreview?: boolean; attachments?: LessonAttachment[] };
}) {
  const queryClient = useQueryClient();
  const [lessonType, setLessonType] = useState<string>(
    defaults?.videoUrl ? 'video' : defaults?.content ? 'text' : '',
  );
  const [attachments, setAttachments] = useState<LessonAttachment[]>(defaults?.attachments || []);
  const [richContent, setRichContent] = useState(defaults?.content || '');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);
  const [mediaPage, setMediaPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkTitleRef = useRef<HTMLInputElement>(null);
  const linkUrlRef = useRef<HTMLInputElement>(null);

  const { data: mediaData, isLoading: mediaLoading } = useQuery({
    queryKey: ['media-picker-attachments', { page: mediaPage }],
    queryFn: () => mediaApi.list({ page: mediaPage, limit: 12 }),
    enabled: showMediaBrowser,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => mediaApi.upload(file),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['media-picker-attachments'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setAttachments((prev) => [
        ...prev,
        {
          type: 'file',
          title: result.originalName || result.filename || 'Uploaded file',
          mediaId: result.id,
          url: `/api/v1/media/${result.id}/url`,
        },
      ]);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addFromLibrary = (item: any) => {
    setAttachments((prev) => [
      ...prev,
      {
        type: 'file',
        title: item.originalName || 'Media file',
        mediaId: item.id,
        url: `/api/v1/media/${item.id}/url`,
      },
    ]);
    setShowMediaBrowser(false);
  };

  const addExternalLink = () => {
    const linkTitle = (linkTitleRef.current?.value || '').trim();
    const linkUrl = (linkUrlRef.current?.value || '').trim();
    if (!linkTitle || !linkUrl) return;
    setAttachments((prev) => [...prev, { type: 'link', title: linkTitle, url: linkUrl }]);
    setShowLinkForm(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const showVideoFields = lessonType === 'video';
  const showAttachmentFields = lessonType === 'resource';

  const contentPlaceholders: Record<string, string> = {
    text: 'Lesson content (Markdown or HTML)...',
    video: 'Optional lesson notes or transcript...',
    quiz: 'Quiz instructions or description...',
    assignment: 'Assignment instructions and requirements...',
    resource: 'Description of the resources provided...',
  };

  const getFileIcon = (att: LessonAttachment) => {
    if (att.type === 'link') return '\uD83D\uDD17';
    const title = att.title.toLowerCase();
    if (title.endsWith('.pdf')) return '\uD83D\uDCC4';
    if (title.endsWith('.doc') || title.endsWith('.docx')) return '\uD83D\uDCC3';
    if (title.endsWith('.xls') || title.endsWith('.xlsx')) return '\uD83D\uDCCA';
    if (title.endsWith('.zip') || title.endsWith('.rar')) return '\uD83D\uDDDC\uFE0F';
    if (title.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return '\uD83D\uDDBC\uFE0F';
    return '\uD83D\uDCC1';
  };

  return (
    <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
      <h3 className="mb-3 text-lg font-semibold">
        {defaults ? 'Edit Lesson' : 'Add New Lesson'}
      </h3>
      <form onSubmit={onSubmit} className="space-y-3">
        {/* Hidden field to serialize attachments */}
        <input type="hidden" name="attachments" value={JSON.stringify(attachments)} />
        {lessonType === 'text' && (
          <input type="hidden" name="content" value={richContent} />
        )}

        {/* Lesson Type Selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Lesson Type
          </label>
          <div className="flex gap-2">
            {LESSON_TYPES.map((type) => (
              <label
                key={type.value}
                className={`flex-1 cursor-pointer rounded-lg border-2 p-3 transition-colors ${
                  lessonType === type.value
                    ? 'border-green-500 bg-green-100'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="lessonType"
                  value={type.value}
                  checked={lessonType === type.value}
                  onChange={() => setLessonType(type.value)}
                  className="sr-only"
                />
                <p className="text-sm font-semibold text-gray-900">{type.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{type.description}</p>
              </label>
            ))}
          </div>
        </div>

        <input
          name="title"
          type="text"
          defaultValue={defaults?.title || ''}
          placeholder="Lesson Title"
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          required
        />

        {/* Content - rich editor for text lessons, textarea for others */}
        {lessonType && lessonType === 'text' ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Lesson Content</label>
            <RichTextEditor
              value={richContent}
              onChange={setRichContent}
              placeholder="Write your lesson content..."
            />
          </div>
        ) : lessonType ? (
          <textarea
            name="content"
            defaultValue={defaults?.content || ''}
            placeholder={contentPlaceholders[lessonType] || 'Lesson content...'}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        ) : null}

        {/* Video fields - shown for video type */}
        {showVideoFields && (
          <>
            <input
              name="videoUrl"
              type="text"
              defaultValue={defaults?.videoUrl || ''}
              placeholder="Video URL (YouTube/Vimeo embed)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
            <input
              name="videoDuration"
              type="number"
              min="0"
              defaultValue={defaults?.videoDuration || ''}
              placeholder="Video Duration (seconds)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </>
        )}

        {/* Attachments - shown for resource type */}
        {showAttachmentFields && (
          <div className="rounded-lg border border-gray-300 bg-white p-3">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Attachments
            </label>

            {/* Current attachments list */}
            {attachments.length > 0 && (
              <div className="mb-3 space-y-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <span className="text-base">{getFileIcon(att)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{att.title}</p>
                      <p className="truncate text-xs text-gray-500">
                        {att.type === 'link' ? att.url : `Media ID: ${att.mediaId}`}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      att.type === 'link' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {att.type === 'link' ? 'Link' : 'File'}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-red-500 hover:text-red-700"
                      title="Remove attachment"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
              </button>
              <button
                type="button"
                onClick={() => setShowMediaBrowser(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Browse Media Library
              </button>
              <button
                type="button"
                onClick={() => setShowLinkForm(!showLinkForm)}
                className="inline-flex items-center gap-1.5 rounded-md bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Link External URL
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* External link form */}
            {showLinkForm && (
              <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                  <input
                    ref={linkTitleRef}
                    type="text"
                    placeholder="Link title (e.g., Course Slides)"
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    ref={linkUrlRef}
                    type="url"
                    placeholder="https://example.com/resource.pdf"
                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExternalLink(); } }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addExternalLink}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
                    >
                      Add Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLinkForm(false)}
                      className="rounded-md bg-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Media browser modal */}
            {showMediaBrowser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowMediaBrowser(false)}>
                <div className="mx-4 w-full max-w-2xl rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">Select from Media Library</h3>
                    <button onClick={() => setShowMediaBrowser(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
                  </div>
                  <div className="p-5">
                    {mediaLoading ? (
                      <div className="py-12 text-center text-sm text-gray-400">Loading media...</div>
                    ) : mediaData?.data?.length ? (
                      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                        {mediaData.data.map((item: any) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => addFromLibrary(item)}
                            className="group rounded-lg border border-gray-200 bg-white overflow-hidden hover:border-blue-500 hover:ring-2 hover:ring-blue-200 transition-all text-left"
                          >
                            <div className="aspect-square bg-gray-100 flex items-center justify-center">
                              {item.mimeType?.startsWith('image/') ? (
                                <span className="text-[9px] text-gray-400 p-1 text-center break-all line-clamp-3">{item.originalName}</span>
                              ) : (
                                <span className="text-xl text-gray-300">{'\uD83D\uDCC4'}</span>
                              )}
                            </div>
                            <div className="px-1.5 py-1">
                              <p className="truncate text-[10px] font-medium text-gray-700">{item.originalName}</p>
                              <p className="text-[9px] text-gray-400">{item.mimeType}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-sm text-gray-400">No files in media library</div>
                    )}
                    {mediaData?.meta && mediaData.meta.totalPages > 1 && (
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-[10px] text-gray-400">Page {mediaData.meta.page} of {mediaData.meta.totalPages}</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setMediaPage((p) => Math.max(1, p - 1))} disabled={mediaPage <= 1} className="rounded bg-gray-100 px-2 py-1 text-[10px] disabled:opacity-50">Prev</button>
                          <button type="button" onClick={() => setMediaPage((p) => p + 1)} disabled={mediaPage >= mediaData.meta.totalPages} className="rounded bg-gray-100 px-2 py-1 text-[10px] disabled:opacity-50">Next</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-200 px-5 py-3 flex justify-end">
                    <button type="button" onClick={() => setShowMediaBrowser(false)} className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {attachments.length === 0 && (
              <p className="mt-2 text-xs text-gray-400">
                No attachments yet. Upload files, browse the media library, or link external URLs.
              </p>
            )}
          </div>
        )}

        {/* Free preview toggle */}
        {lessonType && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isFreePreview"
              defaultChecked={defaults?.isFreePreview || false}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Free preview (visible without enrollment)</span>
          </label>
        )}

        {!lessonType && (
          <p className="text-sm text-amber-600">Please select a lesson type above to continue.</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending || !lessonType}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? pendingLabel : submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
