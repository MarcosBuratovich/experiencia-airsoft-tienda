import Link from "next/link";
import type { Category } from "@/lib/tiendanube/types";
import { ArrowRight } from "lucide-react";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/categorias/${category.handle}`}
      className="group block clip-notch border border-bone/10 bg-carbon hover:border-orange/40 transition-colors p-6 md:p-8"
    >
      <p className="sect-label">Sector</p>
      <h3 className="fluid-2xl uppercase tracking-wide text-bone group-hover:text-orange transition-colors mt-2">
        {category.name}
      </h3>
      {category.description ? (
        <p
          className="text-ash fluid-sm mt-3 line-clamp-3"
          dangerouslySetInnerHTML={{ __html: category.description }}
        />
      ) : null}
      <div className="mt-6 inline-flex items-center gap-2 fluid-xs uppercase tracking-widest text-bone group-hover:text-orange transition-colors">
        Ver productos <ArrowRight size={14} aria-hidden />
      </div>
    </Link>
  );
}
