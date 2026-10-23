import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RotateCw, ZoomIn, Columns2, Bookmark, ShoppingBag, Globe, Layers, X } from "lucide-react";
import { recommend, evaluateSize, SIZES, type Body, type Size, type FitStatus, type Zone } from "@/lib/fit";
import { AiStylist } from "@/components/AiStylist";
import { Showcase } from "@/components/Showcase";
import { CartDrawer } from "@/components/CartDrawer";
import { PhotoStage } from "@/components/stage/PhotoStage";
import {
  bodyTypes,
  productById,
  products,
  wear,
  wornInOrder,
  type BodyType,
  type Category,
  type Outfit,
  type Product,
} from "@/lib/catalog";
import { addItem, parseCart, type CartItem } from "@/lib/cart";
import { dict, toFaDigits, formatPrice, type Currency, type Lang } from "@/lib/i18n";

const TITLE = "Maison Éclat — Virtual Fitting Room";
const DESC = "Dress a model in your measurements, build outfits and get an honest size estimate.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FittingRoom,
});

const statusCls: Record<FitStatus, string> = {
  tight: "bg-warning",
  perfect: "bg-success",
  loose: "bg-info",
};
const RANK: Record<FitStatus, number> = { perfect: 0, loose: 1, tight: 2 };

const ideas: Outfit[] = [
  {
    top: { id: "silk-blouse", colorIdx: 1 },
    bottom: { id: "satin-skirt", colorIdx: 0 },
    outer: { id: "cashmere-coat", colorIdx: 1 },
    shoes: { id: "leather-pump", colorIdx: 2 },
  },
  {
    top: { id: "knit-top", colorIdx: 0 },
    bottom: { id: "wool-trouser", colorIdx: 1 },
    outer: { id: "cashmere-coat", colorIdx: 0 },
    shoes: { id: "leather-pump", colorIdx: 0 },
  },
  {
    top: { id: "knit-top", colorIdx: 2 },
    bottom: { id: "wool-trouser", colorIdx: 2 },
    shoes: { id: "leather-pump", colorIdx: 1 },
  },
];

