import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ──────────────────────────────────────────────────────────────────────
// Lookup de logos de marca. Lee public/brands/manifest.json que se genera
// con scripts/source-brand-logos.mjs (agente).
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

const MANIFEST_PATH = resolve(process.cwd(), "public/brands/manifest.json");

function loadManifest(): Record<string, BrandManifestEntry> {
  if (!existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    return {};
  }
}

// Cached at module load — manifest changes require a server restart.
const manifest = loadManifest();

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
