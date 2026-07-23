"use client";

import { useEffect } from "react";
import { track } from "@/lib/ga";

/**
 * view_item_list al montarse una grilla. Deps = [listId] a propósito: los
 * re-renders del mismo listado (filtros del CategoryExplorer) no re-cuentan;
 * navegar a otra lista (otro listId) sí dispara de nuevo.
 */
export function TrackItemList({
  listId,
  listName,
  items,
  dedupeKey,
}: {
  listId: string;
  listName: string;
  items: { id: number; name: string }[];
  /**
   * Identidad del disparo (default: listId). Listas cuyo contenido cambia
   * por navegación SPA sin remount (paginación, nueva búsqueda) pasan acá
   * una clave que incluya página/término para contar cada vista real.
   */
  dedupeKey?: string;
}) {
  const identidad = dedupeKey ?? listId;

  useEffect(() => {
    if (items.length === 0) return;
    track("view_item_list", {
      item_list_id: listId,
      item_list_name: listName,
      items: items.slice(0, 10).map((it, i) => ({
        item_id: String(it.id),
        item_name: it.name,
        index: i,
      })),
    });
    // Por identidad de lista, no por contenido (ver docstring de dedupeKey).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identidad]);

  return null;
}
