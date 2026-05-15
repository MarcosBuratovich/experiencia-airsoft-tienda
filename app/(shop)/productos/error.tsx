"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y text-center">
      <p className="sect-label">Sector temporalmente cerrado</p>
      <h1 className="sect-title fluid-4xl mt-3">No pudimos cargar el catálogo</h1>
      <p className="text-ash fluid-base mt-3 max-w-prose mx-auto">
        Hay un problema momentáneo conectándonos con el sistema de productos.
        Probá refrescar la página.
      </p>
      <div className="mt-6 flex justify-center">
        <Button onClick={() => reset()} variant="primary">
          Reintentar
        </Button>
      </div>
    </section>
  );
}
