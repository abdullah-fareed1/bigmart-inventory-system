// src/hooks/use-cart.ts
"use client";

import { create } from "zustand";
import { roundQuantity, getMinimumQuantity } from "@/lib/utils";

export interface CartItem {
  cartKey: string;        // NEW: `${stockId}:whole` or `${stockId}:split`
  stockId: string;        // unchanged — sent to server
  isSplitMode: boolean;   // NEW
  unitsPerWhole?: number; // NEW — needed for maxQuantity calc and server submission
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
  updateQuantity: (cartKey: string, qty: number) => void;
  updateItemDiscount: (cartKey: string, discount: number) => void;
  removeItem: (cartKey: string) => void;
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
      // Check if item already in cart (by cartKey)
      const existing = state.items.find((i) => i.cartKey === item.cartKey);
      if (existing) {
        // Update quantity (capped at maxQuantity)
        return {
          items: state.items.map((i) =>
            i.cartKey === item.cartKey
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

  updateQuantity: (cartKey, qty) => {
    set((state) => ({
      items: state.items.map((i) => {
        if (i.cartKey === cartKey) {
          const rounded = roundQuantity(qty, i.measuringUnit);
          const newQty = Math.min(Math.max(0.01, rounded), i.maxQuantity);
          return {
            ...i,
            quantity: newQty,
            // Reset item discount if it exceeds new line total
            itemDiscount: Math.min(
              i.itemDiscount,
              parseFloat((newQty * i.pricePerUnit).toFixed(2))
            ),
          };
        }
        return i;
      }),
    }));
  },

  updateItemDiscount: (cartKey, discount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.cartKey === cartKey
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

  removeItem: (cartKey) => {
    set((state) => ({
      items: state.items.filter((i) => i.cartKey !== cartKey),
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