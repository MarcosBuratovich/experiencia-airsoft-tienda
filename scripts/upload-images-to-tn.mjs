#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// Subir imágenes de Rediredi a Tiendanube.
//
// Prerequisitos:
//   1. CSV ya importado en TN (los 120 productos existen en la tienda).
//   2. .env.local tiene TIENDANUBE_STORE_ID + TIENDANUBE_ACCESS_TOKEN.
//   3. El token tiene scope write_products (necesario para POST imágenes).
//
// Uso:
//   node scripts/upload-images-to-tn.mjs --dry-run        # ver qué haría
//   node scripts/upload-images-to-tn.mjs --only=RR0001   # un solo SKU
//   node scripts/upload-images-to-tn.mjs                  # subir todo
//
// Comportamiento:
//   · Lista productos de TN paginados, mapea por handle.
//   · Para cada producto enriched: si TN ya tiene >=1 imagen, lo skipea
//     (idempotencia — re-correr es seguro).
//   · Si no tiene imágenes, POSTea cada URL con position correlativo.
//   · TN descarga la imagen del CDN de Rediredi (es público).
//   · Rate limit: pausa 600ms entre requests; respeta Retry-After en 429.
// ──────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENRICHED = resolve(__dirname, "rediredi-enriched.json");

// ── Args ──────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes("--dry-run");
const ONLY_SKU = (() => {
  const a = ARGS.find((x) => x.startsWith("--only="));
  return a ? a.slice("--only=".length).trim() : null;
})();

