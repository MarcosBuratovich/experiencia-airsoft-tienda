import type { Product } from "@/lib/tiendanube/types";
import { ProductCard } from "./product-card";
import { EmptyState } from "@/components/ui/empty-state";

export function ProductGrid({
  products,
  emptyTitle = "Sin productos en esta busqueda",
  emptyHint = "Probá ajustar los filtros o explorar otras categorías.",
  priorityFirst = 0,
}: {
  products: Product[];
  emptyTitle?: string;
  emptyHint?: string;
  priorityFirst?: number;
}) {
  if (products.length === 0) {
    return <EmptyState title={emptyTitle} hint={emptyHint} cta={{ href: "/productos", label: "Ver todo" }} />;
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityFirst} />
      ))}
    </div>
  );
}
