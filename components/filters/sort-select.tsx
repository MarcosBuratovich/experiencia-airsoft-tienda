"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { SORT_OPTIONS } from "@/lib/url";
import { track } from "@/lib/ga";

export function SortSelect({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 fluid-xs uppercase tracking-widest text-smoke">
      <span>Orden</span>
      <select
        defaultValue={defaultValue ?? "recientes"}
        disabled={isPending}
        onChange={(e) => {
          const params = new URLSearchParams(sp.toString());
          if (e.target.value && e.target.value !== "recientes") {
            params.set("orden", e.target.value);
          } else {
            params.delete("orden");
          }
          params.delete("page");
          const qs = params.toString();
          track("ordenar_catalogo", {
            orden: e.target.value,
            page_context: pathname,
          });
          startTransition(() => {
            router.push(qs ? `${pathname}?${qs}` : pathname);
          });
        }}
        className="bg-carbon border border-bone/15 text-bone fluid-xs px-3 py-2 uppercase tracking-wider clip-tag focus:border-orange outline-none"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
