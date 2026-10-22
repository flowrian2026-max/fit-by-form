import garmentsData from "@/data/garments.json";
import bodyTypesData from "@/data/bodyTypes.json";
import type { Body, SizeChart, Size } from "@/lib/fit";
import type { Lang } from "@/lib/i18n";
import type { Anchors, Landmarks } from "@/lib/warp";

export type Category = "top" | "bottom" | "dress" | "outer" | "shoes";
export const CATEGORIES: Category[] = ["top", "bottom", "dress", "outer", "shoes"];
/** Draw order on the model, back to front. */
export const LAYER_ORDER: Category[] = ["bottom", "top", "dress", "outer", "shoes"];
export type Shape = "blouse" | "knit" | "trouser" | "skirt" | "coat" | "pump" | "dress";

export type Product = {
  id: string;
  layer: Category;
  shape: Shape;
  name: Record<Lang, string>;
  price: number;
  colors: { name: string; hex: string; image: string | null }[];
  chart: SizeChart;
  tags: string[];
  demo: boolean;
  photos: { front: string | null; back: string | null };
  anchors: Anchors;
};
export const products = garmentsData as unknown as Product[];
export const productById = (id: string) => products.find((p) => p.id === id);

export type BodyType = {
  id: "slim" | "regular" | "athletic" | "curvy" | "tall";
  defaults: Body;
  image: { front: string | null; back: string | null };
  landmarks: Landmarks;
};
export const bodyTypes = bodyTypesData as unknown as BodyType[];

export type Worn = { id: string; colorIdx: number; size?: Size };
export type Outfit = Partial<Record<Category, Worn>>;

/** One garment per slot; a dress replaces top + bottom, and a top or bottom replaces a dress. */
export function wear(outfit: Outfit, category: Category, item: Worn): Outfit {
  const next: Outfit = { ...outfit, [category]: item };
  if (category === "dress") {
    delete next.top;
    delete next.bottom;
  }
  if (category === "top" || category === "bottom") delete next.dress;
  return next;
}

export const wornInOrder = (o: Outfit) =>
  LAYER_ORDER.flatMap((c) => {
    const w = o[c];
    const p = w && productById(w.id);
    return p && w ? [{ category: c, product: p, worn: w }] : [];
  });
