import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { RotateCw, ZoomIn, Columns2, Bookmark, ShoppingBag, Globe, Layers } from "lucide-react";
import type { LayerSpec, GarmentShape } from "@/components/three/types";
import type { StageFigure } from "@/components/three/FittingStage";

const FittingStage = lazy(() => import("@/components/three/FittingStage"));
import garmentsData from "@/data/garments.json";
import { Mannequin, type View, type Outfit } from "@/components/Mannequin";
import { recommend, evaluateSize, SIZES, type Body, type Size, type SizeChart, type FitStatus } from "@/lib/fit";
import { AiStylist } from "@/components/AiStylist";
import { dict, toFaDigits, formatPrice, type Currency, type Lang } from "@/lib/i18n";

type Layer = "top" | "bottom" | "outer" | "shoes";
type Garment = { id: string; layer: Layer; shape: GarmentShape; name: Record<Lang, string>; price: number; colors: { name: string; hex: string }[]; chart: SizeChart };
const garments = garmentsData as unknown as Garment[];

const presets = {
  slim: { height: 168, weight: 52, bust: 80, waist: 63, hips: 86 },
  regular: { height: 165, weight: 62, bust: 89, waist: 72, hips: 95 },
  athletic: { height: 170, weight: 64, bust: 90, waist: 70, hips: 93 },
  curvy: { height: 163, weight: 72, bust: 100, waist: 78, hips: 106 },
  tall: { height: 182, weight: 66, bust: 88, waist: 70, hips: 96 },
} satisfies Record<string, Body>;
const outfitIdeas: Record<Layer, [string, number]>[] = [
  { top: ["silk-blouse", 1], bottom: ["satin-skirt", 0], outer: ["cashmere-coat", 1], shoes: ["leather-pump", 2] },
  { top: ["knit-top", 0], bottom: ["wool-trouser", 1], outer: ["cashmere-coat", 0], shoes: ["leather-pump", 0] },
  { top: ["knit-top", 2], bottom: ["wool-trouser", 2], outer: ["", 0], shoes: ["leather-pump", 1] },
] as never;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maison Éclat — Virtual Fitting Room" },
      { name: "description", content: "Try luxury pieces on your measurements and get a precise size recommendation." },
      { property: "og:title", content: "Maison Éclat — Virtual Fitting Room" },
      { property: "og:description", content: "Try luxury pieces on your measurements and get a precise size recommendation." },
    ],
  }),
  component: FittingRoom,
});

const statusCls: Record<FitStatus, string> = { tight: "bg-warning", perfect: "bg-success", loose: "bg-info" };

