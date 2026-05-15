"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y text-center">
      <p className="sect-label">Hubo un problema</p>
      <h1 className="sect-title fluid-4xl mt-3">
        Algo se trabó del lado nuestro
      </h1>
      <p className="text-ash fluid-base mt-3 max-w-prose mx-auto">
        Ya nos llegó el aviso. Probá refrescar la página o volver al inicio.
      </p>
      <div className="mt-6 flex justify-center gap-3 flex-wrap">
        <Button onClick={() => reset()} variant="primary">
          Reintentar
        </Button>
        <Button href="/" variant="ghost">
          Volver al inicio
        </Button>
      </div>
    </section>
  );
}
