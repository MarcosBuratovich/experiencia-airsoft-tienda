import type { ReactNode } from "react";

type Tone = "orange" | "bone" | "muted" | "danger";

const TONE: Record<Tone, string> = {
  orange: "mil-tag",
  bone: "mil-tag bone",
  muted:
    "inline-flex items-center gap-2 fluid-xs tracking-widest uppercase text-smoke border border-bone/15 bg-bone/5 px-3 py-1",
  danger:
    "inline-flex items-center gap-2 fluid-xs tracking-widest uppercase text-orange border border-orange/40 bg-orange/10 px-3 py-1",
};

export function Badge({
  tone = "orange",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`${TONE[tone]} ${className ?? ""}`}>{children}</span>
  );
}
