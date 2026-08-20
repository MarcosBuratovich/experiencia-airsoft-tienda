import { z } from "zod";
import type { NextRequest } from "next/server";
import { formatARS } from "@/lib/format";
import { enviarEventoMeta, userDataDesdeRequest } from "@/lib/meta-capi";

// ──────────────────────────────────────────────────────────────────────
// POST /api/cart/checkout
//
// Modo actual: handoff a WhatsApp (sin pasarela de pago integrada todavía).
// Construye un mensaje estructurado con cada item, cantidad, precio
// unitario y total, y devuelve la URL wa.me lista para abrir.
//
// Response shape: { url: string }
// Cuando se integre MercadoPago (o cualquier otro PSP) reemplazamos la
// lógica de este handler manteniendo la misma shape — los clients no
// necesitan cambiar.
//
// Configuración:
//   WHATSAPP_CHECKOUT_NUMBER — número destino (formato internacional sin +,
//   ej "5491131310742"). Si no está, cae al default de abajo.
//   WHATSAPP_CHECKOUT_GREETING — opcional, override del saludo inicial.
// ──────────────────────────────────────────────────────────────────────

// Línea de contacto de la tienda (la misma que WHATSAPP_URL). Es solo el
// fallback: si WHATSAPP_CHECKOUT_NUMBER está seteada en Vercel, manda esa.
const DEFAULT_NUMBER = "5491131310742";

const ItemSchema = z.object({
  variantId: z.number().int().positive(),
  qty: z.number().int().positive().max(99),
  productName: z.string().min(1).max(200),
  variantLabel: z.string().max(200).optional(),
  unitPriceCents: z.number().int().nonnegative(),
  handle: z.string().min(1).max(120).optional(),
});

// Puente de atribución: la venta cierra a mano en WhatsApp, así que el client
// manda una referencia corta (viaja dentro del mensaje) + el client_id de GA
// + el gclid de Ads. Con eso una venta concretada se puede importar como
// conversión offline con monto real. Todo opcional: sin analytics el checkout
// funciona igual.
// .catch(undefined): si el campo viene malformado (cookie corrupta, cliente
// viejo) se descarta la telemetría — un problema de analytics JAMÁS puede
// responder 400 y voltear el checkout.
const AnalyticsSchema = z
  .object({
    ref: z.string().regex(/^EA-[A-Z0-9]{4,12}$/).optional().catch(undefined),
    eventId: z.string().max(80).optional().catch(undefined),
    sourceUrl: z.string().max(500).optional().catch(undefined),
    gaClientId: z.string().max(64).nullish().catch(undefined),
    gclid: z.string().max(512).nullish().catch(undefined),
  })
  .optional()
  .catch(undefined);

const RequestSchema = z.object({
  items: z.array(ItemSchema).min(1, "al menos un item").max(50, "demasiados items"),
  analytics: AnalyticsSchema,
});

type ParsedItem = z.infer<typeof ItemSchema>;

function buildMessage(items: ParsedItem[], ref?: string): string {
  const lines: string[] = [];
  lines.push("🛒 *PEDIDO — Experiencia Airsoft Tienda*");
  lines.push("");
  let totalCents = 0;
  let unitTotal = 0;
  items.forEach((item, idx) => {
    const lineSubtotal = item.unitPriceCents * item.qty;
    totalCents += lineSubtotal;
    unitTotal += item.qty;
    const variantPart =
      item.variantLabel && item.variantLabel.trim() && item.variantLabel !== "Estandar"
        ? ` (${item.variantLabel})`
        : "";
    lines.push(`${idx + 1}. *${item.productName}*${variantPart}`);
    if (item.qty === 1) {
      lines.push(`   Cant: 1 · ${formatARS(item.unitPriceCents)}`);
    } else {
      lines.push(
        `   Cant: ${item.qty} × ${formatARS(item.unitPriceCents)} = ${formatARS(lineSubtotal)}`,
      );
    }
    lines.push("");
  });
  lines.push("────────────────");
  lines.push(`*TOTAL: ${formatARS(totalCents)}*`);
  lines.push(`${items.length} ${items.length === 1 ? "producto" : "productos"} · ${unitTotal} ${unitTotal === 1 ? "unidad" : "unidades"}`);
  lines.push("");
  lines.push("¿Coordinamos el pago? Transferencia o MercadoPago.");
  if (ref) {
    // Referencia de atribución: queda en el historial del chat y permite
    // matchear la venta cerrada con su campaña (conversión offline en Ads).
    lines.push("");
    lines.push(`Ref: ${ref}`);
  }
  return lines.join("\n");
}

function buildWhatsAppUrl(phone: string, message: string): string {
  // Formato wa.me: https://wa.me/{phone}?text={url-encoded message}
  // phone debe estar en formato internacional sin "+", solo dígitos.
  const cleanPhone = phone.replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${text}`;
}

export async function POST(request: NextRequest) {
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
        issues: parsed.error.issues.slice(0, 3).map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const phone = process.env.WHATSAPP_CHECKOUT_NUMBER || DEFAULT_NUMBER;
  const analytics = parsed.data.analytics;
  const message = buildMessage(parsed.data.items, analytics?.ref);
  const url = buildWhatsAppUrl(phone, message);

  // Log estructurado del handoff con los datos de atribución. Sin
  // persistencia todavía: el ref también viaja en el mensaje de WhatsApp,
  // que funciona como registro durable del pedido.
  const totalCents = parsed.data.items.reduce(
    (acc, it) => acc + it.unitPriceCents * it.qty,
    0,
  );
  console.info(
    "[checkout] WA handoff",
    JSON.stringify({
      ref: analytics?.ref ?? null,
      gaClientId: analytics?.gaClientId ?? null,
      gclid: analytics?.gclid ?? null,
      items: parsed.data.items.length,
      totalCents,
    }),
  );

  // Espejo server-side del Lead hacia Meta: recupera las conversiones que el
  // Pixel del navegador pierde por bloqueadores e iOS. Va con el mismo
  // event_id que mandó el cliente, así Meta deduplica. Sin token configurado
  // es un no-op. No se await-ea el resultado más allá de este punto: si Meta
  // demora, el comprador ya tiene su URL igual (hay timeout de 3s adentro).
  if (analytics?.eventId) {
    await enviarEventoMeta({
      eventName: "Lead",
      eventId: analytics.eventId,
      eventSourceUrl: analytics.sourceUrl,
      userData: userDataDesdeRequest(request),
      customData: {
        currency: "ARS",
        value: totalCents / 100,
        content_type: "product",
        num_items: parsed.data.items.length,
        contents: parsed.data.items.map((it) => ({
          id: String(it.variantId),
          quantity: it.qty,
          item_price: it.unitPriceCents / 100,
        })),
      },
    }).catch(() => false);
  }

  return Response.json({ url });
}
