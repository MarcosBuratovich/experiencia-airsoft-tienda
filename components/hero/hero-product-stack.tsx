import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/tiendanube/types";
import {
  productFromPriceCents,
  productPrimaryImage,
} from "@/lib/tiendanube/normalize";
import { formatARS } from "@/lib/format";

// Mosaico de productos featured para la hero:
// 1 card grande + 2 chicas. En mobile solo la grande, las chicas aparecen
// a partir de sm. Cada card entra con stagger (hero-card / hero-card-N).
export function HeroProductStack({ products }: { products: Product[] }) {
  const items = products.slice(0, 3);
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-3 h-[420px] md:h-[500px]">
      {items.map((p, i) => {
        const img = productPrimaryImage(p);
        const price = productFromPriceCents(p);
        const isBig = i === 0;
        return (
          <Link
            key={p.id}
            href={`/productos/${p.handle}`}
            className={`group hero-card hero-card-${i + 1} relative overflow-hidden bg-carbon border border-bone/15 hover:border-orange/60 clip-notch flex flex-col ${
              isBig
                ? "col-span-3 sm:col-span-2 row-span-2"
                : "col-span-1 row-span-1 hidden sm:flex"
            }`}
          >
            <div className="relative flex-1 imgcard">
              {img ? (
                <Image
                  src={img.src}
                  alt={img.alt || p.name}
                  fill
                  priority={isBig}
                  sizes={
                    isBig
                      ? "(min-width: 1024px) 36vw, (min-width: 640px) 50vw, 100vw"
                      : "(min-width: 1024px) 18vw, 25vw"
                  }
                  className="object-contain p-5"
                />
              ) : (
                <div className="absolute inset-0 diag-lines-faint" />
              )}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/0 to-transparent pointer-events-none"
              />
              {isBig ? (
                <span className="absolute top-3 left-3 mil-tag bone">
                  Destacado
                </span>
              ) : null}
            </div>
            <div className="relative px-4 pb-4 pt-2 space-y-1 z-10">
              {p.brand ? (
                <p className="sect-label truncate">{p.brand}</p>
              ) : null}
              <p
                className={`uppercase tracking-wide text-bone group-hover:text-orange transition-colors line-clamp-2 ${
                  isBig ? "fluid-lg" : "fluid-xs"
                }`}
              >
                {p.name}
              </p>
              <p
                className={`text-orange font-semibold ${
                  isBig ? "fluid-2xl" : "fluid-sm"
                }`}
              >
                {formatARS(price)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