// ── Load .env.local (sin dependencias externas) ───────────────────────
function loadEnv() {
  const envPath = resolve(ROOT, ".env.local");
  if (!existsSync(envPath)) {
    throw new Error(`No encontré ${envPath}. ¿Estás corriendo desde la raíz del proyecto?`);
  }
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
const USER_AGENT = env.TIENDANUBE_USER_AGENT || "Experiencia Airsoft Store (hola@experienciaairsoft.com)";
const TN_API = `https://api.tiendanube.com/v1/${STORE_ID}`;

if (!STORE_ID || !TOKEN) {
  throw new Error("Falta TIENDANUBE_STORE_ID o TIENDANUBE_ACCESS_TOKEN en .env.local");
}

// ── Slugify (mismo que rediredi-to-tn-csv.mjs) ────────────────────────
function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ── HTTP helper con rate-limit/retry ──────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tnFetch(path, { method = "GET", body, attempt = 1 } = {}) {
  const url = `${TN_API}${path}`;
  const headers = {
    Authentication: `bearer ${TOKEN}`,
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") || "5");
    console.warn(`  [429] esperando ${retryAfter}s…`);
    await sleep(retryAfter * 1000);
    return tnFetch(path, { method, body, attempt });
  }
  if (res.status >= 500 && attempt <= 3) {
    const backoff = 500 * 2 ** attempt;
    console.warn(`  [${res.status}] reintento en ${backoff}ms (intento ${attempt}/3)`);
    await sleep(backoff);
    return tnFetch(path, { method, body, attempt: attempt + 1 });
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`TN ${res.status} ${method} ${path}: ${txt.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Sanitizar URLs de imagen de Rediredi ──────────────────────────────
function sanitizeImageUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return null;
  }
}

// ── Listar todos los productos de TN ──────────────────────────────────
async function fetchAllTnProducts() {
  const all = [];
  let page = 1;
  const perPage = 200;
  while (true) {
    process.stdout.write(`  pagina ${page}…`);
    const data = await tnFetch(`/products?page=${page}&per_page=${perPage}&fields=id,handle,name,images`);
    process.stdout.write(` +${data.length}\n`);
    all.push(...data);
    if (data.length < perPage) break;
    page += 1;
    await sleep(400);
  }
  return all;
}

// ── Subir imágenes para un producto ───────────────────────────────────
async function uploadImagesFor(product, tnProductId, existingImageCount) {
  const urls = (product.pictures || []).map(sanitizeImageUrl).filter(Boolean);
  if (urls.length === 0) {
    return { skipped: true, reason: "sin imágenes en Rediredi", uploaded: 0 };
  }
  if (existingImageCount >= 1) {
    return { skipped: true, reason: `ya tiene ${existingImageCount} imágenes`, uploaded: 0 };
  }
  let uploaded = 0;
  for (let i = 0; i < urls.length; i++) {
    const src = urls[i];
    const position = i + 1;
    if (DRY_RUN) {
      console.log(`    [dry-run] subiría imagen ${position}: ${src}`);
      uploaded += 1;
      continue;
    }
    try {
      await tnFetch(`/products/${tnProductId}/images`, {
        method: "POST",
        body: { src, position },
      });
      console.log(`    ✓ ${position}/${urls.length}`);
      uploaded += 1;
      await sleep(600);
    } catch (err) {
      console.error(`    ✗ ${position}/${urls.length}: ${err.message}`);
    }
  }
  return { skipped: false, uploaded };
}

// ── Resolver handle de un producto TN (puede ser string u {es: "..."}) ─
function tnHandle(p) {
  if (typeof p.handle === "string") return p.handle;
  if (p.handle && typeof p.handle === "object") {
    return p.handle.es || p.handle.pt || p.handle.en || Object.values(p.handle)[0];
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`[config] store: ${STORE_ID} · dry-run: ${DRY_RUN}${ONLY_SKU ? ` · solo SKU=${ONLY_SKU}` : ""}`);

  console.log("\n[1/3] Cargando productos enriched…");
  const enriched = JSON.parse(readFileSync(ENRICHED, "utf8"));
  let candidates = enriched.map((p) => {
    const title = p.enriched?.normalizedTitle || p.baseVariant?.title || "";
    return {
      ...p,
      _slug: slugify(title) || `producto-${p.id.slice(0, 8)}`,
      _sku: p.baseVariant?.sku || "",
    };
  });
  if (ONLY_SKU) {
    candidates = candidates.filter((p) => p._sku === ONLY_SKU);
    if (candidates.length === 0) {
      throw new Error(`No encontré ningún producto con SKU=${ONLY_SKU} en enriched.json`);
    }
  }
  console.log(`  ${candidates.length} productos a procesar`);

  console.log("\n[2/3] Listando productos en Tiendanube…");
  const tnProducts = await fetchAllTnProducts();
  console.log(`  ${tnProducts.length} productos en TN`);
  const byHandle = new Map();
  for (const p of tnProducts) {
    const h = tnHandle(p);
    if (h) byHandle.set(h, p);
  }

  console.log("\n[3/3] Subiendo imágenes…");
  let matched = 0, unmatched = 0, skipped = 0, uploadedTotal = 0;
  const unmatchedList = [];

  for (const product of candidates) {
    const title = product.enriched?.normalizedTitle || product.baseVariant?.title;
    const tnProduct = byHandle.get(product._slug);
    if (!tnProduct) {
      unmatched += 1;
      unmatchedList.push({ sku: product._sku, slug: product._slug, title });
      console.log(`  ⚠  ${title} → no encontrado en TN (slug: ${product._slug})`);
      continue;
    }
    matched += 1;
    const existingImages = Array.isArray(tnProduct.images) ? tnProduct.images.length : 0;
    console.log(`\n  ${title} → TN id ${tnProduct.id} (${existingImages} img existentes)`);
    const result = await uploadImagesFor(product, tnProduct.id, existingImages);
    if (result.skipped) {
      skipped += 1;
      console.log(`    – skip: ${result.reason}`);
    } else {
      uploadedTotal += result.uploaded;
    }
  }

  console.log("\n══════════ RESUMEN ══════════");
  console.log(`  Productos matcheados: ${matched}/${candidates.length}`);
  console.log(`  Productos saltados (ya con img o sin urls): ${skipped}`);
  console.log(`  Imágenes ${DRY_RUN ? "que se subirían" : "subidas"}: ${uploadedTotal}`);
  if (unmatched > 0) {
    console.log(`  No matcheados en TN: ${unmatched}`);
    for (const u of unmatchedList.slice(0, 10)) {
      console.log(`    · [${u.sku}] ${u.title} (slug esperado: ${u.slug})`);
    }
    if (unmatchedList.length > 10) console.log(`    ... +${unmatchedList.length - 10} más`);
  }
  if (DRY_RUN) {
    console.log("\n  [dry-run] ningún cambio aplicado. Sacá --dry-run para ejecutar.");
  }
}

main().catch((err) => {
  console.error("\n[error]", err);
  process.exit(1);
});
