import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { Search, ChevronDown, HelpCircle } from 'lucide-react';

export interface FAQCategory {
  label: string;
  slug: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

export interface SearchableFAQProps {
  categories?: FAQCategory[];
  items?: FAQItem[];
  showSearch?: boolean;
  searchPlaceholder?: string;
  showCategories?: boolean;
  emptyMessage?: string;
  faqSchema?: boolean;
  className?: string;
}

function FAQJsonLd({ items }: { items: FAQItem[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export const SearchableFAQ: React.FC<SearchableFAQProps> = ({
  categories = [],
  items = [],
  showSearch = true,
  searchPlaceholder = 'Search frequently asked questions...',
  showCategories = true,
  emptyMessage = 'No matching questions found.',
  faqSchema = true,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const filteredItems = useMemo(() => {
    let filtered = items;

    if (activeCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [items, activeCategory, searchQuery]);

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <section className={clsx('w-full', className)}>
      {faqSchema && items.length > 0 && <FAQJsonLd items={items} />}

      {/* Search */}
      {showSearch && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Search FAQ"
          />
        </div>
      )}

      {/* Category Filter */}
      {showCategories && categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={clsx(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              activeCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={clsx(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                activeCategory === cat.slug
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* FAQ Items */}
      {filteredItems.length > 0 ? (
        <div className="divide-y divide-gray-200 rounded-xl border border-gray-200">
          {filteredItems.map((item, index) => {
            const isOpen = openItems.has(index);
            return (
              <div key={index}>
                <button
                  onClick={() => toggleItem(index)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="pr-4 font-medium text-gray-900">{item.question}</span>
                  <ChevronDown
                    className={clsx(
                      'h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-200',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
                <div
                  id={`faq-answer-${index}`}
                  role="region"
                  className={clsx(
                    'overflow-hidden transition-all duration-200',
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
                  )}
                >
                  <div className="px-5 pb-4 text-gray-600 leading-relaxed">
                    {item.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <HelpCircle className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      )}
    </section>
  );
};
