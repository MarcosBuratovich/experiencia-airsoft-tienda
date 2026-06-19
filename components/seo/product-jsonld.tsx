import type { Product } from "@/lib/tiendanube/types";
import {
  productFromPriceCents,
  productMaxPriceCents,
  productHasStock,
  stripHtml,
} from "@/lib/tiendanube/normalize";
import { SHOP_URL, SITE_URL } from "@/app/_components/site-constants";

// Vencimiento del precio para el rich result de Merchant. Se evalúa en build
// (prerender) y se refresca con cada deploy/revalidación. +1 año desde el render.
function priceValidUntil(): string {
  const d = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

// gtin desde el barcode de la primera variante con código válido (8-14 dígitos).
function gtinFrom(product: Product): string | undefined {
  const code = product.variants.find((v) => v.barcode)?.barcode?.trim();
  if (code && /^\d{8,14}$/.test(code)) return code;
  return undefined;
}

export function ProductJsonLd({ product }: { product: Product }) {
  const fromCents = productFromPriceCents(product);
  const toCents = productMaxPriceCents(product);
  const inStock = productHasStock(product);
  const images = product.images.map((i) => i.src).slice(0, 8);
  const url = `${SHOP_URL}/productos/${product.handle}`;
  const descriptionPlain = stripHtml(product.description).slice(0, 1000);

  // Marca REAL o ausente. Nunca el fallback genérico "Experiencia Airsoft":
  // atribuir nuestra marca a un producto de terceros es marca incorrecta y
  // Google lo penaliza en los listados de producto.
  const brandName =
    product.brand && product.brand !== "Genérico" ? product.brand : undefined;
  const gtin = gtinFrom(product);

  // Política de devolución: derecho de arrepentimiento de 10 días corridos que
  // exige la Ley de Defensa del Consumidor en compras online en AR (mínimo legal;
  // el dueño puede ampliarla). Envío gratis solo cuando TN lo marca.
  const hasMerchantReturnPolicy = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "AR",
    returnPolicyCategory:
      "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 10,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/FreeReturn",
  };
  const shippingDetails = product.free_shipping
    ? {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: 0,
          currency: "ARS",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "AR",
        },
      }
    : undefined;

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: descriptionPlain,
    image: images.length > 0 ? images : undefined,
    sku: product.variants[0]?.sku ?? undefined,
    gtin,
    ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
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
            itemCondition: "https://schema.org/NewCondition",
            priceValidUntil: priceValidUntil(),
            url,
            seller: { "@id": `${SITE_URL}/#organization` },
            hasMerchantReturnPolicy,
            ...(shippingDetails ? { shippingDetails } : {}),
          }
        : undefined,
    url,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
