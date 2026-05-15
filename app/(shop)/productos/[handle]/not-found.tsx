import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
      <EmptyState
        eyebrow="OBJETIVO NO ENCONTRADO"
        title="Este producto no existe"
        hint="Puede que el link esté roto o que el producto ya no esté publicado. Probá explorar el catálogo completo."
        cta={{ href: "/productos", label: "Ver catálogo" }}
      />
    </section>
  );
}
