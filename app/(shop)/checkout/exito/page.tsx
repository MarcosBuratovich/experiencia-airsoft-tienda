import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { CartClearOnMount } from "./cart-clear-on-mount";
import { WHATSAPP_URL } from "@/app/_components/site-constants";

export const metadata: Metadata = {
  title: "Compra confirmada",
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessPage() {
  return (
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
      <CartClearOnMount />
      <div className="max-w-2xl mx-auto text-center diag-lines border border-orange/40 clip-notch p-10 md:p-14">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange/10 border border-orange/40 mb-6">
          <CheckCircle2 size={32} className="text-orange" aria-hidden />
        </div>
        <p className="sect-label">Operación completada</p>
        <h1 className="sect-title fluid-4xl mt-3">¡Gracias por tu compra!</h1>
        <p className="text-ash fluid-base mt-4">
          Recibimos tu pedido. Te vamos a contactar por WhatsApp o mail para
          coordinar entrega o retiro. Si pagaste con MercadoPago, el detalle te
          llega también a tu cuenta.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/productos"
            className="btn-wa clip-tag uppercase tracking-wider fluid-sm px-5 py-3 inline-flex items-center justify-center"
          >
            Seguir comprando
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener"
            className="btn-ghost clip-tag uppercase tracking-wider fluid-sm px-5 py-3 inline-flex items-center justify-center"
          >
            Escribir por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
