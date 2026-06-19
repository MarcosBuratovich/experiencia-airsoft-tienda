import type { MetadataRoute } from "next";
import { SHOP_URL } from "@/app/_components/site-constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/_next/",
        // Páginas transaccionales: no aportan a la búsqueda y gastan crawl budget.
        "/carrito",
        "/checkout",
        // Permutaciones de filtro/orden/búsqueda: el canonical ya evita que se
        // INDEXEN, pero sin esto Googlebot igual las RASTREA (y son SSR lentas),
        // drenando el budget que necesitamos para los handles canónicos. El
        // comodín `*` es extensión soportada por Googlebot (no robots estándar).
        "/*?orden=",
        "/*?precio_min=",
        "/*?precio_max=",
        "/*?q=",
      ],
    },
    sitemap: `${SHOP_URL}/sitemap.xml`,
    host: SHOP_URL,
  };
}
