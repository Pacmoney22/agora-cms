import React from 'react';
import { clsx } from 'clsx';
import { ArrowRight, TrendingUp } from 'lucide-react';

export interface CaseStudyMetric {
  label: string;
  value: string;
}

export interface CaseStudy {
  title: string;
  client: string;
  logo?: string;
  image?: string;
  excerpt: string;
  url: string;
  metrics?: CaseStudyMetric[];
}

export interface CaseStudiesGridProps {
  studies?: CaseStudy[];
  columns?: 2 | 3;
  cardStyle?: 'standard' | 'overlay' | 'minimal';
  showMetrics?: boolean;
  showClientLogo?: boolean;
  showExcerpt?: boolean;
  className?: string;
}

const gridColsMap: Record<number, string> = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

export const CaseStudiesGrid: React.FC<CaseStudiesGridProps> = ({
  studies = [],
  columns = 3,
  cardStyle = 'standard',
  showMetrics = true,
  showClientLogo = true,
  showExcerpt = true,
  className,
}) => {
  if (studies.length === 0) return null;

  const renderStandard = (study: CaseStudy, index: number) => (
    <article
      key={index}
      className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {study.image && (
        <div className="overflow-hidden">
          <img
            src={study.image}
            alt={study.title}
            className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-5">
        {showClientLogo && study.logo && (
          <img
            src={study.logo}
            alt={study.client}
            className="mb-3 h-6 object-contain opacity-60"
          />
        )}
        {!study.logo && (
          <span className="mb-2 text-xs font-medium uppercase tracking-wider text-blue-600">
            {study.client}
          </span>
        )}
        <h3 className="text-lg font-semibold text-gray-900">{study.title}</h3>
        {showExcerpt && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-3">{study.excerpt}</p>
        )}

        {showMetrics && study.metrics && study.metrics.length > 0 && (
          <div className="mt-4 flex gap-4 border-t border-gray-100 pt-4">
            {study.metrics.map((metric, i) => (
              <div key={i} className="text-center">
                <div className="text-lg font-bold text-blue-600">{metric.value}</div>
                <div className="text-xs text-gray-500">{metric.label}</div>
              </div>
            ))}
          </div>
        )}

        <a
          href={study.url}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
        >
          Read Case Study
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </article>
  );

  const renderOverlay = (study: CaseStudy, index: number) => (
    <article
      key={index}
      className="group relative overflow-hidden rounded-xl"
    >
      <a href={study.url} className="block">
        <img
          src={study.image || ''}
          alt={study.title}
          className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          {showClientLogo && study.logo ? (
            <img src={study.logo} alt={study.client} className="mb-3 h-5 object-contain brightness-0 invert" />
          ) : (
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/70">
              {study.client}
            </span>
          )}
          <h3 className="text-xl font-bold">{study.title}</h3>
          {showMetrics && study.metrics && study.metrics.length > 0 && (
            <div className="mt-3 flex gap-4">
              {study.metrics.map((metric, i) => (
                <div key={i}>
                  <div className="text-lg font-bold">{metric.value}</div>
                  <div className="text-xs text-white/70">{metric.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </a>
    </article>
  );

  const renderMinimal = (study: CaseStudy, index: number) => (
    <article
      key={index}
      className="group border-b border-gray-200 py-6 last:border-0"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {showClientLogo && study.logo ? (
            <img src={study.logo} alt={study.client} className="mb-2 h-5 object-contain opacity-60" />
          ) : (
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
              {study.client}
            </span>
          )}
          <a href={study.url}>
            <h3 className="text-lg font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
              {study.title}
            </h3>
          </a>
          {showExcerpt && (
            <p className="mt-1 text-sm text-gray-600">{study.excerpt}</p>
          )}
        </div>
        {showMetrics && study.metrics && study.metrics.length > 0 && (
          <div className="flex gap-4">
            {study.metrics.slice(0, 2).map((metric, i) => (
              <div key={i} className="text-right">
                <div className="flex items-center gap-1 text-lg font-bold text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  {metric.value}
                </div>
                <div className="text-xs text-gray-500">{metric.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );

  const renderers: Record<string, (study: CaseStudy, index: number) => React.ReactNode> = {
    standard: renderStandard,
    overlay: renderOverlay,
    minimal: renderMinimal,
  };

  const renderer = renderers[cardStyle] || renderStandard;

  if (cardStyle === 'minimal') {
    return (
      <div className={clsx('w-full', className)}>
        {studies.map((study, i) => renderer(study, i))}
      </div>
    );
  }

  return (
    <div
      className={clsx('grid gap-6', gridColsMap[columns], className)}
    >
      {studies.map((study, i) => renderer(study, i))}
    </div>
  );
};
