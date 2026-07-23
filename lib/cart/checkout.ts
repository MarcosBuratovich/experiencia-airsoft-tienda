"use client";

import { gaCartPayload, track } from "@/lib/ga";
import type { CartItem } from "./types";

// ──────────────────────────────────────────────────────────────────────
// Checkout compartido entre el drawer y /carrito (antes duplicado en ambos).
//
// Además de pedir la URL wa.me al server, arma el puente de ATRIBUCIÓN:
// la venta se cierra a mano en WhatsApp (no hay purchase on-site), así que
// mandamos al server una referencia corta + el client_id de GA + el gclid de
// Google Ads. El ref viaja dentro del mensaje de WhatsApp: cuando la venta
// se concreta en el chat, ese ref permite importar la conversión offline a
// Ads con el monto real.
// ──────────────────────────────────────────────────────────────────────

function leerCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** client_id de GA: cookie _ga con formato GA1.1.111111.2222222 → "111111.2222222". */
function gaClientId(): string | null {
  const raw = leerCookie("_ga");
  if (!raw) return null;
  const parts = raw.split(".");
  return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : null;
}

/** gclid del último click de Google Ads: cookie _gcl_aw = GCL.<ts>.<gclid>. */
function gclid(): string | null {
  const raw = leerCookie("_gcl_aw");
  if (!raw) return null;
  const parts = raw.split(".");
  return parts.length >= 3 ? parts.slice(2).join(".") : null;
}

function nuevoRef(): string {
  // Corto y legible en el chat: EA-<base36 timestamp><2 random>.
  const t = Date.now().toString(36).toUpperCase().slice(-6);
  const r = Math.random().toString(36).toUpperCase().slice(2, 4);
  return `EA-${t}${r}`;
}

export type CheckoutResult = { url: string } | { error: string };

/**
 * Inicia el handoff de checkout por WhatsApp. Dispara begin_checkout al
 * entrar y whatsapp_checkout (LA conversión de la tienda) cuando el server
 * confirma — ANTES de que el caller haga window.open, así el hit sale por
 * sendBeacon aunque el salto a WhatsApp mate la página. Los eventos jamás
 * bloquean el checkout: si GA no cargó, son no-op.
 */
export async function checkoutPorWhatsApp(
  items: CartItem[],
): Promise<CheckoutResult> {
  const payload = gaCartPayload(items);
  track("begin_checkout", payload);

  const ref = nuevoRef();
  try {
    const res = await fetch("/api/cart/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((it) => ({
          variantId: it.variantId,
          qty: it.qty,
          productName: it.snapshot.productName,
          variantLabel: it.snapshot.variantLabel,
          unitPriceCents: it.snapshot.priceCents,
          handle: it.snapshot.handle,
        })),
        // Truncado defensivo: el server valida largos máximos y un valor
        // fuera de spec jamás debe poder voltear el checkout.
        analytics: {
          ref,
          gaClientId: gaClientId()?.slice(0, 64) ?? null,
          gclid: gclid()?.slice(0, 512) ?? null,
        },
      }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      return {
        error:
          data.error ??
          "No pudimos iniciar el checkout. Probá de nuevo o escribinos por WhatsApp.",
      };
    }
    track("whatsapp_checkout", { ...payload, checkout_ref: ref });
    return { url: data.url };
  } catch (err) {
    console.error("[cart] checkout failed", err);
    return { error: "No hay conexion con el servidor. Probá en un rato." };
  }
}
