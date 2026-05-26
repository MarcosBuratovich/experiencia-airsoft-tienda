"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TiendanubeImage } from "@/lib/tiendanube/types";

/**
 * Galería de producto con scroll-snap carousel.
 *
 * UX:
 * - Mobile: swipe nativo entre imágenes, dots indicadores debajo.
 * - Desktop: mismo swipe (trackpad / drag) + flechas prev/next overlay, +
 *   click en thumbnails para saltar, + flechas del teclado mientras la
 *   galería tiene focus.
 *
 * Tracking del slide activo: IntersectionObserver sobre cada slide. Cuando
 * un slide pasa el 60% visible, marca activo → highlight de thumb + actualiza
 * el contador "N de M". Robusto a swipe parcial y cambios de viewport.
 */
export function ProductGallery({
  images,
  alt,
}: {
  images: TiendanubeImage[];
  alt: string;
}) {
  const sorted = useMemo(
    () => [...images].sort((a, b) => (a.position ?? 999) - (b.position ?? 999)),
    [images],
  );
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const goTo = useCallback((idx: number) => {
    const target = slideRefs.current[idx];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, []);

  const prev = useCallback(() => {
    setActive((cur) => {
      const next = Math.max(0, cur - 1);
      requestAnimationFrame(() => goTo(next));
      return next;
    });
  }, [goTo]);

  const next = useCallback(() => {
    setActive((cur) => {
      const nx = Math.min(sorted.length - 1, cur + 1);
      requestAnimationFrame(() => goTo(nx));
      return nx;
    });
  }, [sorted.length, goTo]);

  // IntersectionObserver para detectar el slide actualmente visible.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || sorted.length <= 1) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Tomamos el slide con mayor ratio visible.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const idx = Number((visible.target as HTMLElement).dataset.idx);
          if (!Number.isNaN(idx)) setActive(idx);
        }
      },
      { root: scroller, threshold: [0.5, 0.6, 0.7, 0.8] },
    );
    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [sorted.length]);

  // Keyboard arrows cuando el componente tiene focus.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    },
    [prev, next],
  );

  if (sorted.length === 0) {
    return (
      <div className="relative aspect-square clip-notch border border-bone/10 bg-carbon diag-lines-faint">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="sect-label">Sin imagen</span>
        </div>
      </div>
    );
  }

  const hasMultiple = sorted.length > 1;

  return (
    <div
      className="space-y-3"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`Galería de imágenes — ${sorted.length} ${sorted.length === 1 ? "imagen" : "imágenes"}`}
    >
      {/* Viewport del carousel */}
      <div className="relative group">
        <div
          ref={scrollerRef}
          className="flex aspect-square overflow-x-auto snap-x snap-mandatory scroll-smooth clip-notch border border-bone/10 bg-carbon no-scrollbar"
          role="region"
          aria-roledescription="carousel"
        >
          {sorted.map((img, i) => (
            <div
              key={img.id}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              data-idx={i}
              className="relative aspect-square w-full shrink-0 snap-center"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${sorted.length}`}
            >
              <Image
                src={img.src}
                alt={(img.alt ?? []).filter(Boolean).join(", ") || `${alt} — vista ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-contain p-6 pointer-events-none select-none"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Arrows desktop (hidden en mobile — el swipe es mejor UX) */}
        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={prev}
              disabled={active === 0}
              aria-label="Imagen anterior"
              className="hidden md:inline-flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center bg-ink/80 backdrop-blur-sm border border-bone/15 text-bone hover:border-orange hover:text-orange disabled:opacity-30 disabled:cursor-not-allowed transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={active === sorted.length - 1}
              aria-label="Imagen siguiente"
              className="hidden md:inline-flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center bg-ink/80 backdrop-blur-sm border border-bone/15 text-bone hover:border-orange hover:text-orange disabled:opacity-30 disabled:cursor-not-allowed transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRight size={20} aria-hidden />
            </button>
          </>
        ) : null}

        {/* Contador overlay */}
        {hasMultiple ? (
          <div className="absolute top-3 right-3 font-mono fluid-xs uppercase tracking-[.22em] bg-ink/80 backdrop-blur-sm border border-bone/15 px-2.5 py-1 text-bone/90 tabular-nums">
            {active + 1} / {sorted.length}
          </div>
        ) : null}

        {/* Dots mobile */}
        {hasMultiple ? (
          <div className="md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-ink/70 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
            {sorted.map((img, i) => (
              <button
                key={`dot-${img.id}`}
                type="button"
                onClick={() => {
                  setActive(i);
                  goTo(i);
                }}
                aria-label={`Ir a imagen ${i + 1}`}
                aria-current={i === active}
                className={`size-1.5 rounded-full transition-all ${
                  i === active ? "bg-orange w-4" : "bg-bone/40 hover:bg-bone/70"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Thumbnails (desktop principalmente, también legibles en mobile) */}
      {hasMultiple ? (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {sorted.slice(0, 5).map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => {
                setActive(i);
                goTo(i);
              }}
              aria-current={i === active}
              aria-label={`Ver imagen ${i + 1}`}
              className={`relative aspect-square clip-tag border bg-carbon overflow-hidden transition-colors ${
                i === active
                  ? "border-orange"
                  : "border-bone/10 hover:border-bone/30"
              }`}
            >
              <Image
                src={img.src}
                alt=""
                fill
                sizes="(min-width: 640px) 20vw, 25vw"
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
