'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ordersApi } from '@/lib/api-client';

function formatPrice(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-red-100 text-red-700',
  returned: 'bg-orange-100 text-orange-700',
  fulfilled: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-700',
};

const statusTimeline = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showRefund, setShowRefund] = useState(false);
  const [showFulfill, setShowFulfill] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id),
  });

  const refundMutation = useMutation({
    mutationFn: () => ordersApi.refund(id, { reason: refundReason || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order refunded');
      setShowRefund(false);
      setRefundReason('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const fulfillMutation = useMutation({
    mutationFn: () => ordersApi.fulfill(id, {
      trackingNumber: trackingNumber || undefined,
      carrier: carrier || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order fulfilled');
      setShowFulfill(false);
      setTrackingNumber('');
      setCarrier('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-64 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">Order not found.</p>
      </div>
    );
  }

  const canRefund = !['refunded', 'cancelled', 'returned'].includes(order.status);
  const canFulfill = ['confirmed', 'processing'].includes(order.status);
  const currentStepIndex = statusTimeline.indexOf(order.status);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/orders" className="text-sm text-gray-400 hover:text-gray-600">&larr; Orders</Link>
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <span className={clsx(
              'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
              statusColors[order.status] || 'bg-gray-100 text-gray-600',
            )}>
              {order.status?.replace('_', ' ')}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Placed on {formatDate(order.createdAt)}
            {order.updatedAt !== order.createdAt && ` | Updated ${formatDate(order.updatedAt)}`}
          </p>
        </div>
        <div className="flex gap-2">
          {canFulfill && (
            <button
              onClick={() => setShowFulfill(!showFulfill)}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              Fulfill Order
            </button>
          )}
          {canRefund && (
            <button
              onClick={() => setShowRefund(!showRefund)}
              className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
            >
              Refund
            </button>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      {currentStepIndex >= 0 && (
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            {statusTimeline.map((step, i) => {
              const isActive = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={clsx(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : isActive
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-400',
                    )}>
                      {isActive && !isCurrent ? (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className={clsx('mt-1 text-[10px] capitalize', isActive ? 'text-gray-700 font-medium' : 'text-gray-400')}>
                      {step}
                    </span>
                  </div>
                  {i < statusTimeline.length - 1 && (
                    <div className={clsx('mx-2 h-0.5 w-12', i < currentStepIndex ? 'bg-green-500' : 'bg-gray-200')} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Refund Panel */}
      {showRefund && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-800">Refund Order</h3>
          <p className="mt-1 text-xs text-red-600">This will refund the full order amount of {formatPrice(order.total, order.currency)}.</p>
          <div className="mt-3">
            <label className="block text-xs font-medium text-red-700 mb-1">Reason (optional)</label>
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full rounded-md border border-red-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none"
              placeholder="Reason for refund"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => refundMutation.mutate()}
              disabled={refundMutation.isPending}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {refundMutation.isPending ? 'Processing...' : 'Confirm Refund'}
            </button>
            <button
              onClick={() => setShowRefund(false)}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Fulfill Panel */}
      {showFulfill && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="text-sm font-semibold text-green-800">Fulfill Order</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-green-700 mb-1">Tracking Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full rounded-md border border-green-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none"
                placeholder="e.g. 1Z999AA10123456784"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-green-700 mb-1">Carrier</label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full rounded-md border border-green-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none"
              >
                <option value="">Select carrier...</option>
                <option value="ups">UPS</option>
                <option value="fedex">FedEx</option>
                <option value="usps">USPS</option>
                <option value="dhl">DHL</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => fulfillMutation.mutate()}
              disabled={fulfillMutation.isPending}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {fulfillMutation.isPending ? 'Fulfilling...' : 'Confirm Fulfillment'}
            </button>
            <button
              onClick={() => setShowFulfill(false)}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Line Items */}
        <div className="col-span-2 space-y-4">
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Line Items ({order.lineItems?.length || 0})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {order.lineItems?.map((item: any, i: number) => (
                <div key={item.lineItemId || i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <span className={clsx(
                        'rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize',
                        statusColors[item.status] || 'bg-gray-100 text-gray-600',
                      )}>
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
                      <span className="font-mono">SKU: {item.sku}</span>
                      <span>Qty: {item.quantity}</span>
                      <span className="capitalize">{item.productType}</span>
                    </div>
                    {item.fulfillment && (
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
                        {item.fulfillment.trackingNumber && (
                          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-purple-700">
                            Tracking: {item.fulfillment.trackingNumber}
                          </span>
                        )}
                        {item.fulfillment.licenseKey && (
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700 font-mono">
                            Key: {item.fulfillment.licenseKey}
                          </span>
                        )}
                        {item.fulfillment.downloadUrl && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">
                            Download available
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatPrice(item.totalPrice, order.currency)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-[10px] text-gray-400">
                        {formatPrice(item.unitPrice, order.currency)} each
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Totals */}
            <div className="border-t border-gray-200 px-5 py-3 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal, order.currency)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Tax</span>
                  <span>{formatPrice(order.tax, order.currency)}</span>
                </div>
              )}
              {order.shippingCost > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Shipping</span>
                  <span>{formatPrice(order.shippingCost, order.currency)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                  <span>-{formatPrice(order.discount, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-100 pt-1 text-sm font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatPrice(order.total, order.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="rounded-lg bg-white p-5 shadow">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Notes</h2>
              <p className="text-xs text-gray-600 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Customer</h2>
            {order.guestEmail ? (
              <div>
                <p className="text-xs text-gray-700">{order.guestEmail}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Guest checkout</p>
              </div>
            ) : order.userId ? (
              <p className="text-xs font-mono text-gray-500">{order.userId}</p>
            ) : (
              <p className="text-xs text-gray-400">No customer info</p>
            )}
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="rounded-lg bg-white p-5 shadow">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Shipping Address</h2>
              <div className="text-xs text-gray-600 space-y-0.5">
                <p className="font-medium">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                {order.shippingAddress.phone && <p className="mt-1 text-gray-400">{order.shippingAddress.phone}</p>}
              </div>
            </div>
          )}

          {/* Billing Address */}
          {order.billingAddress && (
            <div className="rounded-lg bg-white p-5 shadow">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Billing Address</h2>
              <div className="text-xs text-gray-600 space-y-0.5">
                <p className="font-medium">{order.billingAddress.firstName} {order.billingAddress.lastName}</p>
                <p>{order.billingAddress.line1}</p>
                {order.billingAddress.line2 && <p>{order.billingAddress.line2}</p>}
                <p>
                  {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postalCode}
                </p>
                <p>{order.billingAddress.country}</p>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Payment</h2>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Currency</span>
                <span className="font-medium">{order.currency}</span>
              </div>
              {order.stripePaymentIntentId && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Stripe PI</span>
                  <span className="font-mono text-[10px]">{order.stripePaymentIntentId}</span>
                </div>
              )}
              {order.couponCode && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Coupon</span>
                  <span className="font-mono">{order.couponCode}</span>
                </div>
              )}
            </div>
          </div>

          {/* IDs */}
          <div className="rounded-lg bg-white p-5 shadow">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">System Info</h2>
            <div className="text-[10px] text-gray-400 space-y-1 font-mono break-all">
              <p>ID: {order.id}</p>
              {order.sfOpportunityId && <p>SF: {order.sfOpportunityId}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
