import type { Metadata } from "next";
import { getAllPublishedProducts, getProducts } from "@/lib/tiendanube/products";
import { getCategoryByHandle } from "@/lib/tiendanube/categories";
import {
  applyLocalProductFilters,
  sortProducts,
} from "@/lib/tiendanube/normalize";
import type { Product } from "@/lib/tiendanube/schemas";
import { ProductGrid } from "@/components/product/product-grid";
import { TrackEvent } from "@/app/_components/track-event";
import { FilterBar } from "@/components/filters/filter-bar";
import { ActiveFilters } from "@/components/filters/active-filters";
import { Pagination } from "@/components/ui/pagination";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buildProductsHref, parseProductsSearch } from "@/lib/url";

const PER_PAGE = 24;

type SearchParams = {
  categoria?: string;
  precio_min?: string;
  precio_max?: string;
  orden?: string;
  page?: string;
  q?: string;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  // Vistas con filtro/búsqueda/orden/paginación: noindex,follow. El canonical
  // siempre apunta a "/productos" limpio, que queda indexable.
  const filtered = Boolean(
    sp.q ||
      sp.categoria ||
      sp.orden ||
      sp.precio_min ||
      sp.precio_max ||
      (sp.page && sp.page !== "1"),
  );
  return {
    title: "Productos",
    description:
      "Catálogo completo de marcadoras, BBs, protección y accesorios para airsoft. Envíos a todo el país.",
    alternates: { canonical: "/productos" },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ProductsListPage({
  searchParams,
}: {
  // Next 16: searchParams es Promise
  searchParams: Promise<SearchParams>;
}) {
  const raw = await searchParams;
  const parsed = parseProductsSearch(raw);

  const category = parsed.categoryHandle
    ? await getCategoryByHandle(parsed.categoryHandle).catch(() => null)
    : null;

  const hasPriceFilter =
    parsed.priceMinCents !== undefined || parsed.priceMaxCents !== undefined;

  let pageItems: Product[];
  let resultCount: number;
  let hasNext: boolean;

  if (hasPriceFilter) {
    // Con filtro de precio, filtramos/ordenamos/paginamos sobre el catálogo
    // COMPLETO (getAllPublishedProducts está cacheado) en vez de sobre una
    // página de 24, para que el conteo y la paginación sean reales.
    const all = await getAllPublishedProducts().catch((err) => {
      console.error("[productos] getAllPublishedProducts failed", err);
      return [] as Product[];
    });
    let set = all;
    if (category) {
      set = set.filter((p) => p.categories.some((c) => c.id === category.id));
    }
    if (parsed.q) {
      const needle = parsed.q.toLowerCase();
      set = set.filter((p) => matchQuery(p, needle));
    }
    set = applyLocalProductFilters(set, {
      priceMinCents: parsed.priceMinCents,
      priceMaxCents: parsed.priceMaxCents,
    });
    set = sortProducts(set, parsed.sortBy);
    resultCount = set.length;
    const start = (parsed.page - 1) * PER_PAGE;
    pageItems = set.slice(start, start + PER_PAGE);
    hasNext = start + PER_PAGE < set.length;
  } else {
    // Sin filtro de precio: paginación de la API (correcta y preserva el orden).
    const items = await getProducts({
      category: category?.id,
      q: parsed.q,
      page: parsed.page,
      per_page: PER_PAGE,
      sort_by: parsed.sortBy,
    }).catch((err) => {
      console.error("[productos] getProducts failed", err);
      return [] as Product[];
    });
    pageItems = items;
    resultCount = items.length;
    hasNext = items.length === PER_PAGE;
  }

  const activeFilters: {
    key: "categoria" | "precio_min" | "precio_max" | "orden" | "q";
    label: string;
  }[] = [];
  if (parsed.q)
    activeFilters.push({ key: "q", label: `Búsqueda: "${parsed.q}"` });
  if (category)
    activeFilters.push({ key: "categoria", label: `Categoría: ${category.name}` });
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
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
      {/* Captura los dos forms del header y los links directos con ?q=. */}
      {parsed.q ? (
        <TrackEvent
          event="search"
          params={{ search_term: parsed.q, result_count: resultCount }}
          dedupeKey={parsed.q}
        />
      ) : null}
      <Breadcrumbs
        items={[
          { href: "/", label: "Tienda" },
          { label: category ? category.name : "Productos" },
        ]}
      />

      <div className="mt-6 mb-2">
        <p className="sect-label">
          {parsed.q ? "Resultados" : category ? "Categoría" : "Catálogo"}
        </p>
        <h1 className="sect-title fluid-4xl md:fluid-5xl mt-2">
          {parsed.q
            ? `“${parsed.q}”`
            : category
              ? category.name
              : "Todos los productos"}
        </h1>
        <p className="text-ash fluid-base mt-3">
          {resultCount}{" "}
          {resultCount === 1 ? "producto encontrado" : "productos encontrados"}
        </p>
      </div>

      <FilterBar
        priceMin={parsed.priceMinCents ? parsed.priceMinCents / 100 : undefined}
        priceMax={parsed.priceMaxCents ? parsed.priceMaxCents / 100 : undefined}
        orden={parsed.rawOrden}
      />
      <ActiveFilters items={activeFilters} />

      <div className="mt-8">
        <ProductGrid
          products={pageItems}
          priorityFirst={4}
          listId={parsed.q ? "busqueda" : category ? `categoria_${category.handle}` : "productos"}
          listName={parsed.q ? "Búsqueda" : category ? category.name : "Todos los productos"}
          listKey={`${parsed.q ?? ""}|${category?.handle ?? ""}|p${parsed.page}`}
        />
      </div>

      <Pagination
        currentPage={parsed.page}
        hasNext={hasNext}
        buildHref={(p) =>
          buildProductsHref({
            q: parsed.q,
            categoria: parsed.categoryHandle,
            precio_min: parsed.priceMinCents
              ? parsed.priceMinCents / 100
              : undefined,
            precio_max: parsed.priceMaxCents
              ? parsed.priceMaxCents / 100
              : undefined,
            orden: parsed.rawOrden,
            page: p,
          })
        }
      />
    </section>
  );
}

function matchQuery(p: Product, needle: string): boolean {
  return (
    p.name.toLowerCase().includes(needle) ||
    p.handle.toLowerCase().includes(needle) ||
    (p.tags ?? "").toLowerCase().includes(needle)
  );
}
