import { formatARS } from "@/lib/format";

export function PriceTag({
  priceCents,
  compareCents,
  promotionalCents,
  size = "md",
  className,
}: {
  priceCents: number | null;
  compareCents?: number | null;
  promotionalCents?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  // Si hay promotional_price activo, lo usamos como precio "real" y mostramos
  // el price normal como tachado. En ese caso el precio principal va en
  // orange (señal de promoción). En la presentación default, el precio va
  // en text-bone (crema) — el orange queda como acento únicamente.
  const hasPromo =
    promotionalCents !== null &&
    promotionalCents !== undefined &&
    priceCents !== null &&
    promotionalCents < priceCents;
  const main = hasPromo ? promotionalCents : priceCents;
  const tachado = hasPromo ? priceCents : compareCents ?? null;

  const sizeCls =
    size === "lg" ? "fluid-3xl" : size === "sm" ? "fluid-lg" : "fluid-2xl";
  const mainColor = hasPromo ? "text-orange" : "text-bone";

  return (
    <div className={`flex items-baseline gap-3 ${className ?? ""}`}>
      <span className={`${mainColor} font-display font-semibold tracking-tight tabular-nums ${sizeCls}`}>
        {formatARS(main)}
      </span>
      {tachado !== null && tachado !== undefined && tachado !== main ? (
        <span className="text-smoke line-through fluid-sm tabular-nums">
          {formatARS(tachado)}
        </span>
      ) : null}
    </div>
  );
}
