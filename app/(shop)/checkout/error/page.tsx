import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { WHATSAPP_URL } from "@/app/_components/site-constants";

export const metadata: Metadata = {
  title: "Hubo un problema con tu compra",
  robots: { index: false, follow: false },
};

export default function CheckoutErrorPage() {
  return (
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
      <div className="max-w-2xl mx-auto text-center diag-lines-faint border border-bone/15 clip-notch p-10 md:p-14">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange/10 border border-orange/40 mb-6">
          <AlertTriangle size={32} className="text-orange" aria-hidden />
        </div>
        <p className="sect-label">Operación interrumpida</p>
        <h1 className="sect-title fluid-4xl mt-3">
          No pudimos completar tu compra
        </h1>
        <p className="text-ash fluid-base mt-4">
          Puede que el pago no haya pasado o que el checkout se haya cerrado
          antes de tiempo. Tu carrito sigue intacto: probá de nuevo o
          escribinos para ayudarte a finalizar.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/carrito"
            className="btn-wa clip-tag uppercase tracking-wider fluid-sm px-5 py-3 inline-flex items-center justify-center"
          >
            Volver al carrito
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
