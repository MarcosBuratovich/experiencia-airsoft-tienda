import type { Product, Variant } from "./schemas";

// ──────────────────────────────────────────────────────────────────────
// Helpers de presentacion / filtrado para productos de Tiendanube.
// Asumen que el producto ya paso por el schema (precios en centavos enteros).
// ──────────────────────────────────────────────────────────────────────

export function productFromPriceCents(p: {
  variants: Pick<Variant, "price">[];
}): number | null {
  const prices = p.variants
    .map((v) => v.price)
    .filter((n): n is number => n !== null);
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

export function productMaxPriceCents(p: {
  variants: Pick<Variant, "price">[];
}): number | null {
  const prices = p.variants
    .map((v) => v.price)
    .filter((n): n is number => n !== null);
  if (prices.length === 0) return null;
  return Math.max(...prices);
}

export function variantHasStock(v: Variant): boolean {
  if (v.stock_management === false) return true; // stock infinito
  return (v.stock ?? 0) > 0;
}

export function productHasStock(p: Pick<Product, "has_stock" | "variants">): boolean {
  // TN ya provee has_stock a nivel producto, pero lo cross-checkeamos contra variants
  // por si tenemos un objeto sin has_stock seteado.
  if (typeof p.has_stock === "boolean") return p.has_stock;
  return p.variants.some(variantHasStock);
}

export function productPrimaryImage(p: Pick<Product, "images">): { src: string; alt: string; width: number; height: number } | null {
  const imgs = p.images ?? [];
  if (imgs.length === 0) return null;
  const sorted = [...imgs].sort(
    (a, b) => (a.position ?? 999) - (b.position ?? 999),
  );
  const first = sorted[0];
  return {
    src: first.src,
    alt: (first.alt ?? []).filter(Boolean).join(", ") || "",
    width: first.width ?? 1200,
    height: first.height ?? 1200,
  };
}

export function variantLabel(
  variant: Variant,
  attributeNames: string[],
): string {
  const values = (variant.values ?? []).filter((v): v is string => Boolean(v));
  if (values.length === 0) return "Estandar";
  if (attributeNames.length === 0) return values.join(" · ");
  return values
    .map((v, i) => (attributeNames[i] ? `${attributeNames[i]}: ${v}` : v))
    .join(" · ");
}

interface PriceFilter {
  priceMinCents?: number;
  priceMaxCents?: number;
}

export function applyLocalProductFilters<
  T extends { variants: Pick<Variant, "price">[] },
>(products: T[], filters: PriceFilter): T[] {
  if (filters.priceMinCents === undefined && filters.priceMaxCents === undefined) {
    return products;
  }
  return products.filter((p) => {
    const min = productFromPriceCents(p);
    if (min === null) return false;
    if (filters.priceMinCents !== undefined && min < filters.priceMinCents) return false;
    if (filters.priceMaxCents !== undefined && min > filters.priceMaxCents) return false;
    return true;
  });
}

// Quita HTML del campo description para uso en meta tags / JSON-LD
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
