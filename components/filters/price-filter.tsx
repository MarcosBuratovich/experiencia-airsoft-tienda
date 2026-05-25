"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

export function PriceFilter({
  defaultMin,
  defaultMax,
}: {
  defaultMin?: number;
  defaultMax?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [min, setMin] = useState(defaultMin?.toString() ?? "");
  const [max, setMax] = useState(defaultMax?.toString() ?? "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(sp.toString());
    if (min) params.set("precio_min", min); else params.delete("precio_min");
    if (max) params.set("precio_max", max); else params.delete("precio_max");
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 fluid-xs uppercase tracking-widest text-smoke">
      <span className="basis-full sm:basis-auto">Precio ARS</span>
      <input
        type="number"
        inputMode="numeric"
        placeholder="Min"
        min="0"
        value={min}
        onChange={(e) => setMin(e.target.value)}
        className="w-20 sm:w-24 bg-carbon border border-bone/15 text-bone fluid-xs px-2 py-2 focus:border-orange outline-none"
        aria-label="Precio minimo"
      />
      <span aria-hidden>–</span>
      <input
        type="number"
        inputMode="numeric"
        placeholder="Max"
        min="0"
        value={max}
        onChange={(e) => setMax(e.target.value)}
        className="w-20 sm:w-24 bg-carbon border border-bone/15 text-bone fluid-xs px-2 py-2 focus:border-orange outline-none"
        aria-label="Precio maximo"
      />
      <button
        type="submit"
        disabled={isPending}
        className="btn-ghost clip-tag fluid-xs uppercase tracking-wider px-3 py-2"
      >
        Aplicar
      </button>
    </form>
  );
}
