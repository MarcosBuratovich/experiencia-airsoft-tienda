import {
  createOgImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/app/_components/og-template";
import { getCategoryByHandle } from "@/lib/tiendanube/categories";
import { stripHtml } from "@/lib/tiendanube/normalize";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Categoría · Tienda Experiencia Airsoft";

export default async function OG({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const cat = await getCategoryByHandle(handle).catch(() => null);
  if (!cat) {
    return createOgImage({
      eyebrow: "TIENDA",
      title: "Categoría",
      subtitle: "Experiencia Airsoft",
    });
  }
  return createOgImage({
    eyebrow: "TIENDA · CATEGORIA",
    title: cat.name,
    subtitle: stripHtml(cat.description ?? "").slice(0, 140) || undefined,
  });
}
