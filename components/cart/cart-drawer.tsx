"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, X, Minus, Plus, ChevronRight } from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { checkoutPorWhatsApp } from "@/lib/cart/checkout";
import { formatARS } from "@/lib/format";

export function CartDrawer() {
  const items = useCart((s) => s.items);
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);
  const pin = useCart((s) => s.pin);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotalCents = useCart((s) => s.subtotalCents);
  const count = useCart((s) => s.count);
  const clear = useCart((s) => s.clear);

  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentUrl, setSentUrl] = useState<string | null>(null);

  // Hidratacion: el store con persist puede diferir entre SSR (0 items)
  // y CSR (N items). No renderizamos contenido hasta que el cliente monto.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Esc cierra. Lock scroll del body mientras este abierto.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close]);

  if (!mounted) return null;

  const subtotal = subtotalCents();
  const total = count();

  const startCheckout = async () => {
    if (submitting || items.length === 0) return;
    setSubmitting(true);
    setErrorMsg(null);
    const res = await checkoutPorWhatsApp(items);
    if ("error" in res) {
      setErrorMsg(res.error);
      setSubmitting(false);
      return;
    }
    // Abre WhatsApp y pasa al estado de handoff, con link de fallback por si
    // el navegador bloqueó el popup.
    window.open(res.url, "_blank", "noopener");
    setSentUrl(res.url);
    setSubmitting(false);
  };

  return (
    <div
      aria-hidden={!isOpen}
      // Inline style: Tailwind v4 solo procesa clases literales en el código,
      // las interpoladas dinamicamente nunca se generan. Si esto fuera
      // `pointer-events-${isOpen ? "auto" : "none"}` el contenedor quedaria
      // siempre interceptando clicks aunque el drawer este cerrado.
      style={{
        pointerEvents: isOpen ? "auto" : "none",
        zIndex: 100,
      }}
      className="fixed inset-0"
    >
      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden
        className={`absolute inset-0 bg-ink/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrito"
        onMouseEnter={pin}
        onFocus={pin}
        className={`absolute right-0 top-0 h-full w-full sm:w-[420px] bg-carbon border-l border-bone/10 shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-bone/10">
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} className="text-orange" aria-hidden />
            <p className="sect-title fluid-xl">Tu carrito</p>
            {total > 0 ? (
              <span className="mil-tag bone">{total}</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar carrito"
            className="text-ash hover:text-orange transition-colors inline-flex items-center justify-center w-11 h-11 -mr-2"
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
            <div className="diag-lines-faint border border-bone/10 clip-notch p-8">
              <p className="sect-label">Sector despejado</p>
              <h3 className="sect-title fluid-2xl mt-3">
                Tu carrito está vacío
              </h3>
              <p className="text-ash fluid-sm mt-3">
                Agregá productos desde el catálogo.
              </p>
              <Link
                href="/productos"
                onClick={close}
                className="btn-ghost clip-tag fluid-sm uppercase tracking-wider px-5 py-3 inline-block mt-6"
              >
                Ver catálogo
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto divide-y divide-bone/10">
              {items.map((it) => {
                const max = it.snapshot.maxQty;
                const canIncrement = max === null || it.qty < max;
                return (
                  <li key={it.variantId} className="flex gap-3 p-4">
                    <div className="relative w-16 h-16 shrink-0 bg-ink border border-bone/10">
                      {it.snapshot.imageSrc ? (
                        <Image
                          src={it.snapshot.imageSrc}
                          alt={it.snapshot.productName}
                          fill
                          sizes="64px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <div className="absolute inset-0 diag-lines-faint" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/productos/${it.snapshot.handle}`}
                        onClick={close}
                        className="block fluid-sm uppercase tracking-wide text-bone hover:text-orange transition-colors line-clamp-2"
                      >
                        {it.snapshot.productName}
                      </Link>
                      {it.snapshot.variantLabel &&
                      it.snapshot.variantLabel !== "Estandar" ? (
                        <p className="fluid-xs text-smoke uppercase tracking-widest mt-1">
                          {it.snapshot.variantLabel}
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center border border-bone/15">
                          <button
                            type="button"
                            onClick={() => setQty(it.variantId, it.qty - 1)}
                            aria-label="Disminuir cantidad"
                            className="inline-flex items-center justify-center w-9 h-9 hover:bg-rail transition-colors"
                          >
                            <Minus size={14} aria-hidden />
                          </button>
                          <span className="min-w-[2rem] text-center fluid-xs font-mono tabular-nums">
                            {it.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(it.variantId, it.qty + 1)}
                            disabled={!canIncrement}
                            aria-label="Aumentar cantidad"
                            className="inline-flex items-center justify-center w-9 h-9 hover:bg-rail disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus size={14} aria-hidden />
                          </button>
                        </div>
                        <span className="fluid-sm text-bone font-semibold tabular-nums">
                          {formatARS(it.snapshot.priceCents * it.qty)}
                        </span>
                      </div>
                      {max !== null && it.qty >= max ? (
                        <p className="fluid-xs text-smoke mt-1">
                          Stock limite alcanzado
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(it.variantId)}
                      aria-label={`Quitar ${it.snapshot.productName}`}
                      className="text-smoke hover:text-orange transition-colors inline-flex items-center justify-center w-9 h-9 self-start -mr-2 -mt-2"
                    >
                      <X size={16} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>

            <footer className="border-t border-bone/10 p-5 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="sect-label">Subtotal</span>
                <span className="fluid-2xl text-bone font-semibold tabular-nums">
                  {formatARS(subtotal)}
                </span>
              </div>
              <p className="fluid-xs text-smoke">
                Coordinamos el pago y envío por WhatsApp.
              </p>
              {errorMsg ? (
                <p className="fluid-xs text-orange border border-orange/40 bg-orange/10 px-3 py-2">
                  {errorMsg}
                </p>
              ) : null}
              {sentUrl ? (
                <div className="border border-green-500/40 bg-green-500/5 clip-notch p-3 space-y-2">
                  <p className="fluid-sm text-bone">
                    Te abrimos WhatsApp con tu pedido.
                  </p>
                  <a
                    href={sentUrl}
                    data-ga-destino="checkout"
                    target="_blank"
                    rel="noopener"
                    className="w-full btn-wa clip-tag uppercase tracking-wider fluid-xs px-4 py-2.5 inline-flex items-center justify-center gap-2"
                  >
                    ¿No se abrió? Abrir WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      clear();
                      setSentUrl(null);
                    }}
                    className="w-full text-center fluid-xs uppercase tracking-widest text-ash hover:text-orange transition-colors"
                  >
                    Vaciar carrito
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startCheckout}
                    disabled={submitting}
                    className="w-full btn-wa clip-tag uppercase tracking-wider fluid-base px-5 py-4 inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
                  >
                    {submitting ? "Abriendo WhatsApp..." : "Finalizar por WhatsApp"}
                    {submitting ? null : <ChevronRight size={16} aria-hidden />}
                  </button>
                  <Link
                    href="/carrito"
                    onClick={close}
                    className="block text-center fluid-xs uppercase tracking-widest text-ash hover:text-orange transition-colors"
                  >
                    Ver carrito completo
                  </Link>
                </>
              )}
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
