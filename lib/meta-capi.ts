// ──────────────────────────────────────────────────────────────────────
// API de Conversiones de Meta (server-side).
//
// ⚠️ SOLO SERVIDOR: lee META_CAPI_TOKEN, que es un secreto. No importar
// este módulo desde un componente cliente.
//
// El Pixel del navegador pierde eventos por bloqueadores de publicidad y
// por las restricciones de iOS (fácil un 20-30%). Esta vía manda el mismo
// evento desde el servidor, donde nada lo puede bloquear.
//
// DEDUPLICACIÓN: el cliente y el servidor mandan el MISMO `event_id`; Meta
// los une y cuenta uno solo. Sin eso, cada conversión contaría doble.
//
// Configuración (Vercel → Settings → Environment Variables):
//   META_CAPI_TOKEN — token de acceso que se genera en el Administrador de
//     eventos → tu pixel → Configuración → API de conversiones → "Generar
//     token de acceso". Es un SECRETO: nunca en el código ni en el cliente.
//   META_CAPI_TEST_CODE — opcional, solo para probar. Mientras esté seteado
//     los eventos aparecen en "Eventos de prueba" y NO impactan los
//     reportes reales. Sacarlo cuando termines de probar.
//
// Sin token, todo esto es un no-op silencioso: la tienda funciona igual.
// ──────────────────────────────────────────────────────────────────────

const PIXEL_ID = "918570951259432";
const API_VERSION = "v21.0";

export type MetaUserData = {
  /** Cookie _fbp del navegador. */
  fbp?: string | null;
  /** Cookie _fbc (viene del clic en el anuncio). */
  fbc?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

export type MetaEvento = {
  /** Nombre estándar de Meta: Lead, Purchase, InitiateCheckout... */
  eventName: string;
  /** Mismo id que mandó el navegador, para deduplicar. */
  eventId: string;
  /** URL donde ocurrió. */
  eventSourceUrl?: string | null;
  userData: MetaUserData;
  customData?: Record<string, unknown>;
};

/**
 * Manda un evento a Meta. Nunca lanza: un problema de analytics no puede
 * romper un checkout. Devuelve true solo si Meta lo aceptó.
 */
export async function enviarEventoMeta(evento: MetaEvento): Promise<boolean> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return false; // sin configurar todavía

  const user_data: Record<string, unknown> = {};
  if (evento.userData.fbp) user_data.fbp = evento.userData.fbp;
  if (evento.userData.fbc) user_data.fbc = evento.userData.fbc;
  if (evento.userData.ip) user_data.client_ip_address = evento.userData.ip;
  if (evento.userData.userAgent) {
    user_data.client_user_agent = evento.userData.userAgent;
  }
  // Meta rechaza eventos sin ninguna señal de usuario.
  if (Object.keys(user_data).length === 0) return false;

  const body: Record<string, unknown> = {
    data: [
      {
        event_name: evento.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: evento.eventId,
        action_source: "website",
        ...(evento.eventSourceUrl
          ? { event_source_url: evento.eventSourceUrl }
          : {}),
        user_data,
        ...(evento.customData ? { custom_data: evento.customData } : {}),
      },
    ],
  };
  const testCode = process.env.META_CAPI_TEST_CODE;
  if (testCode) body.test_event_code = testCode;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // No queremos que un timeout de Meta demore la respuesta al cliente.
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!res.ok) {
      // El cuerpo del error de Meta es útil para diagnosticar (token
      // vencido, permisos). No incluye datos del comprador.
      console.error(
        "[meta-capi] rechazado",
        res.status,
        (await res.text()).slice(0, 300),
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[meta-capi] falló el envío", err);
    return false;
  }
}

/**
 * Señales del usuario a partir del request. Las cookies _fbp/_fbc son las
 * que permiten a Meta unir este evento con la sesión del navegador y, si
 * vino de un anuncio, atribuirlo a la campaña.
 */
export function userDataDesdeRequest(request: Request): MetaUserData {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const leer = (nombre: string): string | null => {
    const m = new RegExp(`(?:^|;\\s*)${nombre}=([^;]*)`).exec(cookieHeader);
    return m ? decodeURIComponent(m[1]) : null;
  };
  // x-forwarded-for puede traer varias IPs: la primera es el cliente real.
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  return {
    fbp: leer("_fbp"),
    fbc: leer("_fbc"),
    ip: fwd.split(",")[0]?.trim() || null,
    userAgent: request.headers.get("user-agent"),
  };
}
