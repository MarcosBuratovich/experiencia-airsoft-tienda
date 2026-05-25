#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// Fase 1 — Enriquecimiento determinista
//
// Lee scripts/rediredi-export.json y produce scripts/rediredi-enriched.json
// con campos normalizados:
//   - normalizedTitle
//   - normalizedDescription (HTML limpio)
//   - normalizedCategory (jerárquica TN: "Padre > Hijo")
//   - tags (array)
//
// Reglas:
//   · Title Case respetando marcas y códigos de modelo.
//   · Strip ZWSPs/nbsp y normalizar whitespace.
//   · Conviertir frases ENTERAS EN MAYÚSCULAS a sentence case.
//   · Mapeo de categorías por categoría origen + override por título.
// ──────────────────────────────────────────────────────────────────────

import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, "rediredi-export.json");
const OUT = resolve(__dirname, "rediredi-enriched.json");

// ── Marcas y acrónimos a preservar en formato canónico ────────────────
// El matcher es case-insensitive sobre la palabra entera.
const PRESERVE = {
  // Marcas
  novritsch: "Novritsch",
  ztac: "ZTAC",
  baofeng: "Baofeng",
  kwa: "KWA",
  emerson: "Emerson",
  idogear: "IDOgear",
  acetech: "Acetech",
  cyma: "CYMA",
  we: "WE",
  pts: "PTS",
  bls: "BLS",
  sig: "SIG",
  sauer: "Sauer",
  romeo5: "Romeo5",
  romeo: "Romeo",
  tokyo: "Tokyo",
  marui: "Marui",
  g3: "G3",
  mtek: "MTEK",
  flux: "Flux",
  taran: "Taran",
  tactical: "Tactical",
  jw4: "JW4",
  tti: "TTI",
  jag: "Jag",
  precision: "Precision",
  army: "Army",
  armament: "Armament",
  puff: "Puff",
  dino: "Dino",
  runcam: "Runcam",
  ezshoot: "EZShoot",
  gmconn: "GMConn",
  votatu: "Votatu",
  wosport: "WoSport",
  armadillo: "Armadillo",
  dlxarsot: "DLXArsot",
  cyma: "CYMA",
  glock: "Glock",
  "go": "Go",
  pro: "Pro",
  hero: "Hero",
  "gen": "Gen",
  ace: "Ace",
  "g&g": "G&G",

  // Unidades — siempre en minúscula
  kg: "kg",
  g: "g",
  mm: "mm",
  cm: "cm",
  ml: "ml",
  lt: "lt",
  v: "V",
  ah: "Ah",
  ma: "mA",
  mah: "mAh",
  lumen: "lumen",
  lumenes: "lúmenes",
  lum: "lúmenes",

  // Términos en español que aparecen en mayúscula y queremos en minúscula natural
  baterias: "Baterías",
  bateria: "Batería",
  marcadora: "Marcadora",
  marcadoras: "Marcadoras",
  pistola: "Pistola",
  rifle: "Rifle",
  mascara: "Máscara",
  cargador: "Cargador",
  cargadora: "Cargadora",
  optica: "Óptica",
  proteccion: "Protección",
  iluminacion: "Iluminación",

  // Modelo / técnico / acrónimos
  gbb: "GBB",
  aeg: "AEG",
  hpa: "HPA",
  fps: "FPS",
  led: "LED",
  usb: "USB",
  bb: "BB",
  bbs: "BBs",
  co2: "CO2",
  ar15: "AR15",
  ak47: "AK47",
  m4: "M4",
  m16: "M16",
  m90: "M90",
  mp9: "MP9",
  mk1: "MK1",
  mk2: "MK2",
  ssr77: "SSR77",
  ssr4: "SSR4",
  ssr90: "SSR90",
  ssg10: "SSG10",
  ssg: "SSG",
  ssr: "SSR",
  ssp5: "SSP5",
  ssp1: "SSP1",
  ssp: "SSP",
  a1: "A1",
  a2: "A2",
  a3: "A3",
  gen1: "Gen 1",
  gen2: "Gen 2",
  gen3: "Gen 3",
  gen4: "Gen 4",
  gen5: "Gen 5",
  g45: "G45",
  ptt: "PTT",
  uv: "UV",
  "uv-5r": "UV-5R",
  "u94": "U94",
  comtac: "Comtac",
  ii: "II",
  iii: "III",
  pl50s: "PL50S",
  g17: "G17",
  cnc: "CNC",
  v3: "V3",
  v2: "V2",
  cy: "CY",
  pi: "PI",
  multicam: "Multicam",
  tan: "Tan",
  ranger: "Ranger",
  green: "Verde",
  blowback: "Blowback",
  bb: "BB",
};

