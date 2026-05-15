import { z } from "zod";

const EnvSchema = z.object({
  TIENDANUBE_STORE_ID: z.string().regex(/^\d+$/, "store id debe ser numerico"),
  TIENDANUBE_ACCESS_TOKEN: z.string().min(20, "access token vacio o muy corto"),
  TIENDANUBE_USER_AGENT: z
    .string()
    .min(1)
    .default("Experiencia Airsoft Store (hola@experienciaairsoft.com)"),
  // URL publica del storefront nativo de TN (ej: https://experienciaairsoft.mitiendanube.com).
  // Solo necesaria para el endpoint /api/cart/checkout que construye el deeplink al checkout hospedado.
  // Si no esta configurada, el endpoint falla con mensaje claro.
  TIENDANUBE_STORE_URL: z.string().url().optional(),
});

const parsed = EnvSchema.safeParse({
  TIENDANUBE_STORE_ID: process.env.TIENDANUBE_STORE_ID,
  TIENDANUBE_ACCESS_TOKEN: process.env.TIENDANUBE_ACCESS_TOKEN,
  TIENDANUBE_USER_AGENT: process.env.TIENDANUBE_USER_AGENT,
  TIENDANUBE_STORE_URL: process.env.TIENDANUBE_STORE_URL,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  throw new Error(
    `[tiendanube/env] Variables de entorno faltantes o invalidas: ${issues}. Verificar .env.local`,
  );
}

export const tnEnv = parsed.data;
export const TN_API_VERSION = "2025-03";
export const TN_BASE_URL = `https://api.tiendanube.com/${TN_API_VERSION}/${tnEnv.TIENDANUBE_STORE_ID}`;
