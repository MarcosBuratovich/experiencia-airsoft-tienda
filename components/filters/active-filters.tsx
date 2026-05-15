"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useTransition } from "react";

interface ActiveFilter {
  key: "categoria" | "precio_min" | "precio_max" | "orden" | "q";
  label: string;
}

export function ActiveFilters({ items }: { items: ActiveFilter[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  if (items.length === 0) return null;

  const remove = (key: string) => {
    const params = new URLSearchParams(sp.toString());
    params.delete(key);
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => remove(it.key)}
          className="inline-flex items-center gap-2 mil-tag bone hover:border-orange hover:text-orange transition-colors"
          aria-label={`Quitar filtro ${it.label}`}
        >
          {it.label}
          <X size={12} aria-hidden />
        </button>
      ))}
      <Link
        href={pathname}
        className="fluid-xs uppercase tracking-widest text-smoke hover:text-orange transition-colors"
      >
        Limpiar todo
      </Link>
    </div>
  );
}