function FittingRoom() {
  const [lang, setLang] = useState<Lang>("en");
  const [cur, setCur] = useState<Currency>("eur");
  const t = dict[lang];
  const n = (v: string | number) => (lang === "fa" ? toFaDigits(v) : String(v));
  const [gid, setGid] = useState(garments[0]!.id);
  const g = garments.find((x) => x.id === gid)!;
  const [colorIdx, setColorIdx] = useState(0);
  const [size, setSize] = useState<Size>("M");
  const [body, setBody] = useState<Body>(presets.regular);
  const [view, setView] = useState<View>("front");
  const [rotating, setRotating] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [compare, setCompare] = useState(false);
  const [cart, setCart] = useState(0);
  const [toast, setToast] = useState("");
  const [wardrobe, setWardrobe] = useState<Outfit>({ top: "#F5E9D6", bottom: "#3a3a3c" });
  const [savedCount, setSavedCount] = useState(0);
  const [wearIds, setWearIds] = useState<Partial<Record<Layer, string>>>({ top: "silk-blouse", bottom: "wool-trouser" });
  const [fitMap, setFitMap] = useState(false);

  useEffect(() => setSavedCount(JSON.parse(localStorage.getItem("looks") || "[]").length), []);
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(""), 2000); return () => clearTimeout(id); } return undefined; }, [toast]);

  const rec = useMemo(() => recommend(g.chart, body), [g, body]);
  const current = rec.best;
  useEffect(() => setSize(rec.best.size), [rec.best.size, gid]);
  const outfit: Outfit = { ...wardrobe, [g.layer]: g.colors[colorIdx]!.hex };
  const ids = { ...wearIds, [g.layer]: gid };
  const layersFor = (currentSize: Size): LayerSpec[] =>
    (Object.keys(ids) as Layer[]).flatMap((l) => {
      const gg = garments.find((x) => x.id === ids[l]);
      const color = outfit[l];
      if (!gg || !color) return [];
      const sz = gg.id === gid ? currentSize : recommend(gg.chart, body).best.size;
      return [{ layer: l, shape: gg.shape, color, measures: gg.chart[sz] }];
    });
  const fitOf = (s: Size) => Object.fromEntries(evaluateSize(g.chart, s, body).zones.map((z) => [z.zone, z.status]));
  const figures: StageFigure[] = (compare ? [rec.best.size, size] : [size]).map((s, i) => ({ key: `${i}`, body, layers: layersFor(s), fitMap, fit: fitOf(s) }));
  const price = formatPrice(g.price, cur, lang);

  const pick = (id: string, c = 0) => { const ng = garments.find((x) => x.id === id)!; setWardrobe({ ...outfit }); setWearIds({ ...wearIds, [g.layer]: gid, [ng.layer]: id }); setGid(id); setColorIdx(c); };
  const saveLook = () => {
    const looks = JSON.parse(localStorage.getItem("looks") || "[]");
    looks.push({ outfit, ids, garment: gid, size, body, at: Date.now() });
    localStorage.setItem("looks", JSON.stringify(looks)); setSavedCount(looks.length); setToast(t.saved);
  };
  const tryIdea = (idea: Record<Layer, [string, number]>) => {
    const o: Outfit = {};
    (Object.keys(idea) as Layer[]).forEach((l) => { const [id, c] = idea[l]; const gg = garments.find((x) => x.id === id); if (gg) o[l] = gg.colors[c]!.hex; });
    const ids: Partial<Record<Layer, string>> = {};
    (Object.keys(idea) as Layer[]).forEach((l) => { if (idea[l][0]) ids[l] = idea[l][0]; });
    setWearIds(ids); setWardrobe(o); const [tid, tc] = idea.top; setGid(tid); setColorIdx(tc);
  };

  const btn = "rounded-full border border-border px-3 py-1.5 text-xs transition-all hover:border-primary hover:text-primary active:scale-95";
  const on = "border-primary bg-primary text-primary-foreground gold-glow hover:text-primary-foreground";

  return (
    <div dir={lang === "fa" ? "rtl" : "ltr"} lang={lang} className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-20 glass border-x-0 border-t-0">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg tracking-[0.2em] text-primary">{t.brand}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setCur(cur === "eur" ? "toman" : "eur")} className={btn}>{t[cur]}</button>
            <button onClick={() => setLang(lang === "en" ? "fa" : "en")} className={btn + " flex items-center gap-1"}><Globe className="h-3.5 w-3.5" />{lang === "en" ? "فارسی" : "English"}</button>
            <span className="flex items-center gap-1 rounded-full border border-primary/40 px-2.5 py-1.5 text-xs text-primary"><ShoppingBag className="h-3.5 w-3.5" />{n(cart)}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[300px_1fr_320px]">
        {/* Product */}
        <section className="order-2 min-w-0 space-y-4 rounded-3xl bg-card p-5 lg:order-1">
          <div className="flex flex-wrap gap-2">
            {garments.map((x) => (
              <button key={x.id} onClick={() => pick(x.id)} className={`${btn} shrink-0 ${x.id === gid ? on : ""}`}>{t[x.layer]}·{x.name[lang].split(" ").slice(-1)}</button>
            ))}
          </div>
          <div>
            <p className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest text-primary">{t[g.layer]}<span className="rounded-full border border-warning/60 px-2 py-0.5 text-warning" title={t.demoNote}>{t.demo}</span></p>
            <h1 className="mt-1 font-display text-2xl">{g.name[lang]}</h1>
            <p className="mt-2 text-xl text-primary">{price}</p>
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{t.color} — {g.colors[colorIdx]!.name}</p>
            <div className="flex gap-3">
              {g.colors.map((c, i) => (
                <button key={c.hex} aria-label={c.name} onClick={() => setColorIdx(i)} style={{ background: c.hex }}
                  className={`h-8 w-8 rounded-full border border-border transition-transform hover:scale-110 ${i === colorIdx ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">{t.size}</p>
            <div className="grid grid-cols-5 gap-2">
              {SIZES.map((s) => (
                <button key={s} onClick={() => setSize(s)} className={`relative rounded-xl border border-border py-2 text-sm transition-all hover:border-primary ${s === size ? on : ""}`}>
                  {s}{(rec.status === "ok" || rec.status === "outside") && s === rec.best.size && <span className="absolute -top-1 end-1 h-1.5 w-1.5 rounded-full bg-success" />}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { setCart(cart + 1); setToast(t.added); }} className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground gold-glow transition-all hover:brightness-110 active:scale-[0.98]">{t.addToCart}</button>
        </section>

        {/* Stage */}
        <section className="order-1 flex min-w-0 flex-col overflow-hidden rounded-3xl stage-bg lg:order-2">
          <div className="flex justify-center gap-2 p-4">
            {(["front", "back", "side"] as View[]).map((v) => <button key={v} onClick={() => setView(v)} className={`${btn} ${view === v ? on : ""}`}>{t[v]}</button>)}
          </div>
          <div className="relative h-[440px] touch-none sm:h-[540px]">
            <ClientOnly fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">…</div>}>
              <Suspense fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">…</div>}>
                <FittingStage figures={figures} view={view} zoom={zoom} autoRotate={rotating} />
              </Suspense>
            </ClientOnly>
            <span className="pointer-events-none absolute start-3 top-2 rounded-full border border-warning/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-warning">{t.stageDemo}</span>
            {compare && (
              <div className="pointer-events-none absolute inset-x-0 top-1 flex justify-around text-[10px] uppercase tracking-widest text-primary" dir="ltr">
                <span>{t.recommended}: {rec.best.size}</span><span>{t.selected}: {size}</span>
              </div>
            )}
            {fitMap && (
              <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-3 rounded-full glass px-3 py-1.5 text-[11px]">
                {(["tight", "perfect", "loose"] as FitStatus[]).map((st) => <span key={st} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${statusCls[st]}`} />{t[st]}</span>)}
              </div>
            )}
          </div>
          <div className="m-3 grid grid-cols-5 gap-1 rounded-2xl glass p-1.5">
            {[[RotateCw, t.rotate, rotating, () => setRotating(!rotating)], [ZoomIn, t.zoom, zoom, () => setZoom(!zoom)], [Columns2, t.compare, compare, () => setCompare(!compare)], [Layers, t.fitMap, fitMap, () => setFitMap(!fitMap)], [Bookmark, t.save, false, saveLook]].map(([Icon, label, active, fn]: any) => (
              <button key={label} onClick={fn} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] transition-all hover:text-primary ${active ? "bg-accent text-primary" : "text-muted-foreground"}`}><Icon className="h-4 w-4" />{label}</button>
            ))}
          </div>
        </section>

        {/* Measurements + fit */}
        <section className="order-3 min-w-0 space-y-5">
          <div className="rounded-3xl bg-card p-5">
            <h2 className="mb-4 font-display text-lg">{t.measurements}</h2>
            {([["height", 145, 200, "cm"], ["weight", 40, 120, "kg"], ["bust", 70, 120, "cm"], ["waist", 55, 110, "cm"], ["hips", 75, 130, "cm"]] as const).map(([k, min, max, u]) => (
              <label key={k} className="mb-3 block">
                <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{t[k]}</span><span className="text-primary">{n(body[k])} {u}</span></div>
                <input type="range" min={min} max={max} value={body[k]} onChange={(e) => setBody({ ...body, [k]: +e.target.value })} className="w-full" />
              </label>
            ))}
          </div>
          <div className="rounded-3xl border border-primary/30 bg-card p-5 gold-glow">
            <h2 className="mb-4 font-display text-lg">{t.fitRec}</h2>
            {rec.status === "noChart" ? <p className="text-sm text-muted-foreground">{g.layer === "shoes" ? t.noFit + " " : ""}{t.noChart}</p>
            : rec.status === "invalid" ? <p className="text-sm text-warning">{t.invalidMsg} {rec.invalid.map((z) => t[z]).join("، ")}</p> : <>
              <p className="text-xs text-muted-foreground">{rec.status === "ok" ? t.recommended : t.closest}</p>
              <p className="font-display text-4xl text-primary">{rec.best.size}</p>
              {rec.status === "outside" && <p className="mt-2 text-xs text-warning">{t.outside}</p>}
              <p className="mt-4 mb-2 text-xs text-muted-foreground">{t.rangesUsed} · {t.size} {rec.best.size}</p>
              <ul className="space-y-2">
                {rec.best.zones.map((z) => (
                  <li key={z.zone} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl bg-secondary px-3 py-2 text-sm">
                    <span>{t[z.zone]} <span className="text-xs text-muted-foreground">{n(body[z.zone])} · {n(z.range[0])}–{n(z.range[1])}</span></span>
                    <span className="flex items-center gap-2 text-xs"><span className={`h-2 w-2 rounded-full ${statusCls[z.status]}`} />{z.offset === 0 ? t.within : `${n(Math.abs(z.offset))} ${z.offset > 0 ? t.above : t.below}`}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] italic text-muted-foreground">{t.estimate}</p>
            </>}
          </div>
        </section>
      </main>

      <section className="mx-auto max-w-7xl space-y-8 px-4 pb-16">
        <AiStylist body={body} lang={lang} cur={cur} onApply={(pieces) => {
          const o: Outfit = {};
          pieces.forEach((p) => { const gg = garments.find((x) => x.id === p.id); if (gg) o[p.layer as Layer] = gg.colors[p.colorIndex]!.hex; });
          setWardrobe(o);
          setWearIds(Object.fromEntries(pieces.map((p) => [p.layer, p.id])));
          const first = pieces[0]!; setGid(first.id); setColorIdx(first.colorIndex); setSize(first.size as Size);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }} />
        <div>
          <h2 className="mb-3 font-display text-xl">{t.bodyTypes}</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Object.entries(presets).map(([k, b]) => (
              <button key={k} onClick={() => setBody(b)} className="flex h-40 w-28 shrink-0 flex-col items-center justify-end rounded-2xl bg-card p-2 transition-all hover:-translate-y-1 hover:gold-glow">
                <div className="h-28"><Mannequin body={b} outfit={{}} view="front" /></div>
                <span className="text-xs">{t[k as keyof typeof t] as string}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-display text-xl">{t.outfits}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {outfitIdeas.map((idea, i) => {
              const o: Outfit = {};
              (Object.keys(idea) as Layer[]).forEach((l) => { const gg = garments.find((x) => x.id === idea[l][0]); if (gg) o[l] = gg.colors[idea[l][1]]!.hex; });
              return (
                <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4">
                  <div className="h-32 shrink-0"><Mannequin body={body} outfit={o} view="front" /></div>
                  <div className="min-w-0">
                    <p className="font-display">{t.outfitNames[i]}</p>
                    <button onClick={() => tryIdea(idea)} className={btn + " mt-3"}>{t.tryOutfit}</button>
                  </div>
                </div>
              );
            })}
          </div>
          {savedCount > 0 && <p className="mt-4 text-xs text-muted-foreground">{t.savedLooks}: {n(savedCount)}</p>}
        </div>
      </section>

      {toast && <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full glass px-5 py-2 text-sm text-primary gold-glow animate-in fade-in slide-in-from-bottom-2">{toast}</div>}
    </div>
  );
}
