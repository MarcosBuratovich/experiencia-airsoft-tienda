import type { Metadata } from "next";

// El carrito es un endpoint transaccional — no queremos que Google indexe
// snapshots del estado local del cliente.
export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
