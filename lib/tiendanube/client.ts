import type { ZodType, ZodTypeDef } from "zod";
import { tnEnv, TN_BASE_URL } from "./env";

// ZodType<Output, Def, Input>: el default Input = Output rompe la inferencia
// cuando hay transforms (I18nString convierte { es: string } a string).
// Aliasamos para permitir que el input difiera del output.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyInputZodType<T> = ZodType<T, ZodTypeDef, any>;
import {
  TiendanubeApiError,
  TiendanubeNetworkError,
  TiendanubeNotFoundError,
  TiendanubeRateLimitError,
} from "./errors";

// ──────────────────────────────────────────────────────────────────────
// Fetch wrapper para la API REST de Tiendanube.
//
// Particularidades de la API:
//  - El header se llama "Authentication" (no "Authorization") y el scheme es
//    "bearer" en minuscula. Si lo cambias a "Authorization: Bearer" te
//    devuelve 401 silencioso. Verificado contra docs y el endpoint en vivo.
//  - User-Agent obligatorio (sin él, algunos endpoints devuelven 403/400).
//  - Rate limit: Leaky Bucket 2 req/s sostenidos, bursts de 40. En 429
//    respeta `Retry-After` si viene; si no, usa backoff exponencial.
//
// El caching no vive aca — vive afuera con la 'use cache' directive.
// Por eso pasamos `cache: "no-store"` para evitar que Next intente cachear
// el fetch crudo y se confunda con la capa de `use cache`.
// ──────────────────────────────────────────────────────────────────────

type QueryValue = string | number | boolean | undefined | null;
export type TNQuery = Record<string, QueryValue>;

const RATE_LIMIT_DELAYS_MS = [500, 1500, 4000, 10_000];
const FIVE_XX_DELAYS_MS = [300, 1000, 3000];
const NETWORK_DELAYS_MS = [1000, 3000];
const DEFAULT_TIMEOUT_MS = 12_000;

export interface TNRequestOptions<T> {
  path: string;
  query?: TNQuery;
  schema?: AnyInputZodType<T>;
  signal?: AbortSignal;
  timeoutMs?: number;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

function jitter(ms: number): number {
  return ms + (Math.random() - 0.5) * ms * 0.4;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(path: string, query?: TNQuery): string {
  const url = new URL(`${TN_BASE_URL}/${path.replace(/^\//, "")}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function extractRetryAfterMs(res: Response): number | null {
  const header = res.headers.get("Retry-After");
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(seconds * 1000, 60_000);
}

export async function tnFetch<T>({
  path,
  query,
  schema,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  method = "GET",
  body,
}: TNRequestOptions<T>): Promise<T> {
  const url = buildUrl(path, query);

  let rateLimitAttempt = 0;
  let fiveXXAttempt = 0;
  let networkAttempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const composedSignal =
      signal && typeof AbortSignal.any === "function"
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          // NO cambiar a "Authorization: Bearer". TN espera literalmente
          // "Authentication: bearer <token>" (lowercase "bearer").
          Authentication: `bearer ${tnEnv.TIENDANUBE_ACCESS_TOKEN}`,
          "User-Agent": tnEnv.TIENDANUBE_USER_AGENT,
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: composedSignal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      if (res.status === 429) {
        if (rateLimitAttempt >= RATE_LIMIT_DELAYS_MS.length) {
          throw new TiendanubeRateLimitError(path);
        }
        const fallback = RATE_LIMIT_DELAYS_MS[rateLimitAttempt];
        const wait = extractRetryAfterMs(res) ?? jitter(fallback);
        rateLimitAttempt++;
        await sleep(wait);
        continue;
      }

      if (res.status === 404) {
        throw new TiendanubeNotFoundError(path);
      }

      if (res.status >= 500) {
        if (fiveXXAttempt >= FIVE_XX_DELAYS_MS.length) {
          const errBody = await safeJson(res);
          throw new TiendanubeApiError(
            res.status,
            "server_error",
            typeof errBody === "object" && errBody && "description" in errBody
              ? String((errBody as Record<string, unknown>).description)
              : `5xx en ${path}`,
            path,
          );
        }
        await sleep(jitter(FIVE_XX_DELAYS_MS[fiveXXAttempt]));
        fiveXXAttempt++;
        continue;
      }

      if (!res.ok) {
        const errBody = (await safeJson(res)) as Record<string, unknown> | null;
        throw new TiendanubeApiError(
          res.status,
          errBody && typeof errBody.code === "string" ? errBody.code : undefined,
          errBody && typeof errBody.description === "string"
            ? errBody.description
            : `HTTP ${res.status} en ${path}`,
          path,
        );
      }

      const json = (await res.json()) as unknown;
      if (schema) {
        const parsed = schema.safeParse(json);
        if (!parsed.success) {
          console.error("[tiendanube/client] schema mismatch", {
            path,
            issues: parsed.error.issues.slice(0, 5),
          });
          throw new TiendanubeApiError(
            200,
            "schema_mismatch",
            "respuesta de TN no matchea con el schema esperado",
            path,
          );
        }
        return parsed.data;
      }
      return json as T;
    } catch (err) {
      clearTimeout(timeoutId);

      // Errores conocidos: propagar
      if (
        err instanceof TiendanubeApiError ||
        err instanceof TiendanubeNetworkError
      ) {
        throw err;
      }

      // AbortError, timeouts, errores de red: retry
      if (networkAttempt < NETWORK_DELAYS_MS.length) {
        await sleep(jitter(NETWORK_DELAYS_MS[networkAttempt]));
        networkAttempt++;
        continue;
      }
      throw new TiendanubeNetworkError(err, path);
    }
  }
}
