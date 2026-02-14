import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { CartProvider } from '@/lib/cart-context';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { getPublicSettings, getThemeCss } from '@/lib/content-client';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const seo = settings?.seo;
  const general = settings?.general;

  return {
    title: seo?.defaultTitle || general?.siteName || 'NextGen CMS - Storefront',
    description: seo?.defaultDescription || 'E-commerce storefront powered by NextGen CMS',
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
}: {
  children: React.ReactNode;
}) {
  const [settings, themeCss] = await Promise.all([
    getPublicSettings(),
    getThemeCss(),
  ]);

  const analytics = settings?.analytics;
  const seo = settings?.seo;
  const general = settings?.general;

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
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
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
