import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <section className="max-w-[1400px] mx-auto fluid-gutter-x fluid-section-y">
      <EmptyState
        eyebrow="SECTOR INEXISTENTE"
        title="Esta categoría no existe"
        hint="Puede que el link esté roto o que la categoría haya cambiado de nombre."
        cta={{ href: "/categorias", label: "Ver todas las categorías" }}
      />
    </section>
  );
}
