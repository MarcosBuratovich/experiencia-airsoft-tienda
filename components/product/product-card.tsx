import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/tiendanube/types";
import {
  productFromPriceCents,
  productHasStock,
  productPrimaryImage,
} from "@/lib/tiendanube/normalize";
import { PriceTag } from "./price-tag";
import { StockBadge } from "./stock-badge";
import { BrandLogo } from "@/components/brand/brand-logo";

export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 50vw",
}: {
  product: Product;
  priority?: boolean;
  sizes?: string;
}) {
  const img = productPrimaryImage(product);
  const fromPrice = productFromPriceCents(product);
  const inStock = productHasStock(product);
  const firstVariant = product.variants[0];

  return (
    <Link
      href={`/productos/${product.handle}`}
      className="group block relative clip-notch border border-bone/10 bg-carbon transition-all duration-300 hover:border-bone/30 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)]"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] bg-ink overflow-hidden">
        {img ? (
          <Image
            src={img.src}
            alt={img.alt || product.name}
            fill
            sizes={sizes}
            priority={priority}
            className="object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 diag-lines-faint flex items-center justify-center">
            <span className="sect-label">Sin imagen</span>
          </div>
        )}

        {/* Sutil vignette top/bottom para dar profundidad sin tapar el producto */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25"
          aria-hidden
        />

        {/* Stock badge */}
        <div className="absolute top-3 right-3 z-10">
          <StockBadge hasStock={inStock} stockNumber={firstVariant?.stock} />
        </div>

        {/* Hover affordance: arrow indicator que indica "click para ver detalle" */}
        <div
          className="absolute bottom-3 right-3 z-10 size-9 grid place-items-center border border-bone/15 bg-ink/80 backdrop-blur-sm opacity-0 -translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
          aria-hidden
        >
          <ArrowUpRight size={16} className="text-bone" />
        </div>
      </div>

      {/* Info area */}
      <div className="p-5 pt-4 space-y-3">
        {product.brand && product.brand !== "Genérico" ? (
          <div className="h-5 flex items-center">
            <BrandLogo brand={product.brand} size="sm" />
          </div>
        ) : (
          <div className="h-5" aria-hidden />
        )}
        <h3 className="font-display fluid-lg leading-[1.1] uppercase tracking-wide text-bone line-clamp-2 sm:line-clamp-3 min-h-[2.2em] sm:min-h-[3.3em] group-hover:text-bone transition-colors">
          {product.name}
        </h3>
        <div className="pt-1 border-t border-bone/5">
          <PriceTag
            priceCents={fromPrice}
            compareCents={firstVariant?.compare_at_price ?? null}
            promotionalCents={firstVariant?.promotional_price ?? null}
            size="sm"
            className="pt-3"
          />
        </div>
      </div>
    </Link>
  );
}
