import type { MetadataRoute } from "next";
import { SHOP_URL } from "@/app/_components/site-constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/_next/"] },
    sitemap: `${SHOP_URL}/sitemap.xml`,
    host: SHOP_URL,
  };
}
