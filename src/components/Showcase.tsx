import { useState } from "react";
import { CATEGORIES, products, type Category, type Outfit, type Product } from "@/lib/catalog";
import { dict, formatPrice, type Currency, type Lang } from "@/lib/i18n";
import { garmentPath } from "@/components/stage/standins";

function Thumb({ p }: { p: Product }) {
  const c = p.colors[0]!;
  const img = c.image ?? p.photos.front;
  if (img) return <img src={img} alt="" className="h-full w-full object-contain" loading="lazy" />;
  const box: Record<string, string> = {
    pump: "150 830 100 50",
    trouser: "120 310 160 560",
    skirt: "110 310 180 310",
  };
  return (
    <svg viewBox={box[p.shape] ?? "100 170 200 500"} className="h-full w-full" aria-hidden>
      {garmentPath(p.shape).map((d) => (
        <path key={d} d={d} fill={c.hex} stroke="var(--border)" />
      ))}
    </svg>
  );
}

export function Showcase({
  lang,
  cur,
  outfit,
  onWear,
}: {
  lang: Lang;
  cur: Currency;
  outfit: Outfit;
  onWear: (p: Product, colorIdx: number) => void;
}) {
  const t = dict[lang];
  const [cat, setCat] = useState<Category | "all">("all");
  const list = products.filter((p) => cat === "all" || p.layer === cat);
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-xs transition-all ${active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary hover:text-primary"}`;
  return (
    <div className="min-w-0">
      <h2 className="mb-3 font-display text-xl">{t.showcase}</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", ...CATEGORIES] as const).map((c) => (
          <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>
            {t[c]}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
          {t.noneInCategory}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {list.map((p) => {
            const on = outfit[p.layer]?.id === p.id;
            return (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                className={`glass flex min-w-0 cursor-grab flex-col rounded-2xl p-3 transition-all hover:-translate-y-0.5 ${on ? "border-primary/70 gold-glow" : ""}`}
              >
                <button onClick={() => onWear(p, 0)} className="relative h-32 rounded-xl bg-secondary/60 p-2">
                  <Thumb p={p} />
                  {p.demo && (
                    <span className="absolute start-1.5 top-1.5 rounded-full border border-warning/60 bg-background/70 px-1.5 text-[9px] uppercase tracking-wider text-warning">
                      {t.demo}
                    </span>
                  )}
                </button>
                <p className="mt-2 truncate text-sm">{p.name[lang]}</p>
                <p className="text-xs text-primary">{formatPrice(p.price, cur, lang)}</p>
                {!p.photos.front && (
                  <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{t.standIn}</p>
                )}
                <div className="mt-2 flex items-center justify-between gap-1">
                  <div className="flex gap-1">
                    {p.colors.map((c, i) => (
                      <button
                        key={c.hex}
                        aria-label={c.name}
                        title={c.name}
                        onClick={() => onWear(p, i)}
                        style={{ background: c.hex }}
                        className={`h-4 w-4 rounded-full border border-border ${on && outfit[p.layer]?.colorIdx === i ? "ring-1 ring-primary ring-offset-1 ring-offset-card" : ""}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{on ? t.worn : t[p.layer]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
