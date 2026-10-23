import { X, Minus, Plus } from "lucide-react";
import { productById } from "@/lib/catalog";
import { cartKey, cartTotal, setQty, removeItem, type CartItem } from "@/lib/cart";
import { dict, formatPrice, toFaDigits, type Currency, type Lang } from "@/lib/i18n";

export function CartDrawer({
  open,
  onClose,
  cart,
  setCart,
  lang,
  cur,
}: {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  setCart: (c: CartItem[]) => void;
  lang: Lang;
  cur: Currency;
}) {
  const t = dict[lang];
  const n = (v: number) => (lang === "fa" ? toFaDigits(v) : String(v));
  const p = (v: number) => formatPrice(v, cur, lang);
  if (!open) return null;
  const total = cartTotal(cart, (id) => productById(id)?.price);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-background/60" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col bg-card p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{t.cart}</h2>
          <button onClick={onClose} aria-label={t.close} className="rounded-full p-1 hover:text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>
        {cart.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.cartEmpty}</p>
        ) : (
          <ul className="flex-1 space-y-3 overflow-y-auto">
            {cart.map((c) => {
              const pr = productById(c.id);
              if (!pr) return null;
              const k = cartKey(c);
              const color = pr.colors[c.colorIdx] ?? pr.colors[0]!;
              return (
                <li key={k} className="rounded-xl bg-secondary p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color.hex }} />
                      <span className="truncate">{pr.name[lang]}</span>
                    </span>
                    <span className="shrink-0 text-primary">{p(pr.price * c.qty)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {color.name}
                      {c.size ? ` · ${t.sizeShort} ${c.size}` : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <button aria-label="-" onClick={() => setCart(setQty(cart, k, c.qty - 1))} className="rounded-full border border-border p-1">
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        aria-label={t.qty}
                        inputMode="numeric"
                        value={n(c.qty)}
                        onChange={(e) => {
                          const v = Number(e.target.value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
                          setCart(setQty(cart, k, v));
                        }}
                        className="w-8 rounded bg-background text-center text-foreground"
                      />
                      <button aria-label="+" onClick={() => setCart(setQty(cart, k, c.qty + 1))} className="rounded-full border border-border p-1">
                        <Plus className="h-3 w-3" />
                      </button>
                      <button onClick={() => setCart(removeItem(cart, k))} className="ms-2 underline hover:text-primary">
                        {t.remove}
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 border-t border-border pt-4">
          <p className="flex justify-between text-sm">
            {t.total}
            <span className="text-primary">{p(total)}</span>
          </p>
          <button
            disabled={!cart.length}
            className="mt-3 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {t.checkout}
          </button>
          <p className="mt-2 text-center text-[11px] text-warning">{t.demoCheckout}</p>
        </div>
      </aside>
    </div>
  );
}
