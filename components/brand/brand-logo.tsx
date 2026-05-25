import Image from "next/image";
import { getBrandLogo } from "@/lib/brand-logos";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { h: string; pxH: number; pxW: number }> = {
  // h: altura visual via Tailwind. pxH/pxW son hints para Next/Image.
  sm: { h: "h-5", pxH: 20, pxW: 80 },   // cards de grid
  md: { h: "h-7", pxH: 28, pxW: 112 },  // hero / detail
  lg: { h: "h-10", pxH: 40, pxW: 160 }, // página de marca
};

/**
 * Renderiza el logo de la marca si está en el manifest. Si no hay logo
 * (marca no soportada o sin logo findable), renderiza un fallback de
 * texto con tipografía monospace small-caps (consistente con el estilo
 * táctico de la tienda).
 */
export function BrandLogo({
  brand,
  size = "sm",
  className = "",
}: {
  brand: string | null | undefined;
  size?: Size;
  className?: string;
}) {
  if (!brand) return null;
  // No mostrar logo ni texto para "Genérico" — significa producto sin marca.
  if (brand === "Genérico") return null;

  const info = getBrandLogo(brand);
  const { h, pxH, pxW } = SIZES[size];

  if (info) {
    return (
      <Image
        src={info.logo}
        alt={brand}
        width={pxW}
        height={pxH}
        className={`${h} w-auto object-contain ${info.needsInvert ? "brightness-0 invert" : ""} opacity-90 ${className}`}
        aria-label={`Marca: ${brand}`}
        unoptimized
      />
    );
  }

  // Fallback texto
  return (
    <span
      className={`font-mono uppercase tracking-[.22em] text-ash inline-block ${
        size === "sm" ? "fluid-xs" : size === "md" ? "fluid-sm" : "fluid-base"
      } ${className}`}
      aria-label={`Marca: ${brand}`}
    >
      {brand}
    </span>
  );
}
