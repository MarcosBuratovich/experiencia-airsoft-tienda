import type { MetadataRoute } from "next";
import { getAllProductHandles } from "@/lib/tiendanube/products";
import { getCategories } from "@/lib/tiendanube/categories";
import { SHOP_URL } from "@/app/_components/site-constants";

// Fecha fija de último cambio de las páginas ESTÁTICAS (home, listados,
// pedidos-exterior). Actualizar a mano cuando cambie su layout/copy. NO usar
// new Date(): un lastmod que cambia en cada deploy sin cambio de contenido hace
// que Google desconfíe y deje de usar lastmod para priorizar el recrawl.
const STATIC_LASTMOD = new Date("2026-06-19T00:00:00-03:00");

// updated_at de TN viene como ISO; si falta o es inválido, caemos a STATIC_LASTMOD.
function toDate(iso: string | undefined): Date {
  if (!iso) return STATIC_LASTMOD;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? STATIC_LASTMOD : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    getAllProductHandles().catch(() => []),
    getCategories().catch(() => []),
  ]);

  const base: MetadataRoute.Sitemap = [
    {
      url: SHOP_URL,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SHOP_URL}/productos`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SHOP_URL}/categorias`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SHOP_URL}/pedidos-exterior`,
      lastModified: STATIC_LASTMOD,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const productUrls: MetadataRoute.Sitemap = products
    .filter((p) => Boolean(p.handle))
    .map((p) => ({
      url: `${SHOP_URL}/productos/${p.handle}`,
      lastModified: toDate(p.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  const categoryUrls: MetadataRoute.Sitemap = categories
    .filter((c) => Boolean(c.handle))
    .map((c) => ({
      url: `${SHOP_URL}/categorias/${c.handle}`,
      lastModified: toDate(c.updated_at),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  return [...base, ...productUrls, ...categoryUrls];
}
