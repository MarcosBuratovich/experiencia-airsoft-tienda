// Google Analytics 4 — helper único de tracking de la tienda.
//
// El Measurement ID es un valor público (viaja al cliente igual), por eso va
// hardcodeado — mismo criterio que el Meta Pixel. Es LA MISMA propiedad/stream
// que www y app: la cookie _ga vive en .experienciaairsoft.com y GA4 unifica
// el journey www → tienda solo.
export const GA_ID = "G-78DVDE6HZT";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Los precios internos van en CENTAVOS; GA4 espera unidades ARS. */
export function centsToArs(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Espejo hacia Meta Pixel: cada evento GA4 relevante dispara también su
 * evento estándar de Meta, así ambas plataformas de Ads ven el mismo embudo
 * sin instrumentación duplicada en los callsites.
 */
const FBQ_MAP: Record<string, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  whatsapp_checkout: "Lead",
  generate_lead: "Lead",
  search: "Search",
  whatsapp_click: "Contact",
};

type Params = Record<string, unknown>;

/**
 * Dispara un evento GA4 (y su espejo Meta si corresponde). Seguro de llamar
 * siempre: si gtag no cargó (ad blocker, script aún no listo) es un no-op —
 * NUNCA condicionar lógica de negocio (checkout, carrito) a un track().
 */
export function track(evento: string, params?: Params): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", evento, params);

  const fb = FBQ_MAP[evento];
  if (fb) {
    const fbParams: Params = {};
    if (params?.value !== undefined) {
      fbParams.value = params.value;
      fbParams.currency = params.currency ?? "ARS";
    }
    (window as { fbq?: (...a: unknown[]) => void }).fbq?.("track", fb, fbParams);
  }
}

// ──────────────────────────────────────────────────────────────────────
// Builders de items[] GA4 (schema oficial de e-commerce).
// ──────────────────────────────────────────────────────────────────────

export interface GaItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
}

/** Item GA4 desde una línea del carrito (snapshot local). */
export function gaItemFromCartItem(it: {
  productId: number;
  qty: number;
  snapshot: {
    productName: string;
    variantLabel: string;
    priceCents: number;
    brand?: string | null;
    category?: string | null;
  };
}): GaItem {
  return {
    item_id: String(it.productId),
    item_name: it.snapshot.productName,
    ...(it.snapshot.brand && it.snapshot.brand !== "Genérico"
      ? { item_brand: it.snapshot.brand }
      : {}),
    ...(it.snapshot.category ? { item_category: it.snapshot.category } : {}),
    ...(it.snapshot.variantLabel && it.snapshot.variantLabel !== "Estandar"
      ? { item_variant: it.snapshot.variantLabel }
      : {}),
    price: centsToArs(it.snapshot.priceCents),
    quantity: it.qty,
  };
}

/** Items + value para eventos de carrito completo (view_cart, checkout). */
export function gaCartPayload(
  items: Parameters<typeof gaItemFromCartItem>[0][],
): { currency: "ARS"; value: number; items: GaItem[] } {
  const value = items.reduce(
    (acc, it) => acc + it.qty * it.snapshot.priceCents,
    0,
  );
  return {
    currency: "ARS",
    value: centsToArs(value),
    items: items.map(gaItemFromCartItem),
  };
}
