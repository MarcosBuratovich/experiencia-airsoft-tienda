import manifestJson from "@/public/brands/manifest.json";

// ──────────────────────────────────────────────────────────────────────
// Lookup de logos de marca. Importa public/brands/manifest.json que se genera
// con scripts/source-brand-logos.mjs (agente).
//
// Import ESTÁTICO (no node:fs): el bundler lo inlinea, así BrandLogo puede
// usarse también dentro de client components (p. ej. las cards del explorador
// de categorías). El manifest está commiteado; si se borrara, el build falla
// en el import (antes degradaba silenciosamente a {}).
//
// Format del manifest:
//   {
//     "Novritsch": { "logo": "/brands/novritsch.svg", "needsInvert": false },
//     "Tokyo Marui": { "logo": "/brands/tokyo-marui.png", "needsInvert": true },
//     "Cronhawk": { "logo": null }
//   }
//
// needsInvert=true: el logo es oscuro en transparente → se aplica el filter
// `brightness(0) invert(1)` para que se vea blanco sobre el bg dark del site.
// ──────────────────────────────────────────────────────────────────────

interface BrandManifestEntry {
  logo: string | null;
  format?: "svg" | "png" | "webp" | "jpg";
  source?: string;
  needsInvert?: boolean;
  comment?: string;
}

// Regenerar el manifest requiere rebuild (antes: reinicio del server).
const manifest = manifestJson as unknown as Record<string, BrandManifestEntry>;

export interface BrandLogoInfo {
  logo: string;
  needsInvert: boolean;
}

export function getBrandLogo(brand: string | null | undefined): BrandLogoInfo | null {
  if (!brand) return null;
  const entry = manifest[brand];
  if (!entry || !entry.logo) return null;
  return { logo: entry.logo, needsInvert: !!entry.needsInvert };
}
