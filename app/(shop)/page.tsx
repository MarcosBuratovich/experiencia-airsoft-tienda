import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CreditCard,
  Headphones,
  PackageCheck,
  Plane,
  Truck,
} from "lucide-react";
import { getFeaturedProducts, getProducts, getProductsByCategory } from "@/lib/tiendanube/products";
import { getCategories } from "@/lib/tiendanube/categories";
import { productPrimaryImage } from "@/lib/tiendanube/normalize";
import { ProductGrid } from "@/components/product/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { OpsDashboard } from "@/components/hero/ops-dashboard";
import { MACRO_CATEGORIES, sortByCuratedOrder } from "@/lib/category-order";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { Category } from "@/lib/tiendanube/types";

// Marcas oficiales destacadas en el home (orden = importancia).
const FEATURED_BRANDS = [
  "Novritsch",
  "Tokyo Marui",
  "KWA",
  "WE Tech",
  "JAG Arms",
  "Taran Tactical Innovations",
  "IDOgear",
  "Acetech",
  "Emerson Gear",
  "PTS Syndicate",
  "Krytac",
  "G&G",
  "Baofeng",
  "GoPro",
] as const;

export default async function HomePage() {
  const [featured, categories, allProducts] = await Promise.all([
    getFeaturedProducts(8).catch((err) => {
      console.error("[home] featured products failed", err);
      return [];
    }),
    getCategories().catch((err) => {
      console.error("[home] categories failed", err);
      return [];
    }),
    // Para los stats del dashboard. Si falla, devolvemos array vacío y el
    // dashboard cae a la sección sin numbers exactos (formatBigNumber lo maneja).
    getProducts({ per_page: 200 }).catch((err) => {
      console.error("[home] all products failed", err);
      return [];
    }),
  ]);

  const roots = sortByCuratedOrder(categories.filter((c) => !c.parent));
  // Contamos marcas distintas (excluyendo "Genérico").
  const brandSet = new Set<string>();
  for (const p of allProducts) {
    if (p.brand && p.brand !== "Genérico") brandSet.add(p.brand);
  }
  const productCount = allProducts.length;
  const categoryCount = roots.length;
  const brandCount = brandSet.size;

  // Para cada categoría raíz, traemos todos sus productos: necesitamos la
  // imagen del primero (visual hero) y el conteo real (no capped).
  // per_page: 200 es el max de TN; el catálogo entra cómodamente.
  const heroByName = new Map<string, { src: string | null; count: number; cat: Category }>();
  await Promise.all(
    roots.map(async (cat) => {
      const items = await getProductsByCategory(cat.id, { per_page: 200 }).catch(() => []);
      const img = items[0] ? productPrimaryImage(items[0]) : null;
      heroByName.set(cat.name, { src: img?.src ?? null, count: items.length, cat });
    }),
  );
  const homeMacros = MACRO_CATEGORIES.slice(0, 4);

  return (
    <>
      {/* ─────── Hero ─────── */}
      <section className="relative overflow-hidden border-b border-bone/10">
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

        <div className="max-w-[1400px] mx-auto fluid-gutter-x py-[clamp(3rem,8vw,9rem)] grid md:grid-cols-2 lg:grid-cols-12 items-center gap-8 md:gap-10 lg:gap-16">
          <div className="lg:col-span-7 relative">
            <div className="hero-fade hero-fade-1 inline-flex items-center gap-3 sect-label">
              <span
                className="size-2 bg-orange rounded-full pulse-dot"
                aria-hidden
              />
              Tienda Oficial · Stock vivo
            </div>

            <h1 className="sect-title mt-6 fluid-6xl leading-[0.88] tracking-tight">
              <span className="hero-word" style={{ animationDelay: "0.12s" }}>Armá</span>{" "}
              <span className="hero-word" style={{ animationDelay: "0.26s" }}>tu</span>
              <br />
              <span className="hero-word text-orange" style={{ animationDelay: "0.42s" }}>setup.</span>
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
          </div>

          <div className="lg:col-span-5 relative">
            <OpsDashboard
              productCount={productCount}
              categoryCount={categoryCount}
              brandCount={brandCount}
            />
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

      {/* ─────── Por sector (macro-categorías) ─────── */}
      <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
        <div className="flex items-end justify-between gap-4 mb-10 border-b border-bone/10 pb-5">
          <div>
            <p className="sect-label">Operaciones</p>
            <h2 className="sect-title fluid-4xl mt-2">Explorá por sector</h2>
            <p className="text-ash fluid-base mt-3 max-w-prose">
              El catálogo organizado para que encuentres rápido lo que necesitás.
            </p>
          </div>
          <Link
            href="/categorias"
            className="hidden md:inline-flex items-center gap-2 fluid-xs uppercase tracking-widest text-bone hover:text-orange transition-colors"
          >
            Ver todas <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {homeMacros.map((macro, i) => {
            const items = macro.categories
              .map((name) => heroByName.get(name))
              .filter((x): x is { src: string | null; count: number; cat: Category } => Boolean(x));
            const featured = items.find((x) => x.src) || items[0];
            if (!featured) return null;
            const totalProducts = items.reduce((sum, x) => sum + x.count, 0);
            return (
              <Link
                key={macro.slug}
                href={`/categorias/${featured.cat.handle}`}
                className="group relative block clip-notch border border-bone/10 bg-carbon overflow-hidden transition-all duration-300 hover:border-bone/30 hover:-translate-y-0.5"
              >
                <div className="relative aspect-[4/5] bg-ink overflow-hidden">
                  {featured.src ? (
                    <Image
                      src={featured.src}
                      alt={macro.label}
                      fill
                      sizes="(min-width: 1024px) 22vw, (min-width: 768px) 45vw, 90vw"
                      className="object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                    />
                  ) : (
                    <div className="absolute inset-0 diag-lines-faint" />
                  )}
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="font-mono fluid-xs tracking-[.28em] uppercase text-orange-300">
                      0{i + 1} · {totalProducts}{totalProducts === 1 ? " producto" : " productos"}
                    </p>
                    <h3 className="font-display fluid-xl uppercase tracking-wide text-bone mt-2 leading-tight">
                      {macro.label}
                    </h3>
                    <p className="fluid-xs text-ash mt-2 line-clamp-2">
                      {macro.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <Link
          href="/categorias"
          className="mt-6 md:hidden inline-flex items-center gap-2 fluid-xs uppercase tracking-widest text-bone hover:text-orange transition-colors"
        >
          Ver todas las categorías <ArrowRight size={14} aria-hidden />
        </Link>
      </section>

      {/* ─────── Destacados ─────── */}
      <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y border-t border-bone/10">
        <div className="flex items-end justify-between gap-4 mb-10">
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
          <ProductGrid
            products={featured}
            priorityFirst={2}
            listId="home_destacados"
            listName="Destacados"
          />
        ) : (
          <EmptyState
            title="Cargando catálogo"
            hint="Estamos sumando productos. Volvé en un rato o escribinos por WhatsApp."
            cta={{ href: "/productos", label: "Ver todo" }}
          />
        )}
      </section>

      {/* ─────── Marcas oficiales ─────── */}
      <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y border-t border-bone/10">
        <div className="mb-8 max-w-2xl">
          <p className="sect-label">Catálogo oficial</p>
          <h2 className="sect-title fluid-3xl mt-2">Marcas con las que trabajamos</h2>
          <p className="text-ash fluid-sm mt-3">
            Productos originales de fabricantes reconocidos del airsoft. Cada
            marca pasada por nuestro control de calidad antes de llegar al
            campo.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-px bg-bone/10 border border-bone/10">
          {FEATURED_BRANDS.map((brand) => (
            <div
              key={brand}
              className="aspect-[3/1] sm:aspect-[2/1] bg-carbon flex items-center justify-center p-2 md:p-4 transition-colors hover:bg-steel"
            >
              <BrandLogo brand={brand} size="md" />
            </div>
          ))}
        </div>
      </section>

      {/* ─────── CTA pedidos exterior ─────── */}
      <section className="max-w-[1400px] mx-auto fluid-gutter-x pb-[var(--sp-section)]">
        <div className="relative border border-bone/10 bg-carbon clip-notch p-8 md:p-12 overflow-hidden">
          <div
            className="absolute inset-0 -z-10 opacity-30 diag-lines-faint"
            aria-hidden
          />
          <div className="grid md:grid-cols-[1fr_auto] items-center gap-6">
            <div className="max-w-2xl">
              <p className="sect-label">Servicio especial</p>
              <h3 className="sect-title fluid-3xl mt-2">
                ¿Buscás algo que no está en stock?
              </h3>
              <p className="text-ash fluid-base mt-4 leading-relaxed">
                Te lo traemos de Brasil. Lo cargás en arsenalsports.com, nos
                pasás el link y te cotizamos. Seña del 30% mínimo.
              </p>
            </div>
            <Button href="/pedidos-exterior" variant="primary" size="lg">
              <Plane size={16} aria-hidden /> Pedir del exterior
            </Button>
          </div>
        </div>
      </section>
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
