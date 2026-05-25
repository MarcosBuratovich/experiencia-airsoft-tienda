#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// Migración Rediredi → Tiendanube (CSV import)
//
// Uso:
//   node scripts/rediredi-to-tn-csv.mjs           # usa cache si existe
//   node scripts/rediredi-to-tn-csv.mjs --no-cache # refresca desde la API
//
// Genera:
//   scripts/rediredi-export.json   ← dump crudo del API (cache reusable)
//   scripts/tiendanube-import.csv  ← CSV listo para subir en TN
//
// Formato CSV: alineado a la plantilla oficial de Tiendanube (productos.csv):
//   - Delimitador: punto y coma (;)
//   - 30 columnas, sin campos de imagen (TN no importa imágenes vía CSV)
//   - Valores booleanos: SI / NO (mayúsculas, sin tilde)
//   - Precios en unidad mayor (ARS sin centavos)
//
// Las imágenes se cargan aparte — manualmente desde el admin o via API.
// ──────────────────────────────────────────────────────────────────────

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const STORE_ID = "640119a2-84b6-4db1-bd8f-d861bcb1fa5b";
const STORE_HANDLE = "kok-shop149";
const API = "https://api.rediredi.com/inventory/storefront/items";
const PER_PAGE = 50;
const DELIM = ";";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = resolve(__dirname, "rediredi-export.json");
const ENRICHED_FILE = resolve(__dirname, "rediredi-enriched.json");
const OUT_FILE = resolve(__dirname, "tiendanube-import.csv");

// ── Fetch + paginación ────────────────────────────────────────────────
async function fetchAllItems() {
  if (existsSync(ENRICHED_FILE)) {
    console.log(`[enriched] Usando ${ENRICHED_FILE} (corré enrich-products.mjs para regenerar).`);
    return JSON.parse(readFileSync(ENRICHED_FILE, "utf8"));
  }
  if (existsSync(CACHE_FILE) && !process.argv.includes("--no-cache")) {
    console.log(`[cache] Usando ${CACHE_FILE} (pasá --no-cache para refrescar).`);
    return JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  }
  const all = [];
  let page = 1;
  let total = Infinity;
  while (all.length < total) {
    const url = `${API}?page=${page}&perPage=${PER_PAGE}&sortBy=title&order=asc`;
    const res = await fetch(url, {
      headers: {
        "X-RR-Store-ID": STORE_ID,
        Accept: "application/json",
        Origin: `https://${STORE_HANDLE}.rdi.store`,
      },
    });
    if (!res.ok) {
      throw new Error(`Rediredi ${res.status}: ${await res.text()}`);
    }
    const json = await res.json();
    total = json?.meta?.total ?? all.length + json.data.length;
    all.push(...json.data);
    console.log(`[page ${page}] +${json.data.length} (total: ${all.length}/${total})`);
    if (json.data.length === 0) break;
    page += 1;
  }
  writeFileSync(CACHE_FILE, JSON.stringify(all, null, 2));
  console.log(`[cache] Guardado ${all.length} productos en ${CACHE_FILE}`);
  return all;
}

