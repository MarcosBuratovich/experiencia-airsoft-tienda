"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, X, Minus, Plus, ChevronRight } from "lucide-react";
import { useCart } from "@/lib/cart/store";
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

  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    try {
      const res = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((it) => ({
            variantId: it.variantId,
            qty: it.qty,
          })),
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setErrorMsg(
          data.error ??
            "No pudimos iniciar el checkout. Probá de nuevo o escribinos por WhatsApp.",
        );
        setSubmitting(false);
        return;
      }
      // Externa (subdominio TN). No usar router.push.
      window.location.href = data.url;
    } catch (err) {
      console.error("[cart] checkout failed", err);
      setErrorMsg("No hay conexion con el servidor. Probá en un rato.");
      setSubmitting(false);
    }
  };

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-[100] pointer-events-${isOpen ? "auto" : "none"}`}
    >
      {/* Backdrop */}
      <div
        onClick={close}
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
            className="text-ash hover:text-orange transition-colors"
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
                            className="p-1.5 hover:bg-rail transition-colors"
                          >
                            <Minus size={12} aria-hidden />
                          </button>
                          <span className="px-3 fluid-xs font-mono">
                            {it.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(it.variantId, it.qty + 1)}
                            disabled={!canIncrement}
                            aria-label="Aumentar cantidad"
                            className="p-1.5 hover:bg-rail disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus size={12} aria-hidden />
                          </button>
                        </div>
                        <span className="fluid-sm text-orange font-semibold">
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
                      className="text-smoke hover:text-orange transition-colors self-start"
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
                <span className="fluid-2xl text-orange font-semibold">
                  {formatARS(subtotal)}
                </span>
              </div>
              <p className="fluid-xs text-smoke">
                Envío y descuentos se calculan en el checkout.
              </p>
              {errorMsg ? (
                <p className="fluid-xs text-orange border border-orange/40 bg-orange/10 px-3 py-2">
                  {errorMsg}
                </p>
              ) : null}
              <button
                type="button"
                onClick={startCheckout}
                disabled={submitting}
                className="w-full btn-wa clip-tag uppercase tracking-wider fluid-base px-5 py-4 inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
              >
                {submitting ? "Redirigiendo..." : "Iniciar compra"}
                {submitting ? null : (
                  <ChevronRight size={16} aria-hidden />
                )}
              </button>
              <Link
                href="/carrito"
                onClick={close}
                className="block text-center fluid-xs uppercase tracking-widest text-ash hover:text-orange transition-colors"
              >
                Ver carrito completo
              </Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
