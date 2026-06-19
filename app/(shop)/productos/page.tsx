import type { Metadata } from "next";
import { getProducts } from "@/lib/tiendanube/products";
import { getCategoryByHandle } from "@/lib/tiendanube/categories";
import { applyLocalProductFilters } from "@/lib/tiendanube/normalize";
import { ProductGrid } from "@/components/product/product-grid";
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

  const items = await getProducts({
    category: category?.id,
    q: parsed.q,
    page: parsed.page,
    per_page: PER_PAGE,
    sort_by: parsed.sortBy,
  }).catch((err) => {
    console.error("[productos] getProducts failed", err);
    return [];
  });

  const filtered = applyLocalProductFilters(items, {
    priceMinCents: parsed.priceMinCents,
    priceMaxCents: parsed.priceMaxCents,
  });

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
          {filtered.length}{" "}
          {filtered.length === 1 ? "producto encontrado" : "productos encontrados"}
        </p>
      </div>

      <FilterBar
        priceMin={parsed.priceMinCents ? parsed.priceMinCents / 100 : undefined}
        priceMax={parsed.priceMaxCents ? parsed.priceMaxCents / 100 : undefined}
        orden={parsed.rawOrden}
      />
      <ActiveFilters items={activeFilters} />

      <div className="mt-8">
        <ProductGrid products={filtered} priorityFirst={4} />
      </div>

      <Pagination
        currentPage={parsed.page}
        hasNext={items.length === PER_PAGE}
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
