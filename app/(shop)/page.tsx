import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  Headphones,
  PackageCheck,
  Truck,
} from "lucide-react";
import { getFeaturedProducts } from "@/lib/tiendanube/products";
import { getCategories } from "@/lib/tiendanube/categories";
import { ProductGrid } from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { HeroProductStack } from "@/components/hero/hero-product-stack";

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
  const heroFeatured = featured.slice(0, 3);

  return (
    <>
      {/* ─────── Hero ─────── */}
      <section className="relative overflow-hidden border-b border-bone/10">
        {/* Capas de fondo */}
        <div className="absolute inset-0 -z-10" aria-hidden>
          <div className="absolute inset-0 diag-lines opacity-90" />
          <div className="absolute -left-32 top-1/4 w-[520px] h-[520px] rounded-full bg-orange/25 blur-[140px] hero-glow" />
          <div className="absolute right-[28%] inset-y-0 w-px overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-transparent via-orange/60 to-transparent hero-stripe" />
          </div>
          <div className="absolute left-[18%] inset-y-0 w-px overflow-hidden">
            <div
              className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-orange/40 to-transparent hero-stripe"
              style={{ animationDelay: "-3s", animationDuration: "9s" }}
            />
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto fluid-gutter-x py-[clamp(4rem,8vw,9rem)] grid lg:grid-cols-12 items-center gap-10 lg:gap-16">
          {/* Texto */}
          <div className="lg:col-span-7 relative">
            <div className="hero-fade hero-fade-1 inline-flex items-center gap-3 sect-label">
              <span
                className="size-2 bg-orange rounded-full pulse-dot"
                aria-hidden
              />
              Tienda Oficial · Stock vivo
            </div>

            <h1 className="sect-title mt-6 fluid-6xl leading-[0.88] tracking-tight">
              <span
                className="hero-word"
                style={{ animationDelay: "0.12s" }}
              >
                Armá
              </span>{" "}
              <span
                className="hero-word"
                style={{ animationDelay: "0.26s" }}
              >
                tu
              </span>
              <br />
              <span
                className="hero-word text-orange"
                style={{ animationDelay: "0.42s" }}
              >
                setup.
              </span>
            </h1>

            <p className="hero-fade hero-fade-4 text-ash fluid-lg mt-6 max-w-prose">
              Marcadoras, BBs, óptica, protección y accesorios. Stock
              actualizado al día, despachos a todo el país y retiro en CABA.
            </p>

            <div className="hero-fade hero-fade-5 mt-8 flex flex-wrap gap-3">
              <Button href="/productos" variant="primary" size="lg">
                Ver catálogo <ArrowRight size={16} aria-hidden />
              </Button>
              <Button href="/categorias" variant="outline" size="lg">
                Explorar categorías
              </Button>
            </div>

            {/* Mini ticker abajo del CTA */}
            <div className="hero-fade hero-fade-6 mt-10 flex items-center gap-3 font-mono fluid-xs uppercase tracking-[.32em] text-smoke">
              <span className="hero-ticker text-orange">●</span>
              <span>
                {featured.length > 0
                  ? `${featured.length}+ productos disponibles`
                  : "Catálogo cargando"}
              </span>
              <span className="text-rail">/</span>
              <span>{categories.length} categorías</span>
            </div>
          </div>

          {/* Visual: mosaico */}
          <div className="lg:col-span-5 relative">
            {heroFeatured.length > 0 ? (
              <HeroProductStack products={heroFeatured} />
            ) : (
              <div className="hero-card hero-card-1 h-[420px] md:h-[500px] diag-lines-faint border border-bone/15 clip-notch flex items-center justify-center text-smoke fluid-sm uppercase tracking-widest">
                Cargando productos…
              </div>
            )}
          </div>
        </div>

        {/* Specs stripe */}
        <div className="hero-fade hero-fade-6 relative border-t border-bone/10 bg-ink/70 backdrop-blur-sm">
          <div className="max-w-[1400px] mx-auto fluid-gutter-x grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 py-5 font-mono fluid-xs uppercase tracking-[.22em] text-ash">
            <SpecRow icon={Truck} label="Envío a todo el país" />
            <SpecRow icon={PackageCheck} label="Stock actualizado al día" />
            <SpecRow icon={CreditCard} label="MercadoPago · Transferencia" />
            <SpecRow icon={Headphones} label="Asesoramiento WhatsApp" />
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
            <p className="sect-label">Catálogo</p>
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

function SpecRow({
  icon: Icon,
  label,
}: {
  icon: typeof Truck;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <Icon size={14} className="text-orange shrink-0" aria-hidden />
      <span>{label}</span>
    </span>
  );
}
