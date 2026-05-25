// ──────────────────────────────────────────────────────────────────────
// Stock badge — 3 estados:
//   0   → "Sin stock"           (gris apagado)
//   1   → "Última"              (warning sutil naranja)
//   >1  → "En stock"            (dot verde, texto crema)
// No mostramos el número exacto cuando hay stock para no estresar al cliente
// con micro-counts ("Últimas 3" suena agresivo).
// ──────────────────────────────────────────────────────────────────────

const BASE =
  "inline-flex items-center gap-1.5 font-mono fluid-xs tracking-[.22em] uppercase px-2.5 py-1 backdrop-blur-sm";

export function StockBadge({
  hasStock,
  stockNumber,
}: {
  hasStock: boolean;
  stockNumber?: number | null;
}) {
  if (!hasStock) {
    return (
      <span className={`${BASE} text-smoke border border-bone/15 bg-ink/70`}>
        Sin stock
      </span>
    );
  }
  if (stockNumber === 1) {
    return (
      <span
        className={`${BASE} text-orange-300 border border-orange-300/30 bg-orange-300/10`}
      >
        <span className="size-1.5 rounded-full bg-orange-300/80" aria-hidden />
        Última
      </span>
    );
  }
  return (
    <span className={`${BASE} text-bone/80 border border-bone/15 bg-ink/70`}>
      <span className="size-1.5 rounded-full bg-emerald-400/80" aria-hidden />
      En stock
    </span>
  );
}
