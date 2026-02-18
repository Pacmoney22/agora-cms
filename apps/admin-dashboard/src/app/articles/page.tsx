'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsApi, usersApi } from '@/lib/api-client';
import { RichTextEditor } from '@/components/RichTextEditor';
import { MediaPicker } from '@/components/MediaPicker';

// ── Types ──

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  category: string;
  tags: string[];
  author: string;
  authorId: string;
  showAuthor: boolean;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt: string;
  scheduledAt: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogImage: string;
    ogTitle: string;
    ogDescription: string;
    ogType: string;
    twitterCard: 'summary' | 'summary_large_image';
    twitterTitle: string;
    twitterDescription: string;
    twitterImage: string;
  };
  allowComments: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ArticlesRegistry {
  articles: { id: string; title: string; status: string; slug: string; category: string; tags: string[]; publishedAt: string; createdAt: string }[];
  categories: string[];
}

interface RssFeedSettings {
  enabled: boolean;
  title: string;
  description: string;
  language: string;
  itemsPerFeed: number;
  contentType: 'full' | 'excerpt';
  includeFeaturedImage: boolean;
  feedUrl: string;
  copyright: string;
  ttl: number;
}

// ── Defaults ──

const DEFAULT_ARTICLE: Omit<Article, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featuredImage: '',
  category: '',
  tags: [],
  author: '',
  authorId: '',
  showAuthor: true,
  status: 'draft',
  publishedAt: '',
  scheduledAt: '',
  seo: {
    metaTitle: '',
    metaDescription: '',
    ogImage: '',
    ogTitle: '',
    ogDescription: '',
    ogType: 'article',
    twitterCard: 'summary_large_image',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
  },
  allowComments: true,
};

const DEFAULT_RSS: RssFeedSettings = {
  enabled: true,
  title: '',
  description: '',
  language: 'en',
  itemsPerFeed: 20,
  contentType: 'excerpt',
  includeFeaturedImage: true,
  feedUrl: '/feed.xml',
  copyright: '',
  ttl: 60,
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
};

// ── Component ──

