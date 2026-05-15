import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="fluid-xs text-smoke uppercase tracking-widest">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((it, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${it.label}-${i}`} className="flex items-center gap-2">
              {it.href && !isLast ? (
                <Link
                  href={it.href}
                  className="hover:text-orange transition-colors"
                >
                  {it.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="text-bone">
                  {it.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight size={12} className="text-rail" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
