import { z } from "zod";
import type { NextRequest } from "next/server";

// ──────────────────────────────────────────────────────────────────────
// POST /api/pedidos-exterior
//
// Recibe el formulario de "Pedidos del exterior" y notifica al staff.
//
// Notificacion: usamos la API REST de Resend via fetch directo (sin
// agregar dependencia). Si la env RESEND_API_KEY no esta seteada, el
// endpoint sigue funcionando — solo loggea el pedido en console para que
// el dev/staging no falle. Apenas se setea la key, los emails arrancan.
//
// Sin persistencia: por ahora la unica copia del pedido es el email.
// Cuando crezca el volumen se puede sumar Notion/Sheet/KV.
// ──────────────────────────────────────────────────────────────────────

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
  email: z.string().email("email invalido").max(200),
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
  website: z
    .string()
    .max(0, "spam detectado")
    .optional()
    .default(""),
});

type Pedido = z.infer<typeof PedidoSchema>;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmail(pedido: Pedido) {
  const lines: string[] = [
    `Nuevo pedido del exterior recibido desde la tienda.`,
    ``,
    `CLIENTE`,
    `Nombre: ${pedido.nombre}`,
    `Email:  ${pedido.email}`,
    `WhatsApp: ${pedido.whatsapp}`,
    ``,
    `PRODUCTO`,
    `Nombre: ${pedido.productName}`,
    `URL: ${pedido.productUrl}`,
    `Cantidad: ${pedido.qty}`,
  ];
  if (pedido.variant) lines.push(`Variante: ${pedido.variant}`);
  if (pedido.notes) {
    lines.push(``, `NOTAS`, pedido.notes);
  }
  lines.push(
    ``,
    `—`,
    `Enviado desde tienda.experienciaairsoft.com — ${new Date().toISOString()}`,
  );
  const text = lines.join("\n");

  const html = `
<div style="font-family: ui-monospace, monospace; color: #0a0a0a; max-width: 640px;">
  <h2 style="background: #ff6b1a; color: #0a0a0a; padding: 12px 16px; margin: 0; font-size: 16px; letter-spacing: 2px; text-transform: uppercase;">
    Pedido del exterior
  </h2>
  <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px;">
    <tr><td style="padding: 6px 8px; color: #6e6e6e; width: 140px;">Cliente</td><td style="padding: 6px 8px;"><strong>${escapeHtml(pedido.nombre)}</strong></td></tr>
    <tr><td style="padding: 6px 8px; color: #6e6e6e;">Email</td><td style="padding: 6px 8px;"><a href="mailto:${escapeHtml(pedido.email)}" style="color: #ff6b1a;">${escapeHtml(pedido.email)}</a></td></tr>
    <tr><td style="padding: 6px 8px; color: #6e6e6e;">WhatsApp</td><td style="padding: 6px 8px;">${escapeHtml(pedido.whatsapp)}</td></tr>
    <tr><td colspan="2" style="padding: 6px 8px; border-top: 1px solid #ddd;"></td></tr>
    <tr><td style="padding: 6px 8px; color: #6e6e6e;">Producto</td><td style="padding: 6px 8px;"><strong>${escapeHtml(pedido.productName)}</strong></td></tr>
    <tr><td style="padding: 6px 8px; color: #6e6e6e;">URL</td><td style="padding: 6px 8px;"><a href="${escapeHtml(pedido.productUrl)}" style="color: #ff6b1a; word-break: break-all;">${escapeHtml(pedido.productUrl)}</a></td></tr>
    <tr><td style="padding: 6px 8px; color: #6e6e6e;">Cantidad</td><td style="padding: 6px 8px;">${pedido.qty}</td></tr>
    ${pedido.variant ? `<tr><td style="padding: 6px 8px; color: #6e6e6e;">Variante</td><td style="padding: 6px 8px;">${escapeHtml(pedido.variant)}</td></tr>` : ""}
  </table>
  ${pedido.notes ? `<div style="margin-top: 16px; padding: 12px 16px; background: #f5f5f0; border-left: 3px solid #ff6b1a;"><strong style="font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #6e6e6e;">Notas del cliente</strong><br/><br/>${escapeHtml(pedido.notes).replace(/\n/g, "<br/>")}</div>` : ""}
  <p style="margin-top: 24px; font-size: 11px; color: #6e6e6e;">tienda.experienciaairsoft.com · ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</p>
</div>`;

  return { text, html };
}

async function sendEmail(pedido: Pedido): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[pedidos-exterior] RESEND_API_KEY no seteada — el pedido se loggea pero no se envia email.",
    );
    console.info("[pedidos-exterior] PEDIDO:", JSON.stringify(pedido, null, 2));
    return { sent: false, reason: "no_api_key" };
  }

  const to =
    process.env.PEDIDOS_NOTIFICATION_EMAIL ?? "hola@experienciaairsoft.com";
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Tienda EA <pedidos@experienciaairsoft.com>";
  const { text, html } = buildEmail(pedido);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: pedido.email,
        subject: `[Pedido exterior] ${pedido.productName} — ${pedido.nombre}`,
        text,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[pedidos-exterior] Resend error", res.status, body);
      return { sent: false, reason: `resend_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[pedidos-exterior] Resend network error", err);
    return { sent: false, reason: "network_error" };
  }
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

  // Si el honeypot vino lleno, fingimos exito sin mandar nada.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return Response.json({ ok: true });
  }

  const result = await sendEmail(parsed.data);
  // No bloqueamos al usuario si Resend falla — el pedido queda registrado
  // en logs y podemos recuperarlo manualmente. Devolvemos ok pero con flag.
  return Response.json({ ok: true, notified: result.sent });
}
