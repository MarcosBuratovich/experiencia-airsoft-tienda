"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/cart/store";
import { checkoutPorWhatsApp } from "@/lib/cart/checkout";
import { gaCartPayload, track } from "@/lib/ga";
import { formatARS } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotalCents = useCart((s) => s.subtotalCents);
  const count = useCart((s) => s.count);
  const clear = useCart((s) => s.clear);

  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentUrl, setSentUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    document.title = "Carrito · Tienda Experiencia Airsoft";
  }, []);

  // view_cart de la página: recién con el store hidratado (persist) los
  // items son reales. El view_cart del drawer se dispara en store.open().
  useEffect(() => {
    if (!mounted) return;
    const its = useCart.getState().items;
    if (its.length > 0) track("view_cart", gaCartPayload(its));
  }, [mounted]);

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
    // Abrimos WhatsApp y pasamos al estado de handoff. Guardamos la URL por si
    // el navegador bloqueó el popup (Safari / in-app), para ofrecer un link.
    window.open(res.url, "_blank", "noopener");
    setSentUrl(res.url);
    setSubmitting(false);
  };

  return (
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
      <Breadcrumbs
        items={[
          { href: "/", label: "Tienda" },
          { label: "Carrito" },
        ]}
      />

      <div className="mt-6 mb-10 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="sect-label">Tu pedido</p>
          <h1 className="sect-title fluid-5xl mt-2">Carrito</h1>
        </div>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 fluid-xs uppercase tracking-widest text-ash hover:text-orange transition-colors"
        >
          <ArrowLeft size={14} aria-hidden /> Seguir comprando
        </Link>
      </div>

      {!mounted ? (
        <div className="diag-lines-faint border border-bone/10 clip-notch p-10 text-center">
          <p className="sect-label">Cargando carrito...</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          eyebrow="SECTOR DESPEJADO"
          title="Tu carrito está vacío"
          hint="Sumá productos del catálogo y volvé acá para iniciar la compra."
          cta={{ href: "/productos", label: "Ver catálogo" }}
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-12">
          <ul className="lg:col-span-8 divide-y divide-bone/10 border border-bone/10 clip-notch bg-carbon">
            {items.map((it) => {
              const max = it.snapshot.maxQty;
              const canIncrement = max === null || it.qty < max;
              return (
                <li
                  key={it.variantId}
                  className="flex flex-row gap-3 sm:gap-4 p-4 sm:p-5"
                >
                  <Link
                    href={`/productos/${it.snapshot.handle}`}
                    className="relative w-20 h-20 sm:w-28 sm:h-28 shrink-0 bg-ink border border-bone/10 block"
                  >
                    {it.snapshot.imageSrc ? (
                      <Image
                        src={it.snapshot.imageSrc}
                        alt={it.snapshot.productName}
                        fill
                        sizes="112px"
                        className="object-contain p-2"
                      />
                    ) : (
                      <div className="absolute inset-0 diag-lines-faint" />
                    )}
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/productos/${it.snapshot.handle}`}
                          className="block fluid-lg uppercase tracking-wide text-bone hover:text-orange transition-colors"
                        >
                          {it.snapshot.productName}
                        </Link>
                        {it.snapshot.variantLabel &&
                        it.snapshot.variantLabel !== "Estandar" ? (
                          <p className="fluid-xs text-smoke uppercase tracking-widest mt-1">
                            {it.snapshot.variantLabel}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(it.variantId)}
                        aria-label={`Quitar ${it.snapshot.productName}`}
                        className="text-smoke hover:text-orange transition-colors shrink-0"
                      >
                        <X size={18} aria-hidden />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-auto">
                      <div className="flex items-center border border-bone/15">
                        <button
                          type="button"
                          onClick={() => setQty(it.variantId, it.qty - 1)}
                          aria-label="Disminuir cantidad"
                          className="p-2 hover:bg-rail transition-colors"
                        >
                          <Minus size={14} aria-hidden />
                        </button>
                        <span className="px-4 fluid-sm font-mono">
                          {it.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(it.variantId, it.qty + 1)}
                          disabled={!canIncrement}
                          aria-label="Aumentar cantidad"
                          className="p-2 hover:bg-rail disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus size={14} aria-hidden />
                        </button>
                      </div>
                      <span className="fluid-xl text-orange font-semibold">
                        {formatARS(it.snapshot.priceCents * it.qty)}
                      </span>
                    </div>
                    {max !== null && it.qty >= max ? (
                      <p className="fluid-xs text-smoke">
                        Stock limite alcanzado para esta variante
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="lg:col-span-4 self-start border border-bone/10 clip-notch bg-carbon p-6 space-y-4 sticky top-24">
            <p className="sect-label">Resumen</p>
            <div className="space-y-2 fluid-sm">
              <div className="flex justify-between">
                <span className="text-ash">
                  {count()} {count() === 1 ? "producto" : "productos"}
                </span>
                <span className="text-bone">{formatARS(subtotalCents())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ash">Envío</span>
                <span className="text-smoke">A calcular</span>
              </div>
            </div>
            <div className="pt-3 border-t border-bone/10 flex items-baseline justify-between">
              <span className="sect-label">Subtotal</span>
              <span className="fluid-2xl text-bone font-semibold tabular-nums">
                {formatARS(subtotalCents())}
              </span>
            </div>
            <p className="fluid-xs text-smoke">
              Coordinamos el pago (transferencia / MercadoPago) y el envío por
              WhatsApp. Te abrimos el chat con el pedido ya cargado.
            </p>
            {errorMsg ? (
              <p className="fluid-xs text-orange border border-orange/40 bg-orange/10 px-3 py-2">
                {errorMsg}
              </p>
            ) : null}
            {sentUrl ? (
              <div className="border border-green-500/40 bg-green-500/5 clip-notch p-4 space-y-3">
                <p className="fluid-sm text-bone">
                  Te abrimos WhatsApp con tu pedido cargado. Coordinamos pago y
                  envío por ahí.
                </p>
                <a
                  href={sentUrl}
                    data-ga-destino="checkout"
                  target="_blank"
                  rel="noopener"
                  className="w-full btn-wa clip-tag uppercase tracking-wider fluid-sm px-5 py-3 inline-flex items-center justify-center gap-2"
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
                  {submitting ? null : <ShoppingBag size={16} aria-hidden />}
                </button>
                <Link
                  href="/productos"
                  className="block text-center fluid-xs uppercase tracking-widest text-ash hover:text-orange transition-colors"
                >
                  Seguir comprando
                </Link>
              </>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
