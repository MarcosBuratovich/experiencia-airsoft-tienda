import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────
// i18n: TN devuelve objetos tipo { es: "..." } o, en algunos endpoints,
// el string plano. Soportamos union + null, normalizamos a string.
// ──────────────────────────────────────────────────────────────────────
export const I18nString = z
  .union([
    z
      .object({
        es: z.string().nullable().optional(),
        en: z.string().nullable().optional(),
        pt: z.string().nullable().optional(),
      })
      .passthrough(),
    z.string(),
    z.null(),
  ])
  .transform((v): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v;
    return v.es ?? v.en ?? v.pt ?? "";
  });

// ──────────────────────────────────────────────────────────────────────
// Precios: TN devuelve string decimal ("350000.00") o null.
// Convertimos a centavos enteros (350000 ARS -> 35000000 centavos).
// ──────────────────────────────────────────────────────────────────────
export const PriceCents = z
  .union([z.string(), z.number(), z.null()])
  .transform((v): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "string" ? Number(v) : v;
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100);
  });

// ──────────────────────────────────────────────────────────────────────
// Imagen
// ──────────────────────────────────────────────────────────────────────
export const ImageSchema = z.object({
  id: z.number(),
  product_id: z.number().optional(),
  src: z.string().url(),
  position: z.number().nullable().optional(),
  alt: z
    .array(z.string())
    .nullable()
    .optional()
    .transform((v): string[] => v ?? []),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
});
export type TiendanubeImage = z.infer<typeof ImageSchema>;

// ──────────────────────────────────────────────────────────────────────
// Variante. Stock null cuando stock_management=false (stock infinito).
// ──────────────────────────────────────────────────────────────────────
export const VariantValueSchema = z
  .union([
    z.object({ es: z.string().nullable().optional() }).passthrough(),
    z.string(),
    z.null(),
  ])
  .transform((v): string | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === "string") return v;
    return v.es ?? null;
  });

export const VariantSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  image_id: z.number().nullable().optional(),
  position: z.number().nullable().optional(),
  sku: z.string().nullable().optional(),
  price: PriceCents,
  compare_at_price: PriceCents,
  promotional_price: PriceCents,
  stock_management: z.boolean().optional().default(false),
  stock: z.number().nullable().optional(),
  weight: z.string().nullable().optional(),
  values: z
    .array(VariantValueSchema)
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  visible: z.boolean().optional().default(true),
  barcode: z.string().nullable().optional(),
});
export type Variant = z.infer<typeof VariantSchema>;

// ──────────────────────────────────────────────────────────────────────
// Categoria asociada al producto (forma reducida embebida)
// ──────────────────────────────────────────────────────────────────────
export const ProductCategorySchema = z
  .object({
    id: z.number(),
    name: I18nString,
    handle: I18nString,
    description: I18nString.optional(),
  })
  .passthrough();

// ──────────────────────────────────────────────────────────────────────
// Producto
// ──────────────────────────────────────────────────────────────────────
export const ProductSchema = z.object({
  id: z.number(),
  name: I18nString,
  description: I18nString,
  handle: I18nString,
  published: z.boolean(),
  free_shipping: z.boolean().optional().default(false),
  requires_shipping: z.boolean().optional().default(true),
  canonical_url: z.string().url().nullable().optional(),
  video_url: z.string().nullable().optional(),
  seo_title: I18nString.optional(),
  seo_description: I18nString.optional(),
  brand: z.string().nullable().optional(),
  has_stock: z.boolean().optional().default(true),
  is_kit: z.boolean().optional().default(false),
  tags: z
    .string()
    .nullable()
    .optional()
    .transform((v): string => v ?? ""),
  attributes: z
    .array(I18nString)
    .nullable()
    .optional()
    .transform((v): string[] => v ?? []),
  variants: z.array(VariantSchema).min(1),
  images: z
    .array(ImageSchema)
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  categories: z
    .array(ProductCategorySchema)
    .nullable()
    .optional()
    .transform((v) => v ?? []),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductsArraySchema = z.array(ProductSchema);

// ──────────────────────────────────────────────────────────────────────
// Categoria (endpoint /categories)
// ──────────────────────────────────────────────────────────────────────
export const CategorySchema = z.object({
  id: z.number(),
  name: I18nString,
  description: I18nString.optional(),
  handle: I18nString,
  parent: z.number().nullable().optional(),
  subcategories: z
    .array(z.number())
    .nullable()
    .optional()
    .transform((v): number[] => v ?? []),
  google_shopping_category: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Category = z.infer<typeof CategorySchema>;
export const CategoriesArraySchema = z.array(CategorySchema);
