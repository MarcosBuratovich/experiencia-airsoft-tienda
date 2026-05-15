"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem, CartState } from "./types";

const STORAGE_KEY = "ea-cart-v1";
const PULSE_AUTO_CLOSE_MS = 4000;

// Timer del pulseOpen vive fuera del state porque no se persiste ni se serializa.
// Lo manejamos a nivel de modulo para poder cancelarlo cuando llega otro pulse.
let pulseTimer: ReturnType<typeof setTimeout> | null = null;

function clamp(qty: number, max: number | null): number {
  const positive = Math.max(0, qty);
  if (max === null) return positive;
  return Math.min(positive, max);
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isPinned: false,

      add: (input) => {
        const qty = input.qty ?? 1;
        set((state) => {
          const existing = state.items.find(
            (it) => it.variantId === input.variantId,
          );
          if (existing) {
            const newQty = clamp(
              existing.qty + qty,
              existing.snapshot.maxQty,
            );
            return {
              items: state.items.map((it) =>
                it.variantId === input.variantId ? { ...it, qty: newQty } : it,
              ),
            };
          }
          const newItem: CartItem = {
            productId: input.productId,
            variantId: input.variantId,
            qty: clamp(qty, input.snapshot.maxQty),
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
                ? { ...it, qty: clamp(qty, it.snapshot.maxQty) }
                : it,
            )
            .filter((it) => it.qty > 0),
        })),
      clear: () => set({ items: [], isOpen: false, isPinned: false }),
      count: () => get().items.reduce((acc, it) => acc + it.qty, 0),
      subtotalCents: () =>
        get().items.reduce(
          (acc, it) => acc + it.qty * it.snapshot.priceCents,
          0,
        ),

      open: () => {
        if (pulseTimer) {
          clearTimeout(pulseTimer);
          pulseTimer = null;
        }
        set({ isOpen: true, isPinned: true });
      },
      close: () => {
        if (pulseTimer) {
          clearTimeout(pulseTimer);
          pulseTimer = null;
        }
        set({ isOpen: false, isPinned: false });
      },
      pulseOpen: () => {
        if (pulseTimer) clearTimeout(pulseTimer);
        set({ isOpen: true, isPinned: false });
        pulseTimer = setTimeout(() => {
          pulseTimer = null;
          if (!get().isPinned) set({ isOpen: false });
        }, PULSE_AUTO_CLOSE_MS);
      },
      pin: () => {
        if (pulseTimer) {
          clearTimeout(pulseTimer);
          pulseTimer = null;
        }
        set({ isPinned: true });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Solo persistimos items. isOpen/isPinned son UI ephemeral.
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
