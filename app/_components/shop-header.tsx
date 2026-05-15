import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { SITE_URL, SHOP_NAV } from "./site-constants";
import { CartHeaderButton } from "./cart-header-button";

export function ShopHeader({ activeHref }: { activeHref?: string }) {
  return (
    <header className="sticky top-0 z-50 bg-ink/85 backdrop-blur border-b border-bone/10">
      <div className="max-w-[1400px] mx-auto fluid-gutter-x flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-4 shrink-0">
          <Link
            href="/"
            aria-label="Tienda Experiencia Airsoft — inicio"
            className="flex items-center gap-3"
          >
            <Image
              src="/img/logo.png"
              alt="Logo Experiencia Airsoft"
              width={840}
              height={240}
              priority
              className="h-8 w-auto"
            />
            <span className="hidden sm:inline-flex mil-tag bone">Tienda</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 font-mono fluid-xs tracking-[.22em] uppercase text-ash">
          {SHOP_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-bone ${
                activeHref === item.href ? "text-orange" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={SITE_URL}
            className="text-smoke hover:text-bone transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft size={12} aria-hidden /> Sitio principal
          </a>
        </nav>

        <CartHeaderButton />
      </div>

      <nav className="md:hidden border-t border-bone/10">
        <div className="max-w-[1400px] mx-auto fluid-gutter-x flex items-center gap-4 overflow-x-auto py-2 font-mono fluid-xs tracking-[.22em] uppercase text-ash whitespace-nowrap">
          {SHOP_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-bone shrink-0 ${
                activeHref === item.href ? "text-orange" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={SITE_URL}
            className="text-smoke hover:text-bone transition-colors shrink-0"
          >
            ← Sitio principal
          </a>
        </div>
      </nav>
    </header>
  );
}
