import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/tiendanube/types";
import {
  productFromPriceCents,
  productHasStock,
  productPrimaryImage,
} from "@/lib/tiendanube/normalize";
import { PriceTag } from "./price-tag";
import { StockBadge } from "./stock-badge";

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
      className="group block relative clip-notch border border-bone/10 bg-carbon hover:border-orange/40 transition-colors"
    >
      <div className="imgcard relative aspect-square bg-ink">
        {img ? (
          <Image
            src={img.src}
            alt={img.alt || product.name}
            fill
            sizes={sizes}
            priority={priority}
            className="object-contain p-4"
          />
        ) : (
          <div className="absolute inset-0 diag-lines-faint flex items-center justify-center">
            <span className="sect-label">Sin imagen</span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <StockBadge hasStock={inStock} stockNumber={firstVariant?.stock} />
        </div>
      </div>
      <div className="p-5 space-y-3">
        {product.brand ? (
          <p className="sect-label">{product.brand}</p>
        ) : null}
        <h3 className="fluid-lg leading-tight uppercase tracking-wide text-bone group-hover:text-orange transition-colors">
          {product.name}
        </h3>
        <PriceTag
          priceCents={fromPrice}
          compareCents={firstVariant?.compare_at_price ?? null}
          promotionalCents={firstVariant?.promotional_price ?? null}
          size="sm"
        />
      </div>
    </Link>
  );
}
