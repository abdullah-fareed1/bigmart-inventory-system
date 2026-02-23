// src/hooks/use-cart.ts
"use client";

import { create } from "zustand";

export interface CartItem {
  stockId: string;
  productId: string;
  productName: string;
  supplierName: string;
  quantity: number;
  pricePerUnit: number;
  measuringUnit: string;
  itemDiscount: number; // Amount, not percentage
  maxQuantity: number;
}

interface CartStore {
  items: CartItem[];
  cartDiscount: number;

  // Actions
  addItem: (item: CartItem) => void;
  updateQuantity: (stockId: string, qty: number) => void;
  updateItemDiscount: (stockId: string, discount: number) => void;
  removeItem: (stockId: string) => void;
  setCartDiscount: (discount: number) => void;
  clearCart: () => void;

  // Computed
  getSubtotal: () => number;
  getTotalItemDiscount: () => number;
  getAfterItemDiscounts: () => number;
  getAfterCartDiscount: () => number;
  getTotal: () => number;
  hasMultipleDiscounts: () => boolean;
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  cartDiscount: 0,

  addItem: (item) => {
    set((state) => {
      // Check if stock already in cart
      const existing = state.items.find((i) => i.stockId === item.stockId);
      if (existing) {
        // Update quantity (capped at maxQuantity)
        return {
          items: state.items.map((i) =>
            i.stockId === item.stockId
              ? {
                  ...i,
                  quantity: Math.min(
                    i.quantity + item.quantity,
                    item.maxQuantity
                  ),
                }
              : i
          ),
        };
      }
      return { items: [...state.items, item] };
    });
  },

  updateQuantity: (stockId, qty) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.stockId === stockId
          ? {
              ...i,
              quantity: Math.min(Math.max(0.01, qty), i.maxQuantity),
              // Reset item discount if it exceeds new line total
              itemDiscount: Math.min(
                i.itemDiscount,
                parseFloat((qty * i.pricePerUnit).toFixed(2))
              ),
            }
          : i
      ),
    }));
  },

  updateItemDiscount: (stockId, discount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.stockId === stockId
          ? {
              ...i,
              itemDiscount: Math.min(
                Math.max(0, discount),
                parseFloat((i.quantity * i.pricePerUnit).toFixed(2))
              ),
            }
          : i
      ),
    }));
  },

  removeItem: (stockId) => {
    set((state) => ({
      items: state.items.filter((i) => i.stockId !== stockId),
    }));
  },

  setCartDiscount: (discount) => {
    const afterItemDiscounts = get().getAfterItemDiscounts();
    set({
      cartDiscount: Math.min(Math.max(0, discount), afterItemDiscounts),
    });
  },

  clearCart: () => {
    set({ items: [], cartDiscount: 0 });
  },

  // subtotal = sum of (qty × price) for all items BEFORE item discounts
  getSubtotal: () => {
    return parseFloat(
      get()
        .items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0)
        .toFixed(2)
    );
  },

  // Total of all item-level discounts
  getTotalItemDiscount: () => {
    return parseFloat(
      get()
        .items.reduce((sum, item) => sum + item.itemDiscount, 0)
        .toFixed(2)
    );
  },

  // After item discounts
  getAfterItemDiscounts: () => {
    return parseFloat(
      (get().getSubtotal() - get().getTotalItemDiscount()).toFixed(2)
    );
  },

  // After cart discount
  getAfterCartDiscount: () => {
    return parseFloat(
      (get().getAfterItemDiscounts() - get().cartDiscount).toFixed(2)
    );
  },

  // Final total (before point redemption - that's handled at checkout)
  getTotal: () => {
    return Math.max(0, get().getAfterCartDiscount());
  },

  // Check if multiple discount types are applied
  hasMultipleDiscounts: () => {
    const hasItemDiscounts = get().getTotalItemDiscount() > 0;
    const hasCartDiscount = get().cartDiscount > 0;
    return hasItemDiscounts && hasCartDiscount;
  },
}));