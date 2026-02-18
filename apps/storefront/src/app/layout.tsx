import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { CartProvider } from '@/lib/cart-context';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { getPublicSettings, getThemeCss, getPageById } from '@/lib/content-client';
import { SiteStatusPage } from '@/components/site-status-page';
import { ComponentRenderer } from '@/components/renderers/component-renderer';
import { type ComponentTree, buildGoogleFontsUrl } from '@agora-cms/shared';

const inter = Inter({ subsets: ['latin'] });

/**
 * Try to render a CMS page by ID via ComponentRenderer.
 * Returns null if the page can't be loaded or has no component tree.
 */
async function renderCmsPage(pageId: string): Promise<React.ReactNode | null> {
  const page = await getPageById(pageId);
  const root = (page?.componentTree as ComponentTree | null)?.root ?? null;
  return root ? <ComponentRenderer instance={root} /> : null;
}

/**
 * Resolve the status page content (coming soon / maintenance) based on site settings.
 * Returns null if the site is live and not in maintenance mode.
 */
async function resolveStatusPage(siteStatus: Record<string, any> | undefined): Promise<React.ReactNode | null> {
  if (!siteStatus) return null;

  // Maintenance mode takes priority over coming-soon
  if (siteStatus.maintenance?.enabled) {
    const m = siteStatus.maintenance;
    if (m.pageSource === 'page-builder' && m.maintenancePageId) {
      const cmsContent = await renderCmsPage(m.maintenancePageId);
      if (cmsContent) return cmsContent;
    }
    return <SiteStatusPage headline={m.headline} message={m.message} />;
  }

  // Coming soon (site not live)
  if (!siteStatus.isLive && siteStatus.comingSoon) {
    const cs = siteStatus.comingSoon;
    if (cs.pageSource === 'page-builder' && cs.comingSoonPageId) {
      const cmsContent = await renderCmsPage(cs.comingSoonPageId);
      if (cmsContent) return cmsContent;
    }
    return (
      <SiteStatusPage
        headline={cs.headline}
        message={cs.message}
        showCountdown={cs.showCountdown}
        countdownTarget={cs.launchDate || null}
        showNewsletter={cs.showEmailSignup}
        socialLinks={cs.socialLinks}
        backgroundColor={cs.backgroundColor}
      />
    );
  }

  return null;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const seo = settings?.seo;
  const general = settings?.general;

  return {
    title: seo?.defaultTitle || general?.siteName || 'Agora CMS - Storefront',
    description: seo?.defaultDescription || 'E-commerce storefront powered by Agora CMS',
    openGraph: {
      title: seo?.defaultTitle || general?.siteName,
      description: seo?.defaultDescription || undefined,
      images: seo?.defaultOgImage ? [seo.defaultOgImage] : undefined,
      siteName: general?.siteName,
    },
    twitter: {
      card: 'summary_large_image',
      site: seo?.socialMedia?.twitterHandle || undefined,
    },
    verification: {
      google: seo?.googleSiteVerification || undefined,
      other: seo?.bingSiteVerification
        ? { 'msvalidate.01': seo.bingSiteVerification }
        : undefined,
    },
    icons: general?.favicon ? { icon: general.favicon } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, themeCss] = await Promise.all([
    getPublicSettings(),
    getThemeCss(),
  ]);

  const analytics = settings?.analytics;
  const seo = settings?.seo;
  const general = settings?.general;

  const statusPageContent = await resolveStatusPage(settings?.siteStatus);

  // Build Google Fonts URL for the configured heading/body fonts
  const headingFont = settings?.theme?.typography?.headingFont;
  const bodyFont = settings?.theme?.typography?.bodyFont;
  const googleFontsUrl = buildGoogleFontsUrl(
    [headingFont, bodyFont].filter((f): f is string => !!f && f !== 'Inter'),
  );

  // Build structured data (Organization schema)
  const structuredData = seo?.structuredData?.organizationName
    ? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: seo.structuredData.organizationName,
        url: general?.siteUrl,
        logo: seo.structuredData.organizationLogo || undefined,
        sameAs: [
          seo?.socialMedia?.facebookPage,
          seo?.socialMedia?.linkedinPage,
          seo?.socialMedia?.instagramHandle
            ? `https://instagram.com/${seo.socialMedia.instagramHandle.replace('@', '')}`
            : undefined,
          seo?.socialMedia?.twitterHandle
            ? `https://x.com/${seo.socialMedia.twitterHandle.replace('@', '')}`
            : undefined,
        ].filter(Boolean),
      }
    : null;

  return (
    <html lang={general?.language || 'en'}>
      <head>
        {/* Google Fonts for configured heading/body fonts */}
        {googleFontsUrl && (
          <link rel="stylesheet" href={googleFontsUrl} />
        )}

        {/* RSS feed */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${general?.siteName || 'Site'} RSS Feed`}
          href="/feed.xml"
        />

        {/* Theme CSS custom properties */}
        {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}

        {/* Organization structured data */}
        {structuredData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
        )}
      </head>
      <body className={inter.className}>
        <CartProvider>
          {statusPageContent ? (
            <main className="flex-1">{statusPageContent}</main>
          ) : (
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          )}
        </CartProvider>

        {/* Google Analytics 4 */}
        {analytics?.enabled && analytics?.measurementId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${analytics.measurementId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-config" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${analytics.measurementId}'${
                  analytics.trackingConfig?.anonymizeIp
                    ? ", { 'anonymize_ip': true }"
                    : ''
                });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
