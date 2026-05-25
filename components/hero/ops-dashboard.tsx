import { Truck, ShieldCheck, MessageCircle, PackageCheck } from "lucide-react";

interface Stat {
  value: string;
  label: string;
  caption?: string;
}

interface Highlight {
  icon: typeof Truck;
  text: string;
}

/**
 * Hero "ops dashboard" — reemplaza el product stack con un panel tactical
 * con stats reales del catálogo y bullets de valor. Pensado para llamar la
 * atención y dar sensación de catálogo activo / profesional.
 */
export function OpsDashboard({
  productCount,
  categoryCount,
  brandCount,
}: {
  productCount: number;
  categoryCount: number;
  brandCount: number;
}) {
  const stats: Stat[] = [
    { value: formatBigNumber(productCount), label: "Productos", caption: "stock vivo" },
    { value: String(categoryCount), label: "Categorías", caption: "filtrá por sector" },
    { value: String(brandCount), label: "Marcas", caption: "fabricantes oficiales" },
    { value: "24/7", label: "Tienda", caption: "siempre abierta" },
  ];

  const highlights: Highlight[] = [
    { icon: Truck, text: "Envío a todo el país desde CABA" },
    { icon: ShieldCheck, text: "Productos originales con garantía" },
    { icon: PackageCheck, text: "Stock actualizado al día" },
    { icon: MessageCircle, text: "Asesoramiento por WhatsApp" },
  ];

  return (
    <div className="hero-card hero-card-1 relative border border-bone/15 bg-carbon/90 backdrop-blur-sm clip-notch-lg overflow-hidden">
      {/* Header bar tactical */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-bone/10 bg-ink/70">
        <div className="flex items-center gap-2.5 font-mono fluid-xs uppercase tracking-[.28em] text-orange-300">
          <span className="size-1.5 rounded-full bg-orange pulse-dot" aria-hidden />
          OPS // Catálogo activo
        </div>
        <span className="font-mono fluid-xs uppercase tracking-[.22em] text-smoke hidden sm:inline">
          v.{new Date().getFullYear()}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px bg-bone/10">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="bg-carbon/95 p-3.5 md:p-5 lg:p-6 hero-card hero-card-2 relative"
            style={{ animationDelay: `${0.18 + i * 0.05}s` }}
          >
            <div className="font-display fluid-3xl md:fluid-4xl leading-none tracking-tight text-bone tabular-nums">
              {s.value}
            </div>
            <div className="font-mono fluid-xs uppercase tracking-[.22em] md:tracking-[.26em] text-ash mt-2 line-clamp-1">
              {s.label}
            </div>
            {s.caption ? (
              <div className="hidden sm:block font-mono fluid-xs uppercase tracking-[.22em] text-smoke mt-1 line-clamp-1">
                {s.caption}
              </div>
            ) : null}
            {/* corner accent */}
            <div
              className="pointer-events-none absolute top-2 right-2 w-3 h-3 border-t border-r border-orange/40"
              aria-hidden
            />
          </div>
        ))}
      </div>

      {/* Highlights */}
      <ul className="divide-y divide-bone/10 bg-ink/50">
        {highlights.map((h, i) => {
          const Icon = h.icon;
          return (
            <li
              key={h.text}
              className="flex items-center gap-3 px-5 py-3 hero-card hero-card-3"
              style={{ animationDelay: `${0.4 + i * 0.05}s` }}
            >
              <Icon size={14} className="text-orange shrink-0" aria-hidden />
              <span className="font-mono fluid-xs uppercase tracking-[.18em] text-bone/90">
                {h.text}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Footer signal */}
      <div className="px-5 py-3 border-t border-bone/10 flex items-center justify-between font-mono fluid-xs uppercase tracking-[.22em]">
        <span className="text-smoke">SIGNAL</span>
        <span className="flex items-center gap-2 text-orange-300">
          <span className="hero-ticker">●</span>
          en línea
        </span>
      </div>
    </div>
  );
}

function formatBigNumber(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) / 10}k+`;
  // Para conteos chicos (catálogo Experiencia Airsoft tiene ~120), redondear
  // al múltiplo de 10 más cercano abajo y sumar el "+" da sensación de
  // catálogo creciente sin mentir.
  const rounded = Math.floor(n / 10) * 10;
  return rounded > 0 ? `${rounded}+` : String(n);
}