export default function ArticlesPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'editor' | 'rss'>('list');
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content');
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showInlineImagePicker, setShowInlineImagePicker] = useState(false);

  // RSS state
  const [rss, setRss] = useState<RssFeedSettings>(DEFAULT_RSS);
  const [rssDirty, setRssDirty] = useState(false);

  // Load registry
  const { data: registry, isLoading } = useQuery({
    queryKey: ['settings', 'articles_registry'],
    queryFn: () => settingsApi.get('articles_registry').catch(() => ({ articles: [], categories: ['General', 'News', 'Tutorial', 'Announcement'] })),
  });

  // Load blog settings for configurable slug
  const { data: blogSettings } = useQuery({
    queryKey: ['settings', 'blog_settings'],
    queryFn: () => settingsApi.get('blog_settings').catch(() => ({ slug: 'blog' })),
  });
  const blogSlug = (blogSettings as any)?.slug || 'blog';

  // Load article categories
  const { data: categoriesData } = useQuery({
    queryKey: ['settings', 'article_categories'],
    queryFn: () => settingsApi.get('article_categories').catch(() => ({ categories: [] })),
  });
  const articleCategories: { id: string; name: string; slug: string }[] = (categoriesData as any)?.categories || [];

  // Load article tags
  const { data: tagsData } = useQuery({
    queryKey: ['settings', 'article_tags'],
    queryFn: () => settingsApi.get('article_tags').catch(() => ({ tags: [] })),
  });
  const articleTags: { id: string; name: string; slug: string; color: string }[] = (tagsData as any)?.tags || [];

  // Load eligible authors (editors, store_managers, admins, super_admins)
  const AUTHOR_ROLES = ['editor', 'store_manager', 'admin', 'super_admin'];
  const { data: allUsersData } = useQuery({
    queryKey: ['users', 'authors'],
    queryFn: () => usersApi.list({ limit: 200, isActive: 'true' }),
  });
  const eligibleAuthors = (allUsersData?.data || []).filter((u: any) => AUTHOR_ROLES.includes(u.role));

  // Load author profiles
  const { data: authorProfilesData } = useQuery({
    queryKey: ['settings', 'author_profiles'],
    queryFn: () => settingsApi.get('author_profiles').catch(() => ({ profiles: {} })),
  });
  const authorProfiles: Record<string, { bio: string; profileImage: string }> = (authorProfilesData as any)?.profiles || {};

  // Load RSS settings
  const { data: rssData } = useQuery({
    queryKey: ['settings', 'rss_feed'],
    queryFn: () => settingsApi.get('rss_feed').catch(() => DEFAULT_RSS),
  });

  const articles: ArticlesRegistry['articles'] = registry?.articles || [];
  const categories: string[] = registry?.categories || ['General', 'News', 'Tutorial', 'Announcement'];

  // Filter
  const filtered = articles.filter((a) => {
    if (filter && a.status !== filter) return false;
    if (categoryFilter && a.category !== categoryFilter) return false;
    return true;
  });

  // Save article
  const saveMutation = useMutation({
    mutationFn: async (article: Article) => {
      await settingsApi.update(`article_${article.id}`, article as any);
      const reg = registry || { articles: [], categories };
      const articlesArr = Array.isArray(reg.articles) ? reg.articles : [];
      const existing = articlesArr.findIndex((a: any) => a.id === article.id);
      const summary = {
        id: article.id,
        title: article.title,
        status: article.status,
        slug: article.slug,
        category: article.category,
        tags: article.tags || [],
        publishedAt: article.publishedAt,
        createdAt: article.createdAt,
      };
      if (existing >= 0) {
        articlesArr[existing] = summary;
      } else {
        articlesArr.unshift(summary);
      }
      await settingsApi.update('articles_registry', { ...reg, articles: articlesArr });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'articles_registry'] });
      toast.success('Article saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete article
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const reg = registry || { articles: [], categories };
      const articlesArr = Array.isArray(reg.articles) ? reg.articles : [];
      await settingsApi.update('articles_registry', { ...reg, articles: articlesArr.filter((a: any) => a.id !== id) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'articles_registry'] });
      toast.success('Article deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Save RSS
  const saveRssMutation = useMutation({
    mutationFn: (data: RssFeedSettings) => settingsApi.update('rss_feed', data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'rss_feed'] });
      toast.success('RSS settings saved');
      setRssDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Helpers ──

  const createArticle = () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    setEditingArticle({
      ...DEFAULT_ARTICLE,
      id,
      createdAt: now,
      updatedAt: now,
    } as Article);
    setActiveTab('content');
    setView('editor');
  };

  const editArticle = async (id: string) => {
    try {
      const data = await settingsApi.get(`article_${id}`);
      setEditingArticle(data);
      setActiveTab('content');
      setView('editor');
    } catch {
      toast.error('Failed to load article');
    }
  };

  const updateArticle = (patch: Partial<Article>) => {
    if (!editingArticle) return;
    setEditingArticle({ ...editingArticle, ...patch, updatedAt: new Date().toISOString() });
  };

  const autoSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const openRss = () => {
    setRss({ ...DEFAULT_RSS, ...rssData });
    setRssDirty(false);
    setView('rss');
  };

  const updateRss = (key: string, value: unknown) => {
    setRss((prev) => ({ ...prev, [key]: value }));
    setRssDirty(true);
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    const reg = registry || { articles: [], categories };
    const cats = Array.isArray(reg.categories) ? reg.categories : [];
    if (!cats.includes(newCategory.trim())) {
      const updatedReg = { ...reg, articles: Array.isArray(reg.articles) ? reg.articles : [], categories: [...cats, newCategory.trim()] };
      settingsApi.update('articles_registry', updatedReg).then(() => {
        queryClient.invalidateQueries({ queryKey: ['settings', 'articles_registry'] });
        toast.success('Category added');
      });
    }
    setNewCategory('');
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ── RSS Settings View ──

  if (view === 'rss') {
    return (
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button onClick={() => setView('list')} className="text-xs text-blue-600 hover:text-blue-800 mb-1">
              &larr; Back to Articles
            </button>
            <h1 className="text-2xl font-bold text-gray-900">RSS Feed Settings</h1>
            <p className="mt-1 text-sm text-gray-500">Configure the RSS feed for your blog articles</p>
          </div>
          <button
            onClick={() => saveRssMutation.mutate(rss)}
            disabled={!rssDirty || saveRssMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saveRssMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">RSS Feed</h2>
              <button
                onClick={() => updateRss('enabled', !rss.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${rss.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={rss.enabled}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${rss.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {rss.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Feed Title</label>
                    <input
                      type="text"
                      value={rss.title}
                      onChange={(e) => updateRss('title', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="My Blog"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Feed URL Path</label>
                    <input
                      type="text"
                      value={rss.feedUrl}
                      onChange={(e) => updateRss('feedUrl', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="/feed.xml"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Feed Description</label>
                  <textarea
                    value={rss.description}
                    onChange={(e) => updateRss('description', e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Latest articles and updates from our blog"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
                    <select
                      value={rss.language}
                      onChange={(e) => updateRss('language', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="pt">Portuguese</option>
                      <option value="ja">Japanese</option>
                      <option value="zh">Chinese</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Items Per Feed</label>
                    <input
                      type="number"
                      value={rss.itemsPerFeed}
                      onChange={(e) => updateRss('itemsPerFeed', parseInt(e.target.value) || 20)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      min={1}
                      max={100}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">TTL (minutes)</label>
                    <input
                      type="number"
                      value={rss.ttl}
                      onChange={(e) => updateRss('ttl', parseInt(e.target.value) || 60)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      min={1}
                    />
                    <p className="mt-1 text-[10px] text-gray-400">How long feed readers should cache before refreshing</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Content in Feed</label>
                    <select
                      value={rss.contentType}
                      onChange={(e) => updateRss('contentType', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="excerpt">Excerpt only</option>
                      <option value="full">Full content</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Copyright</label>
                    <input
                      type="text"
                      value={rss.copyright}
                      onChange={(e) => updateRss('copyright', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="&copy; 2026 Your Company"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rss.includeFeaturedImage}
                    onChange={(e) => updateRss('includeFeaturedImage', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
                  />
                  Include featured image in feed items (as enclosure)
                </label>
              </div>
            )}
          </div>

          {/* Category & Tag Management Links */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Manage Taxonomies</h2>
            <p className="text-xs text-gray-500 mb-3">Categories and tags now have their own dedicated management pages with full SEO, images, and hierarchy support.</p>
            <div className="flex gap-3">
              <a
                href="/article-categories"
                className="rounded-md bg-gray-100 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200"
              >
                Manage Categories
              </a>
              <a
                href="/article-tags"
                className="rounded-md bg-gray-100 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200"
              >
                Manage Tags
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Article Editor View ──

  if (view === 'editor' && editingArticle) {
    return (
      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button onClick={() => setView('list')} className="text-xs text-blue-600 hover:text-blue-800 mb-1">
              &larr; Back to Articles
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {editingArticle.createdAt === editingArticle.updatedAt ? 'New Article' : 'Edit Article'}
            </h1>
          </div>
          <div className="flex gap-2">
            {editingArticle.status === 'draft' && (
              <button
                onClick={() => {
                  const published = { ...editingArticle, status: 'published' as const, publishedAt: new Date().toISOString() };
                  saveMutation.mutate(published);
                  setEditingArticle(published);
                }}
                disabled={!editingArticle.title || saveMutation.isPending}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Publish
              </button>
            )}
            <button
              onClick={() => saveMutation.mutate(editingArticle)}
              disabled={!editingArticle.title || saveMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 border-b border-gray-200">
          {(['content', 'seo'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'content' ? 'Content' : 'SEO'}
            </button>
          ))}
        </div>

        {activeTab === 'content' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Main content */}
            <div className="col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editingArticle.title}
                  onChange={(e) => {
                    updateArticle({ title: e.target.value });
                    if (!editingArticle.slug || editingArticle.slug === autoSlug(editingArticle.title)) {
                      updateArticle({ title: e.target.value, slug: autoSlug(e.target.value) });
                    }
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Article title"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Slug</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">/{blogSlug}/</span>
                  <input
                    type="text"
                    value={editingArticle.slug}
                    onChange={(e) => updateArticle({ slug: e.target.value })}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="article-slug"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Excerpt</label>
                <textarea
                  value={editingArticle.excerpt}
                  onChange={(e) => updateArticle({ excerpt: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Brief summary for listings and RSS feeds..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
                <RichTextEditor
                  value={editingArticle.content}
                  onChange={(html) => updateArticle({ content: html })}
                  placeholder="Start writing your article..."
                  onInsertImage={() => setShowInlineImagePicker(true)}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Status */}
              <div className="rounded-lg bg-white p-4 shadow">
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editingArticle.status}
                  onChange={(e) => {
                    const status = e.target.value as Article['status'];
                    const patch: Partial<Article> = { status };
                    if (status === 'published' && !editingArticle.publishedAt) {
                      patch.publishedAt = new Date().toISOString();
                    }
                    updateArticle(patch);
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
                {editingArticle.status === 'scheduled' && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Publish Date</label>
                    <input
                      type="datetime-local"
                      value={editingArticle.scheduledAt?.slice(0, 16) || ''}
                      onChange={(e) => updateArticle({ scheduledAt: new Date(e.target.value).toISOString() })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="rounded-lg bg-white p-4 shadow">
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editingArticle.category}
                  onChange={(e) => updateArticle({ category: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select category...</option>
                  {articleCategories.length > 0
                    ? articleCategories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>{cat.name}</option>
                      ))
                    : categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                </select>
              </div>

              {/* Author */}
              <div className="rounded-lg bg-white p-4 shadow space-y-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Author</label>
                <select
                  value={editingArticle.authorId || ''}
                  onChange={(e) => {
                    const userId = e.target.value;
                    const user = eligibleAuthors.find((u: any) => u.id === userId);
                    updateArticle({
                      authorId: userId,
                      author: user?.name || '',
                    });
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select author...</option>
                  {eligibleAuthors.map((user: any) => {
                    const profile = authorProfiles[user.id];
                    return (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role}){profile?.bio ? ' *' : ''}
                      </option>
                    );
                  })}
                </select>

                {/* Selected author preview */}
                {editingArticle.authorId && (() => {
                  const authorUser = eligibleAuthors.find((u: any) => u.id === editingArticle.authorId);
                  const profile = authorProfiles[editingArticle.authorId];
                  if (!authorUser) return null;
                  return (
                    <div className="flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-2">
                      <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {profile?.profileImage ? (
                          <span className="text-[8px] text-gray-400">IMG</span>
                        ) : (
                          <span className="text-xs font-semibold text-gray-500">
                            {authorUser.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800">{authorUser.name}</p>
                        <p className="text-[10px] text-gray-400">{authorUser.email}</p>
                        {profile?.bio && (
                          <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{profile.bio}</p>
                        )}
                        {!profile?.bio && (
                          <p className="text-[10px] text-amber-500 mt-0.5">No author bio set. Edit in Users &gt; Author Profile.</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Show/hide author on page */}
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer pt-1 border-t border-gray-100">
                  <input
                    type="checkbox"
                    checked={editingArticle.showAuthor !== false}
                    onChange={(e) => updateArticle({ showAuthor: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
                  />
                  Show author on published page
                </label>
              </div>

              {/* Featured Image */}
              <div className="rounded-lg bg-white p-4 shadow">
                <MediaPicker
                  value={editingArticle.featuredImage}
                  onChange={(url) => updateArticle({ featuredImage: url })}
                  label="Featured Image"
                  accept="image/*"
                  helpText="Used as the main image for the article and social sharing"
                />
              </div>

              {/* Tags */}
              <div className="rounded-lg bg-white p-4 shadow">
                <label className="block text-xs font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {editingArticle.tags.map((tag) => {
                    const tagObj = articleTags.find((t) => t.slug === tag || t.name === tag);
                    return (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: tagObj?.color ? `${tagObj.color}20` : '#eff6ff',
                          color: tagObj?.color || '#1d4ed8',
                        }}
                      >
                        {tagObj?.color && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tagObj.color }} />
                        )}
                        {tagObj?.name || tag}
                        <button
                          onClick={() => updateArticle({ tags: editingArticle.tags.filter((t) => t !== tag) })}
                          className="opacity-60 hover:opacity-100"
                        >
                          &times;
                        </button>
                      </span>
                    );
                  })}
                </div>
                {articleTags.length > 0 ? (
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !editingArticle.tags.includes(e.target.value)) {
                        updateArticle({ tags: [...editingArticle.tags, e.target.value] });
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Add a tag...</option>
                    {articleTags
                      .filter((t) => !editingArticle.tags.includes(t.slug) && !editingArticle.tags.includes(t.name))
                      .map((t) => (
                        <option key={t.id} value={t.slug}>{t.name}</option>
                      ))}
                  </select>
                ) : (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTag.trim()) {
                          if (!editingArticle.tags.includes(newTag.trim())) {
                            updateArticle({ tags: [...editingArticle.tags, newTag.trim()] });
                          }
                          setNewTag('');
                        }
                      }}
                      className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      placeholder="Add tag..."
                    />
                    <button
                      onClick={() => {
                        if (newTag.trim() && !editingArticle.tags.includes(newTag.trim())) {
                          updateArticle({ tags: [...editingArticle.tags, newTag.trim()] });
                        }
                        setNewTag('');
                      }}
                      className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="rounded-lg bg-white p-4 shadow">
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingArticle.allowComments}
                    onChange={(e) => updateArticle({ allowComments: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 h-3.5 w-3.5"
                  />
                  Allow comments on this article
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="max-w-2xl space-y-4">
            {/* Basic SEO */}
            <div className="rounded-lg bg-white p-6 shadow space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Search Engine</h3>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">SEO Title</label>
                <input
                  type="text"
                  value={editingArticle.seo.metaTitle}
                  onChange={(e) => updateArticle({ seo: { ...editingArticle.seo, metaTitle: e.target.value } })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder={editingArticle.title || 'Defaults to article title'}
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  {(editingArticle.seo.metaTitle || editingArticle.title).length}/60 characters
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Meta Description</label>
                <textarea
                  value={editingArticle.seo.metaDescription}
                  onChange={(e) => updateArticle({ seo: { ...editingArticle.seo, metaDescription: e.target.value } })}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder={editingArticle.excerpt || 'Defaults to article excerpt'}
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  {(editingArticle.seo.metaDescription || editingArticle.excerpt).length}/160 characters
                </p>
              </div>

              {/* Search preview */}
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-medium text-gray-400 uppercase mb-2">Search Preview</p>
                <div>
                  <p className="text-blue-700 text-sm font-medium truncate">
                    {editingArticle.seo.metaTitle || editingArticle.title || 'Article Title'}
                  </p>
                  <p className="text-green-700 text-xs truncate">
                    yoursite.com/{blogSlug}/{editingArticle.slug || 'article-slug'}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                    {editingArticle.seo.metaDescription || editingArticle.excerpt || 'Article description will appear here...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Open Graph (Facebook / LinkedIn) */}
            <div className="rounded-lg bg-white p-6 shadow space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Facebook / Open Graph</h3>
                <span className="text-[10px] text-gray-400">Falls back to SEO values if empty</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">OG Title</label>
                <input
                  type="text"
                  value={editingArticle.seo.ogTitle}
                  onChange={(e) => updateArticle({ seo: { ...editingArticle.seo, ogTitle: e.target.value } })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder={editingArticle.seo.metaTitle || editingArticle.title || 'Defaults to SEO title'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">OG Description</label>
                <textarea
                  value={editingArticle.seo.ogDescription}
                  onChange={(e) => updateArticle({ seo: { ...editingArticle.seo, ogDescription: e.target.value } })}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder={editingArticle.seo.metaDescription || editingArticle.excerpt || 'Defaults to meta description'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">OG Type</label>
                <select
                  value={editingArticle.seo.ogType}
                  onChange={(e) => updateArticle({ seo: { ...editingArticle.seo, ogType: e.target.value } })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="article">Article</option>
                  <option value="website">Website</option>
                  <option value="blog">Blog</option>
                  <option value="product">Product</option>
                </select>
              </div>
              <MediaPicker
                value={editingArticle.seo.ogImage}
                onChange={(url) => updateArticle({ seo: { ...editingArticle.seo, ogImage: url } })}
                label="OG Image"
                accept="image/*"
                helpText="Recommended: 1200x630px. Falls back to featured image."
              />

              {/* OG Preview */}
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-medium text-gray-400 uppercase mb-2">Facebook Preview</p>
                <div className="rounded-md border border-gray-200 bg-white overflow-hidden max-w-sm">
                  <div className="h-28 bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                    {editingArticle.seo.ogImage || editingArticle.featuredImage
                      ? (editingArticle.seo.ogImage || editingArticle.featuredImage).split('/').pop()
                      : '1200 x 630'}
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase">yoursite.com</p>
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {editingArticle.seo.ogTitle || editingArticle.seo.metaTitle || editingArticle.title || 'Article Title'}
                    </p>
                    <p className="text-[10px] text-gray-500 line-clamp-2">
                      {editingArticle.seo.ogDescription || editingArticle.seo.metaDescription || editingArticle.excerpt || 'Description'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Twitter / X Card */}
            <div className="rounded-lg bg-white p-6 shadow space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Twitter / X Card</h3>
                <span className="text-[10px] text-gray-400">Falls back to OG values if empty</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Card Type</label>
                <select
                  value={editingArticle.seo.twitterCard}
                  onChange={(e) => updateArticle({ seo: { ...editingArticle.seo, twitterCard: e.target.value as 'summary' | 'summary_large_image' } })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="summary_large_image">Summary with Large Image</option>
                  <option value="summary">Summary</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editingArticle.seo.twitterTitle}
                  onChange={(e) => updateArticle({ seo: { ...editingArticle.seo, twitterTitle: e.target.value } })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder={editingArticle.seo.ogTitle || editingArticle.seo.metaTitle || editingArticle.title || 'Falls back to OG/SEO title'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingArticle.seo.twitterDescription}
                  onChange={(e) => updateArticle({ seo: { ...editingArticle.seo, twitterDescription: e.target.value } })}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder={editingArticle.seo.ogDescription || editingArticle.seo.metaDescription || 'Falls back to OG/meta description'}
                />
              </div>
              <MediaPicker
                value={editingArticle.seo.twitterImage}
                onChange={(url) => updateArticle({ seo: { ...editingArticle.seo, twitterImage: url } })}
                label="Twitter Image"
                accept="image/*"
                helpText="Recommended: 1200x600px for large image cards. Falls back to OG image."
              />

              {/* Twitter Preview */}
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-[10px] font-medium text-gray-400 uppercase mb-2">Twitter/X Preview</p>
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden max-w-sm">
                  {editingArticle.seo.twitterCard === 'summary_large_image' ? (
                    <>
                      <div className="h-32 bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                        {editingArticle.seo.twitterImage || editingArticle.seo.ogImage || editingArticle.featuredImage
                          ? (editingArticle.seo.twitterImage || editingArticle.seo.ogImage || editingArticle.featuredImage).split('/').pop()
                          : '1200 x 600'}
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {editingArticle.seo.twitterTitle || editingArticle.seo.ogTitle || editingArticle.seo.metaTitle || editingArticle.title || 'Article Title'}
                        </p>
                        <p className="text-[10px] text-gray-500 line-clamp-2">
                          {editingArticle.seo.twitterDescription || editingArticle.seo.ogDescription || editingArticle.seo.metaDescription || editingArticle.excerpt || 'Description'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">yoursite.com</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex">
                      <div className="h-20 w-20 shrink-0 bg-gray-200 flex items-center justify-center text-[8px] text-gray-400">
                        IMG
                      </div>
                      <div className="px-2.5 py-2 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">
                          {editingArticle.seo.twitterTitle || editingArticle.seo.ogTitle || editingArticle.title || 'Title'}
                        </p>
                        <p className="text-[10px] text-gray-500 line-clamp-2">
                          {editingArticle.seo.twitterDescription || editingArticle.seo.ogDescription || editingArticle.excerpt || 'Description'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">yoursite.com</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inline Image Picker for RichTextEditor */}
        {showInlineImagePicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Insert Image</h3>
                <button
                  onClick={() => setShowInlineImagePicker(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <MediaPicker
                value=""
                onChange={(url) => {
                  if (url) {
                    document.execCommand('insertHTML', false, `<img src="${url}" alt="" style="max-width:100%" />`);
                    if (editingArticle) {
                      updateArticle({ content: document.querySelector('[contenteditable]')?.innerHTML || editingArticle.content });
                    }
                  }
                  setShowInlineImagePicker(false);
                }}
                label="Select or upload an image"
                accept="image/*"
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowInlineImagePicker(false)}
                  className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── List View ──

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage blog posts and articles</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openRss}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            RSS Settings
          </button>
          <button
            onClick={createArticle}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Article
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {articleCategories.length > 0
            ? articleCategories.map((cat) => (
                <option key={cat.id} value={cat.slug}>{cat.name}</option>
              ))
            : categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} articles</span>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">
              {articles.length === 0 ? 'No articles yet. Create your first article.' : 'No articles match your filters.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Tags</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Published</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((article) => (
                <tr key={article.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{article.title}</p>
                      <p className="text-xs text-gray-400">/{blogSlug}/{article.slug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {article.category && (
                      <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        {articleCategories.find((c) => c.slug === article.category)?.name || article.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {(article.tags || []).slice(0, 3).map((tag) => {
                        const tagObj = articleTags.find((t) => t.slug === tag || t.name === tag);
                        return (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: tagObj?.color ? `${tagObj.color}20` : '#f3f4f6',
                              color: tagObj?.color || '#4b5563',
                            }}
                          >
                            {tagObj?.color && (
                              <span className="inline-block h-1 w-1 rounded-full" style={{ backgroundColor: tagObj.color }} />
                            )}
                            {tagObj?.name || tag}
                          </span>
                        );
                      })}
                      {(article.tags || []).length > 3 && (
                        <span className="text-[10px] text-gray-400">+{article.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[article.status] || ''}`}>
                      {article.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDate(article.publishedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => editArticle(article.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this article?')) deleteMutation.mutate(article.id);
                        }}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
