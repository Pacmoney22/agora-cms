'use client';

import Link from 'next/link';
import { formatPrice } from '@agora-cms/shared';
import { useCart } from '@/lib/cart-context';

export default function CartPage() {
  const { items, itemCount, subtotal, loading, updateQuantity, removeItem } =
    useCart();

  // ---- Empty cart ----
  if (!loading && itemCount === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <svg
          className="mx-auto h-16 w-16 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
          />
        </svg>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Your cart is empty</h2>
        <p className="mt-2 text-sm text-gray-500">
          Browse our products and add items to your cart.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>

      {loading && (
        <p className="mt-4 text-sm text-gray-500">Updating cart...</p>
      )}

      <div className="mt-8 lg:grid lg:grid-cols-12 lg:gap-12">
        {/* Cart items */}
        <div className="lg:col-span-8">
          <ul className="divide-y divide-gray-200 border-b border-t border-gray-200">
            {items.map((item) => (
              <li key={item.cartItemId} className="flex py-6">
                {/* Thumbnail */}
                <div className="h-24 w-24 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <svg
                      className="h-8 w-8 text-gray-300"
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

                <div className="ml-6 flex flex-1 flex-col">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        <Link
                          href={`/products/${item.productId}`}
                          className="hover:text-indigo-600"
                        >
                          {item.name}
                        </Link>
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">
                        SKU: {item.sku}
                        {item.variantId && (
                          <span className="ml-2">Variant: {item.variantId.slice(0, 8)}...</span>
                        )}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatPrice(item.totalPrice)}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-2">
                    {/* Quantity controls */}
                    <div className="flex items-center rounded-md border border-gray-300">
                      <button
                        onClick={() =>
                          updateQuantity(item.cartItemId, Math.max(1, item.quantity - 1))
                        }
                        disabled={loading}
                        className="px-2 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        disabled={loading}
                        className="px-2 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatPrice(item.unitPrice)} each</span>
                      <button
                        onClick={() => removeItem(item.cartItemId)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Cart summary */}
        <div className="mt-8 lg:col-span-4 lg:mt-0">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>

            <dl className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-600">
                  Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatPrice(subtotal)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <dt className="text-base font-medium text-gray-900">Order total</dt>
                <dd className="text-base font-medium text-gray-900">
                  {formatPrice(subtotal)}
                </dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              className="mt-6 block w-full rounded-md bg-indigo-600 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700"
            >
              Proceed to Checkout
            </Link>

            <Link
              href="/products"
              className="mt-3 block w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
