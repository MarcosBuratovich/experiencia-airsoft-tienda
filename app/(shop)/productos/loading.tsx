export default function Loading() {
  return (
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
      <p className="sect-label">Cargando catálogo</p>
      <h1 className="sect-title fluid-5xl mt-2">Equipando armería...</h1>
      <div className="mt-12 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="clip-notch border border-bone/10 bg-carbon"
            aria-hidden
          >
            <div className="aspect-square bg-ink diag-lines-faint" />
            <div className="p-5 space-y-3">
              <div className="h-3 w-20 bg-rail" />
              <div className="h-5 w-3/4 bg-rail" />
              <div className="h-4 w-1/3 bg-rail" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
