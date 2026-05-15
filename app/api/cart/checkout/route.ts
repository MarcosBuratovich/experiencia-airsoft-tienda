import { z } from "zod";
import type { NextRequest } from "next/server";
import { tnEnv } from "@/lib/tiendanube/env";

// ──────────────────────────────────────────────────────────────────────
// POST /api/cart/checkout
//
// Recibe los items del carrito local (Zustand) y devuelve la URL del
// checkout hospedado de Tiendanube con esos items pre-cargados.
//
// Estrategia: deeplink directo al storefront nativo de TN. TN soporta
// el patron ?_cart_action=add_multiple&variants[ID]=QTY,&variants[ID]=QTY
// que arma el cart en cookies del subdominio TN y redirige al checkout.
//
// Requisito: TIENDANUBE_STORE_URL apuntando al storefront nativo de TN
// (ej: https://experienciaairsoft.mitiendanube.com). Si no esta, 500.
//
// El stock/precios finales los valida TN al cobrar — nosotros solo
// arrancamos el handoff.
// ──────────────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.number().int().positive(),
        qty: z.number().int().positive().max(99),
      }),
    )
    .min(1, "al menos un item")
    .max(50, "demasiados items"),
});

export async function POST(request: NextRequest) {
  const storeUrl = tnEnv.TIENDANUBE_STORE_URL;
  if (!storeUrl) {
    return Response.json(
      {
        error:
          "Checkout no configurado: falta TIENDANUBE_STORE_URL en el entorno.",
      },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Items invalidos",
        issues: parsed.error.issues.slice(0, 3),
      },
      { status: 400 },
    );
  }

  // Construimos el deeplink: ?_cart_action=add_multiple&variants[ID1]=Q1&variants[ID2]=Q2
  // URLSearchParams soporta keys repetidas y caracteres especiales.
  const url = new URL(`${storeUrl.replace(/\/$/, "")}/`);
  url.searchParams.set("_cart_action", "add_multiple");
  for (const item of parsed.data.items) {
    url.searchParams.append(`variants[${item.variantId}]`, String(item.qty));
  }

  return Response.json({ url: url.toString() });
}
