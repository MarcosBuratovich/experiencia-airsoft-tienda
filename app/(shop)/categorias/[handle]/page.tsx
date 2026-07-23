import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getCategoryByHandle, getCategories } from "@/lib/tiendanube/categories";
import { getProductsInCategory } from "@/lib/tiendanube/products";
import { stripHtml } from "@/lib/tiendanube/normalize";
import type { Product } from "@/lib/tiendanube/types";
import { ProductGrid } from "@/components/product/product-grid";
import { CategoryExplorer } from "@/components/product/category-explorer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BreadcrumbJsonLd } from "@/components/seo/site-jsonld";
import { SHOP_URL } from "@/app/_components/site-constants";

type Params = { handle: string };

// Pre-renderiza en build el HTML de TODAS las categorías (mismo criterio que
// productos/[handle]): servidas estáticas, Googlebot nunca espera a la API de
// TN ni puede pisar su rate limit — antes, ráfagas de requests concurrentes
// con cache fría tiraban estas páginas a 500/timeout. Los filtros
// (?precio/?orden) se resuelven client-side en CategoryExplorer.
export async function generateStaticParams() {
  const categories = await getCategories().catch(() => []);
  return categories.filter((c) => c.handle).map((c) => ({ handle: c.handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const category = await getCategoryByHandle(handle).catch(() => null);
  if (!category) return { title: "Categoría no encontrada", robots: { index: false } };

  // stripHtml: category.description trae HTML crudo de TN (<p>, <strong>); sin
  // limpiarlo Google muestra/reescribe una meta description con tags.
  const cleanDesc = category.description
    ? stripHtml(category.description).slice(0, 160)
    : "";
  const description =
    cleanDesc ||
    `Productos de la categoría ${category.name} en Tienda Experiencia Airsoft.`;

  // Las vistas con filtro/orden sirven este mismo HTML estático: el canonical
  // limpio + el bloqueo de esos params en robots.txt evitan duplicados (la
  // página ya no lee searchParams — es estática, no hay noindex condicional).
  return {
    title: category.name,
    description,
    alternates: { canonical: `/categorias/${handle}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle } = await params;
  const category = await getCategoryByHandle(handle);
  if (!category) notFound();

  // Resolver subcategorias para enlace contextual (no usadas en query aun)
  const allCats = await getCategories().catch(() => []);
  const subcategories = allCats.filter((c) => c.parent === category.id);

  // Lista COMPLETA de la categoría, derivada del catálogo bulk cacheado (cero
  // fetch a TN por categoría). Se renderiza entera —sin paginar— así cada
  // producto queda enlazado desde su categoría en el HTML estático.
  const items = await getProductsInCategory(category.id);

  // Al explorador client-side la lista viaja serializada en el payload RSC;
  // le sacamos `description` (HTML pesado que las cards no usan) para no
  // engordar la página.
  const slim = items.map((p) => ({ ...p, description: "" }));

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
            <Link
              key={sc.id}
              href={`/categorias/${sc.handle}`}
              className="inline-flex items-center px-3 min-h-[2.5rem] fluid-xs uppercase tracking-widest border border-bone/15 text-bone hover:border-orange hover:text-orange transition-colors clip-tag"
            >
              {sc.name}
            </Link>
          ))}
        </div>
      ) : null}

      {/* useSearchParams del explorador suspende en el prerender: el HTML
          estático imprime el fallback (la grilla default completa) y al
          hidratar se reemplaza por la versión filtrable. */}
      <Suspense fallback={<ExplorerFallback products={items} />}>
        <CategoryExplorer products={slim} />
      </Suspense>

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

// Lo que queda impreso en el HTML pre-renderizado (y ven bots / usuarios sin
// JS): la grilla default completa más un espaciador con la altura de la barra
// de filtros para no mover el layout al hidratar.
function ExplorerFallback({ products }: { products: Product[] }) {
  return (
    <>
      <div className="mt-8 border-y border-bone/10 py-4 min-h-[4.5rem]" aria-hidden />
      <div className="mt-8">
        <ProductGrid products={products} priorityFirst={4} />
      </div>
    </>
  );
}
