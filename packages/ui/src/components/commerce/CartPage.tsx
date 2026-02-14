import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { Plus, Minus, Trash2, Tag, ShoppingCart } from 'lucide-react';

export interface CartPageItem {
  name: string;
  price: number;
  quantity: number;
  image?: string;
  type?: string;
  configurationSummary?: string;
}

export interface CartPageProps {
  showProductImages?: boolean;
  showProductType?: boolean;
  showConfigurationSummary?: boolean;
  showEstimatedShipping?: boolean;
  showCouponField?: boolean;
  crossSellSource?: 'auto' | 'manual' | 'none';
  groupByType?: boolean;
  emptyCartCta?: { label: string; url: string };
  items?: CartPageItem[];
  onUpdateQuantity?: (index: number, quantity: number) => void;
  onRemoveItem?: (index: number) => void;
  onApplyCoupon?: (code: string) => void;
  className?: string;
}

const ESTIMATED_SHIPPING = 9.99;
const FREE_SHIPPING_THRESHOLD = 75;

export const CartPage: React.FC<CartPageProps> = ({
  showProductImages = true,
  showProductType = false,
  showConfigurationSummary = false,
  showEstimatedShipping = true,
  showCouponField = true,
  crossSellSource = 'none',
  groupByType = false,
  emptyCartCta = { label: 'Continue Shopping', url: '/' },
  items = [],
  onUpdateQuantity,
  onRemoveItem,
  onApplyCoupon,
  className,
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const estimatedShipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : ESTIMATED_SHIPPING;
  const total = subtotal + (showEstimatedShipping ? estimatedShipping : 0);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }
    setCouponError('');
    setCouponApplied(true);
    onApplyCoupon?.(couponCode);
  };

  const handleQuantityChange = (index: number, delta: number) => {
    const item = items[index];
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);
    if (newQty === 0) {
      onRemoveItem?.(index);
    } else {
      onUpdateQuantity?.(index, newQty);
    }
  };

  // Group items by type if requested
  const groupedItems = useMemo(() => {
    if (!groupByType) return { '': items.map((item, i) => ({ item, originalIndex: i })) };

    const groups: Record<string, { item: CartPageItem; originalIndex: number }[]> = {};
    items.forEach((item, i) => {
      const key = item.type || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push({ item, originalIndex: i });
    });
    return groups;
  }, [items, groupByType]);

  if (items.length === 0) {
    return (
      <div className={clsx('flex flex-col items-center justify-center py-16', className)}>
        <ShoppingCart className="mb-4 h-16 w-16 text-gray-300" />
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Your cart is empty</h2>
        <p className="mb-6 text-gray-500">Looks like you have not added anything to your cart yet.</p>
        <a
          href={emptyCartCta.url}
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {emptyCartCta.label}
        </a>
      </div>
    );
  }

  const renderLineItem = (item: CartPageItem, originalIndex: number) => (
    <div
      key={originalIndex}
      className="flex items-start gap-4 border-b border-gray-100 py-4 last:border-0"
    >
      {showProductImages && (
        <div className="flex-shrink-0">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="h-20 w-20 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
              No Image
            </div>
          )}
        </div>
      )}

      <div className="flex-1">
        {showProductType && item.type && (
          <span className="mb-0.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
            {item.type}
          </span>
        )}
        <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
        {showConfigurationSummary && item.configurationSummary && (
          <p className="mt-0.5 text-xs text-gray-500">{item.configurationSummary}</p>
        )}
        <p className="mt-1 text-sm font-medium text-gray-700">
          {formatPrice(item.price)}
        </p>

        {/* Quantity controls */}
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center rounded-md border border-gray-300">
            <button
              onClick={() => handleQuantityChange(originalIndex, -1)}
              className="flex h-8 w-8 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100"
              aria-label={`Decrease quantity of ${item.name}`}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="flex h-8 w-10 items-center justify-center border-x border-gray-300 text-sm font-medium text-gray-900">
              {item.quantity}
            </span>
            <button
              onClick={() => handleQuantityChange(originalIndex, 1)}
              className="flex h-8 w-8 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100"
              aria-label={`Increase quantity of ${item.name}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => onRemoveItem?.(originalIndex)}
            className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-red-500"
            aria-label={`Remove ${item.name} from cart`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>

      {/* Line total */}
      <div className="flex-shrink-0 text-right">
        <span className="text-sm font-semibold text-gray-900">
          {formatPrice(item.price * item.quantity)}
        </span>
      </div>
    </div>
  );

  return (
    <div className={clsx('w-full', className)}>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Shopping Cart ({totalItems} item{totalItems !== 1 ? 's' : ''})
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Cart items */}
        <div className="flex-1">
          <div className="rounded-lg border border-gray-200 bg-white">
            {Object.entries(groupedItems).map(([groupName, groupItems]) => (
              <div key={groupName}>
                {groupByType && groupName && (
                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      {groupName}
                    </h3>
                  </div>
                )}
                <div className="px-4">
                  {groupItems.map(({ item, originalIndex }) =>
                    renderLineItem(item, originalIndex),
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Continue shopping */}
          <div className="mt-4">
            <a
              href={emptyCartCta.url}
              className="text-sm text-blue-600 transition-colors hover:text-blue-800"
            >
              &larr; Continue Shopping
            </a>
          </div>
        </div>

        {/* Order summary sidebar */}
        <div className="w-full flex-shrink-0 lg:w-80">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Summary</h2>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})
                </span>
                <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
              </div>

              {showEstimatedShipping && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estimated Shipping</span>
                  <span className="font-medium text-gray-900">
                    {estimatedShipping === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      formatPrice(estimatedShipping)
                    )}
                  </span>
                </div>
              )}

              {showEstimatedShipping && subtotal < FREE_SHIPPING_THRESHOLD && (
                <p className="rounded bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Add {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for free shipping!
                </p>
              )}
            </div>

            {/* Coupon field */}
            {showCouponField && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Coupon code"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        setCouponError('');
                      }}
                      className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponApplied}
                    className={clsx(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      couponApplied
                        ? 'cursor-not-allowed bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                    )}
                  >
                    {couponApplied ? 'Applied' : 'Apply'}
                  </button>
                </div>
                {couponError && (
                  <p className="mt-1 text-xs text-red-600">{couponError}</p>
                )}
              </div>
            )}

            {/* Total */}
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="flex justify-between">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-lg font-bold text-gray-900">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Checkout button */}
            <button
              className="mt-4 w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
