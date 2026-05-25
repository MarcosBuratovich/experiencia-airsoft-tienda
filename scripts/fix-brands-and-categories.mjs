#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// Fase 1: Corregir categorías + asignar brand correcto a los 120 productos.
//
// 1. Rename subcategoría "Pistolas" (id 38984071) → "Secundarias".
// 2. Parse del título para extraer marca real con priorización:
//      - JAG Arms tiene precedencia sobre Taran Tactical si ambos aparecen
//        (JAG es el fabricante, TTI es el design partner).
//      - WE tiene precedencia sobre Glock cuando aparecen juntos
//        (WE es quien fabrica la réplica airsoft; Glock es licencia de modelo).
//      - PTS sobre MTEK (PTS Airsoft fabrica el casco MTEK FLUX).
// 3. PUT cada producto con su brand en TN.
//
// Uso:
//   node scripts/fix-brands-and-categories.mjs --dry-run
//   node scripts/fix-brands-and-categories.mjs
// ──────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENRICHED = resolve(__dirname, "rediredi-enriched.json");
const REPORT_FILE = resolve(__dirname, "brand-assignment-report.json");

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes("--dry-run");

function loadEnv() {
  const envPath = resolve(ROOT, ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[m[1]] = val;
  }
  return env;
}

const env = loadEnv();
const STORE_ID = env.TIENDANUBE_STORE_ID;
const TOKEN = env.TIENDANUBE_ACCESS_TOKEN;
const USER_AGENT = env.TIENDANUBE_USER_AGENT || "Experiencia Airsoft Store";
const TN_API = `https://api.tiendanube.com/v1/${STORE_ID}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tnFetch(path, { method = "GET", body, attempt = 1 } = {}) {
  const res = await fetch(`${TN_API}${path}`, {
    method,
    headers: {
      Authentication: `bearer ${TOKEN}`,
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429 && attempt <= 5) {
    const wait = Number(res.headers.get("Retry-After") || "3") * 1000;
    await sleep(wait);
    return tnFetch(path, { method, body, attempt: attempt + 1 });
  }
  if (res.status >= 500 && attempt <= 3) {
    await sleep(500 * 2 ** attempt);
    return tnFetch(path, { method, body, attempt: attempt + 1 });
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`TN ${res.status} ${method} ${path}: ${t.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function getString(v) {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return v.es || v.pt || v.en || Object.values(v)[0] || "";
  return "";
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ── Tabla de marcas con priorización ──────────────────────────────────
// El orden importa: si un título matchea varias, gana la primera que aparece
// acá. Multi-word brands van primero para evitar matches parciales.
const BRAND_RULES = [
  // Collabs / multi-word primero (orden = prioridad)
  { brand: "JAG Arms", patterns: [/\bjag\s+arms?\b/i, /\bjag\s+precision\b/i] },
  { brand: "Taran Tactical Innovations", patterns: [/\btaran\s+tactical\b/i, /\btti\b/i] },
  { brand: "Tokyo Marui", patterns: [/\btokyo\s+marui\b/i] },
  { brand: "Emerson Gear", patterns: [/\bemerson(\s+gear)?\b/i] },
  { brand: "PTS Airsoft", patterns: [/\bpts\s+airsoft\b/i, /\bcasco.*mtek/i] },
  { brand: "Puff Dino", patterns: [/\bpuff\s+dino\b/i] },
  { brand: "Go Pro", patterns: [/\bgo\s*pro\b/i] },
  { brand: "SIG Sauer", patterns: [/\bsig\s+sauer\b/i, /\bromeo\s*5\b/i] },
  { brand: "Gens Ace", patterns: [/\bgen[s]?\s+ace\b/i] },
  { brand: "Tycoon Tactical", patterns: [/\btycoon\b/i] },

  // Single-word
  { brand: "Novritsch", patterns: [/\bnovritsch\b/i, /\bssp\d+\b/i, /\bssg\d+\b/i, /\bssr\d+\b/i] },
  { brand: "KWA", patterns: [/\bkwa\b/i] },
  { brand: "WE", patterns: [/\bwe\s+gen\b/i, /\bwe\s+glock\b/i, /\bpistola\s+we\b/i, /^we\b/i] },
  { brand: "IDOgear", patterns: [/\bidogear\b/i, /\bido\s*gear\b/i] },
  { brand: "Acetech", patterns: [/\bacetech\b/i] },
  { brand: "ZTAC", patterns: [/\bz[\s-]?tac\b/i, /\bz[\s-]?tac\b/i] },
  { brand: "Baofeng", patterns: [/\bbaofeng\b/i, /\buv-?5r\b/i] },
  { brand: "CYMA", patterns: [/\bcyma\b/i, /\bcy-/i] },
  { brand: "BLS", patterns: [/\bbls\b/i] },
  { brand: "G&G", patterns: [/g&g/i] },
  { brand: "PTS", patterns: [/\bpts\b/i] },
  { brand: "Armadillo", patterns: [/\barmadillo\b/i] },
  { brand: "Runcam", patterns: [/\bruncam\b/i] },
  { brand: "Votatu", patterns: [/\bvotatu\b/i] },
  { brand: "WoSport", patterns: [/\bwosport\b/i] },
  { brand: "EZShoot", patterns: [/\bezshoot\b/i] },
  { brand: "GMConn", patterns: [/\bgmconn\b/i] },
  { brand: "Defentac", patterns: [/\bdefentac\b/i] },
  { brand: "Vtiger", patterns: [/\bvtiger\b/i] },
  { brand: "Cronhawk", patterns: [/\bcronhawk\b/i] },
  { brand: "Ezaiming", patterns: [/\bezaiming\b/i] },
  { brand: "Gazeshot", patterns: [/\bgazeshot\b/i] },
  { brand: "Toughsol", patterns: [/\btoughsol\b/i] },
  { brand: "DLXArsot", patterns: [/\bdlxarsot\b/i] },
  { brand: "Pyramex", patterns: [/\bpyramex\b/i] },
  { brand: "MTEK Flux", patterns: [/\bmtek\s+flux\b/i] },
  { brand: "Eshooter", patterns: [/\beshooter\b/i] },
  { brand: "Venture Gear", patterns: [/\bventure\s+gear\b/i, /\bhigh\s+lander\b/i] },
  { brand: "Dumi", patterns: [/\bdumi\b/i] },
  { brand: "Titan", patterns: [/\bcargador.*titan\b|\bbater[íi]a.*titan\b/i] },
  { brand: "Glock", patterns: [/\bglock\b/i] }, // último fallback — Glock como brand sólo si no aparece WE/KWA
];

function detectBrand(title) {
  const t = title.trim();
  for (const rule of BRAND_RULES) {
    if (rule.patterns.some((p) => p.test(t))) {
      return rule.brand;
    }
  }
  return null;
}

// Si TN ya tenía brand y matchea una de nuestras canonical (case-insensitive),
// devolvemos la versión canonical (corrige casing) sin cambiar la marca.
function canonicalizeIfKnown(currentBrand) {
  if (!currentBrand) return null;
  const norm = currentBrand.trim().toLowerCase();
  for (const rule of BRAND_RULES) {
    if (rule.brand.toLowerCase() === norm) return rule.brand;
    if (rule.patterns.some((p) => p.test(currentBrand))) return rule.brand;
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`[config] store: ${STORE_ID} · dry-run: ${DRY_RUN}\n`);

  // ── 1. Rename Pistolas → Secundarias ─────────────────────────────────
  console.log("[1/3] Rename Pistolas → Secundarias…");
  const cats = await tnFetch("/categories?per_page=200");
  const pistolas = cats.find((c) => getString(c.name) === "Pistolas");
  if (!pistolas) {
    console.log("  · 'Pistolas' no existe (ya renombrada?)");
  } else {
    console.log(`  ${getString(pistolas.name)} (id=${pistolas.id}) → 'Secundarias'`);
    if (!DRY_RUN) {
      await tnFetch(`/categories/${pistolas.id}`, {
        method: "PUT",
        body: { name: { es: "Secundarias" } },
      });
      await sleep(500);
    }
  }

  // ── 2. Cargar productos enriched + TN ────────────────────────────────
  console.log("\n[2/3] Matcheando enriched con productos TN…");
  const enriched = JSON.parse(readFileSync(ENRICHED, "utf8"));
  const tnProducts = await fetchAllTnProducts();
  const byHandle = new Map();
  for (const p of tnProducts) {
    const h = tnHandle(p);
    if (h) byHandle.set(h, p);
  }
  console.log(`  ${enriched.length} enriched · ${tnProducts.length} en TN`);

  // ── 3. Detectar marca y aplicar ──────────────────────────────────────
  console.log("\n[3/3] Asignando brands…");
  const report = [];
  let updated = 0, unchanged = 0, skipped = 0, noBrand = 0;

  for (const product of enriched) {
    const title = product.enriched?.normalizedTitle || product.baseVariant?.title || "";
    const slug = slugify(title) || `producto-${product.id.slice(0, 8)}`;
    const tnp = byHandle.get(slug);
    if (!tnp) {
      skipped += 1;
      report.push({ sku: product.baseVariant?.sku, title, status: "no-match-tn" });
      continue;
    }
    const detected = detectBrand(title);
    const currentBrand = tnp.brand || null;
    // Si TN ya tiene un brand válido conocido, lo preferimos sobre detectado
    // (caso: "Cargador Glock 17" tenía "WE" — eso es info que el title no muestra)
    const canonicalCurrent = canonicalizeIfKnown(currentBrand);
    const finalBrand = canonicalCurrent || detected;
    if (!finalBrand) {
      noBrand += 1;
      report.push({ sku: product.baseVariant?.sku, title, brand: null, status: "no-brand-detected" });
      console.log(`  ?  ${title} → marca no detectada`);
      continue;
    }
    if (currentBrand === finalBrand) {
      unchanged += 1;
      continue;
    }
    console.log(`  ${title}  →  brand: ${finalBrand}${currentBrand ? ` (era: ${currentBrand})` : ""}`);
    report.push({ sku: product.baseVariant?.sku, title, brand: finalBrand, tnId: tnp.id, was: currentBrand });
    if (!DRY_RUN) {
      try {
        await tnFetch(`/products/${tnp.id}`, {
          method: "PUT",
          body: { brand: finalBrand },
        });
        updated += 1;
        await sleep(500);
      } catch (err) {
        console.error(`    ✗ ${err.message}`);
      }
    } else {
      updated += 1;
    }
  }

  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  console.log("\n══════════ RESUMEN ══════════");
  console.log(`  Brand asignado: ${updated}`);
  console.log(`  Sin cambio (ya estaba): ${unchanged}`);
  console.log(`  Sin brand detectable: ${noBrand}`);
  console.log(`  Skipped (no en TN): ${skipped}`);
  console.log(`  Report: ${REPORT_FILE}`);
  if (DRY_RUN) console.log("\n  [dry-run] ningún cambio aplicado.");
}

async function fetchAllTnProducts() {
  const all = [];
  let page = 1;
  while (true) {
    const data = await tnFetch(`/products?page=${page}&per_page=200&fields=id,handle,name,brand`);
    all.push(...data);
    if (data.length < 200) break;
    page += 1;
    await sleep(300);
  }
  return all;
}

function tnHandle(p) {
  if (typeof p.handle === "string") return p.handle;
  if (p.handle && typeof p.handle === "object") {
    return p.handle.es || p.handle.pt || p.handle.en || Object.values(p.handle)[0];
  }
  return null;
}

main().catch((err) => {
  console.error("\n[error]", err);
  process.exit(1);
});
