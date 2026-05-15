import type { MetadataRoute } from "next";
import { getAllProductHandles } from "@/lib/tiendanube/products";
import { getCategories } from "@/lib/tiendanube/categories";
import { SHOP_URL } from "@/app/_components/site-constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [handles, categories] = await Promise.all([
    getAllProductHandles().catch(() => [] as string[]),
    getCategories().catch(() => []),
  ]);
  const now = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: SHOP_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${SHOP_URL}/productos`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SHOP_URL}/categorias`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SHOP_URL}/pedidos-exterior`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const productUrls: MetadataRoute.Sitemap = handles
    .filter(Boolean)
    .map((h) => ({
      url: `${SHOP_URL}/productos/${h}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  const categoryUrls: MetadataRoute.Sitemap = categories
    .filter((c) => Boolean(c.handle))
    .map((c) => ({
      url: `${SHOP_URL}/categorias/${c.handle}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

  return [...base, ...productUrls, ...categoryUrls];
}
