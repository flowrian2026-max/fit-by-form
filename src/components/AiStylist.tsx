import { useState } from "react";
import { Sparkles } from "lucide-react";
import garmentsData from "@/data/garments.json";
import { styleOutfit, type StylistResult, type StylistPiece } from "@/lib/stylist";
import { dict, formatPrice, type Currency, type Lang } from "@/lib/i18n";
import type { Body } from "@/lib/fit";

const garments = garmentsData as unknown as {
  id: string;
  name: Record<Lang, string>;
  colors: { name: string; hex: string }[];
}[];

export function AiStylist({
  body,
  lang,
  cur,
  onApply,
}: {
  body: Body;
  lang: Lang;
  cur: Currency;
  onApply: (pieces: StylistPiece[]) => void;
}) {
  const t = dict[lang];
  const n = (v: number) => formatPrice(v, cur, lang);
  const [occasion, setOccasion] = useState("");
  const [style, setStyle] = useState("");
  const [budget, setBudget] = useState(2500);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<StylistResult | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (occasion.trim().length < 2 || loading) return;
    setLoading(true);
    setRes(null);
    await new Promise((r) => setTimeout(r, 350));
    setRes(styleOutfit({ occasion, style, budget, lang, body, budgetLabel: n(budget) }));
    setLoading(false);
  };

  const field =
    "w-full rounded-xl border border-input bg-secondary px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

  return (
    <div className="rounded-3xl border border-primary/30 bg-card p-5 gold-glow">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <h2 className="font-display text-xl">{t.aiTitle}</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{t.aiSub}</p>
      <div className="grid gap-5 md:grid-cols-2">
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-xs text-muted-foreground">
            {t.occasion}
            <input
              className={field + " mt-1"}
              value={occasion}
              maxLength={300}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder={t.occasionPh}
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            {t.style}
            <input
              className={field + " mt-1"}
              value={style}
              maxLength={300}
              onChange={(e) => setStyle(e.target.value)}
              placeholder={t.stylePh}
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            <span className="flex justify-between">
              {t.budget}
              <span className="text-primary">{n(budget)}</span>
            </span>
            <input
              type="range"
              min={300}
              max={5000}
              step={50}
              value={budget}
              onChange={(e) => setBudget(+e.target.value)}
              className="mt-2 w-full"
            />
          </label>
          <button
            disabled={loading || occasion.trim().length < 2}
            className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? t.styling : t.styleMe}
          </button>
        </form>
        <div className="min-h-40 rounded-2xl bg-secondary p-4">
          {loading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-4 animate-pulse rounded bg-muted"
                  style={{ width: `${90 - i * 20}%` }}
                />
              ))}
            </div>
          )}
          {res && (
            <div className="space-y-3 animate-in fade-in">
              <p className="font-display text-lg text-primary">{res.title}</p>
              <p className="text-sm text-muted-foreground">{res.rationale}</p>
              <ul className="space-y-1.5">
                {res.pieces.map((p) => {
                  const g = garments.find((x) => x.id === p.id)!;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full border border-border"
                          style={{ background: g.colors[p.colorIndex]?.hex }}
                        />
                        <span className="truncate">{g.name[lang]}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {!p.hasSize ? "" : p.size + " · "}
                        {n(p.price)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                <span>
                  {t.total}: <span className="text-primary">{n(res.total)}</span>
                  {res.overBudget && (
                    <span className="ms-2 text-xs text-warning">{t.overBudget}</span>
                  )}
                </span>
                <button
                  onClick={() => onApply(res.pieces)}
                  className="rounded-full border border-primary px-3 py-1.5 text-xs text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                >
                  {t.applyLook}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
