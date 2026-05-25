import { z } from "zod";
import type { NextRequest } from "next/server";
import { formatARS } from "@/lib/format";

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
//   ej "541131069019"). Si no está, cae al default conocido.
//   WHATSAPP_CHECKOUT_GREETING — opcional, override del saludo inicial.
// ──────────────────────────────────────────────────────────────────────

const DEFAULT_NUMBER = "541131069019";

const ItemSchema = z.object({
  variantId: z.number().int().positive(),
  qty: z.number().int().positive().max(99),
  productName: z.string().min(1).max(200),
  variantLabel: z.string().max(200).optional(),
  unitPriceCents: z.number().int().nonnegative(),
  handle: z.string().min(1).max(120).optional(),
});

const RequestSchema = z.object({
  items: z.array(ItemSchema).min(1, "al menos un item").max(50, "demasiados items"),
});

type ParsedItem = z.infer<typeof ItemSchema>;

function buildMessage(items: ParsedItem[]): string {
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
  const message = buildMessage(parsed.data.items);
  const url = buildWhatsAppUrl(phone, message);

  // Log para tracking básico (sin persistencia por ahora).
  console.info(
    `[checkout] WA handoff · items=${parsed.data.items.length} · phone=${phone}`,
  );

  return Response.json({ url });
}
