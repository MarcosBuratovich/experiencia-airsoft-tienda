import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryByHandle, getCategories } from "@/lib/tiendanube/categories";
import { getProductsByCategory } from "@/lib/tiendanube/products";
import { applyLocalProductFilters } from "@/lib/tiendanube/normalize";
import { ProductGrid } from "@/components/product/product-grid";
import { FilterBar } from "@/components/filters/filter-bar";
import { ActiveFilters } from "@/components/filters/active-filters";
import { Pagination } from "@/components/ui/pagination";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BreadcrumbJsonLd } from "@/components/seo/site-jsonld";
import { SHOP_URL } from "@/app/_components/site-constants";
import { parseProductsSearch } from "@/lib/url";

const PER_PAGE = 24;

type Params = { handle: string };
type SearchParams = {
  precio_min?: string;
  precio_max?: string;
  orden?: string;
  page?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const category = await getCategoryByHandle(handle).catch(() => null);
  if (!category) return { title: "Categoría no encontrada", robots: { index: false } };
  return {
    title: category.name,
    description:
      category.description ||
      `Productos de la categoría ${category.name} en Tienda Experiencia Airsoft.`,
    alternates: { canonical: `/categorias/${handle}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ handle }, rawSp] = await Promise.all([params, searchParams]);
  const category = await getCategoryByHandle(handle);
  if (!category) notFound();

  const parsed = parseProductsSearch(rawSp);

  // Resolver subcategorias para enlace contextual (no usadas en query aun)
  const allCats = await getCategories().catch(() => []);
  const subcategories = allCats.filter((c) => c.parent === category.id);

  const items = await getProductsByCategory(category.id, {
    page: parsed.page,
    per_page: PER_PAGE,
    sort_by: parsed.sortBy,
  }).catch((err) => {
    console.error("[categoria]", err);
    return [];
  });

  const filtered = applyLocalProductFilters(items, {
    priceMinCents: parsed.priceMinCents,
    priceMaxCents: parsed.priceMaxCents,
  });

  const activeFilters: {
    key: "categoria" | "precio_min" | "precio_max" | "orden";
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
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
      <Breadcrumbs
        items={[
          { href: "/", label: "Tienda" },
          { href: "/categorias", label: "Categorías" },
          { label: category.name },
        ]}
      />

      <div className="mt-6">
        <p className="sect-label">Sector</p>
        <h1 className="sect-title fluid-5xl mt-2">{category.name}</h1>
        {category.description ? (
          <div
            className="text-ash fluid-base mt-3 max-w-prose"
            dangerouslySetInnerHTML={{ __html: category.description }}
          />
        ) : null}
      </div>

      {subcategories.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {subcategories.map((sc) => (
            <a
              key={sc.id}
              href={`/categorias/${sc.handle}`}
              className="inline-flex items-center px-3 min-h-[2.5rem] fluid-xs uppercase tracking-widest border border-bone/15 text-bone hover:border-orange hover:text-orange transition-colors clip-tag"
            >
              {sc.name}
            </a>
          ))}
        </div>
      ) : null}

      <div className="mt-8">
        <FilterBar
          priceMin={parsed.priceMinCents ? parsed.priceMinCents / 100 : undefined}
          priceMax={parsed.priceMaxCents ? parsed.priceMaxCents / 100 : undefined}
          orden={parsed.rawOrden}
        />
        <ActiveFilters items={activeFilters} />
      </div>

      <div className="mt-8">
        <ProductGrid products={filtered} priorityFirst={4} />
      </div>

      <Pagination
        currentPage={parsed.page}
        hasNext={items.length === PER_PAGE}
        buildHref={(p) => {
          const params = new URLSearchParams();
          if (parsed.priceMinCents !== undefined)
            params.set("precio_min", String(parsed.priceMinCents / 100));
          if (parsed.priceMaxCents !== undefined)
            params.set("precio_max", String(parsed.priceMaxCents / 100));
          if (parsed.rawOrden) params.set("orden", parsed.rawOrden);
          if (p > 1) params.set("page", String(p));
          const qs = params.toString();
          return `/categorias/${handle}${qs ? `?${qs}` : ""}`;
        }}
      />

      <BreadcrumbJsonLd
        items={[
          { name: "Tienda", url: `${SHOP_URL}/` },
          { name: "Categorías", url: `${SHOP_URL}/categorias` },
          { name: category.name },
        ]}
      />
    </section>
  );
}
