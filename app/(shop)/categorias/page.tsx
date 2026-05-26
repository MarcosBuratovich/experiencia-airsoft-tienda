import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getCategories } from "@/lib/tiendanube/categories";
import { getProductsByCategory } from "@/lib/tiendanube/products";
import { productPrimaryImage } from "@/lib/tiendanube/normalize";
import { MACRO_CATEGORIES, sortByCuratedOrder } from "@/lib/category-order";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import type { Category } from "@/lib/tiendanube/types";

export const metadata: Metadata = {
  title: "Categorías",
  description:
    "Explorá el catálogo por sector: marcadoras, munición, óptica, protección, equipamiento táctico, comunicaciones y más.",
  alternates: { canonical: "/categorias" },
};

interface CategoryHero {
  category: Category;
  productCount: number;
  imageSrc: string | null;
  imageAlt: string;
}

async function buildCategoryHero(category: Category): Promise<CategoryHero> {
  // Trae todos los productos de la categoría: necesitamos el primero como
  // visual hero y el count real (no capped). per_page: 200 es el max de TN.
  const items = await getProductsByCategory(category.id, { per_page: 200 }).catch(() => []);
  const first = items[0];
  const img = first ? productPrimaryImage(first) : null;
  return {
    category,
    productCount: items.length,
    imageSrc: img?.src ?? null,
    imageAlt: img?.alt ?? category.name,
  };
}

export default async function CategoriesPage() {
  const allCats = await getCategories().catch((err) => {
    console.error("[categorias] failed", err);
    return [];
  });
  const roots = sortByCuratedOrder(allCats.filter((c) => !c.parent));

  // Fetcheamos hero data para cada categoría en paralelo.
  const heroes = await Promise.all(roots.map(buildCategoryHero));
  const heroByName = new Map(heroes.map((h) => [h.category.name, h]));

  return (
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
      <Breadcrumbs
        items={[
          { href: "/", label: "Tienda" },
          { label: "Categorías" },
        ]}
      />
      <div className="mt-6 mb-12 max-w-3xl">
        <p className="sect-label">Operaciones</p>
        <h1 className="sect-title fluid-4xl md:fluid-5xl mt-3">Categorías</h1>
        <p className="text-ash fluid-base mt-4 leading-relaxed">
          Encontrá lo que buscás explorando por sector. Marcadoras primarias y
          secundarias, óptica, iluminación, protección, equipamiento táctico,
          munición, comunicaciones y más.
        </p>
      </div>

      {roots.length === 0 ? (
        <EmptyState
          title="Cargando categorías"
          hint="Estamos organizando el catálogo. Volvé en un rato o escribinos por WhatsApp."
          cta={{ href: "/productos", label: "Ver todos los productos" }}
        />
      ) : (
        <div className="space-y-14 md:space-y-20">
          {MACRO_CATEGORIES.map((macro) => {
            const items = macro.categories
              .map((name) => heroByName.get(name))
              .filter((x): x is CategoryHero => Boolean(x) && (x as CategoryHero).productCount > 0);
            if (items.length === 0) return null;
            return (
              <div key={macro.slug}>
                <div className="flex items-end justify-between gap-4 mb-6 border-b border-bone/10 pb-4">
                  <div>
                    <p className="sect-label">{`0${MACRO_CATEGORIES.indexOf(macro) + 1}`}</p>
                    <h2 className="sect-title fluid-3xl mt-2">{macro.label}</h2>
                    <p className="text-ash fluid-sm mt-2 max-w-xl">
                      {macro.description}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {items.map((hero, i) => (
                    <CategoryHeroCard key={hero.category.id} hero={hero} variant={i === 0 ? "primary" : "secondary"} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CategoryHeroCard({
  hero,
  variant = "secondary",
}: {
  hero: CategoryHero;
  variant?: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";
  return (
    <Link
      href={`/categorias/${hero.category.handle}`}
      className="group relative block clip-notch border border-bone/10 bg-carbon overflow-hidden transition-all duration-300 hover:border-bone/30 hover:-translate-y-0.5"
    >
      <div className={`relative ${isPrimary ? "aspect-[5/4]" : "aspect-[4/3]"} bg-ink overflow-hidden`}>
        {hero.imageSrc ? (
          <Image
            src={hero.imageSrc}
            alt={hero.imageAlt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="absolute inset-0 diag-lines-faint" />
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
          <p className="font-mono fluid-xs tracking-[.28em] uppercase text-orange-300">
            {hero.productCount}{hero.productCount === 1 ? " producto" : " productos"}
          </p>
          <h3 className="font-display fluid-2xl uppercase tracking-wide text-bone mt-2 leading-none">
            {hero.category.name}
          </h3>
          <span className="inline-flex items-center gap-2 fluid-xs uppercase tracking-widest text-ash mt-3 group-hover:text-bone transition-colors">
            Explorar <ArrowRight size={14} aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