function FittingRoom() {
  const [lang, setLang] = useState<Lang>("en");
  const [cur, setCur] = useState<Currency>("eur");
  const t = dict[lang];
  const n = (v: string | number) => (lang === "fa" ? toFaDigits(v) : String(v));
  const price = (v: number) => formatPrice(v, cur, lang);

  const [typeId, setTypeId] = useState<BodyType["id"]>("regular");
  const bodyType = bodyTypes.find((b) => b.id === typeId)!;
  const [body, setBody] = useState<Body>(bodyType.defaults);
  const [outfit, setOutfit] = useState<Outfit>({
    top: { id: "silk-blouse", colorIdx: 0 },
    bottom: { id: "wool-trouser", colorIdx: 0 },
  });
  const [focus, setFocus] = useState<Category>("top");
  const [back, setBack] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [compare, setCompare] = useState(false);
  const [fitMap, setFitMap] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cart, setCartState] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    setCartState(parseCart(localStorage.getItem("cart"), (id) => !!productById(id)));
    try {
      setSavedCount(JSON.parse(localStorage.getItem("looks") || "[]").length);
    } catch {
      setSavedCount(0);
    }
  }, []);
  const setCart = (c: CartItem[]) => {
    setCartState(c);
    localStorage.setItem("cart", JSON.stringify(c));
  };
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  /** Size per worn item: the user's pick, else the recommendation (single source of truth). */
  const recs = useMemo(
    () =>
      Object.fromEntries(
        wornInOrder(outfit).map(({ product }) => [product.id, recommend(product.chart, body)]),
      ),
    [outfit, body],
  );
  const sizeOf = (p: Product): Size | undefined => {
    const w = outfit[p.layer];
    const r = recs[p.id];
    if (w?.size) return w.size;
    return r && (r.status === "ok" || r.status === "outside") ? r.best.size : undefined;
  };
  const items = wornInOrder(outfit).map((i) => ({ ...i, worn: { ...i.worn, size: sizeOf(i.product) } }));
  const focused = outfit[focus] ? productById(outfit[focus]!.id) : undefined;
  const fRec = focused ? recs[focused.id] : undefined;
  const fSize = focused ? sizeOf(focused) : undefined;
  const fitZones = useMemo(() => {
    const z: Partial<Record<Zone, FitStatus>> = {};
    items.forEach(({ product, worn }) => {
      if (!worn.size) return;
      evaluateSize(product.chart, worn.size, body).zones.forEach((x) => {
        if (!z[x.zone] || RANK[x.status] > RANK[z[x.zone]!]) z[x.zone] = x.status;
      });
    });
    return z;
  }, [items, body]);
  const hasBack = items.length > 0 && items.every((i) => i.product.photos.back) && !!bodyType.image.back;
  useEffect(() => {
    if (!hasBack) setBack(false);
  }, [hasBack]);
  const outfitTotal = items.reduce((s, i) => s + i.product.price, 0);

  const wearProduct = (p: Product, colorIdx: number) => {
    setOutfit((o) => wear(o, p.layer, { id: p.id, colorIdx }));
    setFocus(p.layer);
  };
  const takeOff = (c: Category) => {
    setOutfit((o) => {
      const next = { ...o };
      delete next[c];
      return next;
    });
  };
  const pickType = (b: BodyType) => {
    setTypeId(b.id);
    setBody(b.defaults);
  };
  const saveLook = () => {
    let looks: unknown[] = [];
    try {
      looks = JSON.parse(localStorage.getItem("looks") || "[]");
    } catch {
      looks = [];
    }
    looks.push({ outfit, bodyType: typeId, body, at: Date.now() });
    localStorage.setItem("looks", JSON.stringify(looks));
    setSavedCount(looks.length);
    setToast(t.saved);
  };
  const addAll = () => {
    let c = cart;
    items.forEach(({ product, worn }) => {
      c = addItem(c, { id: product.id, colorIdx: worn.colorIdx, size: worn.size ?? null });
    });
    setCart(c);
    setToast(t.added);
  };
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const btn =
    "rounded-full border border-border px-3 py-1.5 text-xs transition-all hover:border-primary hover:text-primary active:scale-95";
  const on = "border-primary bg-primary text-primary-foreground gold-glow hover:text-primary-foreground";
  const view = back ? "back" : "front";

  return (
    <div dir={lang === "fa" ? "rtl" : "ltr"} lang={lang} className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-20 glass border-x-0 border-t-0">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg tracking-[0.2em] text-primary">{t.brand}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setCur(cur === "eur" ? "toman" : "eur")} className={btn}>
              {t[cur]}
            </button>
            <button onClick={() => setLang(lang === "en" ? "fa" : "en")} className={btn + " flex items-center gap-1"}>
              <Globe className="h-3.5 w-3.5" />
              {lang === "en" ? "فارسی" : "English"}
            </button>
            <button
              onClick={() => setCartOpen(true)}
              aria-label={t.cart}
              className="flex items-center gap-1 rounded-full border border-primary/40 px-2.5 py-1.5 text-xs text-primary hover:bg-accent"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              {n(cartCount)}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[300px_1fr_320px]">
        {/* My outfit + focused product */}
        <section className="order-2 min-w-0 space-y-4 lg:order-1">
          <div className="rounded-3xl bg-card p-5">
            <h2 className="mb-3 font-display text-lg">{t.myOutfit}</h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.emptyOutfit}</p>
            ) : (
              <ul className="space-y-2">
                {items.map(({ category, product, worn }) => (
                  <li
                    key={category}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${focus === category ? "bg-accent" : "bg-secondary"}`}
                  >
                    <button onClick={() => setFocus(category)} className="flex min-w-0 flex-1 items-center gap-2 text-start">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: product.colors[worn.colorIdx]?.hex }} />
                      <span className="min-w-0">
                        <span className="block truncate">{product.name[lang]}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {t[category]} · {worn.size ? `${t.sizeShort} ${worn.size}` : t.noFit}
                        </span>
                      </span>
                    </button>
                    <span className="shrink-0 text-xs text-primary">{price(product.price)}</span>
                    <button onClick={() => takeOff(category)} aria-label={t.remove} className="shrink-0 text-muted-foreground hover:text-primary">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex justify-between border-t border-border pt-3 text-sm">
              {t.total}
              <span className="text-primary">{price(outfitTotal)}</span>
            </p>
            <button
              disabled={!items.length}
              onClick={addAll}
              className="mt-3 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground gold-glow transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {t.addAll}
            </button>
          </div>

          {focused && (
            <div className="rounded-3xl bg-card p-5">
              <p className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-primary">
                {t[focused.layer]}
                {focused.demo && (
                  <span className="rounded-full border border-warning/60 px-2 py-0.5 text-warning" title={t.demoNote}>
                    {t.demo}
                  </span>
                )}
              </p>
              <h1 className="mt-1 font-display text-2xl">{focused.name[lang]}</h1>
              <p className="mt-1 text-xl text-primary">{price(focused.price)}</p>
              <p className="mt-3 mb-2 text-xs text-muted-foreground">
                {t.color} — {focused.colors[outfit[focus]!.colorIdx]?.name}
              </p>
              <div className="flex gap-3">
                {focused.colors.map((c, i) => (
                  <button
                    key={c.hex}
                    aria-label={c.name}
                    onClick={() => setOutfit((o) => ({ ...o, [focus]: { ...o[focus]!, colorIdx: i } }))}
                    style={{ background: c.hex }}
                    className={`h-8 w-8 rounded-full border border-border transition-transform hover:scale-110 ${i === outfit[focus]!.colorIdx ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                  />
                ))}
              </div>
              {fRec && fRec.status !== "noChart" && (
                <>
                  <p className="mt-4 mb-2 text-xs text-muted-foreground">{t.size}</p>
                  <div className="grid grid-cols-5 gap-2">
                    {SIZES.map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          setOutfit((o) => ({
                            ...o,
                            [focus]: { ...o[focus]!, size: fRec.best.size === s ? undefined : s },
                          }))
                        }
                        className={`relative rounded-xl border border-border py-2 text-sm transition-all hover:border-primary ${s === fSize ? on : ""}`}
                      >
                        {s}
                        {(fRec.status === "ok" || fRec.status === "outside") && s === fRec.best.size && (
                          <span className="absolute -top-1 end-1 h-1.5 w-1.5 rounded-full bg-success" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* Stage */}
        <section className="order-1 flex min-w-0 flex-col overflow-hidden rounded-3xl stage-bg lg:order-2">
          <div className="flex flex-wrap justify-center gap-2 p-3">
            {bodyTypes.map((b) => (
              <button key={b.id} onClick={() => pickType(b)} className={`${btn} ${typeId === b.id ? on : ""}`}>
                {t[b.id]}
              </button>
            ))}
          </div>
          <div
            className={`relative h-[480px] sm:h-[580px] ${dragOver ? "ring-2 ring-inset ring-primary" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const p = productById(e.dataTransfer.getData("text/plain"));
              if (p) wearProduct(p, 0);
            }}
          >
            {compare ? (
              <div className="grid h-full grid-cols-2" dir="ltr">
                {[false, true].map((withG) => (
                  <div key={String(withG)} className="relative min-w-0">
                    <PhotoStage bodyType={bodyType} body={body} items={withG ? items : []} view={view} zoom={zoom} fit={fitMap && withG ? fitZones : undefined} />
                    <span className="absolute inset-x-0 top-2 text-center text-[10px] uppercase tracking-widest text-primary">
                      {withG ? t.withGarments : t.without}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <PhotoStage bodyType={bodyType} body={body} items={items} view={view} zoom={zoom} fit={fitMap ? fitZones : undefined} />
            )}
            <span className="pointer-events-none absolute start-3 bottom-2 rounded-full border border-warning/60 bg-background/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-warning">
              {t.stageDemo}
            </span>
            {dragOver && (
              <span className="pointer-events-none absolute inset-x-0 top-3 text-center text-xs text-primary">{t.dropHere}</span>
            )}
            {fitMap && (
              <div className="pointer-events-none absolute end-2 bottom-2 flex gap-2 rounded-full glass px-3 py-1.5 text-[11px]">
                {(["tight", "perfect", "loose"] as FitStatus[]).map((st) => (
                  <span key={st} className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${statusCls[st]}`} />
                    {t[st]}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="m-3 grid grid-cols-5 gap-1 rounded-2xl glass p-1.5">
            {(
              [
                [RotateCw, t.rotate, back, () => setBack(!back), !hasBack, t.noBack],
                [ZoomIn, t.zoom, zoom, () => setZoom(!zoom), false, t.zoom],
                [Columns2, t.compare, compare, () => setCompare(!compare), false, t.compare],
                [Layers, t.fitMap, fitMap, () => setFitMap(!fitMap), false, t.fitMap],
                [Bookmark, t.save, false, saveLook, false, `${n(savedCount)} ${t.looksSaved}`],
              ] as [typeof RotateCw, string, boolean, () => void, boolean, string][]
            ).map(([Icon, label, active, fn, disabled, tip]) => (
              <button
                key={label}
                onClick={fn}
                disabled={disabled}
                title={tip}
                className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] transition-all hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted-foreground ${active ? "bg-accent text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          {!hasBack && <p className="-mt-1 mb-3 text-center text-[10px] text-muted-foreground">{t.noBack}</p>}
        </section>

        {/* Measurements + fit */}
        <section className="order-3 min-w-0 space-y-5">
          <div className="rounded-3xl bg-card p-5">
            <h2 className="mb-4 font-display text-lg">{t.measurements}</h2>
            {(
              [
                ["height", 145, 200, "cm"],
                ["weight", 40, 120, "kg"],
                ["bust", 70, 120, "cm"],
                ["waist", 55, 110, "cm"],
                ["hips", 75, 130, "cm"],
              ] as const
            ).map(([k, min, max, u]) => (
              <label key={k} className="mb-3 block">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">{t[k]}</span>
                  <span className="text-primary">
                    {n(body[k])} {u}
                  </span>
                </div>
                <input type="range" min={min} max={max} value={body[k]} onChange={(e) => setBody({ ...body, [k]: +e.target.value })} className="w-full" />
              </label>
            ))}
          </div>
          <div className="rounded-3xl border border-primary/30 bg-card p-5 gold-glow">
            <h2 className="mb-1 font-display text-lg">{t.fitRec}</h2>
            {focused && <p className="mb-3 truncate text-xs text-muted-foreground">{focused.name[lang]}</p>}
            {!focused || !fRec ? (
              <p className="text-sm text-muted-foreground">{t.emptyOutfit}</p>
            ) : fRec.status === "noChart" ? (
              <p className="text-sm text-muted-foreground">
                {focused.layer === "shoes" ? t.noFit + " " : ""}
                {t.noChart}
              </p>
            ) : fRec.status === "invalid" ? (
              <p className="text-sm text-warning">
                {t.invalidMsg} {fRec.invalid.map((z) => t[z]).join("، ")}
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{fRec.status === "ok" ? t.recommended : t.closest}</p>
                <p className="font-display text-4xl text-primary">{fRec.best.size}</p>
                {fRec.status === "outside" && <p className="mt-2 text-xs text-warning">{t.outside}</p>}
                <p className="mt-4 mb-2 text-xs text-muted-foreground">
                  {t.rangesUsed} · {t.size} {fRec.best.size}
                </p>
                <ul className="space-y-2">
                  {fRec.best.zones.map((z) => (
                    <li key={z.zone} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl bg-secondary px-3 py-2 text-sm">
                      <span>
                        {t[z.zone]}{" "}
                        <span className="text-xs text-muted-foreground">
                          {n(body[z.zone])} · {n(z.range[0])}–{n(z.range[1])}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-xs">
                        <span className={`h-2 w-2 rounded-full ${statusCls[z.status]}`} />
                        {z.offset === 0 ? t.within : `${n(Math.abs(z.offset))} ${z.offset > 0 ? t.above : t.below}`}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] italic text-muted-foreground">{t.estimate}</p>
              </>
            )}
          </div>
        </section>
      </main>

      <section className="mx-auto max-w-7xl space-y-10 px-4 pb-16">
        <Showcase lang={lang} cur={cur} outfit={outfit} onWear={wearProduct} />
        <AiStylist
          body={body}
          lang={lang}
          cur={cur}
          onApply={(pieces) => {
            let o: Outfit = {};
            pieces.forEach((p) => {
              const pr = productById(p.id);
              if (pr) o = wear(o, pr.layer, { id: pr.id, colorIdx: p.colorIndex });
            });
            setOutfit(o);
            if (pieces[0]) setFocus(pieces[0].layer as Category);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
        <div>
          <h2 className="mb-3 font-display text-xl">{t.outfits}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {ideas.map((idea, i) => {
              const its = wornInOrder(idea).map((x) => ({ ...x, worn: { ...x.worn, size: recommend(x.product.chart, body).best.size } }));
              return (
                <div key={i} className="flex min-w-0 items-center gap-3 rounded-2xl bg-card p-3">
                  <div className="h-36 w-20 shrink-0">
                    <PhotoStage bodyType={bodyType} body={body} items={its} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display">{t.outfitNames[i]}</p>
                    <p className="text-xs text-primary">{price(its.reduce((s, x) => s + x.product.price, 0))}</p>
                    <button onClick={() => setOutfit(idea)} className={btn + " mt-2"}>
                      {t.tryOutfit}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">
          {products.length} · {t.demoNote}
        </p>
      </section>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} setCart={setCart} lang={lang} cur={cur} />
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full glass px-4 py-2 text-sm text-primary gold-glow">{toast}</div>
      )}
    </div>
  );
}
