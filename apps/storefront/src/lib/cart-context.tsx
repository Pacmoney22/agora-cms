'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CartDto, CartItem } from '@agora-cms/shared';
import {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
} from './api';

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  hasPhysicalItems: boolean;
  loading: boolean;
  cartId: string;
  addItem: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const CART_ID_KEY = 'agora_cart_id';

function getStoredCartId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(CART_ID_KEY) ?? '';
}

function getOrCreateCartId(): string {
  let id = getStoredCartId();
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CART_ID_KEY, id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartDto | null>(null);
  const [loading, setLoading] = useState(false);
  const cartIdRef = useRef<string>('');

  // Initialise the cart ID on first client render
  useEffect(() => {
    cartIdRef.current = getOrCreateCartId();
  }, []);

  // Fetch the cart from the API
  const refreshCart = useCallback(async () => {
    const id = cartIdRef.current;
    if (!id) return;

    setLoading(true);
    try {
      const data = await getCart(id);
      setCart(data);
    } catch {
      // Cart might not exist yet - that is OK
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load cart on mount
  useEffect(() => {
    // Small delay to ensure cartIdRef is set
    const timer = setTimeout(() => {
      refreshCart();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshCart]);

  const addItem = useCallback(
    async (productId: string, quantity: number, variantId?: string) => {
      const id = cartIdRef.current;
      if (!id) return;
      setLoading(true);
      try {
        const data = await addCartItem(id, productId, quantity, variantId);
        setCart(data);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      const id = cartIdRef.current;
      if (!id) return;
      setLoading(true);
      try {
        const data = await updateCartItem(id, cartItemId, quantity);
        setCart(data);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const removeItemFn = useCallback(async (cartItemId: string) => {
    const id = cartIdRef.current;
    if (!id) return;
    setLoading(true);
    try {
      const data = await removeCartItem(id, cartItemId);
      setCart(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items: cart?.items ?? [],
      itemCount: cart?.itemCount ?? 0,
      subtotal: cart?.subtotal ?? 0,
      hasPhysicalItems: cart?.hasPhysicalItems ?? false,
      loading,
      cartId: cartIdRef.current,
      addItem,
      updateQuantity,
      removeItem: removeItemFn,
      refreshCart,
    }),
    [cart, loading, addItem, updateQuantity, removeItemFn, refreshCart],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
