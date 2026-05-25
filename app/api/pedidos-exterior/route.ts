import { z } from "zod";
import type { NextRequest } from "next/server";

// ──────────────────────────────────────────────────────────────────────
// POST /api/pedidos-exterior
//
// Recibe el formulario de "Pedidos del exterior" y devuelve una URL wa.me
// pre-cargada con el detalle del pedido. El cliente la abre y entra al
// chat con todos los datos listos para mandar.
//
// Response shape: { ok: true, url: "https://wa.me/..." }
// Mismo patrón que /api/cart/checkout — si más adelante queremos persistir
// el pedido en una DB / KV / Notion, reemplazamos esta lógica manteniendo
// la response shape.
//
// Configuración:
//   WHATSAPP_CHECKOUT_NUMBER — destino (formato internacional sin "+").
//   Si no está, usa el default conocido.
// ──────────────────────────────────────────────────────────────────────

const DEFAULT_NUMBER = "541131069019";

function isArsenalSportsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return host === "arsenalsports.com";
  } catch {
    return false;
  }
}

const PedidoSchema = z.object({
  nombre: z.string().min(2, "nombre muy corto").max(120),
  // Email queda como campo opcional — la conversación va a seguir por WhatsApp.
  email: z
    .string()
    .email("email invalido")
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  whatsapp: z.string().min(7, "whatsapp incompleto").max(40),
  productUrl: z
    .string()
    .url("url invalida")
    .max(500)
    .refine(isArsenalSportsUrl, "el link tiene que ser de arsenalsports.com"),
  productName: z.string().min(2).max(200),
  qty: z.coerce.number().int().positive().max(20).default(1),
  variant: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  terms: z.literal(true, {
    errorMap: () => ({ message: "debes aceptar las condiciones" }),
  }),
  // Honeypot anti-bot: campo invisible que solo bots llenan.
  website: z.string().max(0, "spam detectado").optional().default(""),
});

type Pedido = z.infer<typeof PedidoSchema>;

function buildMessage(pedido: Pedido): string {
  const lines: string[] = [];
  lines.push("🌎 *PEDIDO DEL EXTERIOR — Experiencia Airsoft*");
  lines.push("");
  lines.push("*Cliente*");
  lines.push(`• Nombre: ${pedido.nombre}`);
  lines.push(`• WhatsApp: ${pedido.whatsapp}`);
  if (pedido.email) lines.push(`• Email: ${pedido.email}`);
  lines.push("");
  lines.push("*Producto*");
  lines.push(`• ${pedido.productName}`);
  lines.push(`• Cantidad: ${pedido.qty}`);
  if (pedido.variant) lines.push(`• Variante: ${pedido.variant}`);
  lines.push(`• Link: ${pedido.productUrl}`);
  if (pedido.notes) {
    lines.push("");
    lines.push("*Notas*");
    lines.push(pedido.notes);
  }
  lines.push("");
  lines.push("✅ Acepté las condiciones (seña 30% mínimo, saldo al llegar).");
  lines.push("");
  lines.push("¿Me cotizan el total con envío? Gracias.");
  return lines.join("\n");
}

function buildWhatsAppUrl(phone: string, message: string): string {
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

  const parsed = PedidoSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Datos invalidos",
        issues: parsed.error.issues.slice(0, 5).map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  // Honeypot: si vino lleno, fingimos éxito sin devolver URL (no abrimos
  // WhatsApp para que el bot no logre nada).
  if (parsed.data.website && parsed.data.website.length > 0) {
    return Response.json({ ok: true });
  }

  const phone = process.env.WHATSAPP_CHECKOUT_NUMBER || DEFAULT_NUMBER;
  const message = buildMessage(parsed.data);
  const url = buildWhatsAppUrl(phone, message);

  console.info(
    `[pedidos-exterior] WA handoff · cliente=${parsed.data.nombre} · producto=${parsed.data.productName}`,
  );

  return Response.json({ ok: true, url });
}
