import type { Product } from "@/lib/tiendanube/types";
import { ProductCard } from "./product-card";
import { TrackItemList } from "./track-item-list";
import { EmptyState } from "@/components/ui/empty-state";

export function ProductGrid({
  products,
  emptyTitle = "Sin productos en esta busqueda",
  emptyHint = "Probá ajustar los filtros o explorar otras categorías.",
  priorityFirst = 0,
  listId,
  listName,
  listKey,
}: {
  products: Product[];
  emptyTitle?: string;
  emptyHint?: string;
  priorityFirst?: number;
  /** Con listId/listName la grilla emite view_item_list y sus cards select_item. */
  listId?: string;
  listName?: string;
  /** Identidad del view_item_list (ver TrackItemList.dedupeKey). */
  listKey?: string;
}) {
  if (products.length === 0) {
    return <EmptyState title={emptyTitle} hint={emptyHint} cta={{ href: "/productos", label: "Ver todo" }} />;
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {listId && listName ? (
        <TrackItemList
          listId={listId}
          listName={listName}
          dedupeKey={listKey}
          items={products.map((p) => ({ id: p.id, name: p.name }))}
        />
      ) : null}
      {products.map((p, i) => (
        <ProductCard
          key={p.id}
          product={p}
          priority={i < priorityFirst}
          listId={listId}
        />
      ))}
    </div>
  );
}
