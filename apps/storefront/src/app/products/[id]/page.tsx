import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/api';
import { getPublicSettings } from '@/lib/content-client';
import { ProductDetailClient } from './product-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const [product, settings] = await Promise.all([
      getProduct(id),
      getPublicSettings(),
    ]);
    const siteUrl = settings?.general?.siteUrl || 'http://localhost:3000';

    return {
      title: product.name,
      description:
        product.shortDescription || product.description || `${product.name} - ${product.sku}`,
      alternates: { canonical: `${siteUrl}/products/${product.id}` },
      openGraph: {
        title: product.name,
        description: product.shortDescription || product.description || undefined,
        url: `${siteUrl}/products/${product.id}`,
        images: product.images?.[0]?.url ? [product.images[0].url] : undefined,
        type: 'website',
      },
    };
  } catch {
    return { title: 'Product not found' };
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [product, settings] = await Promise.all([
    getProduct(id).catch((): null => null),
    getPublicSettings(),
  ]);

  if (!product) notFound();

  const siteUrl = settings?.general?.siteUrl || 'http://localhost:3000';
  const price = product.pricing.salePrice ?? product.pricing.basePrice;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description || undefined,
    sku: product.sku,
    image: product.images?.[0]?.url || undefined,
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: product.pricing.currency,
      availability:
        product.status === 'active'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Products',
        item: `${siteUrl}/products`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.name,
        item: `${siteUrl}/products/${product.id}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}
