"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/store";

export function CartHeaderButton() {
  const open = useCart((s) => s.open);
  const count = useCart((s) => s.count);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const items = mounted ? count() : 0;

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Carrito${items > 0 ? ` (${items})` : ""}`}
      className="relative btn-ghost clip-tag px-4 py-2 uppercase tracking-wider fluid-xs inline-flex items-center gap-2"
    >
      <ShoppingBag size={16} aria-hidden />
      <span className="hidden sm:inline">Carrito</span>
      {mounted && items > 0 ? (
        <span
          aria-hidden
          className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 inline-flex items-center justify-center bg-orange text-ink fluid-xs font-bold leading-none rounded-full"
        >
          {items}
        </span>
      ) : null}
    </button>
  );
}
