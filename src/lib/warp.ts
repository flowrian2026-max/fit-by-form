import type { Body } from "@/lib/fit";

/** Stage coordinates: SVG viewBox 400×900, figure centred on CX, feet at FEET_Y. */
export const CX = 200;
export const FEET_Y = 870;
/** Every band / height change is capped at ±15% so the figure never looks broken. */
export const MAX_WARP = 0.15;

export type LandmarkKey = "shoulders" | "bust" | "waist" | "hips" | "knees" | "ankles";
export const LANDMARK_KEYS: LandmarkKey[] = ["shoulders", "bust", "waist", "hips", "knees", "ankles"];
/** y = vertical position, hw = half-width of the figure at that line (stage units). */
export type Landmarks = Record<LandmarkKey, { y: number; hw: number }>;

export const clampWarp = (r: number) =>
  Number.isFinite(r) ? Math.min(1 + MAX_WARP, Math.max(1 - MAX_WARP, r)) : 1;

/** Width factor per band, relative to the body type's default measurements. */
export function bandFactors(body: Body, base: Body): Record<LandmarkKey, number> {
  const w = Math.pow(body.weight / base.weight, 0.3);
  const bust = (body.bust / base.bust) * w;
  const waist = (body.waist / base.waist) * w;
  const hips = (body.hips / base.hips) * w;
  return {
    shoulders: clampWarp(1 + (bust - 1) * 0.6),
    bust: clampWarp(bust),
    waist: clampWarp(waist),
    hips: clampWarp(hips),
    knees: clampWarp(1 + (hips - 1) * 0.7),
    ankles: clampWarp(1 + (hips - 1) * 0.4),
  };
}

/** Whole-figure scale for height (reference figure is 170 cm). */
export const heightScale = (height: number) => clampWarp(height / 170);

/** Interpolated width factor at a given y; the head band stays unwarped. */
export function factorAt(y: number, lm: Landmarks, f: Record<LandmarkKey, number>): number {
  const pts: [number, number][] = [
    [lm.shoulders.y - 40, 1],
    ...LANDMARK_KEYS.map((k) => [lm[k].y, f[k]] as [number, number]),
  ];
  if (y <= pts[0]![0]) return 1;
  for (let i = 1; i < pts.length; i++) {
    const [y1, v1] = pts[i]!;
    const [y0, v0] = pts[i - 1]!;
    if (y <= y1) return v0 + ((v1 - v0) * (y - y0)) / (y1 - y0);
  }
  return pts[pts.length - 1]![1];
}

/** How much wider/narrower a garment is than the body it sits on (1 = ideal 5 cm ease). */
export const sizeFactor = (garment: number | undefined, body: number) =>
  garment === undefined ? 1 : Math.min(1.12, Math.max(0.88, (garment - 5) / body));

export type Anchors = Partial<
  Record<
    | "leftShoulder"
    | "rightShoulder"
    | "hem"
    | "waistLeft"
    | "waistRight"
    | "leftAnkle"
    | "rightAnkle",
    [number, number]
  >
>;
export type Placement = { tx: number; ty: number; sx: number; sy: number; ox: number; oy: number };

/**
 * Vertical landmark lines of the reference figure that garment art and anchors are drawn on.
 * Different body images (for example real photos) have other proportions, so heights are
 * mapped between these lines and the body's own landmark lines.
 */
export const REF_Y: Record<LandmarkKey, number> = {
  shoulders: 190,
  bust: 250,
  waist: 330,
  hips: 410,
  knees: 630,
  ankles: 840,
};

/** Piecewise-linear map of a reference y (garment art space) onto the body's own landmark lines. */
export function mapY(y: number, lm: Landmarks): number {
  const ref = LANDMARK_KEYS.map((k) => REF_Y[k]);
  const dst = LANDMARK_KEYS.map((k) => lm[k].y);
  const last = ref.length - 1;
  if (y <= ref[0]!) return dst[0]! + (y - ref[0]!);
  if (y >= ref[last]!) return dst[last]! + (y - ref[last]!);
  for (let i = 1; i <= last; i++) {
    if (y <= ref[i]!) {
      const t = (y - ref[i - 1]!) / (ref[i]! - ref[i - 1]!);
      return dst[i - 1]! + t * (dst[i]! - dst[i - 1]!);
    }
  }
  return y;
}

/**
 * Maps a garment's anchor pair onto the matching body landmark line. Width follows the body's
 * half-width at that line; length follows the hem anchor, so the hem lands where the same cut
 * would land on this body (a trouser hem stays at the ankle even on a short-legged figure).
 */
export function placeGarment(
  category: "top" | "bottom" | "dress" | "outer" | "shoes",
  a: Anchors,
  lm: Landmarks,
  widthFactor = 1,
): Placement | null {
  const pair =
    category === "bottom"
      ? ([a.waistLeft, a.waistRight, lm.waist] as const)
      : category === "shoes"
        ? ([a.leftAnkle, a.rightAnkle, lm.ankles] as const)
        : ([a.leftShoulder, a.rightShoulder, lm.shoulders] as const);
  const [l, r, target] = pair;
  if (!l || !r || r[0] - l[0] <= 0) return null;
  const s = (2 * target.hw) / (r[0] - l[0]);
  const oy = (l[1] + r[1]) / 2;
  let sy = s;
  if (category !== "shoes" && a.hem && a.hem[1] - oy > 1) {
    const hemY = mapY(a.hem[1], lm);
    sy = (hemY - target.y) / (a.hem[1] - oy);
  }
  return {
    tx: CX,
    ty: target.y,
    sx: s * widthFactor,
    sy,
    ox: (l[0] + r[0]) / 2,
    oy,
  };
}
