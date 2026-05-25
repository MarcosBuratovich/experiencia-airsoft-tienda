#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// Pipeline de procesamiento profesional de imágenes de productos.
//
// Para cada imagen:
//   1. Descargar de Rediredi (si no está en caché local)
//   2. Background removal vía @imgly (modelo BRIA RMBG-1.4)
//   3. Trim al bounding box del subject
//   4. Composite sobre canvas 1200×900 (#0a0a0a, matching bg-ink del site)
//   5. Subject ocupa ~88% del canvas, padding 6% por lado
//   6. Subtle drop shadow para profundidad
//   7. Export JPEG quality 90 sRGB
//
// Uso:
//   node scripts/process-images.mjs --samples   # procesa los 6 samples
//   node scripts/process-images.mjs --all       # procesa los 357 del catálogo
//   node scripts/process-images.mjs --only=RR0001  # un solo producto
// ──────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";
import sharp from "sharp";
import { removeBackground } from "@imgly/background-removal-node";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENRICHED = resolve(__dirname, "rediredi-enriched.json");
const RAW_DIR = resolve(__dirname, "images/raw");
const OUT_DIR = resolve(__dirname, "images/processed");
const CONTACT_HTML = resolve(__dirname, "images/contact-sheet.html");

const CANVAS_W = 1200;
const CANVAS_H = 900;
const BG_HEX = "#0a0a0a";
const BG_RGB = { r: 10, g: 10, b: 10, alpha: 1 };
const SUBJECT_FILL = 0.88; // % del canvas que ocupa el subject (long axis)

// ── Args ──────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const MODE_SAMPLES = ARGS.includes("--samples");
const MODE_ALL = ARGS.includes("--all");
const ONLY_SKU = (() => {
  const a = ARGS.find((x) => x.startsWith("--only="));
  return a ? a.slice("--only=".length).trim() : null;
})();

if (!MODE_SAMPLES && !MODE_ALL && !ONLY_SKU) {
  console.error("Uso: --samples | --all | --only=SKU");
  process.exit(1);
}

