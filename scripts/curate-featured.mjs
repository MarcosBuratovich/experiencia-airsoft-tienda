#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// Curaduría de productos destacados para el home de la tienda.
//
// Genera una lista priorizada de ~40 productos para destacar en TN
// (admin → Productos → Organizar). Sólo productos en stock.
//
// Estrategia: balanced — mix de hero products (marcadoras flagship),
// accesorios visualmente atractivos (tracers, linternas premium),
// equipamiento (IDOgear), y representantes de cada categoría mayor.
//
// Output:
//   scripts/destacados-sugeridos.md   ← checklist legible
//   scripts/destacados-sugeridos.csv  ← spreadsheet con columnas
// ──────────────────────────────────────────────────────────────────────

import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "rediredi-enriched.json");
const OUT_MD = resolve(__dirname, "destacados-sugeridos.md");
const OUT_CSV = resolve(__dirname, "destacados-sugeridos.csv");

// ── Marcas premium → bonus en scoring ─────────────────────────────────
const PREMIUM_BRANDS = new Set([
  "Novritsch", "Tokyo Marui", "Emerson", "IDOgear", "Acetech",
  "Taran Tactical", "KWA", "ZTAC", "WE", "PTS",
  "SIG Sauer", "Armadillo", "G&G", "Puff Dino",
]);

// ── Target de slots por categoría (suma ~40) ──────────────────────────
const SLOTS_BY_CATEGORY = {
  "Marcadoras > Primarias": 4,
  "Marcadoras > Pistolas": 5,
  "Tracers": 3,
  "Iluminación": 4,
  "Ópticas y miras": 2,
  "Protección > Cascos": 2,
  "Protección > Máscaras": 2,
  "Protección > Antiparras": 1,
  "Protección > Chalecos": 1,
  "Protección > Guantes": 1,
  "Equipamiento táctico > Pouches": 3,
  "Equipamiento táctico > Chest rigs": 1,
  "Equipamiento táctico > Correas": 1,
  "Cargadores > De marcadora": 2,
  "Cargadores > Speedloaders": 1,
  "Munición y gas > BBs": 2,
  "Munición y gas > Gas propelente": 1,
  "Comunicaciones > Radios": 1,
  "Comunicaciones > Headsets y PTT": 1,
  "Cámaras": 1,
  "Uniformes": 1,
  "Estuches y bolsos": 1,
};

// ── Scoring ───────────────────────────────────────────────────────────
function brandBonus(title) {
  let bonus = 0;
  for (const b of PREMIUM_BRANDS) {
    if (new RegExp(`\\b${b.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "i").test(title)) {
      bonus += 1;
    }
  }
  return bonus;
}

function descriptionScore(html) {
  const text = (html || "").replace(/<[^>]+>/g, "").trim();
  if (text.length === 0) return 0;
  if (text.length < 150) return 1;
  if (text.length < 300) return 2;
  return 3;
}

function totalStock(product) {
  const variants = [product.baseVariant, ...(product.additionalVariants || [])].filter((v) => v && !v.archived);
  return variants.reduce((sum, v) => sum + Math.max(0, Number(v.quantityAvailable ?? 0)), 0);
}

function scoreProduct(p, allInCategory) {
  const title = p.enriched.normalizedTitle;
  const price = p.baseVariant?.price?.amount || 0;

  // Normalizar precio dentro de su categoría (0..1)
  const prices = allInCategory.map((x) => x.baseVariant?.price?.amount || 0);
  const max = Math.max(...prices, 1);
  const priceN = price / max; // 0..1

  // En marcadoras, hero = caro. En consumibles/accesorios, no necesariamente.
  const cat = p.enriched.normalizedCategory;
  const priceWeight = cat.startsWith("Marcadoras") ? 2 : cat.startsWith("Tracers") || cat.startsWith("Iluminación") ? 1 : 0.5;

  const score =
    priceN * priceWeight +
    brandBonus(title) * 1.5 +
    descriptionScore(p.enriched.normalizedDescription) * 0.6 +
    Math.min(totalStock(p) / 10, 1) * 0.3; // pequeño bonus por stock alto (signo de inversión del shop en el producto)

  return score;
}

// ── Main ──────────────────────────────────────────────────────────────
function main() {
  const items = JSON.parse(readFileSync(SRC, "utf8"));
  const inStock = items.filter((p) => totalStock(p) > 0);

  // Agrupar por categoría
  const byCat = new Map();
  for (const p of inStock) {
    const cat = p.enriched.normalizedCategory;
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(p);
  }

  // Para cada categoría target, tomar top N por score
  const picks = [];
  for (const [cat, slots] of Object.entries(SLOTS_BY_CATEGORY)) {
    const pool = byCat.get(cat) || [];
    if (pool.length === 0) continue;
    const ranked = pool
      .map((p) => ({ p, score: scoreProduct(p, pool) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, slots);
    for (const { p, score } of ranked) {
      picks.push({ category: cat, product: p, score });
    }
  }

  // Si nos pasamos de 40, recortar los de menor score
  picks.sort((a, b) => b.score - a.score);
  const final = picks.slice(0, 40);
  // Reordenar por categoría → score para mejor lectura
  final.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return b.score - a.score;
  });

  // ── Markdown ────────────────────────────────────────────────────────
  const mdLines = [
    "# Productos destacados sugeridos",
    "",
    `Total: **${final.length} productos** · Estrategia: balanced · Solo en stock`,
    "",
    "Para cargar en TN: **Admin → Productos → Lista de productos → Organizar → Agregar productos**. Marcá los siguientes (orden sugerido por categoría):",
    "",
  ];
  let lastCat = "";
  for (const { category, product } of final) {
    if (category !== lastCat) {
      mdLines.push("");
      mdLines.push(`## ${category}`);
      mdLines.push("");
      lastCat = category;
    }
    const sku = product.baseVariant?.sku || "—";
    const price = product.baseVariant?.price?.amount;
    const priceStr = price ? `$${price.toLocaleString("es-AR")}` : "s/p";
    mdLines.push(`- [ ] **${product.enriched.normalizedTitle}** · ${priceStr} · SKU ${sku}`);
  }
  writeFileSync(OUT_MD, mdLines.join("\n") + "\n");

  // ── CSV ─────────────────────────────────────────────────────────────
  const csvLines = ["#;Categoría;Título;SKU;Precio;Stock"];
  final.forEach(({ category, product }, i) => {
    const sku = product.baseVariant?.sku || "";
    const price = product.baseVariant?.price?.amount || 0;
    const stock = totalStock(product);
    csvLines.push([
      i + 1,
      `"${category}"`,
      `"${product.enriched.normalizedTitle.replace(/"/g, '""')}"`,
      sku,
      price,
      stock,
    ].join(";"));
  });
  writeFileSync(OUT_CSV, "﻿" + csvLines.join("\n") + "\n");

  console.log(`[done] ${final.length} productos seleccionados`);
  console.log(`  → ${OUT_MD}`);
  console.log(`  → ${OUT_CSV}`);

  // Distribución final
  console.log("\n=== Distribución por categoría ===");
  const dist = {};
  for (const { category } of final) dist[category] = (dist[category] || 0) + 1;
  for (const c of Object.keys(dist).sort()) {
    console.log(`  ${dist[c]} · ${c}`);
  }
}

main();
