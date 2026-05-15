import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
      <EmptyState
        eyebrow="404 · OBJETIVO PERDIDO"
        title="No encontramos esta página"
        hint="Capaz seguiste un link viejo o la URL está mal tipeada. Volvé al inicio o explorá el catálogo."
        cta={{ href: "/", label: "Ir al inicio" }}
      />
    </section>
  );
}
