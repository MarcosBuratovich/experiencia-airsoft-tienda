import type { ProductSortBy } from "@/lib/tiendanube/types";

const SORT_MAP: Record<string, ProductSortBy> = {
  recientes: "default",
  baratos: "price-ascending",
  caros: "price-descending",
  az: "name-ascending",
  za: "name-descending",
  destacados: "user",
  mas_vendidos: "best-selling",
};

export interface ParsedProductsSearch {
  categoryHandle?: string;
  priceMinCents?: number;
  priceMaxCents?: number;
  page: number;
  sortBy: ProductSortBy;
  rawOrden?: string;
}

function toIntPositive(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

export function parseProductsSearch(
  sp: Record<string, string | string[] | undefined>,
): ParsedProductsSearch {
  const get = (k: string): string | undefined => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0];
    return v;
  };

  const priceMin = toIntPositive(get("precio_min"));
  const priceMax = toIntPositive(get("precio_max"));
  const page = toIntPositive(get("page")) ?? 1;
  const rawOrden = get("orden");
  const mapped = rawOrden ? SORT_MAP[rawOrden] : undefined;
  const sortBy: ProductSortBy = mapped ?? "default";

  return {
    categoryHandle: get("categoria") || undefined,
    priceMinCents: priceMin !== undefined ? priceMin * 100 : undefined,
    priceMaxCents: priceMax !== undefined ? priceMax * 100 : undefined,
    page: Math.max(1, page),
    sortBy,
    rawOrden,
  };
}

export function buildProductsHref(
  current: Partial<{
    categoria: string;
    precio_min: number;
    precio_max: number;
    orden: string;
    page: number;
  }>,
): string {
  const params = new URLSearchParams();
  if (current.categoria) params.set("categoria", current.categoria);
  if (current.precio_min !== undefined)
    params.set("precio_min", String(current.precio_min));
  if (current.precio_max !== undefined)
    params.set("precio_max", String(current.precio_max));
  if (current.orden) params.set("orden", current.orden);
  if (current.page && current.page > 1) params.set("page", String(current.page));
  const qs = params.toString();
  return qs ? `/productos?${qs}` : "/productos";
}

export const SORT_OPTIONS = [
  { value: "recientes", label: "Más recientes" },
  { value: "mas_vendidos", label: "Más vendidos" },
  { value: "baratos", label: "Precio: menor a mayor" },
  { value: "caros", label: "Precio: mayor a menor" },
  { value: "az", label: "Nombre A → Z" },
  { value: "za", label: "Nombre Z → A" },
] as const;
