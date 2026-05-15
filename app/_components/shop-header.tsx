import { getCategories } from "@/lib/tiendanube/categories";
import { HeaderClient } from "./header-client";

// Server component: fetcha categorias TN (cached) y delega el UI a un
// client component que maneja scroll/mobile drawer/search.
export async function ShopHeader() {
  const cats = await getCategories().catch(() => []);
  const top = cats
    .filter((c) => !c.parent)
    .slice(0, 7)
    .map((c) => ({ id: c.id, name: c.name, handle: c.handle }));
  return <HeaderClient categories={top} />;
}
