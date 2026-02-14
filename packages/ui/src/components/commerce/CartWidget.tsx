import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ShoppingCart, X, Trash2 } from 'lucide-react';

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface CartWidgetProps {
  style?: 'icon-badge' | 'icon-text' | 'text-only';
  icon?: string;
  showItemCount?: boolean;
  showTotal?: boolean;
  dropdownPreview?: boolean;
  maxPreviewItems?: number;
  checkoutButtonLabel?: string;
  items?: CartItem[];
  onRemoveItem?: (index: number) => void;
  onUpdateQuantity?: (index: number, quantity: number) => void;
  onCheckout?: () => void;
  className?: string;
}

export const CartWidget: React.FC<CartWidgetProps> = ({
  style = 'icon-badge',
  icon,
  showItemCount = true,
  showTotal = true,
  dropdownPreview = true,
  maxPreviewItems = 3,
  checkoutButtonLabel = 'Checkout',
  items = [],
  onRemoveItem,
  onUpdateQuantity,
  onCheckout,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const renderTrigger = () => {
    switch (style) {
      case 'text-only':
        return (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            Cart
            {showItemCount && totalItems > 0 && (
              <span className="text-gray-500">({totalItems})</span>
            )}
            {showTotal && totalItems > 0 && (
              <span className="font-semibold">{formatPrice(totalPrice)}</span>
            )}
          </button>
        );

      case 'icon-text':
        return (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <span className="relative">
              <ShoppingCart className="h-5 w-5" />
              {showItemCount && totalItems > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </span>
            <span className="hidden sm:inline">Cart</span>
            {showTotal && totalItems > 0 && (
              <span className="hidden font-semibold sm:inline">{formatPrice(totalPrice)}</span>
            )}
          </button>
        );

      case 'icon-badge':
      default:
        return (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-expanded={isOpen}
            aria-haspopup="true"
            aria-label={`Shopping cart with ${totalItems} item${totalItems !== 1 ? 's' : ''}`}
          >
            <ShoppingCart className="h-5 w-5" />
            {showItemCount && totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </button>
        );
    }
  };

  const renderDropdown = () => {
    if (!dropdownPreview || !isOpen) return null;

    const previewItems = items.slice(0, maxPreviewItems);
    const remainingCount = items.length - maxPreviewItems;

    return (
      <div
        className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-xl"
        role="region"
        aria-label="Cart preview"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Shopping Cart ({totalItems})
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close cart preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="max-h-64 overflow-y-auto">
              {previewItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 border-b border-gray-50 px-4 py-3 last:border-0"
                >
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-12 w-12 flex-shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
                      N/A
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Qty: {item.quantity} &times; {formatPrice(item.price)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-medium text-gray-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                    {onRemoveItem && (
                      <button
                        onClick={() => onRemoveItem(index)}
                        className="rounded p-0.5 text-gray-400 transition-colors hover:text-red-500"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {remainingCount > 0 && (
              <p className="border-t border-gray-100 px-4 py-2 text-center text-xs text-gray-500">
                + {remainingCount} more item{remainingCount !== 1 ? 's' : ''}
              </p>
            )}

            {/* Footer */}
            <div className="border-t border-gray-200 px-4 py-3">
              {showTotal && (
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Subtotal</span>
                  <span className="text-base font-bold text-gray-900">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCheckout?.();
                }}
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                {checkoutButtonLabel}
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div ref={dropdownRef} className={clsx('relative inline-block', className)}>
      {renderTrigger()}
      {renderDropdown()}
    </div>
  );
};
