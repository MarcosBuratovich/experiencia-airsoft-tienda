// Snapshot del item en el carrito local. Guardamos lo minimo para mostrar
// el carrito sin tener que refetchear el producto entero.
export interface CartItemSnapshot {
  handle: string;
  productName: string;
  variantLabel: string;
  priceCents: number;
  imageSrc: string | null;
}

export interface CartItem {
  productId: number;
  variantId: number;
  qty: number;
  snapshot: CartItemSnapshot;
}

export interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  remove: (variantId: number) => void;
  setQty: (variantId: number, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotalCents: () => number;
}
