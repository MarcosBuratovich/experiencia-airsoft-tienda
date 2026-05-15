export default function Loading() {
  return (
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
      <div className="grid gap-10 md:grid-cols-12 md:gap-12 mt-8">
        <div
          className="md:col-span-7 aspect-square clip-notch border border-bone/10 bg-carbon diag-lines-faint"
          aria-hidden
        />
        <div className="md:col-span-5 space-y-4" aria-hidden>
          <div className="h-3 w-24 bg-rail" />
          <div className="h-8 w-3/4 bg-rail" />
          <div className="h-6 w-1/3 bg-rail" />
          <div className="h-12 w-full bg-rail" />
        </div>
      </div>
    </section>
  );
}
