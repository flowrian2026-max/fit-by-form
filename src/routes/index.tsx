import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  RotateCw,
  ZoomIn,
  Columns2,
  Bookmark,
  ShoppingBag,
  Globe,
  Layers,
  X,
  Shirt,
  Ruler,
  Lock,
  Unlock,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  recommend,
  evaluateSize,
  SIZES,
  FIT_PREFS,
  type Body,
  type FitPref,
  type Size,
  type FitStatus,
  type Zone,
} from "@/lib/fit";
import { AiStylist } from "@/components/AiStylist";
import { Thumb } from "@/components/Showcase";
import { CartDrawer } from "@/components/CartDrawer";
import { PhotoStage } from "@/components/stage/PhotoStage";
import { HoloBody } from "@/components/HoloBody";
import {
  CATEGORIES,
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
import {
  garmentImage,
  loadConfig,
  mockProvider,
  providerFor,
  saveConfig,
  DEFAULT_CONFIG,
  type TryOnConfig,
} from "@/lib/tryon";
import bgBoutique from "@/assets/bg-boutique.jpg";
import bgShowroom from "@/assets/bg-showroom.jpg";
import bgHolo from "@/assets/bg-holo.jpg";

const TITLE = "Maison Éclat — Virtual Dressing Room & Smart Mirror";
const DESC = "Try outfits on a model or your own photo, save looks and get an honest size estimate.";

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

const BGS = [bgBoutique, bgShowroom, bgHolo];
const statusCls: Record<FitStatus, string> = { tight: "bg-warning", perfect: "bg-success", loose: "bg-info" };
const RANK: Record<FitStatus, number> = { perfect: 0, loose: 1, tight: 2 };
type Look = { outfit: Outfit; bodyType: BodyType["id"]; body: Body; at: number };

function readLooks(): Look[] {
  try {
    const v = JSON.parse(localStorage.getItem("looks") || "[]");
    return Array.isArray(v) ? v.filter((l) => l && l.outfit && l.body) : [];
  } catch {
    return [];
  }
}

function FittingRoom() {
  const [lang, setLang] = useState<Lang>("fa");
  const [cur, setCur] = useState<Currency>("eur");
  const t = dict[lang];
  const n = (v: string | number) => (lang === "fa" ? toFaDigits(v) : String(v));
  const price = (v: number) => formatPrice(v, cur, lang);

  const [typeId, setTypeId] = useState<BodyType["id"]>("regular");
  const bodyType = bodyTypes.find((b) => b.id === typeId)!;
  const [body, setBody] = useState<Body>(bodyType.defaults);
  const [pref, setPref] = useState<FitPref>("regular");
  const [guide, setGuide] = useState(false);
  const [outfit, setOutfit] = useState<Outfit>({
    top: { id: "silk-blouse", colorIdx: 0 },
    bottom: { id: "satin-skirt", colorIdx: 0 },
  });
  const [focus, setFocus] = useState<Category>("top");
  const [cat, setCat] = useState<Category>("top");
  const [back, setBack] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [compare, setCompare] = useState(false);
  const [fitMap, setFitMap] = useState(false);
  const [locked, setLocked] = useState(false);
  const [bg, setBg] = useState(0);
  const [cart, setCartState] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [looks, setLooks] = useState<Look[]>([]);
  const [pick, setPick] = useState<number[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<{ url: string; demo: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [cfg, setCfg] = useState<TryOnConfig>(DEFAULT_CONFIG);
  const [cfgOpen, setCfgOpen] = useState(false);
  const fitRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCartState(parseCart(localStorage.getItem("cart"), (id) => !!productById(id)));
    setLooks(readLooks());
    setCfg(loadConfig());
  }, []);
  const setCart = (c: CartItem[]) => {
    setCartState(c);
    localStorage.setItem("cart", JSON.stringify(c));
  };
  const storeLooks = (l: Look[]) => {
    setLooks(l);
    localStorage.setItem("looks", JSON.stringify(l));
  };
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const recs = useMemo(
    () => Object.fromEntries(wornInOrder(outfit).map(({ product }) => [product.id, recommend(product.chart, body, pref)])),
    [outfit, body, pref],
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
      evaluateSize(product.chart, worn.size, body, pref).zones.forEach((x) => {
        if (!z[x.zone] || RANK[x.status] > RANK[z[x.zone]!]) z[x.zone] = x.status;
      });
    });
    return z;
  }, [items, body, pref]);
  const hasBack = items.length > 0 && items.every((i) => i.product.photos.back) && !!bodyType.image.back;
  useEffect(() => {
    if (!hasBack) setBack(false);
  }, [hasBack]);
  const outfitTotal = items.reduce((s, i) => s + i.product.price, 0);

  const wearProduct = (p: Product, colorIdx: number) => {
    setOutfit((o) => wear(o, p.layer, { id: p.id, colorIdx, ...(locked && o[p.layer]?.size ? { size: o[p.layer]!.size } : {}) }));
    setFocus(p.layer);
    setResult(null);
  };
  const takeOff = (c: Category) =>
    setOutfit((o) => {
      const next = { ...o };
      delete next[c];
      return next;
    });
  const pickType = (b: BodyType) => {
    if (locked) return;
    setTypeId(b.id);
    setBody(b.defaults);
  };
  const changeStyle = () => {
    if (!focused) return setToast(t.needGarment);
    const w = outfit[focus]!;
    setOutfit((o) => ({ ...o, [focus]: { ...w, colorIdx: (w.colorIdx + 1) % focused.colors.length } }));
  };
  const toggleLock = () => {
    if (!locked) {
      // freeze the current sizes on every worn item
      setOutfit((o) => {
        const next: Outfit = { ...o };
        items.forEach(({ category, worn }) => {
          next[category] = { ...o[category]!, size: worn.size };
        });
        return next;
      });
      setToast(t.lockedNote);
    }
    setLocked(!locked);
  };
  const saveLook = () => {
    storeLooks([...looks, { outfit, bodyType: typeId, body, at: Date.now() }]);
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
  const onFile = (f: File | undefined) => {
    if (!f || !f.type.startsWith("image/")) return;
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(URL.createObjectURL(f));
    setPhotoBlob(f);
    setResult(null);
  };
  const tryOn = async () => {
    const main = items.find((i) => i.category === "dress") ?? items.find((i) => i.category === "top") ?? items[0];
    if (!main) return setToast(t.needGarment);
    if (!photoBlob) {
      setToast(t.needPhoto);
      fileRef.current?.click();
      return;
    }
    setBusy(true);
    try {
      const req = { person: photoBlob, garment: await garmentImage(main.product, main.worn.colorIdx), category: main.category };
      try {
        setResult(await providerFor(cfg).run(req));
      } catch {
        setToast(t.serverFail);
        setResult(await mockProvider.run(req));
      }
    } finally {
      setBusy(false);
    }
  };

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const pill =
    "rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs transition-all hover:border-primary active:scale-95";
  const on = "border-primary bg-primary text-primary-foreground";
  const view = back ? "back" : "front";
  const list = products.filter((p) => p.layer === cat);
  const zoneLabel = (z: { offset: number }) =>
    z.offset === 0 ? "✓" : `${z.offset > 0 ? "+" : "−"}${n(Math.abs(z.offset))}`;

  const styleBtns: [typeof Shirt, string, () => void, boolean][] = [
    [Shirt, t.changeStyle, changeStyle, false],
    [Ruler, t.adjustFit, () => fitRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), false],
    [locked ? Lock : Unlock, locked ? t.unlockFit : t.lockFit, toggleLock, locked],
    [ImageIcon, t.switchBg, () => setBg((bg + 1) % BGS.length), false],
  ];

  return (
    <div dir={lang === "fa" ? "rtl" : "ltr"} lang={lang} className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-20 glass-panel border-x-0 border-t-0">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg sm:text-2xl">
              <span className="font-bold">{t.title}</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{t.brand}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button onClick={() => setCur(cur === "eur" ? "toman" : "eur")} className={pill}>
              {t[cur]}
            </button>
            <button onClick={() => setLang(lang === "en" ? "fa" : "en")} className={pill + " flex items-center gap-1"}>
              <Globe className="h-3.5 w-3.5" />
              {lang === "en" ? "فارسی" : "EN"}
            </button>
            <button onClick={() => setCartOpen(true)} aria-label={t.cart} className={pill + " flex items-center gap-1"}>
              <ShoppingBag className="h-3.5 w-3.5" />
              {n(cartCount)}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[250px_minmax(0,1fr)_250px]">
        {/* Select outfit */}
        <section className="order-2 min-w-0 rounded-3xl glass-panel p-4 lg:order-1">
          <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em]">{t.selectOutfit}</h2>
          <div className="mb-3 flex flex-wrap justify-center gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`${pill} ${cat === c ? on : ""}`}>
                {t[c]}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="rounded-2xl bg-secondary p-4 text-center text-xs text-muted-foreground">{t.noneInCategory}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {list.map((p) => {
                const worn = outfit[p.layer]?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => wearProduct(p, 0)}
                    className={`group min-w-0 overflow-hidden rounded-2xl border bg-card text-start transition-all hover:-translate-y-0.5 hover:shadow-lg ${worn ? "border-primary ring-1 ring-primary" : "border-border"}`}
                  >
                    <div className="relative h-28 bg-secondary p-2">
                      <Thumb p={p} />
                      {p.demo && (
                        <span className="absolute start-1.5 top-1.5 rounded-full bg-card/90 px-1.5 text-[9px] uppercase tracking-wider text-warning">
                          {t.demo}
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-semibold">{p.name[lang]}</p>
                      <p className="text-xs text-muted-foreground">{price(p.price)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Mirror */}
        <section className="order-1 min-w-0 lg:order-2">
          <div
            className="relative overflow-hidden rounded-[2rem] bg-cover bg-center transition-[background-image] duration-700"
            style={{ backgroundImage: `url(${BGS[bg]})` }}
          >
            <div className="flex flex-wrap justify-center gap-1.5 p-3">
              {bodyTypes.map((b) => (
                <button key={b.id} disabled={locked} onClick={() => pickType(b)} className={`${pill} disabled:opacity-50 ${typeId === b.id ? on : ""}`}>
                  {t[b.id]}
                </button>
              ))}
            </div>
            <div className="relative mx-auto h-[460px] w-[min(100%,380px)] rounded-[1.75rem] mirror-frame sm:h-[580px]">
              {result ? (
                <div className="relative h-full">
                  <img src={result.url} alt={t.resultTitle} className="h-full w-full rounded-[1.6rem] object-contain" />
                  {result.demo && (
                    <span className="absolute inset-x-3 top-3 rounded-full bg-card/90 px-3 py-1 text-center text-[10px] text-warning">
                      {t.demoResult}
                    </span>
                  )}
                  <button onClick={() => setResult(null)} aria-label={t.close} className="absolute end-3 bottom-3 rounded-full bg-card/90 p-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : photo ? (
                <img src={photo} alt={t.upload} className="h-full w-full rounded-[1.6rem] object-contain" />
              ) : compare ? (
                <div className="grid h-full grid-cols-2" dir="ltr">
                  {[false, true].map((withG) => (
                    <div key={String(withG)} className="relative min-w-0">
                      <PhotoStage bodyType={bodyType} body={body} items={withG ? items : []} view={view} zoom={zoom} fit={fitMap && withG ? fitZones : undefined} />
                      <span className="absolute inset-x-0 top-2 text-center text-[10px] uppercase tracking-widest">
                        {withG ? t.withGarments : t.without}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <PhotoStage bodyType={bodyType} body={body} items={items} view={view} zoom={zoom} fit={fitMap ? fitZones : undefined} />
              )}
              <div className="pointer-events-none absolute inset-x-[15%] bottom-3 h-6 rounded-[50%] border-2 border-holo/70 holo-glow" />
              {!photo && !result && (
                <span className="pointer-events-none absolute start-3 top-3 rounded-full bg-card/85 px-2 py-0.5 text-[9px] uppercase tracking-widest text-warning">
                  {t.stageDemo}
                </span>
              )}
              {locked && (
                <span className="absolute end-3 top-3 rounded-full bg-primary p-1.5 text-primary-foreground" title={t.lockedNote}>
                  <Lock className="h-3 w-3" />
                </span>
              )}
            </div>

            <div className="mx-auto mt-3 grid w-[min(100%,420px)] grid-cols-5 gap-1 rounded-2xl glass-panel p-1.5">
              {(
                [
                  [RotateCw, t.rotate, back, () => setBack(!back), !hasBack, t.noBack],
                  [ZoomIn, t.zoom, zoom, () => setZoom(!zoom), false, t.zoom],
                  [Columns2, t.compare, compare, () => setCompare(!compare), false, t.compare],
                  [Layers, t.fitMap, fitMap, () => setFitMap(!fitMap), false, t.fitMap],
                  [Bookmark, t.save, false, saveLook, false, t.save],
                ] as [typeof RotateCw, string, boolean, () => void, boolean, string][]
              ).map(([Icon, label, active, fn, disabled, tip]) => (
                <button
                  key={label}
                  onClick={fn}
                  disabled={disabled}
                  title={tip}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] transition-all disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="max-w-full truncate">{label}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 p-4">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <button onClick={() => fileRef.current?.click()} className={pill + " flex items-center gap-1.5"}>
                <Upload className="h-3.5 w-3.5" />
                {t.upload}
              </button>
              {photo && (
                <button
                  onClick={() => {
                    setPhoto(null);
                    setPhotoBlob(null);
                    setResult(null);
                  }}
                  className={pill}
                >
                  {t.removePhoto}
                </button>
              )}
              <button onClick={() => setCfgOpen(!cfgOpen)} aria-label={t.tryOnSettings} className={pill + " px-2"}>
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {cfgOpen && (
              <div className="mx-4 mb-3 rounded-2xl glass-panel p-3 text-xs">
                <p className="mb-2 font-semibold">{t.tryOnSettings}</p>
                {(["mock", "http"] as const).map((m) => (
                  <label key={m} className="mb-1 flex items-center gap-2">
                    <input
                      type="radio"
                      checked={cfg.mode === m}
                      onChange={() => {
                        const c = { ...cfg, mode: m };
                        setCfg(c);
                        saveConfig(c);
                      }}
                    />
                    {m === "mock" ? t.demoMode : t.ownServer}
                  </label>
                ))}
                {cfg.mode === "http" && (
                  <input
                    dir="ltr"
                    value={cfg.url}
                    placeholder="https://my-catvton.example.com/tryon"
                    aria-label={t.serverUrl}
                    onChange={(e) => {
                      const c = { ...cfg, url: e.target.value.trim() };
                      setCfg(c);
                      saveConfig(c);
                    }}
                    className="mt-1 w-full rounded-lg border border-input bg-card px-2 py-1.5"
                  />
                )}
              </div>
            )}
            <div className="px-4 pb-5">
              <button
                onClick={tryOn}
                disabled={busy}
                className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-lg font-semibold tracking-[0.2em] text-primary-foreground shadow-xl transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                <Sparkles className="h-5 w-5" />
                {busy ? t.trying : t.tryOn}
              </button>
            </div>
          </div>
        </section>

        {/* Style options + outfit */}
        <section className="order-3 min-w-0 space-y-4">
          <div className="rounded-3xl glass-panel p-4">
            <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em]">{t.styleOptions}</h2>
            <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
              {styleBtns.map(([Icon, label, fn, active]) => (
                <button key={label} onClick={fn} className="flex min-w-0 flex-col items-center gap-1.5 text-center text-[11px]">
                  <span className={`grid h-12 w-12 place-items-center rounded-full shadow-md transition-transform hover:scale-105 ${active ? "bg-gold text-primary-foreground" : "bg-primary text-primary-foreground"}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="leading-tight">{label}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">{t.bgNames[bg]}</p>
          </div>

          <div className="rounded-3xl glass-panel p-4">
            <h2 className="mb-2 font-display text-lg">{t.myOutfit}</h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.emptyOutfit}</p>
            ) : (
              <ul className="space-y-1.5">
                {items.map(({ category, product, worn }) => (
                  <li key={category} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs ${focus === category ? "bg-accent" : "bg-secondary"}`}>
                    <button onClick={() => setFocus(category)} className="flex min-w-0 flex-1 items-center gap-2 text-start">
                      <span className="h-3 w-3 shrink-0 rounded-full border border-border" style={{ background: product.colors[worn.colorIdx]?.hex }} />
                      <span className="min-w-0">
                        <span className="block truncate">{product.name[lang]}</span>
                        <span className="text-[10px] text-muted-foreground">{worn.size ? `${t.sizeShort} ${worn.size}` : t.noFit}</span>
                      </span>
                    </button>
                    <span className="shrink-0">{price(product.price)}</span>
                    <button onClick={() => takeOff(category)} aria-label={t.remove} className="shrink-0 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold">
              {t.total}
              <span>{price(outfitTotal)}</span>
            </p>
            <button disabled={!items.length} onClick={addAll} className="mt-2 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {t.addAll}
            </button>
          </div>
        </section>
      </main>

      {/* Preview looks */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="rounded-3xl glass-panel p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg">{t.previewLooks}</h2>
            {looks.length > 1 && <p className="text-[11px] text-muted-foreground">{t.compareTwo}</p>}
          </div>
          {looks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noLooks}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
              {looks.map((l, i) => {
                const bt = bodyTypes.find((b) => b.id === l.bodyType) ?? bodyType;
                const its = wornInOrder(l.outfit);
                const sel = pick.includes(i);
                return (
                  <div key={l.at} className={`relative min-w-0 rounded-2xl border bg-card p-1 ${sel ? "border-primary ring-1 ring-primary" : "border-border"}`}>
                    <button
                      onClick={() => {
                        setOutfit(l.outfit);
                        if (!locked) {
                          setTypeId(bt.id);
                          setBody(l.body);
                        }
                      }}
                      className="block h-32 w-full"
                    >
                      <PhotoStage bodyType={bt} body={l.body} items={its} />
                    </button>
                    <div className="flex items-center justify-between px-1 text-[10px]">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => setPick(sel ? pick.filter((x) => x !== i) : [...pick, i].slice(-2))}
                        />
                        {t.compare}
                      </label>
                      <button
                        aria-label={t.del}
                        onClick={() => {
                          storeLooks(looks.filter((_, j) => j !== i));
                          setPick([]);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Holographic size finder */}
      <section ref={fitRef} className="mx-auto mt-4 grid max-w-7xl gap-4 px-3 sm:px-4 lg:grid-cols-[1fr_260px_1fr]">
        <div className={`rounded-3xl glass-panel p-4 ${locked ? "opacity-70" : ""}`}>
          <h2 className="mb-3 font-display text-lg">{t.measurements}</h2>
          {(
            [
              ["height", 145, 200, "cm"],
              ["weight", 40, 120, "kg"],
              ["bust", 70, 120, "cm"],
              ["waist", 55, 110, "cm"],
              ["hips", 75, 130, "cm"],
            ] as const
          ).map(([k, min, max, u]) => (
            <label key={k} className="mb-2.5 block">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">{t[k]}</span>
                <span className="font-semibold">
                  {n(body[k])} {u}
                </span>
              </div>
              <input type="range" disabled={locked} min={min} max={max} value={body[k]} onChange={(e) => setBody({ ...body, [k]: +e.target.value })} className="w-full" />
            </label>
          ))}
          <p className="mt-3 mb-2 text-xs text-muted-foreground">{t.fitPref}</p>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label={t.fitPref}>
            {FIT_PREFS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={locked}
                aria-pressed={pref === p}
                onClick={() => {
                  setPref(p);
                  setOutfit((o) => Object.fromEntries(Object.entries(o).map(([k, w]) => [k, w ? { ...w, size: undefined } : w])) as Outfit);
                }}
                className={`${pill} disabled:opacity-50 ${pref === p ? on : ""}`}
              >
                {p === "fitted" ? t.prefFitted : p === "regular" ? t.prefRegular : t.prefRelaxed}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t.prefNote}</p>
          <button type="button" onClick={() => setGuide(!guide)} aria-expanded={guide} className="mt-2 text-xs underline-offset-4 hover:underline">
            {t.howTo}
          </button>
          {guide && (
            <ul className="mt-2 space-y-1.5 rounded-xl bg-secondary p-3 text-[12px] leading-relaxed text-muted-foreground">
              {[t.measureIntro, t.measureBust, t.measureWaist, t.measureHips, t.measureHeight, t.measureWeight].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-holo/40 bg-gradient-to-b from-card to-secondary p-3">
          <p className="mb-1 text-center text-[10px] uppercase tracking-[0.2em] text-info">{t.holoTitle}</p>
          <div className="h-72" dir="ltr">
            <HoloBody zones={fRec && (fRec.status === "ok" || fRec.status === "outside") && fSize ? (fRec.all.find((f) => f.size === fSize)?.zones ?? []) : []} label={zoneLabel} />
          </div>
          <div className="flex justify-center gap-3 text-[10px]">
            {(["tight", "perfect", "loose"] as FitStatus[]).map((st) => (
              <span key={st} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${statusCls[st]}`} />
                {t[st]}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-3xl glass-panel p-4">
          <h2 className="mb-1 font-display text-lg">{t.fitRec}</h2>
          {focused && <p className="mb-2 truncate text-xs text-muted-foreground">{focused.name[lang]}</p>}
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
              <p className="font-display text-4xl">{fRec.best.size}</p>
              {fRec.status === "outside" && <p className="mt-1 text-xs text-warning">{t.outside}</p>}
              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    disabled={locked}
                    onClick={() => setOutfit((o) => ({ ...o, [focus]: { ...o[focus]!, size: fRec.best.size === s ? undefined : s } }))}
                    className={`relative rounded-lg border border-border py-1.5 text-xs disabled:opacity-60 ${s === fSize ? on : ""}`}
                  >
                    {s}
                    {s === fRec.best.size && <span className="absolute -top-1 end-1 h-1.5 w-1.5 rounded-full bg-success" />}
                  </button>
                ))}
              </div>
              <ul className="mt-3 space-y-1.5">
                {(fRec.all.find((f) => f.size === fSize) ?? fRec.best).zones.map((z) => (
                  <li key={z.zone} className="flex flex-wrap items-center justify-between gap-1 rounded-xl bg-secondary px-3 py-2 text-xs">
                    <span>
                      {t[z.zone]}{" "}
                      <span className="text-muted-foreground">
                        {n(body[z.zone])} · {n(z.range[0])}–{n(z.range[1])}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${statusCls[z.status]}`} />
                      {z.offset === 0 ? t.within : `${n(Math.abs(z.offset))} ${z.offset > 0 ? t.above : t.below}`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] italic text-muted-foreground">{t.estimate}</p>
            </>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-3 py-8 sm:px-4">
        <AiStylist
          body={body}
          pref={pref}
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
        <p className="text-center text-[11px] text-muted-foreground">
          {n(products.length)} · {t.demoNote}
        </p>
      </section>

      {pick.length === 2 && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-foreground/40 p-4" onClick={() => setPick([])}>
          <div className="w-full max-w-lg rounded-3xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex justify-between">
              <h3 className="font-display text-lg">{t.compare}</h3>
              <button onClick={() => setPick([])} aria-label={t.close}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {pick.map((i) => {
                const l = looks[i];
                if (!l) return null;
                const bt = bodyTypes.find((b) => b.id === l.bodyType) ?? bodyType;
                const its = wornInOrder(l.outfit);
                return (
                  <div key={i} className="min-w-0 rounded-2xl bg-secondary p-2">
                    <div className="h-72">
                      <PhotoStage bodyType={bt} body={l.body} items={its} />
                    </div>
                    <p className="text-center text-xs font-semibold">{price(its.reduce((s, x) => s + x.product.price, 0))}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} setCart={setCart} lang={lang} cur={cur} />
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-center text-sm text-primary-foreground shadow-xl">{toast}</div>
      )}
    </div>
  );
}
