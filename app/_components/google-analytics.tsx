"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { GA_ID, track } from "@/lib/ga";

/**
 * Google Analytics 4 de la tienda — misma propiedad/stream que www y app.
 *
 * page_view es 100% MANUAL (send_page_view: false en el config): un solo
 * mecanismo para carga inicial + navegaciones SPA. Requiere tener APAGADO en
 * GA4 el toggle de Enhanced Measurement "Cambios de página según eventos del
 * historial" para no duplicar.
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.gtag?.("event", "page_view", {
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

/**
 * Listener delegado global de clicks:
 *  - a[href wa.me] → whatsapp_click (contacto general; el checkout tiene su
 *    propio whatsapp_checkout y NO pasa por acá — sale de window.open).
 *  - a[data-ga-select-item] → select_item (cards de producto server-rendered,
 *    sin convertirlas a client components).
 */
function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // auxclick: solo botón del medio (abre en pestaña nueva y navega igual).
      if (e.type === "auxclick" && e.button !== 1) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      const d = a.dataset;

      if (/(^https?:\/\/)(wa\.me|api\.whatsapp\.com)\//.test(a.href)) {
        // destino: lo dice el data-attribute y nada más. Antes había un
        // fallback que miraba el número del link, pero la línea de contacto y
        // la del checkout ahora son la misma: el número ya no distingue nada.
        // Los links de checkout y de pedidos del exterior llevan
        // data-ga-destino; el resto es contacto general.
        track("whatsapp_click", {
          page_context: window.location.pathname,
          // Sin query string: lleva el mensaje prefilled del pedido.
          link_url: `${a.origin}${a.pathname}`.slice(0, 200),
          destino: d.gaDestino ?? "general",
        });
        return;
      }

      if (d.gaSelectItem !== undefined) {
        track("select_item", {
          item_list_id: d.gaList || undefined,
          items: [
            {
              item_id: d.gaItemId,
              item_name: d.gaItemName,
            },
          ],
        });
      }
    };
    // capture + sendBeacon de gtag: el hit sobrevive a la navegación.
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);

  return null;
}

export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
(function(){
  var prod = /(^|\\.)experienciaairsoft\\.com$/.test(location.hostname);
  var cfg = { send_page_view: false };
  if (!prod) { cfg.debug_mode = true; cfg.traffic_type = 'internal'; }
  gtag('config', '${GA_ID}', cfg);
})();`}
      </Script>
      <ClickTracker />
      {/* useSearchParams necesita un límite de Suspense en el App Router. */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
