import { Badge } from "@/components/ui/badge";

export function StockBadge({
  hasStock,
  stockNumber,
}: {
  hasStock: boolean;
  stockNumber?: number | null;
}) {
  if (!hasStock) return <Badge tone="muted">Sin stock</Badge>;
  if (stockNumber !== null && stockNumber !== undefined && stockNumber > 0 && stockNumber < 5) {
    return <Badge tone="danger">Ultimas {stockNumber}</Badge>;
  }
  return <Badge tone="bone">En stock</Badge>;
}
