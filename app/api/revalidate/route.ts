import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { tnFetch } from "@/lib/tiendanube/client";
import { ProductSchema, CategorySchema } from "@/lib/tiendanube/schemas";
import {
  allProductHandlesTag,
  categoriesAllTag,
  categoryHandleTag,
  categoryIdTag,
  featuredProductsTag,
  productHandleTag,
  productIdTag,
  productsAllTag,
} from "@/lib/tiendanube/tags";

// ──────────────────────────────────────────────────────────────────────
// Webhook de Tiendanube → revalidación on-demand.
//
// Sin esto, el cache 'use cache' solo expira por tiempo (cacheLife hours/days),
// así que un producto nuevo tarda en aparecer en el sitemap y los cambios de
// precio/stock tardan horas. Acá, ante un evento de TN, invalidamos los tags
// afectados: el sitemap se regenera, la página del producto se re-prerenderiza
// y el JSON-LD de precio/stock queda fresco.
//
// REGISTRO (acción del dueño, una sola vez, vía API de TN):
//   POST https://api.tiendanube.com/v1/<store_id>/webhooks
//   body: { "event": "product/updated", "url": "https://tienda.experienciaairsoft.com/api/revalidate" }
//   Repetir para: product/created, product/updated, product/deleted,
//                 category/created, category/updated, category/deleted.
//
// AUTENTICACIÓN: TN firma el body con HMAC-SHA256 (header
// x-linkedstore-hmac-sha256) usando el client_secret de la app. Verificamos
// contra TIENDANUBE_WEBHOOK_SECRET y/o TIENDANUBE_CLIENT_SECRET.
// ──────────────────────────────────────────────────────────────────────

// Nota: NO declarar `export const runtime` — con experimental.useCache Next 16
// lo prohíbe. El runtime por defecto de los route handlers es Node.js, donde
// node:crypto está disponible.

// Next 16: revalidateTag pide un segundo arg. Para webhooks de terceros que
// necesitan expiración INMEDIATA, la doc recomienda { expire: 0 } (en vez del
// profile "max" stale-while-revalidate o updateTag, que es solo para Server Actions).
const purge = (tag: string): void => revalidateTag(tag, { expire: 0 });

function verifySignature(rawBody: string, header: string | null): boolean {
  if (!header) return false;
  const secrets = [
    process.env.TIENDANUBE_WEBHOOK_SECRET,
    process.env.TIENDANUBE_CLIENT_SECRET,
  ].filter((s): s is string => Boolean(s));
  if (secrets.length === 0) return false;

  const headerBuf = Buffer.from(header, "utf8");
  for (const secret of secrets) {
    const digest = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");
    const digestBuf = Buffer.from(digest, "utf8");
    if (
      digestBuf.length === headerBuf.length &&
      crypto.timingSafeEqual(digestBuf, headerBuf)
    ) {
      return true;
    }
  }
  return false;
}

interface TnWebhookPayload {
  store_id?: number;
  event?: string;
  id?: number;
}

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-linkedstore-hmac-sha256");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: TnWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as TnWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event = payload.event ?? "";
  const id = typeof payload.id === "number" ? payload.id : undefined;

  try {
    if (event.startsWith("product")) {
      // Tags amplios: sitemap, listados, destacados.
      purge(productsAllTag());
      purge(allProductHandlesTag());
      purge(featuredProductsTag());
      if (id !== undefined) purge(productIdTag(id));
      revalidatePath("/productos");

      // Para la página del producto y su tag por-handle necesitamos el handle:
      // lo resolvemos con un fetch FRESCO (tnFetch no usa 'use cache').
      if (id !== undefined && event !== "product/deleted") {
        const fresh = await tnFetch({
          path: `products/${id}`,
          schema: ProductSchema,
        }).catch(() => null);
        if (fresh?.handle) {
          purge(productHandleTag(fresh.handle));
          revalidatePath(`/productos/${fresh.handle}`);
        }
      }
    } else if (event.startsWith("category")) {
      purge(categoriesAllTag());
      if (id !== undefined) purge(categoryIdTag(id));
      revalidatePath("/categorias");

      if (id !== undefined && event !== "category/deleted") {
        const fresh = await tnFetch({
          path: `categories/${id}`,
          schema: CategorySchema,
        }).catch(() => null);
        if (fresh?.handle) {
          purge(categoryHandleTag(fresh.handle));
          revalidatePath(`/categorias/${fresh.handle}`);
        }
      }
    }
  } catch (err) {
    console.error("[api/revalidate] error", { event, id, err });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event });
}
