"use client";

import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/tiendanube/types";
import {
  applyLocalProductFilters,
  sortProducts,
} from "@/lib/tiendanube/normalize";
import { parseProductsSearch } from "@/lib/url";
import { ProductGrid } from "./product-grid";
import { FilterBar } from "@/components/filters/filter-bar";
import { ActiveFilters } from "@/components/filters/active-filters";

/**
 * Filtros y orden de una categoría, 100% client-side sobre la lista completa.
 * La página de categoría es ESTÁTICA (no puede leer searchParams en el
 * server), así que este componente resuelve ?precio_min/?precio_max/?orden al
 * hidratar. Los filtros siguen viviendo en la URL —compartir el link conserva
 * la vista— y esas variantes quedan bloqueadas en robots.txt y canonicalizadas
 * a la categoría limpia, igual que en /productos.
 */
export function CategoryExplorer({ products }: { products: Product[] }) {
  const sp = useSearchParams();
  const parsed = parseProductsSearch(Object.fromEntries(sp.entries()));

  const filtered = applyLocalProductFilters(products, {
    priceMinCents: parsed.priceMinCents,
    priceMaxCents: parsed.priceMaxCents,
  });
  const items = sortProducts(filtered, parsed.sortBy);

  const activeFilters: {
    key: "precio_min" | "precio_max";
    label: string;
  }[] = [];
  if (parsed.priceMinCents !== undefined)
    activeFilters.push({
      key: "precio_min",
      label: `Desde $${(parsed.priceMinCents / 100).toLocaleString("es-AR")}`,
    });
  if (parsed.priceMaxCents !== undefined)
    activeFilters.push({
      key: "precio_max",
      label: `Hasta $${(parsed.priceMaxCents / 100).toLocaleString("es-AR")}`,
    });

  return (
    <>
      <div className="mt-8">
        <FilterBar
          priceMin={parsed.priceMinCents ? parsed.priceMinCents / 100 : undefined}
          priceMax={parsed.priceMaxCents ? parsed.priceMaxCents / 100 : undefined}
          orden={parsed.rawOrden}
        />
        <ActiveFilters items={activeFilters} />
      </div>
      <div className="mt-8">
        <ProductGrid products={items} priorityFirst={4} />
      </div>
    </>
  );
}
