import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  currentPage,
  hasNext,
  buildHref,
}: {
  currentPage: number;
  hasNext: boolean;
  buildHref: (page: number) => string;
}) {
  if (currentPage <= 1 && !hasNext) return null;
  return (
    <nav
      aria-label="Paginacion"
      className="flex items-center justify-between gap-4 mt-12 fluid-xs uppercase tracking-widest"
    >
      <div>
        {currentPage > 1 ? (
          <Link
            href={buildHref(currentPage - 1)}
            className="inline-flex items-center gap-2 text-bone hover:text-orange transition-colors min-h-[2.75rem] px-2"
          >
            <ChevronLeft size={14} aria-hidden /> Anterior
          </Link>
        ) : (
          <span className="text-rail inline-flex items-center gap-2 min-h-[2.75rem] px-2">
            <ChevronLeft size={14} aria-hidden /> Anterior
          </span>
        )}
      </div>
      <span className="text-smoke">Pagina {currentPage}</span>
      <div>
        {hasNext ? (
          <Link
            href={buildHref(currentPage + 1)}
            className="inline-flex items-center gap-2 text-bone hover:text-orange transition-colors min-h-[2.75rem] px-2"
          >
            Siguiente <ChevronRight size={14} aria-hidden />
          </Link>
        ) : (
          <span className="text-rail inline-flex items-center gap-2 min-h-[2.75rem] px-2">
            Siguiente <ChevronRight size={14} aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