// ── Helpers CSV ───────────────────────────────────────────────────────
function cleanText(s) {
  if (s === null || s === undefined) return "";
  // Rediredi a veces inyecta zero-width spaces y nbsp invisibles en los títulos.
  return String(s)
    .replace(/[​-‍﻿]/g, "")
    .replace(/ /g, " ")
    .trim();
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const s = cleanText(value);
  if (s === "") return "";
  if (s.includes(DELIM) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(cells) {
  return cells.map(csvCell).join(DELIM);
}

// ── Transformaciones de campos ────────────────────────────────────────
function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function priceToMajor(amount) {
  // El amount de Rediredi viene en unidad mayor (pesos), confirmado por el usuario.
  // La plantilla TN usa el formato "220.00" — emitimos el valor con dos decimales.
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "";
  return amount.toFixed(2);
}

function cmFromUnit(value, unit) {
  if (typeof value !== "number" || value <= 0) return "";
  switch (unit) {
    case "MILLIMETERS": return String(value / 10);
    case "CENTIMETERS": return String(value);
    case "METERS": return String(value * 100);
    case "INCHES": return String(value * 2.54);
    default: return String(value);
  }
}

function kgFromUnit(value, unit) {
  if (typeof value !== "number" || value <= 0) return "";
  switch (unit) {
    case "GRAMS": return String(value / 1000);
    case "KILOGRAMS": return String(value);
    case "POUNDS": return String(value * 0.453592);
    case "OUNCES": return String(value * 0.0283495);
    default: return String(value);
  }
}

// ── Headers oficiales de la plantilla TN ──────────────────────────────
const TN_HEADERS = [
  "Identificador de URL",
  "Nombre",
  "Categorías",
  "Nombre de propiedad 1",
  "Valor de propiedad 1",
  "Nombre de propiedad 2",
  "Valor de propiedad 2",
  "Nombre de propiedad 3",
  "Valor de propiedad 3",
  "Precio",
  "Precio promocional",
  "Peso (kg)",
  "Alto (cm)",
  "Ancho (cm)",
  "Profundidad (cm)",
  "Stock",
  "SKU",
  "Código de barras",
  "Mostrar en tienda",
  "Envío sin cargo",
  "Descripción",
  "Tags",
  "Título para SEO",
  "Descripción para SEO",
  "Marca",
  "Producto Físico",
  "MPN (Número de pieza del fabricante)",
  "Sexo",
  "Rango de edad",
  "Costo",
];

// ── Build TN rows ─────────────────────────────────────────────────────
function variantsOf(product) {
  const all = [];
  if (product.baseVariant) all.push(product.baseVariant);
  for (const v of product.additionalVariants || []) all.push(v);
  return all.filter((v) => !v.archived);
}

function buildRows(product) {
  const variants = variantsOf(product);
  const options = product.options || []; // [{name, values}]
  const optionNames = options.slice(0, 3).map((o) => o.name);

  // Si el producto fue procesado por enrich-products.mjs, usamos los campos
  // normalizados; si no, caemos al dato crudo de Rediredi.
  const en = product.enriched || {};
  const title = (en.normalizedTitle || product.baseVariant?.title || "").trim() || "(sin nombre)";
  const slug = slugify(title) || `producto-${product.id.slice(0, 8)}`;
  const description = en.normalizedDescription || product.baseVariant?.description || "";
  const category = en.normalizedCategory || product.category?.name || "";
  const brand = product.brand || "";
  const tags = (en.tags && en.tags.length)
    ? en.tags.join(",")
    : (product.tags?.length ? product.tags.join(",") : "");
  const dims = product.dimensions || {};
  const weight = kgFromUnit(dims.weight?.value, dims.weight?.unit);
  const height = cmFromUnit(dims.height?.value, dims.height?.unit);
  const width = cmFromUnit(dims.width?.value, dims.width?.unit);
  const length = cmFromUnit(dims.length?.value, dims.length?.unit);

  // Una fila por variante. Si no hay variantes (solo baseVariant), una sola fila.
  return variants.map((variant, idx) => {
    const om = variant.optionMapping || []; // [{name, value}]
    const valByName = new Map(om.map((p) => [p.name, p.value]));

    const propName1 = optionNames[0] || "";
    const propVal1 = propName1 ? (valByName.get(propName1) || "") : "";
    const propName2 = optionNames[1] || "";
    const propVal2 = propName2 ? (valByName.get(propName2) || "") : "";
    const propName3 = optionNames[2] || "";
    const propVal3 = propName3 ? (valByName.get(propName3) || "") : "";

    const isFirst = idx === 0;
    const stock = Math.max(0, Number(variant.quantityAvailable ?? variant.quantityTotal ?? 0));
    const sku = variant.sku || "";
    const price = priceToMajor(variant.price?.amount);

    return {
      "Identificador de URL": slug,
      "Nombre": isFirst ? title : "",
      "Categorías": isFirst ? category : "",
      "Nombre de propiedad 1": propName1,
      "Valor de propiedad 1": propVal1,
      "Nombre de propiedad 2": propName2,
      "Valor de propiedad 2": propVal2,
      "Nombre de propiedad 3": propName3,
      "Valor de propiedad 3": propVal3,
      "Precio": price,
      "Precio promocional": "",
      "Peso (kg)": weight,
      "Alto (cm)": height,
      "Ancho (cm)": width,
      "Profundidad (cm)": length,
      "Stock": String(stock),
      "SKU": sku,
      "Código de barras": "",
      "Mostrar en tienda": isFirst ? "SI" : "",
      "Envío sin cargo": isFirst ? "NO" : "",
      "Descripción": isFirst ? description : "",
      "Tags": isFirst ? tags : "",
      "Título para SEO": "",
      "Descripción para SEO": "",
      "Marca": isFirst ? brand : "",
      "Producto Físico": "SI",
      "MPN (Número de pieza del fabricante)": "",
      "Sexo": "",
      "Rango de edad": "",
      "Costo": "",
    };
  });
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const items = await fetchAllItems();
  console.log(`\n[transform] Procesando ${items.length} productos…`);

  const rows = [];
  for (const item of items) {
    rows.push(...buildRows(item));
  }

  const lines = [csvRow(TN_HEADERS)];
  for (const r of rows) lines.push(csvRow(TN_HEADERS.map((h) => r[h] ?? "")));
  // UTF-8 BOM para que Excel/Sheets abran bien las tildes.
  writeFileSync(OUT_FILE, "﻿" + lines.join("\n") + "\n", "utf8");

  const withVariants = items.filter((p) => (p.additionalVariants || []).length > 0).length;
  console.log(`\n[done] CSV → ${OUT_FILE}`);
  console.log(`        ${items.length} productos · ${rows.length} filas · ${withVariants} con variantes`);
  console.log(`\nProximo paso: subí el CSV en TN admin → Productos → Importar productos.`);
  console.log(`Las imágenes (max 7 por producto, ya están en rediredi-export.json) se cargan aparte.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
