'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Lesson {
  id: string;
  title: string;
  content?: string;
  videoUrl?: string;
  videoDuration?: number;
  position: number;
}

interface Section {
  id: string;
  title: string;
  description?: string;
  position: number;
  lessons?: Lesson[];
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', courseId] });
      toast.success('Lesson created successfully');
      setAddingLessonToSection(null);
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
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const videoUrl = formData.get('videoUrl') as string;
    const videoDuration = formData.get('videoDuration') as string;

    if (title.trim()) {
      createLessonMutation.mutate({
        sectionId,
        data: {
          title: title.trim(),
          content: content.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
          videoDuration: videoDuration ? parseInt(videoDuration, 10) : undefined,
        },
      });
    }
  };

  const handleUpdateLesson = (e: React.FormEvent<HTMLFormElement>, lessonId: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const videoUrl = formData.get('videoUrl') as string;
    const videoDuration = formData.get('videoDuration') as string;

    if (title.trim()) {
      updateLessonMutation.mutate({
        id: lessonId,
        data: {
          title: title.trim(),
          content: content.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
          videoDuration: videoDuration ? parseInt(videoDuration, 10) : undefined,
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
                              <textarea
                                name="content"
                                defaultValue={lesson.content || ''}
                                placeholder="Lesson Content (optional)"
                                rows={3}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                              />
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
                                {lesson.videoUrl && (
                                  <svg
                                    className="mt-1 h-5 w-5 text-purple-600"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                                  </svg>
                                )}
                                <div>
                                  <h3 className="font-medium">{lesson.title}</h3>
                                  {lesson.videoDuration && (
                                    <p className="text-sm text-gray-500">
                                      Duration: {formatDuration(lesson.videoDuration)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
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
                    <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                      <h3 className="mb-3 text-lg font-semibold">Add New Lesson</h3>
                      <form
                        onSubmit={(e) => handleCreateLesson(e, section.id)}
                        className="space-y-3"
                      >
                        <input
                          name="title"
                          type="text"
                          placeholder="Lesson Title"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                          required
                        />
                        <textarea
                          name="content"
                          placeholder="Lesson Content (optional)"
                          rows={3}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                        <input
                          name="videoUrl"
                          type="text"
                          placeholder="Video URL (YouTube/Vimeo embed)"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                        <input
                          name="videoDuration"
                          type="number"
                          placeholder="Video Duration (seconds)"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={createLessonMutation.isPending}
                            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {createLessonMutation.isPending ? 'Creating...' : 'Create Lesson'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingLessonToSection(null)}
                            className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
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
