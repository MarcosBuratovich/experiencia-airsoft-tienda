"use client";

import { Minus, Plus } from "lucide-react";

/**
 * Stepper de cantidad para producto detail.
 * - `max=null` → stock infinito (cap suave en 99 para evitar inputs absurdos).
 * - `max` definido → bloquea + cuando llega al límite.
 */
export function QuantityStepper({
  value,
  onChange,
  max,
  min = 1,
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  max: number | null;
  min?: number;
  disabled?: boolean;
}) {
  const hardMax = max ?? 99;
  const safeValue = Math.min(Math.max(value, min), hardMax);

  const dec = () => onChange(Math.max(min, safeValue - 1));
  const inc = () => onChange(Math.min(hardMax, safeValue + 1));

  const canDec = safeValue > min && !disabled;
  const canInc = safeValue < hardMax && !disabled;

  return (
    <div className="inline-flex items-stretch border border-bone/15 bg-ink/70 clip-tag">
      <button
        type="button"
        onClick={dec}
        disabled={!canDec}
        aria-label="Disminuir cantidad"
        className="inline-flex items-center justify-center w-11 h-11 text-bone hover:text-orange disabled:text-smoke disabled:cursor-not-allowed transition-colors"
      >
        <Minus size={14} aria-hidden />
      </button>
      <div
        className="min-w-[3rem] grid place-items-center px-2 font-mono fluid-base text-bone tabular-nums select-none border-x border-bone/10"
        aria-live="polite"
      >
        {safeValue}
      </div>
      <button
        type="button"
        onClick={inc}
        disabled={!canInc}
        aria-label="Aumentar cantidad"
        className="inline-flex items-center justify-center w-11 h-11 text-bone hover:text-orange disabled:text-smoke disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={14} aria-hidden />
      </button>
    </div>
  );
}
