"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem, CartState } from "./types";

const STORAGE_KEY = "ea-cart-v1";

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (input) => {
        const qty = input.qty ?? 1;
        set((state) => {
          const existing = state.items.find(
            (it) => it.variantId === input.variantId,
          );
          if (existing) {
            return {
              items: state.items.map((it) =>
                it.variantId === input.variantId
                  ? { ...it, qty: it.qty + qty }
                  : it,
              ),
            };
          }
          const newItem: CartItem = {
            productId: input.productId,
            variantId: input.variantId,
            qty,
            snapshot: input.snapshot,
          };
          return { items: [...state.items, newItem] };
        });
      },
      remove: (variantId) =>
        set((state) => ({
          items: state.items.filter((it) => it.variantId !== variantId),
        })),
      setQty: (variantId, qty) =>
        set((state) => ({
          items: state.items
            .map((it) =>
              it.variantId === variantId
                ? { ...it, qty: Math.max(0, qty) }
                : it,
            )
            .filter((it) => it.qty > 0),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((acc, it) => acc + it.qty, 0),
      subtotalCents: () =>
        get().items.reduce(
          (acc, it) => acc + it.qty * it.snapshot.priceCents,
          0,
        ),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
