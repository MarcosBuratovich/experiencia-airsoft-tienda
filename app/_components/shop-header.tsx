import { getCategories } from "@/lib/tiendanube/categories";
import { sortByCuratedOrder } from "@/lib/category-order";
import { HeaderClient } from "./header-client";

// Cantidad de categorías que aparecen como link directo en la barra desktop
// (al lado del dropdown). Las primeras N del orden curado se promueven.
const PROMOTED_COUNT = 3;

// Server component: fetcha categorias TN (cached) y delega el UI a un
// client component que maneja scroll/mobile drawer/search.
export async function ShopHeader() {
  const cats = await getCategories().catch(() => []);
  const roots = sortByCuratedOrder(cats.filter((c) => !c.parent)).map((c) => ({
    id: c.id,
    name: c.name,
    handle: c.handle,
  }));
  const promoted = roots.slice(0, PROMOTED_COUNT);
  return <HeaderClient categories={roots} promoted={promoted} />;
}
