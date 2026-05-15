// Formateo unificado de ARS. Recibe centavos enteros (centavos ARS).
// `Math.round(1500.00 * 100) === 150000` → "ARS $1.500"
export function formatARS(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "Consultar";
  const formatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(cents / 100);
}

export function formatStock(
  stock: number | null | undefined,
  hasManagement: boolean,
): string {
  if (!hasManagement) return "En stock";
  if (stock === null || stock === undefined) return "Sin stock";
  if (stock <= 0) return "Sin stock";
  if (stock < 5) return `Ultimas ${stock}`;
  return "En stock";
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}
