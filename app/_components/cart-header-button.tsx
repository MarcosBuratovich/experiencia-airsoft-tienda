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
    // Wrapper relative SIN clip-path: el badge necesita poder salirse
    // de las esquinas del boton, y clip-tag (clip-path) recorta hijos
    // absolutos. Por eso el visual notched vive en un span interno.
    <button
      type="button"
      onClick={open}
      aria-label={`Carrito${items > 0 ? ` (${items})` : ""}`}
      className="relative inline-flex items-center"
    >
      <span className="btn-ghost clip-tag px-4 py-2 uppercase tracking-wider fluid-xs inline-flex items-center gap-2">
        <ShoppingBag size={16} aria-hidden />
        <span className="hidden sm:inline">Carrito</span>
      </span>
      {mounted && items > 0 ? (
        <span
          aria-hidden
          className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 inline-flex items-center justify-center bg-orange text-ink fluid-xs font-bold leading-none rounded-full pointer-events-none"
        >
          {items}
        </span>
      ) : null}
    </button>
  );
}
