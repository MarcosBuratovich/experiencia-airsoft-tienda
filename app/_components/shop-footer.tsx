import Link from "next/link";
import Image from "next/image";
import {
  ADDRESS_CITY,
  ADDRESS_STREET,
  INSTAGRAM_URL,
  MAIN_NAV,
  SHOP_NAV,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
  YOUTUBE_URL,
} from "./site-constants";

export function ShopFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative bg-ink border-t border-bone/10">
      <div className="max-w-[1400px] mx-auto fluid-gutter-x py-12">
        <div className="grid md:grid-cols-4 gap-8 md:gap-10">
          <div className="md:col-span-2">
            <Image
              src="/img/logo.png"
              alt="Logo Experiencia Airsoft"
              width={840}
              height={240}
              loading="lazy"
              className="h-10 w-auto mb-4"
            />
            <p className="text-ash fluid-sm leading-relaxed max-w-[40ch]">
              Marcadoras, BBs, protección y accesorios para airsoft. Envíos a
              todo el país desde nuestro centro táctico en CABA.
            </p>
            <p className="mt-4 mil-tag bone">Stock vivo · Despacho directo</p>
          </div>

          <div>
            <p className="sect-label mb-3">Tienda</p>
            <ul className="space-y-2 font-mono fluid-xs tracking-[.22em] uppercase text-ash">
              {SHOP_NAV.map((it) => (
                <li key={it.href}>
                  <Link href={it.href} className="hover:text-bone transition">
                    {it.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/carrito" className="hover:text-bone transition">
                  Carrito
                </Link>
              </li>
            </ul>
            <p className="sect-label mt-6 mb-3">Experiencia</p>
            <ul className="space-y-2 font-mono fluid-xs tracking-[.22em] uppercase text-ash">
              {MAIN_NAV.map((it) => (
                <li key={it.href}>
                  <a
                    href={it.href}
                    className="hover:text-bone transition"
                    rel="noopener"
                  >
                    {it.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="sect-label mb-3">Contacto</p>
            <ul className="space-y-2 font-mono fluid-xs uppercase tracking-[.18em] text-ash">
              <li className="text-bone">{ADDRESS_STREET}</li>
              <li>{ADDRESS_CITY}</li>
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener"
                  className="text-bone hover:text-orange transition"
                >
                  WhatsApp {WHATSAPP_NUMBER}
                </a>
              </li>
              <li className="flex gap-4 pt-2">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener"
                  className="hover:text-orange transition"
                >
                  Instagram
                </a>
                <a
                  href={YOUTUBE_URL}
                  target="_blank"
                  rel="noopener"
                  className="hover:text-orange transition"
                >
                  YouTube
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-bone/10 flex flex-wrap items-center justify-between gap-3 font-mono fluid-xs uppercase tracking-[.25em] text-smoke">
          <span>© {year} · Experiencia Airsoft Tienda</span>
          <span>Equipamiento táctico para todos los niveles</span>
        </div>
      </div>
    </footer>
  );
}
