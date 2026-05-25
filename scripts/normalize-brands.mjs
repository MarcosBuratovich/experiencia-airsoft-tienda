#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// Normaliza nombres de marca en TN (deduplica variantes).
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
    await sleep(wait); return tnFetch(path, { method, body, attempt: attempt + 1 });
  }
  if (!res.ok) throw new Error(`TN ${res.status} ${method} ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
}

// Mapa de normalización: variant → canonical
const NORMALIZE = {
  "Emerson": "Emerson Gear",
  "Gen Ace": "Gens Ace",
  "RunCam": "Runcam",
  "WE Tech / Compatible": "WE Tech",
  "Pyramex / Genérico": "Pyramex",
  "Genérico / Armadillo": "Armadillo",
  "SIG Sauer / EMG": "SIG Sauer",
  "Z-Tactical": "ZTAC",
  // PTS Airsoft y PTS son la misma marca — canonical = "PTS Syndicate"
  "PTS": "PTS Syndicate",
  "PTS Airsoft": "PTS Syndicate",
  "G&G Armament": "G&G",
};

async function main() {
  console.log(`[config] dry-run: ${DRY_RUN}\n`);
  console.log("[1/2] Cargando productos…");
  const all = [];
  let page = 1;
  while (true) {
    const data = await tnFetch(`/products?page=${page}&per_page=200&fields=id,name,brand`);
    all.push(...data); if (data.length < 200) break; page += 1;
  }
  console.log(`  ${all.length} productos`);

  console.log("\n[2/2] Aplicando normalización…");
  let updated = 0;
  for (const p of all) {
    const current = p.brand || "";
    const canonical = NORMALIZE[current];
    if (!canonical || current === canonical) continue;
    const name = typeof p.name === "object" ? p.name.es : p.name;
    console.log(`  ${name?.slice(0, 50)} · brand: ${current} → ${canonical}`);
    if (!DRY_RUN) {
      await tnFetch(`/products/${p.id}`, { method: "PUT", body: { brand: canonical } });
      updated += 1;
      await sleep(500);
    } else updated += 1;
  }
  console.log(`\n══════ DONE ══════\n  Actualizados: ${updated}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
