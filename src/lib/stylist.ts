import garmentsData from "@/data/garments.json";
import { recommend, type Body, type SizeChart, type Size } from "@/lib/fit";
import type { Lang } from "@/lib/i18n";

type Layer = "top" | "bottom" | "outer" | "shoes";
type Garment = {
  id: string;
  layer: Layer;
  price: number;
  tags: string[];
  colors: { name: string; hex: string }[];
  chart: SizeChart;
};
const garments = garmentsData as unknown as Garment[];

export type Occasion = "formal" | "work" | "casual";
export type StylistPiece = {
  id: string;
  layer: Layer;
  colorIndex: number;
  size: Size;
  hasSize: boolean;
  price: number;
};
export type StylistResult = {
  title: string;
  rationale: string;
  pieces: StylistPiece[];
  total: number;
  overBudget: boolean;
};

const has = (text: string, words: string[]) => words.some((w) => text.includes(w));
const FORMAL = [
  "gala",
  "wedding",
  "dinner",
  "party",
  "evening",
  "black-tie",
  "cocktail",
  "date",
  "opera",
  "عروسی",
  "مهمانی",
  "شام",
  "جشن",
  "شب",
];
const WORK = [
  "office",
  "work",
  "meeting",
  "interview",
  "business",
  "conference",
  "کار",
  "جلسه",
  "اداری",
  "مصاحبه",
];
const COLD = ["winter", "autumn", "fall", "cold", "snow", "زمستان", "پاییز", "سرد"];

export function classifyOccasion(text: string): { occasion: Occasion; cold: boolean } {
  const t = text.toLowerCase();
  return {
    occasion: has(t, FORMAL) ? "formal" : has(t, WORK) ? "work" : "casual",
    cold: has(t, COLD),
  };
}

const PALETTE: [string[], string[]][] = [
  [
    ["dark", "black", "noir", "moody", "مشکی", "تیره"],
    ["Noir", "Black", "Charcoal", "Mocha", "Wine"],
  ],
  [
    ["gold", "glam", "shine", "طلایی", "درخشان"],
    ["Gold", "Champagne", "Camel"],
  ],
  [
    ["light", "neutral", "minimal", "cream", "soft", "روشن", "مینیمال", "کرم"],
    ["Ivory", "Cream", "Nude", "Sage"],
  ],
];
function pickColor(g: Garment, style: string) {
  const s = style.toLowerCase();
  for (const [words, names] of PALETTE) {
    if (has(s, words)) {
      const i = g.colors.findIndex((c) => names.includes(c.name));
      if (i >= 0) return i;
    }
  }
  return 0;
}

const TITLES: Record<Lang, Record<Occasion, string>> = {
  en: { formal: "Evening Elegance", work: "Polished Workwear", casual: "Effortless Ease" },
  fa: { formal: "شکوه شبانه", work: "استایل رسمی کاری", casual: "راحتی بی‌تکلف" },
};

export function styleOutfit(input: {
  occasion: string;
  style: string;
  budget: number;
  body: Body;
  lang: Lang;
  budgetLabel?: string;
}): StylistResult {
  const { occasion, cold } = classifyOccasion(input.occasion);
  const fitScore = (g: Garment) => {
    const r = recommend(g.chart, input.body);
    return r.status === "ok" ? 100 : r.status === "outside" ? 50 - r.best.penalty : 50;
  };
  const score = (g: Garment) => (g.tags.includes(occasion) ? 1000 : 0) + fitScore(g);
  const best = (layer: Layer) =>
    garments.filter((g) => g.layer === layer).sort((a, b) => score(b) - score(a))[0];

  let chosen: Garment[] = [best("top")!, best("bottom")!];
  const outer = best("outer");
  if (outer && (cold || outer.tags.includes(occasion))) chosen.push(outer);
  const shoes = best("shoes");
  if (shoes) chosen.push(shoes);

  const total = () => chosen.reduce((s, g) => s + g.price, 0);
  // Over budget: drop the coat, then shoes, then swap to the cheapest top/bottom.
  for (const layer of ["outer", "shoes"] as Layer[])
    if (total() > input.budget) chosen = chosen.filter((g) => g.layer !== layer);
  for (const layer of ["top", "bottom"] as Layer[]) {
    if (total() <= input.budget) break;
    const cheapest = garments
      .filter((g) => g.layer === layer)
      .sort((a, b) => a.price - b.price)[0]!;
    chosen = chosen.map((g) => (g.layer === layer ? cheapest : g));
  }

  const pieces: StylistPiece[] = chosen.map((g) => {
    const r = recommend(g.chart, input.body);
    return {
      id: g.id,
      layer: g.layer,
      colorIndex: pickColor(g, input.style),
      size: r.best.size,
      hasSize: r.status === "ok" || r.status === "outside",
      price: g.price,
    };
  });
  const sum = total();
  const b = input.budgetLabel ?? `€${input.budget}`;
  const rationale =
    input.lang === "fa"
      ? `این ست بر اساس قوانین ساده برای موقعیت «${TITLES.fa[occasion]}»${cold ? " و هوای سرد" : ""} با بودجه ${b} انتخاب شد. سایزها از جدول سایز هر محصول و اندازه‌های شما تخمین زده شده‌اند.`
      : `Picked by simple rules for a ${occasion} occasion${cold ? " in cooler weather" : ""} within ${b}. Sizes are estimated from each product's size chart and your measurements.`;

  return {
    title: TITLES[input.lang][occasion],
    rationale,
    pieces,
    total: sum,
    overBudget: sum > input.budget,
  };
}
