'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatPrice } from '@nextgen-cms/shared';
import type { Address } from '@nextgen-cms/shared';
import { useCart } from '@/lib/cart-context';
import { processCheckout } from '@/lib/api';

// ---------------------------------------------------------------------------
// Empty address helper
// ---------------------------------------------------------------------------

function emptyAddress(): Address {
  return {
    firstName: '',
    lastName: '',
    line1: '',
    line2: null,
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: null,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CheckoutPage() {
  const router = useRouter();
  const { items, itemCount, subtotal, hasPhysicalItems, cartId, loading: cartLoading } =
    useCart();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState<Address>(emptyAddress());
  const [billingAddress, setBillingAddress] = useState<Address>(emptyAddress());
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Empty cart guard
  if (!cartLoading && itemCount === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Nothing to checkout</h2>
        <p className="mt-2 text-sm text-gray-500">
          Your cart is empty. Add some products first.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const shipping = hasPhysicalItems
        ? { ...shippingAddress, phone: phone || null }
        : undefined;
      const billing = sameAsShipping && hasPhysicalItems
        ? shipping
        : { ...billingAddress, phone: phone || null };

      const order = await processCheckout({
        cartId,
        guestEmail: email || undefined,
        shippingAddress: shipping,
        billingAddress: billing,
        notes: notes || undefined,
      });

      router.push(`/checkout/success?orderId=${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>

      <form onSubmit={handleSubmit} className="mt-8 lg:grid lg:grid-cols-12 lg:gap-12">
        {/* Form fields */}
        <div className="lg:col-span-7 space-y-8">
          {/* Contact info */}
          <section>
            <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone (optional)
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </section>

          {/* Shipping address */}
          {hasPhysicalItems && (
            <section>
              <h2 className="text-lg font-medium text-gray-900">Shipping Address</h2>
              <AddressForm
                address={shippingAddress}
                onChange={setShippingAddress}
                idPrefix="shipping"
              />
            </section>
          )}

          {/* Billing address */}
          <section>
            <h2 className="text-lg font-medium text-gray-900">Billing Address</h2>

            {hasPhysicalItems && (
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={sameAsShipping}
                  onChange={(e) => setSameAsShipping(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Same as shipping address
              </label>
            )}

            {(!hasPhysicalItems || !sameAsShipping) && (
              <AddressForm
                address={billingAddress}
                onChange={setBillingAddress}
                idPrefix="billing"
              />
            )}
          </section>

          {/* Notes */}
          <section>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Order notes (optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </section>

          {error && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || cartLoading}
            className="w-full rounded-md bg-indigo-600 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>

        {/* Order summary sidebar */}
        <div className="mt-8 lg:col-span-5 lg:mt-0">
          <div className="sticky top-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>
            <ul className="mt-4 divide-y divide-gray-200">
              {items.map((item) => (
                <li key={item.cartItemId} className="flex justify-between py-3">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{item.name}</span>
                    <span className="ml-1 text-gray-500">x{item.quantity}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatPrice(item.totalPrice)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-gray-200 pt-4">
              <div className="flex justify-between text-sm">
                <dt className="text-gray-600">Subtotal</dt>
                <dd className="font-medium text-gray-900">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-base font-medium">
                <dt className="text-gray-900">Total</dt>
                <dd className="text-gray-900">{formatPrice(subtotal)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddressForm sub-component
// ---------------------------------------------------------------------------

function AddressForm({
  address,
  onChange,
  idPrefix,
}: {
  address: Address;
  onChange: (addr: Address) => void;
  idPrefix: string;
}) {
  const update = (field: keyof Address, value: string) =>
    onChange({ ...address, [field]: value || null });

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
      <div className="sm:col-span-3">
        <label
          htmlFor={`${idPrefix}-firstName`}
          className="block text-sm font-medium text-gray-700"
        >
          First name
        </label>
        <input
          id={`${idPrefix}-firstName`}
          type="text"
          required
          value={address.firstName}
          onChange={(e) => update('firstName', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="sm:col-span-3">
        <label
          htmlFor={`${idPrefix}-lastName`}
          className="block text-sm font-medium text-gray-700"
        >
          Last name
        </label>
        <input
          id={`${idPrefix}-lastName`}
          type="text"
          required
          value={address.lastName}
          onChange={(e) => update('lastName', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="sm:col-span-6">
        <label
          htmlFor={`${idPrefix}-line1`}
          className="block text-sm font-medium text-gray-700"
        >
          Address line 1
        </label>
        <input
          id={`${idPrefix}-line1`}
          type="text"
          required
          value={address.line1}
          onChange={(e) => update('line1', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="sm:col-span-6">
        <label
          htmlFor={`${idPrefix}-line2`}
          className="block text-sm font-medium text-gray-700"
        >
          Address line 2 (optional)
        </label>
        <input
          id={`${idPrefix}-line2`}
          type="text"
          value={address.line2 ?? ''}
          onChange={(e) => update('line2', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="sm:col-span-2">
        <label
          htmlFor={`${idPrefix}-city`}
          className="block text-sm font-medium text-gray-700"
        >
          City
        </label>
        <input
          id={`${idPrefix}-city`}
          type="text"
          required
          value={address.city}
          onChange={(e) => update('city', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="sm:col-span-2">
        <label
          htmlFor={`${idPrefix}-state`}
          className="block text-sm font-medium text-gray-700"
        >
          State
        </label>
        <input
          id={`${idPrefix}-state`}
          type="text"
          required
          value={address.state}
          onChange={(e) => update('state', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="sm:col-span-2">
        <label
          htmlFor={`${idPrefix}-postalCode`}
          className="block text-sm font-medium text-gray-700"
        >
          Postal code
        </label>
        <input
          id={`${idPrefix}-postalCode`}
          type="text"
          required
          value={address.postalCode}
          onChange={(e) => update('postalCode', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="sm:col-span-3">
        <label
          htmlFor={`${idPrefix}-country`}
          className="block text-sm font-medium text-gray-700"
        >
          Country
        </label>
        <input
          id={`${idPrefix}-country`}
          type="text"
          required
          value={address.country}
          onChange={(e) => update('country', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}
