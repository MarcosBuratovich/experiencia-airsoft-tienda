#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// Auto-detect needsInvert basado en luminancia real de cada logo PNG/WebP.
//
// Para SVGs no aplica análisis pixel-level — los dejamos como están.
// Para rasters: medimos luminancia promedio de píxeles no-transparentes.
//   - Si avg luminance < 0.4 → logo es oscuro → needsInvert: true
//   - Si avg luminance > 0.55 → logo es claro → needsInvert: false
//   - En la zona ambigua, dejamos el valor actual.
// ──────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, extname } from "node:path";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MANIFEST_PATH = resolve(ROOT, "public/brands/manifest.json");
const BRANDS_DIR = resolve(ROOT, "public/brands");

async function measureLuminance(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // data is RGBA
  let totalLum = 0;
  let opaqueCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 50) continue; // skip mostly-transparent
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Rec.709 luminance, normalized to 0..1
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    totalLum += lum;
    opaqueCount += 1;
  }
  return opaqueCount === 0 ? 0.5 : totalLum / opaqueCount;
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  console.log("Analizando luminancia de cada logo…\n");

  const changes = [];
  for (const [brand, entry] of Object.entries(manifest)) {
    if (!entry.logo) continue;
    const ext = extname(entry.logo).toLowerCase();
    if (ext === ".svg") {
      console.log(`  - ${brand} (svg) — skip análisis pixel`);
      continue;
    }
    const file = resolve(BRANDS_DIR, entry.logo.replace(/^\/brands\//, ""));
    try {
      const lum = await measureLuminance(file);
      const currentInvert = !!entry.needsInvert;
      let recommendedInvert = currentInvert;
      if (lum < 0.4) recommendedInvert = true;
      else if (lum > 0.55) recommendedInvert = false;
      // else (0.4-0.55): zona ambigua, mantener actual
      const flag = recommendedInvert !== currentInvert ? " ← FIX" : "";
      console.log(
        `  ${brand.padEnd(28)} lum=${lum.toFixed(3)}  invert: ${currentInvert} → ${recommendedInvert}${flag}`,
      );
      if (recommendedInvert !== currentInvert) {
        changes.push({ brand, was: currentInvert, now: recommendedInvert, lum: lum.toFixed(3) });
        entry.needsInvert = recommendedInvert;
      }
    } catch (err) {
      console.error(`  ${brand}: ERROR ${err.message}`);
    }
  }

  if (changes.length > 0) {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`\n✓ ${changes.length} entries actualizadas en manifest.json`);
    for (const c of changes) console.log(`  · ${c.brand}: ${c.was} → ${c.now} (lum=${c.lum})`);
  } else {
    console.log("\n· Sin cambios — todo coherente.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
