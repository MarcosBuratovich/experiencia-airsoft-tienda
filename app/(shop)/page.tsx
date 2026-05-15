import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFeaturedProducts } from "@/lib/tiendanube/products";
import { getCategories } from "@/lib/tiendanube/categories";
import { ProductGrid } from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  // En paralelo: featured + categorias (cada uno usa su propia cache via 'use cache')
  const [featured, categories] = await Promise.all([
    getFeaturedProducts(8).catch((err) => {
      console.error("[home] featured products failed", err);
      return [];
    }),
    getCategories().catch((err) => {
      console.error("[home] categories failed", err);
      return [];
    }),
  ]);

  const topCategories = categories.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="relative diag-lines border-b border-bone/10">
        <div className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y grid md:grid-cols-12 gap-8 items-end">
          <div className="md:col-span-8 reveal in">
            <p className="sect-label">Tienda · Equipamiento táctico</p>
            <h1 className="sect-title fluid-6xl mt-4">
              Equipalo
              <br />
              <span className="text-orange">para la próxima partida</span>
            </h1>
            <p className="text-ash fluid-lg mt-6 max-w-prose">
              Marcadoras AEG y GBB, BBs, protección y accesorios. Despacho a
              todo el país. Retiro en Conesa 1858, CABA.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/productos" variant="primary" size="lg">
                Ver todos los productos <ArrowRight size={16} aria-hidden />
              </Button>
              <Button href="/categorias" variant="ghost" size="lg">
                Explorar categorías
              </Button>
            </div>
          </div>
          <div className="md:col-span-4 hidden md:flex flex-col gap-3 fluid-xs uppercase tracking-widest text-smoke">
            <p className="mil-tag bone w-fit">+18 · DNI obligatorio</p>
            <ul className="font-mono leading-relaxed">
              <li>· Envíos a todo el país</li>
              <li>· Retiro en sucursal CABA</li>
              <li>· Garantía oficial en marcadoras</li>
              <li>· Asesoramiento por WhatsApp</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="sect-label">Recién llegado</p>
            <h2 className="sect-title fluid-4xl mt-2">Destacados</h2>
          </div>
          <Link
            href="/productos"
            className="hidden md:inline-flex items-center gap-2 fluid-xs uppercase tracking-widest text-bone hover:text-orange transition-colors"
          >
            Ver todo <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        {featured.length > 0 ? (
          <ProductGrid products={featured} priorityFirst={2} />
        ) : (
          <EmptyState
            title="Cargando catálogo"
            hint="Estamos sumando productos. Volvé en un rato o escribinos por WhatsApp."
            cta={{ href: "/productos", label: "Ver todo" }}
          />
        )}
      </section>

      {/* Categorias */}
      {topCategories.length > 0 ? (
        <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y border-t border-bone/10">
          <div className="mb-8">
            <p className="sect-label">Operaciones</p>
            <h2 className="sect-title fluid-4xl mt-2">Por categoría</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {topCategories.map((c) => (
              <Link
                key={c.id}
                href={`/categorias/${c.handle}`}
                className="group block border border-bone/10 bg-carbon hover:border-orange/40 transition-colors p-6 clip-notch"
              >
                <p className="sect-label">Sector</p>
                <p className="fluid-xl uppercase tracking-wide text-bone group-hover:text-orange transition-colors mt-2">
                  {c.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
