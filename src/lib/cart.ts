import type { Size } from "@/lib/fit";

export type CartItem = { id: string; colorIdx: number; size: Size | null; qty: number };
export const MAX_QTY = 10;
export const cartKey = (i: Pick<CartItem, "id" | "colorIdx" | "size">) =>
  `${i.id}|${i.colorIdx}|${i.size ?? "-"}`;

export function addItem(cart: CartItem[], item: Omit<CartItem, "qty">, qty = 1): CartItem[] {
  const k = cartKey(item);
  const found = cart.find((c) => cartKey(c) === k);
  if (found)
    return cart.map((c) => (c === found ? { ...c, qty: Math.min(MAX_QTY, c.qty + qty) } : c));
  return [...cart, { ...item, qty: Math.min(MAX_QTY, qty) }];
}

/** Non-integer / NaN quantities are ignored; 0 or less removes; above max is capped. */
export function setQty(cart: CartItem[], key: string, qty: number): CartItem[] {
  if (!Number.isFinite(qty) || !Number.isInteger(qty)) return cart;
  if (qty <= 0) return cart.filter((c) => cartKey(c) !== key);
  return cart.map((c) => (cartKey(c) === key ? { ...c, qty: Math.min(MAX_QTY, qty) } : c));
}

export const removeItem = (cart: CartItem[], key: string) =>
  cart.filter((c) => cartKey(c) !== key);

export const cartTotal = (cart: CartItem[], priceOf: (id: string) => number | undefined) =>
  cart.reduce((s, c) => s + (priceOf(c.id) ?? 0) * c.qty, 0);

/** Parses stored cart data, dropping anything malformed or for unknown products. */
export function parseCart(raw: string | null, known: (id: string) => boolean): CartItem[] {
  try {
    const data = JSON.parse(raw ?? "[]");
    if (!Array.isArray(data)) return [];
    return data.filter(
      (c): c is CartItem =>
        c &&
        typeof c.id === "string" &&
        known(c.id) &&
        Number.isInteger(c.colorIdx) &&
        Number.isInteger(c.qty) &&
        c.qty > 0 &&
        c.qty <= MAX_QTY,
    );
  } catch {
    return [];
  }
}
