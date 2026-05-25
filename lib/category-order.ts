// ──────────────────────────────────────────────────────────────────────
// Orden curado de categorías raíz para mostrar en navegación y listados.
//
// Lo que está afuera de esta lista se ordena después, alfabéticamente.
// Cambiar acá afecta header nav, home, /categorias y cualquier lugar que
// muestre categorías.
// ──────────────────────────────────────────────────────────────────────

export const CATEGORY_ORDER: readonly string[] = [
  "Marcadoras",
  "Cargadores",
  "Munición y gas",
  "Tracers",
  "Ópticas y miras",
  "Iluminación",
  "Protección",
  "Equipamiento táctico",
  "Comunicaciones",
  "Uniformes",
  "Cámaras",
  "Estuches y bolsos",
  "Energía",
  "Repuestos y mejoras",
  "Accesorios",
] as const;

// Agrupación en "macro-categorías" para layouts más visuales (home, /categorias).
// Cada macro agrupa categorías relacionadas para dar una imagen mental clara.
export interface MacroCategory {
  slug: string;
  label: string;
  description: string;
  categories: readonly string[];
}

export const MACRO_CATEGORIES: readonly MacroCategory[] = [
  {
    slug: "marcadoras",
    label: "Marcadoras",
    description: "Primarias, pistolas y rifles de francotirador.",
    categories: ["Marcadoras"],
  },
  {
    slug: "municion-cargadores",
    label: "Munición y cargadores",
    description: "BBs, gas propelente, cargadores y speedloaders.",
    categories: ["Munición y gas", "Cargadores"],
  },
  {
    slug: "opticas-iluminacion",
    label: "Óptica e iluminación",
    description: "Miras red dot, linternas tácticas, tracers.",
    categories: ["Ópticas y miras", "Iluminación", "Tracers"],
  },
  {
    slug: "proteccion-equipo",
    label: "Protección y equipo",
    description: "Cascos, máscaras, chalecos, pouches, uniformes.",
    categories: ["Protección", "Equipamiento táctico", "Uniformes"],
  },
  {
    slug: "comunicaciones-camaras",
    label: "Comunicaciones y cámaras",
    description: "Radios, headsets, cámaras de acción.",
    categories: ["Comunicaciones", "Cámaras"],
  },
  {
    slug: "complementos",
    label: "Complementos",
    description: "Estuches, baterías, repuestos y accesorios varios.",
    categories: ["Estuches y bolsos", "Energía", "Repuestos y mejoras", "Accesorios"],
  },
] as const;

/**
 * Ordena un array de categorías por el orden curado, con las no listadas al final.
 */
export function sortByCuratedOrder<T extends { name: string }>(cats: T[]): T[] {
  const order = new Map(CATEGORY_ORDER.map((name, i) => [name, i]));
  return [...cats].sort((a, b) => {
    const ai = order.get(a.name) ?? 999;
    const bi = order.get(b.name) ?? 999;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name, "es");
  });
}