// Palabras conectoras que se mantienen en minúscula dentro del título
// (salvo si son la primera palabra).
const SMALL_WORDS = new Set([
  "de", "del", "la", "las", "el", "los", "y", "o", "u", "a", "al", "en",
  "para", "con", "sin", "por", "que", "se", "su", "sus", "lo", "le", "les",
]);

// ── Normalización de texto ────────────────────────────────────────────
function stripInvisibles(s) {
  return String(s || "")
    .replace(/[​-‍﻿]/g, "")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isAllCapsWord(w) {
  // "Palabra" sin dígitos, 2+ letras, todas en mayúscula.
  return /^[A-ZÁÉÍÓÚÑ]{2,}$/.test(w);
}

function isModelToken(w) {
  // Tokens con dígitos (M4, SSR77, 1700, etc) — preservamos casing original.
  return /\d/.test(w);
}

function titleCaseWord(w, isFirst) {
  if (!w) return w;
  // Para lookups, quitar puntuación leading/trailing.
  const stripped = w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  const lower = stripped.toLowerCase();
  // Marcas / acrónimos / códigos modelo
  if (Object.prototype.hasOwnProperty.call(PRESERVE, lower)) {
    return w.replace(stripped, PRESERVE[lower]);
  }
  // Tokens con dígitos: respetar y poner mayúscula la parte alfabética inicial.
  if (isModelToken(stripped)) return w.toUpperCase();
  // Palabras conectoras minúsculas (excepto si son la primera)
  if (!isFirst && SMALL_WORDS.has(lower)) return w.toLowerCase();
  // Default: Title Case — capitalizar la primera letra (no la puntuación).
  return w.toLowerCase().replace(/(\p{L})/u, (m) => m.toUpperCase());
}

function titleCase(input) {
  const s = stripInvisibles(input);
  if (!s) return "";
  // Separar por whitespace pero mantener separadores especiales (-, /)
  // Estrategia: aplicar a tokens separados por espacio; dentro de cada
  // token mantener los caracteres no-letra.
  const tokens = s.split(/(\s+)/);
  let first = true;
  return tokens
    .map((tok) => {
      if (/^\s+$/.test(tok)) return tok;
      // Dentro del token puede haber subpartes separadas por - o /
      const sub = tok.split(/([-\/])/);
      const out = sub
        .map((part, i) => {
          if (part === "-" || part === "/" || part === "") return part;
          const cased = titleCaseWord(part, first && i === 0);
          return cased;
        })
        .join("");
      first = false;
      return out;
    })
    .join("")
    .replace(/\s+-\s+/g, " - ")
    .trim();
}

// ── Limpieza de descripciones HTML ────────────────────────────────────
function cleanDescription(html) {
  if (!html) return "";
  let s = String(html);
  // ZWSPs y nbsp
  s = s.replace(/[​-‍﻿]/g, "").replace(/&#8203;/g, "");
  s = s.replace(/ /g, " ").replace(/&nbsp;/g, " ");
  // Colapsar <p></p> vacíos repetidos
  s = s.replace(/(<p>\s*<\/p>\s*){2,}/g, "<p></p>");
  s = s.replace(/^(<p>\s*<\/p>\s*)+/, "");
  s = s.replace(/(<p>\s*<\/p>\s*)+$/, "");
  // <br /> múltiples
  s = s.replace(/(<br\s*\/?>\s*){3,}/g, "<br/><br/>");
  // Normalizar quotes raros
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  // Sentence-case frases enteras en mayúscula >= 4 palabras dentro de <p>
  s = s.replace(/(>)([^<]+)(<)/g, (_m, a, text, c) => {
    const trimmed = text.trim();
    if (trimmed.length < 8) return a + text + c;
    const words = trimmed.split(/\s+/);
    const upperWords = words.filter((w) => /^[A-ZÁÉÍÓÚÑ]{2,}$/.test(w));
    if (upperWords.length >= 4 && upperWords.length / words.length > 0.6) {
      // toda la frase en mayúscula → sentence case
      const lower = trimmed.toLowerCase();
      const cased = lower.charAt(0).toUpperCase() + lower.slice(1);
      return a + cased + c;
    }
    return a + text + c;
  });
  // Si no tiene tags HTML, envolver en <p>
  if (!/<[a-z][^>]*>/i.test(s)) {
    s = `<p>${s.trim()}</p>`;
  }
  // Whitespace final
  return s.replace(/\s+/g, " ").trim();
}

// ── Taxonomía: categoría origen + override por título ─────────────────
// Las categorías padre se crearán automáticamente en TN al importar.
const CATEGORY_BY_RR = {
  PRIMARIAS: "Marcadoras > Primarias",
  SECUNDARIAS: "Marcadoras > Pistolas",
  CARGADORES: "Cargadores",
  CONSUMIBLES: "Munición y gas",
  TRACERS: "Tracers",
  MIRAS: "Ópticas y miras",
  LINTERNAS: "Iluminación",
  PROTECCION: "Protección",
  SEGURIDAD: "Protección > Máscaras",
  EQUIPAMIENTO: "Equipamiento táctico",
  ACCESORIO: "Accesorios",
  UNIFORMES: "Uniformes",
  RADIOS: "Comunicaciones",
  CAMARAS: "Cámaras",
  "CAJAS MARCADORAS": "Estuches y bolsos",
  BATERIA: "Energía",
  PARCHES: "Accesorios > Parches",
  CORREA: "Equipamiento táctico > Correas",
};

// Patrones (case-insensitive) que pisan la categoría inferida.
const CATEGORY_OVERRIDES = [
  // Iluminación PRIMERO — antes que casco/rieles, porque las linternas mencionan
  // "para casco" o "picatinny" como compatibilidad, no como su tipo de producto.
  { pattern: /^linterna|^luz t[áa]ctica|^luz de pistola|^luz de baja|^ezshoot.*linterna/i, category: "Iluminación" },

  // BBs tracer: si el título contiene BBs Y tracer → munición, no tracer device.
  { pattern: /\bbbs?\b.*tracer|tracer.*\bbbs?\b/i, category: "Munición y gas > BBs" },

  // Protección — específicos primero
  { pattern: /casco/i, category: "Protección > Cascos" },
  { pattern: /antiparra|lentes?\b|antifog/i, category: "Protección > Antiparras" },
  { pattern: /guantes/i, category: "Protección > Guantes" },
  { pattern: /chaleco/i, category: "Protección > Chalecos" },
  { pattern: /m[áa]scara|mesh|balaclava/i, category: "Protección > Máscaras" },

  // Iluminación (fallback más amplio, después de protección)
  { pattern: /linterna|luz t[áa]ctica|luz de pistola|luz de baja|l[úu]menes|lumen/i, category: "Iluminación" },

  // Comunicaciones específicas antes que radio genérico.
  { pattern: /headset|comtac|sordinas|ptt|u94/i, category: "Comunicaciones > Headsets y PTT" },
  { pattern: /radio|baofeng|uv-5r/i, category: "Comunicaciones > Radios" },

  // Cargadores: speedloader antes que cargador genérico.
  { pattern: /cargador(a)? (de )?velocidad|speedloader/i, category: "Cargadores > Speedloaders" },
  { pattern: /^cargador(a)?\b|^mag(azine)?\b/i, category: "Cargadores > De marcadora" },

  // Equipamiento táctico
  { pattern: /chest rig/i, category: "Equipamiento táctico > Chest rigs" },
  { pattern: /pouch|bolsa de descarte/i, category: "Equipamiento táctico > Pouches" },
  { pattern: /correa|sling/i, category: "Equipamiento táctico > Correas" },

  // Munición
  { pattern: /^bbs?\b|bb's|^botella/i, category: "Munición y gas > BBs" },
  { pattern: /green gas|puff dino|propelente|600 ?ml|botella.*gas/i, category: "Munición y gas > Gas propelente" },
  { pattern: /bengala/i, category: "Accesorios > Bengalas" },

  // Rieles y monturas — patrón estricto (no debe matchear linternas que mencionan picatinny)
  { pattern: /^(juego de )?riel|^gancho|^protector de mira|^montura/i, category: "Accesorios > Rieles y monturas" },

  // Repuestos
  { pattern: /odin|^repuesto|^resorte|spring/i, category: "Repuestos y mejoras" },

  // Otros
  { pattern: /tracer/i, category: "Tracers" },
  { pattern: /go ?pro|runcam|c[áa]mara/i, category: "Cámaras" },
  { pattern: /bater[íi]a/i, category: "Energía > Baterías" },
  { pattern: /estuche|^bolso/i, category: "Estuches y bolsos" },
  { pattern: /parche/i, category: "Accesorios > Parches" },
  { pattern: /cuchillo de goma|dummy/i, category: "Accesorios > Entrenamiento" },
  { pattern: /uniforme|combat shirt|combat pants|g3 combat/i, category: "Uniformes" },
];

function mapCategory(rrCategory, title) {
  const t = title || "";
  for (const ov of CATEGORY_OVERRIDES) {
    if (ov.pattern.test(t)) return ov.category;
  }
  const upper = (rrCategory || "").toUpperCase();
  if (CATEGORY_BY_RR[upper]) return CATEGORY_BY_RR[upper];
  return "Accesorios";
}

// ── Tags ──────────────────────────────────────────────────────────────
const BRAND_KEYWORDS = [
  "Novritsch", "KWA", "Tokyo Marui", "Emerson", "IDOgear", "Acetech",
  "CYMA", "WE", "PTS", "BLS", "SIG Sauer", "G&G", "Taran Tactical",
  "Baofeng", "ZTAC", "Glock", "Armadillo", "Runcam", "Go Pro",
  "Votatu", "WoSport", "EZShoot", "GMConn", "Puff Dino", "MTEK", "Flux",
];

function deriveTags(normalizedTitle, normalizedCategory) {
  const tags = new Set();
  for (const brand of BRAND_KEYWORDS) {
    if (new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "i").test(normalizedTitle)) {
      tags.add(brand);
    }
  }
  // tag por categoría raíz
  const root = normalizedCategory.split(">")[0].trim();
  if (root) tags.add(root);
  return [...tags];
}

// ── Main ──────────────────────────────────────────────────────────────
function main() {
  const items = JSON.parse(readFileSync(SRC, "utf8"));
  console.log(`[load] ${items.length} productos desde ${SRC}`);

  const enriched = items.map((p) => {
    const originalTitle = p.baseVariant?.title || "";
    const normalizedTitle = titleCase(originalTitle);
    const originalDesc = p.baseVariant?.description || "";
    const normalizedDescription = cleanDescription(originalDesc);
    const normalizedCategory = mapCategory(p.category?.name, normalizedTitle);
    const tags = deriveTags(normalizedTitle, normalizedCategory);
    return {
      ...p,
      enriched: {
        normalizedTitle,
        normalizedDescription,
        normalizedCategory,
        tags,
        needsLLMPolish: stripInvisibles(originalDesc.replace(/<[^>]+>/g, "")).length < 100,
      },
    };
  });

  writeFileSync(OUT, JSON.stringify(enriched, null, 2));
  console.log(`[done] ${OUT}`);

  // Resumen
  const byCat = {};
  for (const p of enriched) {
    const c = p.enriched.normalizedCategory;
    byCat[c] = (byCat[c] || 0) + 1;
  }
  console.log("\n=== DISTRIBUCIÓN EN NUEVA TAXONOMÍA ===");
  for (const c of Object.keys(byCat).sort()) {
    console.log(`  ${String(byCat[c]).padStart(3)} · ${c}`);
  }

  const needsLLM = enriched.filter((p) => p.enriched.needsLLMPolish).length;
  console.log(`\n[next] ${needsLLM} productos marcados para Fase 2 (LLM + web search).`);
}

main();
