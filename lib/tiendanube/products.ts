import { cacheLife, cacheTag } from "next/cache";
import { tnFetch } from "./client";
import { TiendanubeNotFoundError } from "./errors";
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
      category: params.category,
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

  try {
    const items = await tnFetch({
      path: "products",
      query: { handle, per_page: 1 },
      schema: ProductsArraySchema,
    });
    return items[0] ?? null;
  } catch (err) {
    if (err instanceof TiendanubeNotFoundError) return null;
    throw err;
  }
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

// Para sitemap / generateStaticParams. Itera paginado EN SERIE — no paralelizar.
// El rate limit en plan gratis se drena rapido si pegamos en paralelo.
export async function getAllProductHandles(): Promise<string[]> {
  "use cache";
  cacheLife("days");
  cacheTag(allProductHandlesTag());

  const handles: string[] = [];
  const PER_PAGE = 200; // maximo permitido por TN
  for (let page = 1; page <= 100; page++) {
    const batch = await tnFetch({
      path: "products",
      query: { page, per_page: PER_PAGE, published: true },
      schema: ProductsArraySchema,
    });
    if (batch.length === 0) break;
    for (const p of batch) {
      if (p.handle) handles.push(p.handle);
    }
    if (batch.length < PER_PAGE) break;
  }
  return handles;
}

export async function getProductsByCategory(
  categoryId: number,
  opts: Omit<GetProductsParams, "category"> = {},
): Promise<Product[]> {
  return getProducts({ ...opts, category: categoryId });
}
