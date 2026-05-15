import { cacheLife, cacheTag } from "next/cache";
import { tnFetch } from "./client";
import { TiendanubeNotFoundError } from "./errors";
import { CategoriesArraySchema, CategorySchema, type Category } from "./schemas";
import {
  categoriesAllTag,
  categoryHandleTag,
  categoryIdTag,
} from "./tags";

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(categoriesAllTag());

  // TN no soporta paginacion grande para /categories; pedimos hasta 200 que
  // alcanza para la mayoria de tiendas pequenas/medianas.
  const items = await tnFetch({
    path: "categories",
    query: { per_page: 200 },
    schema: CategoriesArraySchema,
  });
  return items;
}

export async function getCategoryById(id: number): Promise<Category | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(categoryIdTag(id));
  try {
    return await tnFetch({
      path: `categories/${id}`,
      schema: CategorySchema,
    });
  } catch (err) {
    if (err instanceof TiendanubeNotFoundError) return null;
    throw err;
  }
}

// /categories no acepta ?handle= como filtro, por eso buscamos en el listado completo.
export async function getCategoryByHandle(
  handle: string,
): Promise<Category | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(categoryHandleTag(handle));

  const all = await getCategories();
  return all.find((c) => c.handle === handle) ?? null;
}
