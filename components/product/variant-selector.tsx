"use client";

import { useEffect, useMemo, useState } from "react";
import type { Variant } from "@/lib/tiendanube/types";
import { PriceTag } from "./price-tag";
import { StockBadge } from "./stock-badge";
import { variantHasStock, variantLabel } from "@/lib/tiendanube/normalize";
import { AddToCartButton } from "./add-to-cart-button";
import { QuantityStepper } from "./quantity-stepper";

interface ProductSnapshotForCart {
  handle: string;
  productId: number;
  productName: string;
  imageSrc: string | null;
}

export function VariantSelector({
  variants,
  attributes,
  snapshot,
}: {
  variants: Variant[];
  attributes: string[];
  snapshot: ProductSnapshotForCart;
}) {
  // Arrancar en la primera variante CON stock (si hay alguna), no en
  // variants[0]: si la primera está agotada pero otras no, evita mostrar
  // "sin stock" como si el producto entero no estuviera disponible.
  const [selectedId, setSelectedId] = useState<number>(
    (variants.find((v) => variantHasStock(v)) ?? variants[0])?.id,
  );
  const [qty, setQty] = useState(1);
  const selected = useMemo(
    () => variants.find((v) => v.id === selectedId) ?? variants[0],
    [variants, selectedId],
  );

  const hasOptions =
    variants.length > 1 ||
    (selected && (selected.values ?? []).some((v) => v));

  const stockLimited = selected?.stock_management === true;
  const maxQty = stockLimited ? selected?.stock ?? 0 : null;
  const inStock = variantHasStock(selected);

  // Precio efectivo para el carrito: el promocional cuando aplica (igual que
  // muestra PriceTag), no el de lista, para que carrito y checkout coincidan.
  const precioEfectivo =
    selected?.promotional_price != null &&
    selected?.price != null &&
    selected.promotional_price < selected.price
      ? selected.promotional_price
      : selected?.price ?? null;

  // Si cambia la variante y la cantidad excede el nuevo stock, ajustar.
  useEffect(() => {
    if (maxQty !== null && qty > maxQty) {
      setQty(Math.max(1, maxQty));
    }
  }, [maxQty, qty]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <PriceTag
          priceCents={selected.price}
          compareCents={selected.compare_at_price}
          promotionalCents={selected.promotional_price}
          size="lg"
        />
        <StockBadge
          hasStock={variantHasStock(selected)}
          stockNumber={selected.stock}
        />
      </div>

      {selected.sku ? (
        <p className="font-mono fluid-xs tracking-widest uppercase text-smoke">
          SKU · {selected.sku}
        </p>
      ) : null}

      {hasOptions && variants.length > 1 ? (
        <div>
          <p className="sect-label mb-3">Variante</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const inStock = variantHasStock(v);
              const isActive = v.id === selected.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  disabled={!inStock}
                  aria-pressed={isActive}
                  className={`px-4 py-2 clip-tag border fluid-xs uppercase tracking-wider transition-colors ${
                    isActive
                      ? "border-orange text-orange bg-orange/10"
                      : "border-bone/15 text-bone hover:border-bone/40"
                  } ${!inStock ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {variantLabel(v, attributes)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {inStock ? (
        <div>
          <p className="sect-label mb-3">Cantidad</p>
          <div className="flex items-center gap-4">
            <QuantityStepper
              value={qty}
              onChange={setQty}
              max={maxQty}
            />
            {maxQty !== null ? (
              <span className="font-mono fluid-xs uppercase tracking-widest text-smoke">
                {maxQty === 1
                  ? "Última disponible"
                  : `${maxQty} disponibles`}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <AddToCartButton
        variantId={selected.id}
        productId={snapshot.productId}
        handle={snapshot.handle}
        productName={snapshot.productName}
        variantLabelText={variantLabel(selected, attributes)}
        priceCents={precioEfectivo}
        imageSrc={snapshot.imageSrc}
        maxQty={maxQty}
        qty={qty}
        disabled={!inStock || precioEfectivo === null}
      />
    </div>
  );
}
