"use client";

import { useEffect } from "react";
import { track } from "@/lib/ga";

/**
 * Dispara un evento GA4 al montar (y de nuevo si cambian evento/params — en
 * navegaciones SPA entre dos páginas que renderizan este componente en la
 * misma posición, React NO remonta y sin deps el segundo evento se perdería).
 * Para páginas server-rendered: view_item de producto, search, etc.
 */
export function TrackEvent({
  event,
  params,
  dedupeKey,
}: {
  event: string;
  params?: Record<string, unknown>;
  /**
   * Identidad del disparo. Por default se usa el serializado de params, pero
   * cuando un param varía sin que cambie el hecho medido (ej: result_count
   * de una búsqueda al paginar) conviene fijarla (ej: el término buscado).
   */
  dedupeKey?: string;
}) {
  const identidad = dedupeKey ?? JSON.stringify(params ?? null);

  useEffect(() => {
    track(event, params);
    // params se re-crea por render: comparar por identidad, no referencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, identidad]);

  return null;
}
