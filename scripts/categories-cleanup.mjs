#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// Limpieza de categorías duplicadas en TN.
//
// Trabajo:
//   1. RENAME (5 viejas → Title Case, conservando ID y sub-categorías):
//        PROTECCION → Protección
//        CARGADORES → Cargadores
//        TRACERS    → Tracers
//        CAMARAS    → Cámaras
//        UNIFORMES  → Uniformes
//   2. RE-TAG productos de OLD vacías-no-equivalentes a la NEW correcta:
//        CONSUMIBLES (3) → Munición y gas (BBs o Gas propelente)
//        LINTERNAS (2)   → Iluminación
//   3. DELETE 13 categorías ya vacías:
//        PRIMARIAS, SECUNDARIAS, RADIOS, EQUIPAMIENTO, ACCESORIO,
//        PARCHES, MIRAS, SEGURIDAD, CAJAS MARCADORAS, CORREA, BATERIA,
//        CONSUMIBLES, LINTERNAS (estas dos quedan vacías tras el re-tag)
//
// Uso:
//   node scripts/categories-cleanup.mjs --dry-run    # preview
//   node scripts/categories-cleanup.mjs              # ejecutar
// ──────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
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

function getString(v) {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return v.es || v.pt || v.en || Object.values(v)[0] || "";
  return "";
}

// ── Plan declarativo ──────────────────────────────────────────────────
const RENAMES = [
  { oldName: "PROTECCION", newName: "Protección" },
  { oldName: "CARGADORES", newName: "Cargadores" },
  { oldName: "TRACERS", newName: "Tracers" },
  { oldName: "CAMARAS", newName: "Cámaras" },
  { oldName: "UNIFORMES", newName: "Uniformes" },
];

// Para cada producto en estas viejas, retagear según mapping (por nombre
// del producto o por sub-categoría adecuada).
const RETAGS_BY_OLD_CAT = {
  CONSUMIBLES: (productName, newCats) => {
    const name = productName.toLowerCase();
    if (/puff dino|green gas|gas|propelente|600 ?ml/.test(name)) {
      return newCats.find((c) => getString(c.name) === "Gas propelente");
    }
    if (/bb/.test(name)) {
      return newCats.find((c) => getString(c.name) === "BBs");
    }
    return newCats.find((c) => getString(c.name) === "Munición y gas");
  },
  LINTERNAS: (_productName, newCats) =>
    newCats.find((c) => getString(c.name) === "Iluminación"),
};

const DELETE_NAMES = [
  "PRIMARIAS", "SECUNDARIAS", "RADIOS", "EQUIPAMIENTO", "ACCESORIO",
  "PARCHES", "MIRAS", "SEGURIDAD", "CAJAS MARCADORAS", "CORREA", "BATERIA",
  "CONSUMIBLES", "LINTERNAS",
];

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`[config] store: ${STORE_ID} · dry-run: ${DRY_RUN}\n`);

  console.log("[1/5] Cargando categorías…");
  const cats = await tnFetch("/categories?per_page=200");
  const catByName = new Map();
  for (const c of cats) catByName.set(getString(c.name), c);
  console.log(`  ${cats.length} categorías\n`);

  console.log("[2/5] Cargando productos con categorías…");
  let products = [];
  let page = 1;
  while (true) {
    const batch = await tnFetch(`/products?page=${page}&per_page=200&fields=id,name,categories`);
    products.push(...batch);
    if (batch.length < 200) break;
    page += 1;
    await sleep(300);
  }
  console.log(`  ${products.length} productos\n`);

  // ─── 3. Renames ───────────────────────────────────────────────────
  console.log("[3/5] Renames…");
  for (const r of RENAMES) {
    const cat = catByName.get(r.oldName);
    if (!cat) {
      console.log(`  · ${r.oldName} no existe (ya migrada?) — skip`);
      continue;
    }
    console.log(`  ${r.oldName} → "${r.newName}" (id=${cat.id})`);
    if (!DRY_RUN) {
      await tnFetch(`/categories/${cat.id}`, {
        method: "PUT",
        body: { name: { es: r.newName } },
      });
      await sleep(600);
    }
  }

  // ─── 4. Re-tags ───────────────────────────────────────────────────
  console.log("\n[4/5] Re-tags…");
  for (const [oldName, mapper] of Object.entries(RETAGS_BY_OLD_CAT)) {
    const oldCat = catByName.get(oldName);
    if (!oldCat) {
      console.log(`  · ${oldName} no existe — skip`);
      continue;
    }
    const inOld = products.filter((p) => (p.categories || []).some((c) => c.id === oldCat.id));
    console.log(`  ${oldName} (id=${oldCat.id}): ${inOld.length} productos a re-tagear`);
    for (const product of inOld) {
      const productName = getString(product.name);
      const target = mapper(productName, cats);
      if (!target) {
        console.log(`    ✗ ${productName}: no encontré categoría destino`);
        continue;
      }
      const currentIds = (product.categories || []).map((c) => c.id);
      // Remover OLD + agregar target (si no está)
      const newIds = currentIds.filter((id) => id !== oldCat.id);
      if (!newIds.includes(target.id)) newIds.push(target.id);
      console.log(`    · ${productName} → ${getString(target.name)} (${target.id})`);
      if (!DRY_RUN) {
        await tnFetch(`/products/${product.id}`, {
          method: "PUT",
          body: { categories: newIds },
        });
        await sleep(600);
      }
    }
  }

  // ─── 5. Deletes ───────────────────────────────────────────────────
  console.log("\n[5/5] Deletes…");
  for (const name of DELETE_NAMES) {
    const cat = catByName.get(name);
    if (!cat) {
      console.log(`  · ${name} no existe — skip`);
      continue;
    }
    // Verificar que esté vacía (excepto si estamos en dry-run que no aplicó retags)
    const stillHas = products.filter((p) => (p.categories || []).some((c) => c.id === cat.id)).length;
    if (!DRY_RUN && stillHas > 0) {
      console.log(`  ✗ ${name}: aún tiene ${stillHas} productos — skip (revisar)`);
      continue;
    }
    console.log(`  DELETE ${name} (id=${cat.id})${DRY_RUN ? " [post-retag]" : ""}`);
    if (!DRY_RUN) {
      await tnFetch(`/categories/${cat.id}`, { method: "DELETE" });
      await sleep(600);
    }
  }

  console.log("\n══════ DONE ══════");
  if (DRY_RUN) console.log("Dry-run: ningún cambio aplicado. Sacá --dry-run para ejecutar.");
}

main().catch((err) => {
  console.error("\n[error]", err);
  process.exit(1);
});
