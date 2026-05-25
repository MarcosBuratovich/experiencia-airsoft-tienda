#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// Reemplazo de imágenes en Tiendanube — sube las procesadas profesionalmente.
//
// Flujo:
//   1. Listar productos de TN + sus imágenes actuales.
//   2. Matchear por handle/slug con nuestro enriched JSON.
//   3. Para cada producto:
//        a. DELETE todas las imágenes actuales (las subidas previas desde
//           Rediredi).
//        b. POST las imágenes procesadas en orden, vía `attachment`
//           (base64) para evitar dependencia de hosting externo.
//
// Idempotencia:
//   Si una imagen procesada no existe localmente para una posición, se
//   saltea (no remueve la actual de TN).
//
// Uso:
//   node scripts/replace-images-in-tn.mjs --dry-run
//   node scripts/replace-images-in-tn.mjs --only=RR0001
//   node scripts/replace-images-in-tn.mjs
// ──────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENRICHED = resolve(__dirname, "rediredi-enriched.json");
const PROCESSED_DIR = resolve(__dirname, "images/processed");

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes("--dry-run");
const ONLY_SKU = (() => {
  const a = ARGS.find((x) => x.startsWith("--only="));
  return a ? a.slice("--only=".length).trim() : null;
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
    console.warn(`  [429] esperando ${wait}ms…`);
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

function urlBasename(url) {
  try {
    return basename(new URL(url).pathname);
  } catch {
    return basename(url);
  }
}

// ── Listar productos de TN ────────────────────────────────────────────
async function fetchAllTnProducts() {
  const all = [];
  let page = 1;
  while (true) {
    const data = await tnFetch(`/products?page=${page}&per_page=200&fields=id,handle,name,images`);
    all.push(...data);
    if (data.length < 200) break;
    page += 1;
    await sleep(300);
  }
  return all;
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`[config] store: ${STORE_ID} · dry-run: ${DRY_RUN}${ONLY_SKU ? ` · only ${ONLY_SKU}` : ""}\n`);

  console.log("[1/3] Cargando enriched + productos TN…");
  const enriched = JSON.parse(readFileSync(ENRICHED, "utf8"));
  const candidates = enriched
    .map((p) => ({
      ...p,
      _slug: slugify(p.enriched?.normalizedTitle || p.baseVariant?.title || "") || `producto-${p.id.slice(0, 8)}`,
      _sku: p.baseVariant?.sku || "",
    }))
    .filter((p) => !ONLY_SKU || p._sku === ONLY_SKU);

  const tnProducts = await fetchAllTnProducts();
  const byHandle = new Map();
  for (const p of tnProducts) {
    const h = tnHandle(p);
    if (h) byHandle.set(h, p);
  }
  console.log(`  ${candidates.length} candidatos · ${tnProducts.length} en TN\n`);

  console.log("[2/3] Procesando reemplazos…");
  let prodsDone = 0, imgsDeleted = 0, imgsUploaded = 0, skipped = 0;
  const missingLocal = [];

  for (const product of candidates) {
    const tnp = byHandle.get(product._slug);
    if (!tnp) {
      console.log(`  ⚠  ${product._sku} ${product.enriched.normalizedTitle} → no encontrado en TN (slug ${product._slug})`);
      continue;
    }
    const pics = product.pictures || [];
    const localPaths = pics.map((url, i) => {
      const fname = `${product._sku}-p${i + 1}-${urlBasename(url).replace(/\.jpg$/i, "")}.jpg`;
      return resolve(PROCESSED_DIR, fname);
    });
    const allExist = localPaths.every((p) => existsSync(p));
    if (!allExist) {
      missingLocal.push(product._sku);
      skipped += 1;
      console.log(`  ⏭  ${product._sku}: faltan imágenes procesadas — skip`);
      continue;
    }

    console.log(`\n  ${product._sku} ${product.enriched.normalizedTitle} → TN id ${tnp.id}`);
    const currentImages = Array.isArray(tnp.images) ? tnp.images : [];
    console.log(`    delete: ${currentImages.length} imágenes actuales`);

    // DELETE existing images
    if (!DRY_RUN) {
      for (const img of currentImages) {
        try {
          await tnFetch(`/products/${tnp.id}/images/${img.id}`, { method: "DELETE" });
          imgsDeleted += 1;
          await sleep(400);
        } catch (err) {
          console.error(`    ✗ delete img ${img.id}: ${err.message}`);
        }
      }
    }

    // POST processed images
    for (let i = 0; i < localPaths.length; i++) {
      const lp = localPaths[i];
      const position = i + 1;
      if (DRY_RUN) {
        console.log(`    [dry-run] subiría #${position}: ${basename(lp)}`);
        imgsUploaded += 1;
        continue;
      }
      try {
        const buf = readFileSync(lp);
        const base64 = buf.toString("base64");
        await tnFetch(`/products/${tnp.id}/images`, {
          method: "POST",
          body: { attachment: base64, filename: basename(lp), position },
        });
        console.log(`    ✓ #${position}/${localPaths.length}`);
        imgsUploaded += 1;
        await sleep(600);
      } catch (err) {
        console.error(`    ✗ upload #${position}: ${err.message}`);
      }
    }
    prodsDone += 1;
  }

  console.log("\n══════════ RESUMEN ══════════");
  console.log(`  Productos procesados: ${prodsDone}`);
  console.log(`  Productos sin imgs locales (skip): ${skipped}`);
  console.log(`  Imágenes eliminadas: ${imgsDeleted}`);
  console.log(`  Imágenes subidas: ${imgsUploaded}`);
  if (missingLocal.length > 0 && missingLocal.length <= 15) {
    console.log(`  Faltan locales: ${missingLocal.join(", ")}`);
  }
  if (DRY_RUN) console.log("\n  [dry-run] ningún cambio aplicado.");
}

main().catch((err) => {
  console.error("\n[error]", err);
  process.exit(1);
});