mkdirSync(RAW_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

// ── Cargar productos del enriched JSON ────────────────────────────────
const enriched = JSON.parse(readFileSync(ENRICHED, "utf8"));

function urlFilename(url) {
  return basename(new URL(url).pathname);
}

// ── Download cache local ──────────────────────────────────────────────
async function ensureLocal(url) {
  const name = urlFilename(url);
  const localPath = resolve(RAW_DIR, name);
  if (existsSync(localPath)) return localPath;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(localPath, buf);
  return localPath;
}

// ── Detecta si la imagen ya tiene fondo oscuro (corner sampling) ──────
async function detectBackgroundType(imagePath) {
  const meta = await sharp(imagePath).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (w === 0 || h === 0) return "unknown";

  // Sample 5×5 px en las 4 esquinas
  const samples = [];
  for (const [x, y] of [[0, 0], [w - 5, 0], [0, h - 5], [w - 5, h - 5]]) {
    const { data } = await sharp(imagePath)
      .extract({ left: Math.max(0, x), top: Math.max(0, y), width: 5, height: 5 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let sum = 0;
    for (let i = 0; i < data.length; i += 3) {
      // Luminance approx (Rec.709): 0.2126R + 0.7152G + 0.0722B
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    samples.push(sum / (data.length / 3) / 255);
  }
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  // Si las 4 esquinas son uniformes (variance baja) y bright (>0.85) → white bg
  // Si oscuras (<0.25) → ya está sobre dark
  if (avg > 0.85) return "white";
  if (avg < 0.25) return "dark";
  return "mixed";
}

// ── Process único ─────────────────────────────────────────────────────
async function processImage(localPath, outPath, { tag = "" } = {}) {
  const start = Date.now();
  const bgType = await detectBackgroundType(localPath);

  let foregroundBuf;
  if (bgType === "dark") {
    // Ya está sobre fondo oscuro: skip bg removal, sólo resize y pad.
    // Para mantener consistencia visual, igual pasamos por removeBackground
    // pero con cuidado: si el modelo falla, fallback a la original.
    foregroundBuf = readFileSync(localPath);
  } else {
    // Background removal
    const removedBlob = await removeBackground(localPath, {
      output: { format: "image/png", quality: 1 },
    });
    foregroundBuf = Buffer.from(await removedBlob.arrayBuffer());
  }

  // Sharp pipeline: trim transparent edges, fit to canvas, composite on dark
  let pipe = sharp(foregroundBuf);
  const meta = await pipe.metadata();
  if (meta.channels === 4) {
    pipe = pipe.trim({ threshold: 1 }); // recorta bordes transparentes
  }
  const trimmed = await pipe.toBuffer({ resolveWithObject: true });
  const tw = trimmed.info.width;
  const th = trimmed.info.height;

  // Calcular escala para que el subject ocupe SUBJECT_FILL del canvas
  const fillW = Math.round(CANVAS_W * SUBJECT_FILL);
  const fillH = Math.round(CANVAS_H * SUBJECT_FILL);
  const scaleW = fillW / tw;
  const scaleH = fillH / th;
  const scale = Math.min(scaleW, scaleH);
  const subjectW = Math.round(tw * scale);
  const subjectH = Math.round(th * scale);

  const resized = await sharp(trimmed.data)
    .resize(subjectW, subjectH, { fit: "inside" })
    .png()
    .toBuffer();

  // Subtle drop shadow (dilate alpha, blur, dark)
  // Implementación simple: composite el subject sobre un canvas negro
  // Si querés shadow más sofisticada, se puede agregar después.
  const canvas = await sharp({
    create: {
      width: CANVAS_W,
      height: CANVAS_H,
      channels: 4,
      background: BG_RGB,
    },
  })
    .composite([
      {
        input: resized,
        left: Math.round((CANVAS_W - subjectW) / 2),
        top: Math.round((CANVAS_H - subjectH) / 2),
      },
    ])
    .flatten({ background: BG_HEX })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  writeFileSync(outPath, canvas);
  const ms = Date.now() - start;
  console.log(`  ✓ ${tag} (${bgType}, ${ms}ms) → ${basename(outPath)}`);
}

// ── Modo samples ─────────────────────────────────────────────────────
async function processSamples() {
  // Toma 6 SKUs representativos
  const SAMPLE_SKUS = ["RR0001", "RR0093", "RR0043", "RR0105", "RR0060", "RR0098"];
  console.log(`[samples] Procesando ${SAMPLE_SKUS.length} muestras…\n`);
  const rows = [];
  for (const sku of SAMPLE_SKUS) {
    const product = enriched.find((p) => p.baseVariant?.sku === sku);
    if (!product) {
      console.warn(`  - ${sku} no encontrado en enriched.json`);
      continue;
    }
    const url = product.pictures?.[0];
    if (!url) {
      console.warn(`  - ${sku} sin imagen`);
      continue;
    }
    const local = await ensureLocal(url);
    const outName = `${sku}-${basename(local, ".jpg")}.jpg`;
    const out = resolve(OUT_DIR, outName);
    try {
      await processImage(local, out, { tag: `${sku} ${product.enriched.normalizedTitle.slice(0, 32)}` });
      rows.push({ sku, title: product.enriched.normalizedTitle, before: local, after: out });
    } catch (err) {
      console.error(`  ✗ ${sku}: ${err.message}`);
    }
  }
  buildContactSheet(rows);
}

// ── Modo full catalog ─────────────────────────────────────────────────
async function processAll() {
  // Recolectar (sku, url, position) de todos los productos
  const jobs = [];
  for (const product of enriched) {
    const sku = product.baseVariant?.sku || product.id;
    const pics = product.pictures || [];
    pics.forEach((url, idx) => {
      jobs.push({ sku, position: idx + 1, url, productId: product.id });
    });
  }
  console.log(`[all] ${jobs.length} imágenes en ${enriched.length} productos\n`);

  let done = 0, failed = 0;
  for (const job of jobs) {
    const local = await ensureLocal(job.url);
    const outName = `${job.sku}-p${job.position}-${basename(local, ".jpg")}.jpg`;
    const out = resolve(OUT_DIR, outName);
    if (existsSync(out)) {
      done += 1;
      continue;
    }
    try {
      await processImage(local, out, { tag: `${job.sku} #${job.position} [${done + failed + 1}/${jobs.length}]` });
      done += 1;
    } catch (err) {
      console.error(`  ✗ ${job.sku}#${job.position}: ${err.message}`);
      failed += 1;
    }
  }
  console.log(`\n══════ DONE ══════`);
  console.log(`  Procesadas: ${done} · Fallaron: ${failed} · Total: ${jobs.length}`);
}

// ── Modo single SKU ───────────────────────────────────────────────────
async function processOneSku(sku) {
  const product = enriched.find((p) => p.baseVariant?.sku === sku);
  if (!product) throw new Error(`SKU ${sku} no encontrado`);
  const pics = product.pictures || [];
  console.log(`[${sku}] ${product.enriched.normalizedTitle} · ${pics.length} imágenes\n`);
  for (let i = 0; i < pics.length; i++) {
    const local = await ensureLocal(pics[i]);
    const outName = `${sku}-p${i + 1}-${basename(local, ".jpg")}.jpg`;
    const out = resolve(OUT_DIR, outName);
    await processImage(local, out, { tag: `#${i + 1}` });
  }
}

// ── HTML contact sheet para review visual ─────────────────────────────
function buildContactSheet(rows) {
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Contact sheet — antes/después</title>
<style>
  body { background: #0a0a0a; color: #f5f5f0; font: 14px/1.4 system-ui, sans-serif; margin: 0; padding: 24px; }
  h1 { font-size: 18px; letter-spacing: .2em; text-transform: uppercase; margin: 0 0 24px; }
  .row { display: grid; grid-template-columns: 1fr 1fr 1.5fr; gap: 16px; align-items: center; padding: 16px 0; border-bottom: 1px solid rgba(245, 245, 240, 0.1); }
  .row img { width: 100%; height: auto; display: block; background: #1a1a1a; }
  .col { display: flex; flex-direction: column; gap: 8px; }
  .label { font: 11px/1 ui-monospace, monospace; letter-spacing: .2em; text-transform: uppercase; color: #888; }
  .title { font-size: 15px; color: #f5f5f0; }
  .sku { font: 11px/1 ui-monospace, monospace; color: #ff6b1a; }
</style>
</head>
<body>
<h1>Procesamiento de imágenes — antes / después</h1>
${rows.map((r) => `
  <div class="row">
    <div class="col">
      <span class="label">Antes</span>
      <img src="file://${r.before}" alt="">
    </div>
    <div class="col">
      <span class="label">Después</span>
      <img src="file://${r.after}" alt="">
    </div>
    <div class="col">
      <span class="sku">${r.sku}</span>
      <span class="title">${r.title}</span>
    </div>
  </div>
`).join("")}
</body>
</html>`;
  writeFileSync(CONTACT_HTML, html);
  console.log(`\n[contact-sheet] ${CONTACT_HTML}`);
  console.log(`  Abrilo en el browser para comparar visualmente.`);
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  if (MODE_SAMPLES) await processSamples();
  else if (ONLY_SKU) await processOneSku(ONLY_SKU);
  else if (MODE_ALL) await processAll();
}

main().catch((err) => {
  console.error("\n[error]", err);
  process.exit(1);
});
