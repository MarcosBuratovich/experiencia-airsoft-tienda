import { createOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/app/_components/og-template";
import { getProductByHandle } from "@/lib/tiendanube/products";
import {
  productFromPriceCents,
  stripHtml,
} from "@/lib/tiendanube/normalize";
import { formatARS } from "@/lib/format";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Producto · Tienda Experiencia Airsoft";

export default async function OG({
  params,
}: {
  // Next 16: params es Promise tambien en OG image
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const product = await getProductByHandle(handle).catch(() => null);
  if (!product) {
    return createOgImage({
      eyebrow: "TIENDA",
      title: "Producto",
      subtitle: "Experiencia Airsoft",
    });
  }
  const price = formatARS(productFromPriceCents(product));
  const subtitleParts = [
    price,
    product.brand ? `Marca: ${product.brand}` : null,
    stripHtml(product.description).slice(0, 80) || null,
  ].filter(Boolean) as string[];

  return createOgImage({
    eyebrow: `TIENDA · ${(product.brand ?? "EA").toUpperCase()}`,
    title: product.name,
    subtitle: subtitleParts.join(" · "),
  });
}
