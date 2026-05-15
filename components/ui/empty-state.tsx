import Link from "next/link";
import type { ReactNode } from "react";

export function EmptyState({
  eyebrow = "SECTOR DESPEJADO",
  title,
  hint,
  cta,
}: {
  eyebrow?: string;
  title: string;
  hint?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="diag-lines-faint border border-bone/10 clip-notch p-10 md:p-14 text-center">
      <p className="sect-label">{eyebrow}</p>
      <h2 className="sect-title fluid-3xl mt-3">{title}</h2>
      {hint ? <p className="text-ash fluid-base mt-3 max-w-prose mx-auto">{hint}</p> : null}
      {cta ? (
        <Link href={cta.href} className="btn-ghost clip-tag fluid-sm uppercase tracking-wider px-5 py-3 inline-block mt-6">
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}
