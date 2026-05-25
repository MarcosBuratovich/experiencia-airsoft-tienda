#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// Aplica evike-enrichment.json a productos en TN.
//
// Para cada entrada:
//   - PUT /products/{id} con description (HTML) + brand (si difiere)
//   - Tags: agregamos confidence + categoría evike como tag suelto
//
// Idempotente: si la descripción actual ya coincide con la enriquecida, skip.
//
// Uso:
//   node scripts/apply-evike-enrichment.mjs --dry-run
//   node scripts/apply-evike-enrichment.mjs --only=RR0001
//   node scripts/apply-evike-enrichment.mjs                  # aplicar todo
//   node scripts/apply-evike-enrichment.mjs --confidence=high # solo high
// ──────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENRICHED = resolve(__dirname, "rediredi-enriched.json");
const EVIKE = resolve(__dirname, "evike-enrichment.json");

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes("--dry-run");
const ONLY_SKU = (() => {
  const a = ARGS.find((x) => x.startsWith("--only="));
  return a ? a.slice("--only=".length).trim() : null;
})();
const CONFIDENCE_FILTER = (() => {
  const a = ARGS.find((x) => x.startsWith("--confidence="));
  return a ? a.slice("--confidence=".length).trim() : null;
})();

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

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function tnHandle(p) {
  if (typeof p.handle === "string") return p.handle;
  if (p.handle && typeof p.handle === "object") {
    return p.handle.es || p.handle.pt || p.handle.en || Object.values(p.handle)[0];
  }
  return null;
}

function getString(v) {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return v.es || v.pt || v.en || Object.values(v)[0] || "";
  return "";
}

async function fetchAllTnProducts() {
  const all = [];
  let page = 1;
  while (true) {
    const data = await tnFetch(`/products?page=${page}&per_page=200&fields=id,handle,name,brand,description`);
    all.push(...data);
    if (data.length < 200) break;
    page += 1;
    await sleep(300);
  }
  return all;
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`[config] store: ${STORE_ID} · dry-run: ${DRY_RUN}${ONLY_SKU ? ` · only ${ONLY_SKU}` : ""}${CONFIDENCE_FILTER ? ` · confidence=${CONFIDENCE_FILTER}` : ""}\n`);

  console.log("[1/3] Cargando enriquecimientos…");
  const evike = JSON.parse(readFileSync(EVIKE, "utf8"));
  const enriched = JSON.parse(readFileSync(ENRICHED, "utf8"));
  console.log(`  ${evike.length} entries · ${enriched.length} productos en catálogo`);

  // Map SKU → slug
  const slugBySku = new Map();
  for (const p of enriched) {
    const sku = p.baseVariant?.sku;
    const title = p.enriched?.normalizedTitle || p.baseVariant?.title || "";
    if (sku) slugBySku.set(sku, slugify(title) || `producto-${p.id.slice(0, 8)}`);
  }

  console.log("\n[2/3] Listando productos en TN…");
  const tnProducts = await fetchAllTnProducts();
  const byHandle = new Map();
  for (const p of tnProducts) {
    const h = tnHandle(p);
    if (h) byHandle.set(h, p);
  }
  console.log(`  ${tnProducts.length} productos en TN\n`);

  console.log("[3/3] Aplicando…");
  let updated = 0, unchanged = 0, skipped = 0, errors = 0;
  const skippedSkus = [];

  for (const entry of evike) {
    if (ONLY_SKU && entry.sku !== ONLY_SKU) continue;
    if (CONFIDENCE_FILTER && entry.confidence !== CONFIDENCE_FILTER) continue;
    if (!entry.description || entry.description.trim().length < 20) {
      skipped += 1;
      skippedSkus.push(`${entry.sku}: sin descripción`);
      continue;
    }

    const slug = slugBySku.get(entry.sku);
    if (!slug) {
      skipped += 1;
      skippedSkus.push(`${entry.sku}: no encontrado en enriched`);
      continue;
    }
    const tnp = byHandle.get(slug);
    if (!tnp) {
      skipped += 1;
      skippedSkus.push(`${entry.sku}: no en TN (slug ${slug})`);
      continue;
    }

    const currentDesc = getString(tnp.description) || "";
    const currentBrand = tnp.brand || null;
    const newDesc = entry.description.trim();
    const newBrand = entry.evikeBrand || null;

    const descChanged = currentDesc.trim() !== newDesc;
    const brandChanged = newBrand && currentBrand !== newBrand;

    if (!descChanged && !brandChanged) {
      unchanged += 1;
      continue;
    }

    const body = {};
    if (descChanged) body.description = { es: newDesc };
    if (brandChanged) body.brand = newBrand;

    const changes = [
      descChanged ? `desc(${newDesc.length}c)` : null,
      brandChanged ? `brand:${currentBrand || "—"}→${newBrand}` : null,
    ].filter(Boolean).join(", ");
    console.log(`  ${entry.sku} ${entry.ourTitle.slice(0, 50)} · ${entry.confidence} · ${changes}`);

    if (!DRY_RUN) {
      try {
        await tnFetch(`/products/${tnp.id}`, { method: "PUT", body });
        updated += 1;
        await sleep(500);
      } catch (err) {
        console.error(`    ✗ ${err.message}`);
        errors += 1;
      }
    } else {
      updated += 1;
    }
  }

  console.log("\n══════════ RESUMEN ══════════");
  console.log(`  Aplicados: ${updated}`);
  console.log(`  Sin cambio: ${unchanged}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errores: ${errors}`);
  if (skippedSkus.length > 0 && skippedSkus.length <= 15) {
    for (const s of skippedSkus) console.log(`    · ${s}`);
  } else if (skippedSkus.length > 0) {
    console.log(`    (${skippedSkus.length} skip details suprimidos)`);
  }
  if (DRY_RUN) console.log("\n  [dry-run] ningún cambio aplicado.");
}

main().catch((err) => {
  console.error("\n[error]", err);
  process.exit(1);
});
