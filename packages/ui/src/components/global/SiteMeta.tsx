import React from 'react';
import { clsx } from 'clsx';
import { Globe, Image, Twitter, Search, Code, Building2 } from 'lucide-react';

export interface OrganizationSchema {
  name: string;
  url: string;
  logo: string;
  sameAs: string[];
}

export interface SiteMetaProps {
  siteName?: string;
  defaultMetaTitle?: string;
  defaultMetaDescription?: string;
  favicon?: string | null;
  ogDefaultImage?: string | null;
  twitterHandle?: string | null;
  googleSiteVerification?: string | null;
  customHeadCode?: string | null;
  organizationSchema?: OrganizationSchema | null;
  localBusinessSchema?: Record<string, unknown> | null;
  className?: string;
}

function MetaField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex-shrink-0 rounded-md bg-gray-100 p-2 text-gray-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm text-gray-700">
          {value || <span className="italic text-gray-300">Not set</span>}
        </p>
      </div>
    </div>
  );
}

export const SiteMeta: React.FC<SiteMetaProps> = ({
  siteName = '',
  defaultMetaTitle = '',
  defaultMetaDescription = '',
  favicon = null,
  ogDefaultImage = null,
  twitterHandle = null,
  googleSiteVerification = null,
  customHeadCode = null,
  organizationSchema = null,
  localBusinessSchema = null,
  className,
}) => {
  return (
    <div
      className={clsx(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        className,
      )}
    >
      <div className="border-b border-gray-100 px-6 py-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Globe className="h-5 w-5 text-blue-600" />
          Site Meta Configuration
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Global settings for SEO, social sharing, and structured data.
        </p>
      </div>

      <div className="divide-y divide-gray-100 px-6">
        <MetaField
          icon={<Globe className="h-4 w-4" />}
          label="Site Name"
          value={siteName}
        />
        <MetaField
          icon={<Search className="h-4 w-4" />}
          label="Default Meta Title"
          value={defaultMetaTitle}
        />
        <MetaField
          icon={<Search className="h-4 w-4" />}
          label="Default Meta Description"
          value={defaultMetaDescription}
        />
        <MetaField
          icon={<Image className="h-4 w-4" />}
          label="Favicon"
          value={favicon}
        />
        <MetaField
          icon={<Image className="h-4 w-4" />}
          label="OG Default Image"
          value={ogDefaultImage}
        />
        <MetaField
          icon={<Twitter className="h-4 w-4" />}
          label="Twitter Handle"
          value={twitterHandle}
        />
        <MetaField
          icon={<Search className="h-4 w-4" />}
          label="Google Site Verification"
          value={googleSiteVerification}
        />
        <MetaField
          icon={<Code className="h-4 w-4" />}
          label="Custom Head Code"
          value={customHeadCode ? 'Configured' : null}
        />
        <MetaField
          icon={<Building2 className="h-4 w-4" />}
          label="Organization Schema"
          value={organizationSchema ? organizationSchema.name : null}
        />
        <MetaField
          icon={<Building2 className="h-4 w-4" />}
          label="Local Business Schema"
          value={localBusinessSchema ? 'Configured' : null}
        />
      </div>
    </div>
  );
};
