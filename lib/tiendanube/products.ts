import { cacheLife, cacheTag } from "next/cache";
import { tnFetch } from "./client";
import { TiendanubeNotFoundError } from "./errors";
import { sortProducts } from "./normalize";
import {
  ProductSchema,
  ProductsArraySchema,
  type Product,
} from "./schemas";
import {
  allProductHandlesTag,
  featuredProductsTag,
  productHandleTag,
  productIdTag,
  productListTag,
  productsAllTag,
} from "./tags";

// Valores validos confirmados con la API en vivo (2025-03).
// Defaults a "default" → no enviamos sort_by y TN devuelve orden cronologico.
export type ProductSortBy =
  | "default"
  | "price-ascending"
  | "price-descending"
  | "name-ascending"
  | "name-descending"
  | "user"
  | "best-selling";

export interface GetProductsParams {
  category?: number;
  handle?: string;
  q?: string;
  page?: number;
  per_page?: number;
  sort_by?: ProductSortBy;
  published?: boolean;
}

export async function getProducts(
  params: GetProductsParams = {},
): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(productsAllTag());
  cacheTag(productListTag(params as Record<string, unknown>));

  const sort_by = params.sort_by && params.sort_by !== "default" ? params.sort_by : undefined;

  const items = await tnFetch({
    path: "products",
    query: {
      // TN espera "category_id" (no "category"). Si pasas el param mal,
      // el endpoint lo ignora y devuelve el listado completo igual para
      // todas las categorías. Verificado contra la API en vivo.
      category_id: params.category,
      handle: params.handle,
      q: params.q,
      page: params.page ?? 1,
      per_page: params.per_page ?? 50,
      sort_by,
      published: params.published ?? true,
    },
    schema: ProductsArraySchema,
  });

  return items.filter((p) => p.published && p.variants.length > 0);
}

export async function getProductByHandle(
  handle: string,
): Promise<Product | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(productHandleTag(handle));
  cacheTag(productsAllTag());

  // Deriva del catálogo bulk cacheado en vez de 1 fetch por handle. En build,
  // generateStaticParams pre-renderiza ~120 productos: con 1 llamada por handle
  // se agotaba el rate limit de TN (2 req/s) y el build fallaba. El endpoint de
  // listado devuelve el producto completo (mismo shape que ?handle=).
  const all = await getAllPublishedProducts();
  return all.find((p) => p.handle === handle) ?? null;
}

export async function getProductById(id: number): Promise<Product | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(productIdTag(id));
  try {
    return await tnFetch({
      path: `products/${id}`,
      schema: ProductSchema,
    });
  } catch (err) {
    if (err instanceof TiendanubeNotFoundError) return null;
    throw err;
  }
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(featuredProductsTag());

  // En Fase 1 = ultimos N publicados con stock (orden default = creacion descendente).
  // Cuando exista una categoria "destacados" o tag dedicado, ajustar aca.
  const items = await tnFetch({
    path: "products",
    query: {
      page: 1,
      per_page: limit * 2, // pedimos extra por si filtramos sin stock
      published: true,
    },
    schema: ProductsArraySchema,
  });
  return items
    .filter((p) => p.has_stock !== false && p.variants.length > 0)
    .slice(0, limit);
}

// Catálogo bulk: TODOS los productos publicados con el objeto completo, en UNA
// sola pasada paginada y cacheada. Es la fuente única de getProductByHandle,
// getAllProductHandles, el sitemap y los "relacionados", para no pegarle a la
// API de TN una vez por producto (el rate limit 2 req/s se drena en build).
// Itera EN SERIE — no paralelizar.
export async function getAllPublishedProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(productsAllTag());
  cacheTag(allProductHandlesTag());

  const all: Product[] = [];
  const PER_PAGE = 200; // maximo permitido por TN
  for (let page = 1; page <= 100; page++) {
    const batch = await tnFetch({
      path: "products",
      query: { page, per_page: PER_PAGE, published: true },
      schema: ProductsArraySchema,
    });
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return all.filter((p) => p.published && p.variants.length > 0);
}

// Para sitemap / generateStaticParams. Devuelve handle + updatedAt: el sitemap
// usa updatedAt como <lastmod> REAL (no new Date()); generateStaticParams solo
// usa el handle. Deriva del catálogo bulk (cero llamadas extra a TN).
export interface ProductHandleMeta {
  handle: string;
  updatedAt: string;
}

export async function getAllProductHandles(): Promise<ProductHandleMeta[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(allProductHandlesTag());

  const all = await getAllPublishedProducts();
  return all
    .filter((p) => p.handle)
    .map((p) => ({ handle: p.handle, updatedAt: p.updated_at }));
}

/**
 * TODOS los productos de una categoría, derivados del catálogo bulk cacheado
 * (cero llamadas a TN por categoría). Antes cada categoría pegaba su propio
 * fetch por combinación (categoría, página, orden): con la cache fría y
 * requests concurrentes (Googlebot en ráfaga, la home que arma N heros) se
 * drenaba el rate limit de TN (2 req/s) y las páginas devolvían 500.
 * Orden = el del catálogo (cronológico desc, default de TN).
 */
export async function getProductsInCategory(
  categoryId: number,
): Promise<Product[]> {
  const all = await getAllPublishedProducts();
  return all.filter((p) => p.categories.some((c) => c.id === categoryId));
}

// Compat con la firma anterior: ordena y pagina LOCAL sobre el derivado bulk.
// sort_by 'user'/'best-selling' no existen local y caen al orden del catálogo.
export async function getProductsByCategory(
  categoryId: number,
  opts: Omit<GetProductsParams, "category"> = {},
): Promise<Product[]> {
  const items = sortProducts(
    await getProductsInCategory(categoryId),
    opts.sort_by ?? "default",
  );
  const perPage = opts.per_page ?? 50;
  const page = Math.max(1, opts.page ?? 1);
  return items.slice((page - 1) * perPage, page * perPage);
}
