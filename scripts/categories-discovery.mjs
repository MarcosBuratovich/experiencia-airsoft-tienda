#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// Discovery (read-only) del estado de categorías en TN.
//
// Lista cada categoría, cuántos productos contiene, y agrupa viejas
// (all-caps, ids 38983xxx) vs nuevas (Title Case, ids 38984xxx).
// Sirve para planear la migración sin tocar nada.
//
// Uso:
//   node scripts/categories-discovery.mjs
// ──────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

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

async function tnFetch(path, attempt = 1) {
  const res = await fetch(`${TN_API}${path}`, {
    headers: {
      Authentication: `bearer ${TOKEN}`,
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  if (res.status === 429 && attempt <= 5) {
    const wait = Number(res.headers.get("Retry-After") || "3") * 1000;
    await sleep(wait);
    return tnFetch(path, attempt + 1);
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`TN ${res.status} ${path}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

function getString(v) {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return v.es || v.pt || v.en || Object.values(v)[0] || "";
  return "";
}

async function listAllProductsCategories() {
  // Trae todos los productos con solo (id, name, categories) — paginado.
  const all = [];
  let page = 1;
  while (true) {
    const data = await tnFetch(`/products?page=${page}&per_page=200&fields=id,name,categories`);
    all.push(...data);
    if (data.length < 200) break;
    page += 1;
    await sleep(300);
  }
  return all;
}

async function main() {
  console.log("[1/2] Listando categorías…");
  const cats = await tnFetch(`/categories?per_page=200`);
  console.log(`  ${cats.length} categorías\n`);

  console.log("[2/2] Listando productos + sus categorías…");
  const products = await listAllProductsCategories();
  console.log(`  ${products.length} productos\n`);

  // Mapear: catId → product count
  const countByCat = new Map();
  for (const p of products) {
    for (const c of p.categories || []) {
      countByCat.set(c.id, (countByCat.get(c.id) || 0) + 1);
    }
  }

  // Clasificar OLD vs NEW por nombre (all-caps = old)
  const isAllCaps = (s) => /^[A-ZÁÉÍÓÚÑ0-9\s]+$/.test(s) && s.length > 2;
  const old = [];
  const fresh = [];
  for (const c of cats) {
    const name = getString(c.name);
    const handle = getString(c.handle);
    const count = countByCat.get(c.id) || 0;
    const entry = { id: c.id, name, handle, parent: c.parent || 0, count };
    if (isAllCaps(name)) old.push(entry);
    else fresh.push(entry);
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ANTIGUAS (all-caps, candidatas a eliminar): ${old.length}`);
  console.log("═══════════════════════════════════════════════════════════════");
  for (const c of old.sort((a, b) => b.count - a.count)) {
    const marker = c.count > 0 ? "❗" : "·";
    console.log(`  ${marker} ${String(c.count).padStart(3)} prod · "${c.name}" (id=${c.id}, handle=${c.handle})`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  NUEVAS (Title Case, mantener): ${fresh.length}`);
  console.log("═══════════════════════════════════════════════════════════════");
  for (const c of fresh.sort((a, b) => b.count - a.count)) {
    const parentName = c.parent
      ? getString(cats.find((x) => x.id === c.parent)?.name || "")
      : null;
    const tag = parentName ? `(sub de ${parentName})` : "(raíz)";
    console.log(`  · ${String(c.count).padStart(3)} prod · "${c.name}" ${tag} (id=${c.id}, handle=${c.handle})`);
  }

  // Productos que están SOLO en categorías viejas (orfanos potenciales)
  const oldIds = new Set(old.map((c) => c.id));
  const newIds = new Set(fresh.map((c) => c.id));
  const orphans = [];
  for (const p of products) {
    const cs = (p.categories || []).map((c) => c.id);
    if (cs.length === 0) continue;
    const inOld = cs.some((id) => oldIds.has(id));
    const inNew = cs.some((id) => newIds.has(id));
    if (inOld && !inNew) {
      const name = getString(p.name);
      orphans.push({ id: p.id, name, cats: cs.filter((id) => oldIds.has(id)) });
    }
  }
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  PRODUCTOS QUE SOLO ESTÁN EN VIEJAS: ${orphans.length}`);
  console.log(`  (se quedarían huérfanos si borramos las viejas sin migrar)`);
  console.log("═══════════════════════════════════════════════════════════════");
  for (const o of orphans.slice(0, 30)) {
    const catNames = o.cats.map((id) => old.find((c) => c.id === id)?.name || `?${id}`).join(", ");
    console.log(`  · ${o.name} → [${catNames}]`);
  }
  if (orphans.length > 30) console.log(`  ... +${orphans.length - 30} más`);
}

main().catch((err) => {
  console.error("[error]", err);
  process.exit(1);
});
