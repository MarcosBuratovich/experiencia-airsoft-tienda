"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { TiendanubeImage } from "@/lib/tiendanube/types";

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

  if (sorted.length === 0) {
    return (
      <div className="relative aspect-square clip-notch border border-bone/10 bg-carbon diag-lines-faint">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="sect-label">Sin imagen</span>
        </div>
      </div>
    );
  }

  const main = sorted[active];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square clip-notch border border-bone/10 bg-carbon overflow-hidden">
        <Image
          src={main.src}
          alt={(main.alt ?? []).filter(Boolean).join(", ") || alt}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-contain p-6"
        />
      </div>
      {sorted.length > 1 ? (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {sorted.slice(0, 5).map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-current={i === active}
              className={`relative aspect-square clip-tag border bg-carbon overflow-hidden transition-colors ${
                i === active
                  ? "border-orange"
                  : "border-bone/10 hover:border-bone/30"
              }`}
            >
              <Image
                src={img.src}
                alt={`${alt} — vista ${i + 1}`}
                fill
                sizes="20vw"
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
