import type { NextConfig } from "next";

// Security headers aplicados a todas las rutas. Configuración conservadora —
// nada que rompa el iframe del checkout de TN ni Resend ni Vercel Analytics.
const securityHeaders = [
  // Bloquea que el sitio sea cargado en un iframe externo (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Negamos APIs sensibles que el storefront no usa.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self)",
  },
];

const nextConfig: NextConfig = {
  // Habilita la 'use cache' directive sin forzar el modo PPR estricto
  // (que requeriria cacheComponents: true y Suspense boundaries en todo lo dinamico).
  // Doc: node_modules/next/dist/server/config-schema.js -> experimental.useCache
  experimental: {
    useCache: true,
  },

  // El worktree comparte el lockfile con el repo padre; le decimos a Turbopack
  // que el root de este proyecto es este directorio para silenciar la inferencia.
  turbopack: {
    root: __dirname,
  },

  images: {
    // Hosts donde TN sirve las imágenes públicas de productos.
    remotePatterns: [
      { protocol: "https", hostname: "acdn.mitiendanube.com" },
      { protocol: "https", hostname: "dcdn.mitiendanube.com" },
      { protocol: "https", hostname: "**.mitiendanube.com" },
      { protocol: "https", hostname: "**.tiendanube.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        // Aplicar a todo (excepto _next/static que ya tiene su política).
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // No exponer la versión de Next en respuestas (header X-Powered-By).
  poweredByHeader: false,
};

export default nextConfig;
