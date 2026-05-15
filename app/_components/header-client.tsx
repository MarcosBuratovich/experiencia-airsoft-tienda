"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Menu,
  Search,
  X,
  Crosshair,
  Send,
  CreditCard,
  Headphones,
} from "lucide-react";
import { SHOP_NAV, SITE_URL, WHATSAPP_URL } from "./site-constants";
import { CartHeaderButton } from "./cart-header-button";

interface CategoryLite {
  id: number;
  name: string;
  handle: string;
}

const TOP_BAR_ITEMS = [
  { icon: Send, label: "Envío a todo el país" },
  { icon: Crosshair, label: "Retiro en CABA · Conesa 1858" },
  { icon: CreditCard, label: "Pago seguro con MercadoPago" },
  { icon: Headphones, label: "Asesoramiento por WhatsApp" },
];

export function HeaderClient({
  categories,
}: {
  categories: CategoryLite[];
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Scroll detection con rAF para no thrashear el main thread.
  useEffect(() => {
    let raf: number | null = null;
    const onScroll = () => {
      if (raf !== null) return;
      raf = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 60);
        raf = null;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf !== null) window.cancelAnimationFrame(raf);
    };
  }, []);

  // Lock scroll cuando el drawer mobile esta abierto.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <>
      {/* ─────── Top bar: marquee de info que se oculta al scrollear ─────── */}
      <div
        aria-hidden={scrolled}
        className={`relative bg-ink border-b border-orange/20 overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          scrolled ? "max-h-0 opacity-0 border-b-0" : "max-h-12 opacity-100"
        }`}
      >
        <div
          aria-hidden
          className="absolute inset-0 diag-lines pointer-events-none"
        />
        {/*
          Marquee infinito: dos grupos identicos con min-width 100vw cada uno
          aseguran que el ancho total del track sea >= 2*viewport. La animacion
          va de 0 a -50% (un grupo entero), y al loopear muestra el segundo
          grupo en el mismo lugar — sin gaps porque son iguales.
          Si en una pantalla muy ancha el contenido natural quedara corto, el
          min-w-[100vw] lo extiende; los items se distribuyen via justify-around.
        */}
        <div className="relative flex marquee-track whitespace-nowrap font-mono fluid-xs uppercase tracking-[.25em] text-orange/90">
          {[0, 1].map((groupIdx) => (
            <ul
              key={groupIdx}
              aria-hidden={groupIdx === 1}
              className="flex items-center justify-around shrink-0 min-w-[100vw] py-2 list-none m-0 p-0"
            >
              {TOP_BAR_ITEMS.map((it, i) => {
                const Icon = it.icon;
                return (
                  <li
                    key={`${groupIdx}-${i}`}
                    className="px-8 flex items-center gap-2.5 shrink-0"
                  >
                    <Icon size={12} className="text-orange" aria-hidden />
                    <span>{it.label}</span>
                    <span className="text-orange/40">·</span>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      </div>

      {/* ─────── Header principal ─────── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ease-out ${
          scrolled
            ? "bg-ink/95 backdrop-blur-xl border-b border-orange/40 shadow-[0_18px_50px_-22px_rgba(255,107,26,0.55)]"
            : "bg-ink/85 backdrop-blur-md border-b border-bone/10"
        }`}
      >
        {/* Stripe naranja inferior animada — solo cuando scrolleado */}
        <div
          aria-hidden
          className={`absolute left-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-orange to-transparent transition-all duration-500 ${
            scrolled ? "w-full opacity-100" : "w-0 opacity-0"
          }`}
        />

        <div
          className={`max-w-[1400px] mx-auto fluid-gutter-x grid grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-8 transition-[padding] duration-300 ${
            scrolled ? "py-2.5" : "py-4 md:py-5"
          }`}
        >
          {/* Logo bloque */}
          <Link
            href="/"
            aria-label="Tienda Experiencia Airsoft — inicio"
            className="group relative flex items-center gap-3 shrink-0"
          >
            <span className="relative inline-flex">
              <Image
                src="/img/logo.png"
                alt="Experiencia Airsoft"
                width={840}
                height={240}
                priority
                className={`w-auto transition-[height,filter] duration-300 group-hover:drop-shadow-[0_0_18px_rgba(255,107,26,0.55)] ${
                  scrolled ? "h-7 md:h-8" : "h-9 md:h-12"
                }`}
              />
            </span>
            <span className="hidden md:inline-flex">
              <span className="mil-tag bone">Tienda Oficial</span>
            </span>
          </Link>

          {/* Search bar (desktop) */}
          <form
            action="/productos"
            role="search"
            className={`hidden md:flex items-center gap-2 border-b transition-colors ${
              scrolled
                ? "border-orange/40 focus-within:border-orange"
                : "border-bone/15 focus-within:border-orange"
            }`}
          >
            <Search size={16} className="text-smoke shrink-0" aria-hidden />
            <input
              type="search"
              name="q"
              autoComplete="off"
              placeholder="Buscar marcadoras, BBs, anteojos…"
              aria-label="Buscar productos"
              className="flex-1 bg-transparent text-bone fluid-sm py-3 outline-none placeholder:text-smoke uppercase tracking-wider min-w-0"
            />
            <button
              type="submit"
              className="fluid-xs uppercase tracking-widest text-ash hover:text-orange transition-colors px-2"
            >
              Buscar
            </button>
          </form>

          {/* Cluster derecho */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <a
              href={SITE_URL}
              rel="noopener"
              className="hidden lg:inline-flex items-center gap-1.5 fluid-xs uppercase tracking-widest text-smoke hover:text-bone transition-colors"
            >
              <ArrowLeft size={12} aria-hidden /> Sitio principal
            </a>
            <CartHeaderButton />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
              className="md:hidden relative inline-flex items-center justify-center w-10 h-10 border border-bone/20 text-bone hover:border-orange hover:text-orange transition-colors"
            >
              <Menu size={20} aria-hidden />
            </button>
          </div>
        </div>

        {/* Search bar (mobile) */}
        <form
          action="/productos"
          role="search"
          className="md:hidden max-w-[1400px] mx-auto fluid-gutter-x pb-3"
        >
          <label className="flex items-center gap-2 bg-carbon/60 border border-bone/15 focus-within:border-orange px-3 py-2 transition-colors">
            <Search size={14} className="text-smoke shrink-0" aria-hidden />
            <input
              type="search"
              name="q"
              placeholder="Buscar"
              aria-label="Buscar productos"
              className="flex-1 bg-transparent text-bone fluid-sm outline-none placeholder:text-smoke uppercase tracking-wider min-w-0"
            />
          </label>
        </form>

        {/* Category nav desktop: se oculta al scrollear */}
        <nav
          aria-label="Categorías"
          className={`hidden md:block border-t border-bone/10 transition-[max-height,opacity] duration-300 overflow-hidden ${
            scrolled
              ? "max-h-0 opacity-0 border-t-0"
              : "max-h-14 opacity-100"
          }`}
        >
          <div className="max-w-[1400px] mx-auto fluid-gutter-x flex items-center gap-1 overflow-x-auto py-1 fluid-xs uppercase tracking-[.22em] no-scrollbar">
            <CatLink href="/productos" label="Todos" />
            {categories.map((c) => (
              <CatLink
                key={c.id}
                href={`/categorias/${c.handle}`}
                label={c.name}
              />
            ))}
            <Link
              href="/categorias"
              className="group relative px-3 py-2 text-smoke transition-colors hover:text-orange inline-flex items-center gap-1 whitespace-nowrap"
            >
              Ver todas <ChevronDown size={12} aria-hidden />
            </Link>
            <span aria-hidden className="mx-2 text-rail">
              |
            </span>
            <Link
              href="/pedidos-exterior"
              className="group relative px-3 py-2 text-orange hover:text-orange/80 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <span
                className="size-1.5 bg-orange rounded-full pulse-dot"
                aria-hidden
              />
              Pedidos del exterior
            </Link>
          </div>
        </nav>

        {/* Category strip mobile */}
        <nav
          aria-label="Categorías"
          className="md:hidden border-t border-bone/10"
        >
          <div className="max-w-[1400px] mx-auto fluid-gutter-x flex items-center gap-4 overflow-x-auto py-2 fluid-xs uppercase tracking-[.22em] text-ash whitespace-nowrap no-scrollbar">
            <Link
              href="/productos"
              className="text-bone hover:text-orange transition-colors shrink-0"
            >
              Todos
            </Link>
            {categories.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                href={`/categorias/${c.handle}`}
                className="hover:text-orange transition-colors shrink-0"
              >
                {c.name}
              </Link>
            ))}
            <Link
              href="/categorias"
              className="text-smoke hover:text-orange transition-colors shrink-0"
            >
              Más →
            </Link>
            <Link
              href="/pedidos-exterior"
              className="text-orange hover:text-orange/80 transition-colors shrink-0 inline-flex items-center gap-1.5"
            >
              <span
                className="size-1.5 bg-orange rounded-full pulse-dot"
                aria-hidden
              />
              Pedidos exterior
            </Link>
          </div>
        </nav>
      </header>

      {/* ─────── Mobile menu drawer ─────── */}
      <div
        aria-hidden={!mobileOpen}
        style={{
          pointerEvents: mobileOpen ? "auto" : "none",
          zIndex: 90,
        }}
        className="fixed inset-0 md:hidden"
      >
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden
          className={`absolute inset-0 bg-ink/80 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menú principal"
          className={`absolute left-0 top-0 h-full w-[88%] max-w-sm bg-carbon border-r border-orange/20 transition-transform duration-300 ease-out flex flex-col shadow-[16px_0_50px_-12px_rgba(0,0,0,0.6)] ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <header className="flex items-center justify-between px-5 py-4 border-b border-bone/10">
            <div className="flex items-center gap-3">
              <Image
                src="/img/logo.png"
                alt="Experiencia Airsoft"
                width={840}
                height={240}
                className="h-7 w-auto"
              />
              <span className="mil-tag bone">Menú</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className="text-ash hover:text-orange transition-colors"
            >
              <X size={22} aria-hidden />
            </button>
          </header>

          <nav className="flex-1 overflow-y-auto">
            <div className="px-5 pt-5">
              <p className="sect-label mb-3">Tienda</p>
              <ul className="space-y-px">
                {SHOP_NAV.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between fluid-base uppercase tracking-wider text-bone hover:text-orange transition-colors py-3 border-b border-bone/5"
                    >
                      {it.label}
                      <span aria-hidden className="text-smoke">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {categories.length > 0 ? (
              <div className="px-5 pt-6">
                <p className="sect-label mb-3">Categorías</p>
                <ul className="space-y-px">
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/categorias/${c.handle}`}
                        onClick={() => setMobileOpen(false)}
                        className="block fluid-sm uppercase tracking-wide text-bone hover:text-orange transition-colors py-2.5 border-b border-bone/5"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href="/categorias"
                      onClick={() => setMobileOpen(false)}
                      className="block fluid-sm uppercase tracking-wide text-smoke hover:text-orange transition-colors py-2.5"
                    >
                      Ver todas →
                    </Link>
                  </li>
                </ul>
              </div>
            ) : null}

            <div className="px-5 pt-6 pb-5">
              <p className="sect-label mb-3">Contacto</p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener"
                onClick={() => setMobileOpen(false)}
                className="w-full btn-wa clip-tag uppercase tracking-wider fluid-sm px-5 py-3 inline-flex items-center justify-center gap-2"
              >
                <span className="size-1.5 bg-ink rounded-full" aria-hidden />
                Escribir por WhatsApp
              </a>
              <a
                href={SITE_URL}
                rel="noopener"
                className="mt-4 block text-center fluid-xs uppercase tracking-widest text-smoke hover:text-orange transition-colors"
              >
                ← Volver al sitio principal
              </a>
            </div>
          </nav>
        </aside>
      </div>
    </>
  );
}

function CatLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group relative px-3 py-2 text-bone transition-colors hover:text-orange whitespace-nowrap"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className="absolute left-3 right-3 bottom-0 h-[2px] bg-orange origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-200 ease-out"
      />
    </Link>
  );
}
