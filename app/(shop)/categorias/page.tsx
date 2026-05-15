import type { Metadata } from "next";
import { getCategories } from "@/lib/tiendanube/categories";
import { CategoryCard } from "@/components/category/category-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Categorías",
  description:
    "Explorá las categorías de Tienda Experiencia Airsoft: marcadoras, BBs, protección, chalecos y más.",
  alternates: { canonical: "/categorias" },
};

export default async function CategoriesPage() {
  const cats = await getCategories().catch((err) => {
    console.error("[categorias] failed", err);
    return [];
  });
  // Mostramos solo categorias root (sin parent) en el indice principal.
  const roots = cats.filter((c) => !c.parent);

  return (
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
      <Breadcrumbs
        items={[
          { href: "/", label: "Tienda" },
          { label: "Categorías" },
        ]}
      />
      <div className="mt-6 mb-10">
        <p className="sect-label">Operaciones</p>
        <h1 className="sect-title fluid-5xl mt-2">Categorías</h1>
        <p className="text-ash fluid-base mt-3 max-w-prose">
          Encontrá lo que buscás explorando por sector. Marcadoras, BBs,
          protección, chalecos y accesorios.
        </p>
      </div>

      {roots.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {roots.map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Cargando categorías"
          hint="Estamos organizando el catálogo. Volvé en un rato o escribinos por WhatsApp."
          cta={{ href: "/productos", label: "Ver todos los productos" }}
        />
      )}
    </section>
  );
}
