import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductByHandle } from "@/lib/tiendanube/products";
import {
  productPrimaryImage,
  stripHtml,
} from "@/lib/tiendanube/normalize";
import { ProductGallery } from "@/components/product/product-gallery";
import { VariantSelector } from "@/components/product/variant-selector";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ProductJsonLd } from "@/components/seo/product-jsonld";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";

type Params = { handle: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProductByHandle(handle).catch(() => null);
  if (!product) {
    return { title: "Producto no encontrado", robots: { index: false } };
  }
  const description =
    product.seo_description ||
    stripHtml(product.description).slice(0, 160) ||
    "Producto disponible en Tienda Experiencia Airsoft.";
  const title = product.seo_title || product.name;
  return {
    title,
    description,
    alternates: { canonical: `/productos/${handle}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/productos/${handle}`,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  // Next 16: params es Promise — siempre await
  params: Promise<Params>;
}) {
  const { handle } = await params;
  const product = await getProductByHandle(handle);
  if (!product || !product.published) notFound();

  const primaryImage = productPrimaryImage(product);
  const firstCategory = product.categories[0];
  const attributesEs = (product.attributes ?? []).filter((s) => s);

  return (
    <article className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
      <Breadcrumbs
        items={[
          { href: "/", label: "Tienda" },
          { href: "/productos", label: "Productos" },
          ...(firstCategory
            ? [
                {
                  href: `/categorias/${firstCategory.handle}`,
                  label: firstCategory.name,
                },
              ]
            : []),
          { label: product.name },
        ]}
      />

      <div className="mt-8 grid gap-10 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-7">
          <ProductGallery images={product.images} alt={product.name} />
        </div>

        <div className="md:col-span-5 space-y-6">
          <div className="space-y-3">
            {product.brand && product.brand !== "Genérico" ? (
              <div className="h-7 flex items-center">
                <BrandLogo brand={product.brand} size="md" />
              </div>
            ) : null}
            <h1 className="sect-title fluid-4xl">{product.name}</h1>
            {firstCategory ? (
              <Link
                href={`/categorias/${firstCategory.handle}`}
                className="inline-block"
              >
                <Badge tone="muted">{firstCategory.name}</Badge>
              </Link>
            ) : null}
          </div>

          <VariantSelector
            variants={product.variants}
            attributes={attributesEs}
            snapshot={{
              handle: product.handle,
              productId: product.id,
              productName: product.name,
              imageSrc: primaryImage?.src ?? null,
            }}
          />

          {product.free_shipping ? (
            <p className="mil-tag bone w-fit">Envío gratis</p>
          ) : null}

          {product.description ? (
            <div className="pt-6 border-t border-bone/10">
              <p className="sect-label mb-4">Descripción</p>
              <div
                className="prose prose-invert max-w-none text-ash fluid-base leading-relaxed [&_p]:mb-3 [&_strong]:text-bone [&_a]:text-orange [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <ProductJsonLd product={product} />
    </article>
  );
}
