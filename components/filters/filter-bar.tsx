import { PriceFilter } from "./price-filter";
import { SortSelect } from "./sort-select";

export function FilterBar({
  priceMin,
  priceMax,
  orden,
}: {
  priceMin?: number;
  priceMax?: number;
  orden?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-y border-bone/10 py-4">
      <PriceFilter defaultMin={priceMin} defaultMax={priceMax} />
      <SortSelect defaultValue={orden} />
    </div>
  );
}
