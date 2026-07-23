"use client";

import { useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/lib/cart/store";

export function AddToCartButton({
  variantId,
  productId,
  handle,
  productName,
  variantLabelText,
  priceCents,
  imageSrc,
  brand,
  category,
  maxQty,
  qty = 1,
  disabled,
}: {
  variantId: number;
  productId: number;
  handle: string;
  productName: string;
  variantLabelText: string;
  priceCents: number | null;
  imageSrc: string | null;
  brand?: string | null;
  category?: string | null;
  // null = stock infinito (stock_management=false en TN)
  maxQty: number | null;
  qty?: number;
  disabled?: boolean;
}) {
  const add = useCart((s) => s.add);
  const pulseOpen = useCart((s) => s.pulseOpen);
  const [justAdded, setJustAdded] = useState(false);

  const handleClick = () => {
    if (disabled || priceCents === null) return;
    add({
      productId,
      variantId,
      qty,
      snapshot: {
        handle,
        productName,
        variantLabel: variantLabelText,
        priceCents,
        imageSrc,
        maxQty,
        brand,
        category,
      },
    });
    pulseOpen();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`w-full inline-flex items-center justify-center gap-3 fluid-base px-7 py-4 clip-tag uppercase tracking-wider font-semibold transition-all ${
        disabled
          ? "bg-rail text-smoke cursor-not-allowed"
          : justAdded
            ? "bg-bone text-ink"
            : "btn-wa"
      }`}
    >
      {justAdded ? (
        <>
          <Check size={18} aria-hidden /> Agregado al carrito
        </>
      ) : disabled ? (
        <>Sin stock disponible</>
      ) : (
        <>
          <ShoppingBag size={18} aria-hidden /> Agregar al carrito
        </>
      )}
    </button>
  );
}
