// Snapshot del item en el carrito local. Guardamos lo minimo para mostrar
// el carrito sin tener que refetchear el producto entero.
export interface CartItemSnapshot {
  handle: string;
  productName: string;
  variantLabel: string;
  priceCents: number;
  imageSrc: string | null;
  // null = stock infinito (stock_management false en TN). Si es number,
  // es el cap al momento de agregar — se valida en checkout final.
  maxQty: number | null;
  // Para los items[] de analytics (GA4/Meta). Opcionales: carritos
  // persistidos anteriores a este campo no los tienen.
  brand?: string | null;
  category?: string | null;
}

export interface CartItem {
  productId: number;
  variantId: number;
  qty: number;
  snapshot: CartItemSnapshot;
}

export interface CartState {
  // Datos persistidos
  items: CartItem[];

  // UI ephemeral (no se persiste)
  isOpen: boolean;
  isPinned: boolean;

  // Acciones de items
  add: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  remove: (variantId: number) => void;
  setQty: (variantId: number, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotalCents: () => number;

  // Acciones del drawer
  open: () => void;        // user-initiated, queda abierto
  close: () => void;
  pulseOpen: () => void;   // auto-trigger desde AddToCart, se cierra solo a los 4s si no se interactua
  pin: () => void;         // marca como interactuado (cancela auto-close)
}
