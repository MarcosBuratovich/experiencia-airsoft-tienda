import type { Product } from "@/lib/tiendanube/types";
import {
  productFromPriceCents,
  productMaxPriceCents,
  productHasStock,
  stripHtml,
} from "@/lib/tiendanube/normalize";
import { SHOP_URL } from "@/app/_components/site-constants";

export function ProductJsonLd({ product }: { product: Product }) {
  const fromCents = productFromPriceCents(product);
  const toCents = productMaxPriceCents(product);
  const inStock = productHasStock(product);
  const images = product.images.map((i) => i.src).slice(0, 8);
  const url = `${SHOP_URL}/productos/${product.handle}`;
  const descriptionPlain = stripHtml(product.description).slice(0, 1000);

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: descriptionPlain,
    image: images.length > 0 ? images : undefined,
    sku: product.variants[0]?.sku ?? undefined,
    brand: { "@type": "Brand", name: product.brand ?? "Experiencia Airsoft" },
    offers:
      fromCents !== null
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "ARS",
            lowPrice: fromCents / 100,
            highPrice: (toCents ?? fromCents) / 100,
            offerCount: product.variants.length,
            availability: inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            url,
          }
        : undefined,
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
