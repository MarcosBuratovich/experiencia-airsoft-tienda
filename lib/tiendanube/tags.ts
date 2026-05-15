// Convencion central de cacheTags. Cualquier cambio en estos nombres rompe
// la invalidacion desde el webhook (Fase 3). Mantener nombres deterministicos.

function stableHash(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`);
  return entries.length === 0 ? "default" : entries.join("|");
}

export const productsAllTag = () => "tn:products:all";
export const productHandleTag = (handle: string) =>
  `tn:product:handle:${handle}`;
export const productIdTag = (id: number) => `tn:product:id:${id}`;
export const productListTag = (params: Record<string, unknown>) =>
  `tn:products:list:${stableHash(params)}`;
export const featuredProductsTag = () => "tn:products:featured";
export const allProductHandlesTag = () => "tn:products:all-handles";

export const categoriesAllTag = () => "tn:categories:all";
export const categoryHandleTag = (handle: string) =>
  `tn:category:handle:${handle}`;
export const categoryIdTag = (id: number) => `tn:category:id:${id}`;
