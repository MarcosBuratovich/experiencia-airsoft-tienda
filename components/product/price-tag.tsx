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
  // Si hay promotional_price activo, lo usamos como precio "real"
  // y mostramos el price normal como tachado.
  const hasPromo =
    promotionalCents !== null &&
    promotionalCents !== undefined &&
    priceCents !== null &&
    promotionalCents < priceCents;
  const main = hasPromo ? promotionalCents : priceCents;
  const tachado = hasPromo ? priceCents : compareCents ?? null;

  const sizeCls =
    size === "lg" ? "fluid-3xl" : size === "sm" ? "fluid-lg" : "fluid-2xl";

  return (
    <div className={`flex items-baseline gap-3 ${className ?? ""}`}>
      <span className={`text-orange font-semibold ${sizeCls}`}>
        {formatARS(main)}
      </span>
      {tachado !== null && tachado !== undefined && tachado !== main ? (
        <span className="text-smoke line-through fluid-sm">
          {formatARS(tachado)}
        </span>
      ) : null}
    </div>
  );
}
