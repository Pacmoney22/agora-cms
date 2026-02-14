import type { ProductDto, CartDto, AddToCartDto } from '@nextgen-cms/shared';

const COMMERCE_API_BASE_URL =
  process.env.NEXT_PUBLIC_COMMERCE_API_URL ?? 'http://localhost:3002';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Fetch a paginated list of products.
 */
export async function getProducts(params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: string;
}): Promise<PaginatedResponse<ProductDto>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.category) searchParams.set('category', params.category);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.sort) searchParams.set('sort', params.sort);

  const res = await fetch(
    `${COMMERCE_API_BASE_URL}/api/products?${searchParams.toString()}`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch a single product by its slug.
 */
export async function getProduct(slug: string): Promise<ProductDto | null> {
  const res = await fetch(
    `${COMMERCE_API_BASE_URL}/api/products/slug/${slug}`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch product: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch the current cart by cart ID (stored in cookie or session).
 */
export async function getCart(cartId: string): Promise<CartDto | null> {
  const res = await fetch(`${COMMERCE_API_BASE_URL}/api/carts/${cartId}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch cart: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Add an item to the cart.
 */
export async function addToCart(
  cartId: string,
  item: AddToCartDto
): Promise<CartDto> {
  const res = await fetch(
    `${COMMERCE_API_BASE_URL}/api/carts/${cartId}/items`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to add to cart: ${res.statusText}`);
  }

  return res.json();
}
