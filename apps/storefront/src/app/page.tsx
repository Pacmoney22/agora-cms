'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProductDto } from '@agora-cms/shared';
import { formatPrice } from '@agora-cms/shared';
import { listProducts, listCategories, type CategoryDto } from '@/lib/api';

export default function HomePage() {
  const [featured, setFeatured] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listProducts({ limit: 4, status: 'active' }).catch(() => ({ data: [] as ProductDto[], total: 0, page: 1, limit: 4 })),
      listCategories().catch(() => ({ data: [] as CategoryDto[], total: 0, page: 1, limit: 100 })),
    ]).then(([prodRes, catRes]) => {
      setFeatured(prodRes.data);
      setCategories(catRes.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gray-900 px-4 py-24 text-center text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Welcome to the Store
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-300">
            Discover our curated collection of physical goods, digital products,
            and professional services -- all managed through Agora CMS.
          </p>
          <Link
            href="/products"
            className="mt-8 inline-block rounded-md bg-indigo-600 px-8 py-3 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Browse Products
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
          <Link
            href="/products"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            View all &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="aspect-square w-full rounded-md bg-gray-200" />
                <div className="mt-4 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-4 w-1/2 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="mt-8 text-sm text-gray-500">
            No products available yet. Check back soon!
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="aspect-square w-full rounded-md bg-gray-100 flex items-center justify-center">
                  {product.images?.[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0].url}
                      alt={product.images[0].alt ?? product.name}
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <svg
                      className="h-16 w-16 text-gray-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                      />
                    </svg>
                  )}
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {formatPrice(product.pricing.basePrice, product.pricing.currency)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Category cards */}
      {categories.length > 0 && (
        <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  className="group rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                      {cat.description}
                    </p>
                  )}
                  <span className="mt-3 inline-flex text-sm font-medium text-indigo-600">
                    Browse &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
