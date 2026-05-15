import type { NextConfig } from "next";

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
    // Hosts del CDN publico de Tiendanube. acdn = served, dcdn = direct.
    // Si en runtime aparece otro hostname, ampliar acá.
    remotePatterns: [
      { protocol: "https", hostname: "acdn.mitiendanube.com" },
      { protocol: "https", hostname: "dcdn.mitiendanube.com" },
      { protocol: "https", hostname: "**.mitiendanube.com" },
      { protocol: "https", hostname: "**.tiendanube.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
