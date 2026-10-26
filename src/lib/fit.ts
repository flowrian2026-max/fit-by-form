export type Zone = "bust" | "waist" | "hips";
export type Size = "XS" | "S" | "M" | "L" | "XL";
/** tight = body above the size's range, perfect = within, loose = below. */
export type FitStatus = "tight" | "perfect" | "loose";
export type Body = { height: number; weight: number; bust: number; waist: number; hips: number };
/** Garment circumferences (cm) per size. The body range a size fits is derived from these. */
export type SizeChart = Record<Size, Partial<Record<Zone, number>>>;

export const SIZES: Size[] = ["XS", "S", "M", "L", "XL"];
export const ZONES: Zone[] = ["bust", "waist", "hips"];

/** How snug the customer wants the garment: shifts the ease window toward smaller or larger sizes. */
export type FitPref = "fitted" | "regular" | "relaxed";
export const FIT_PREFS: FitPref[] = ["fitted", "regular", "relaxed"];
/** Ease window (cm): a body fits a garment when garment − body is inside it. */
export const EASE: Record<FitPref, [number, number]> = {
  fitted: [0, 5],
  regular: [2, 8],
  relaxed: [5, 12],
};
export const MIN_EASE = EASE.regular[0];
export const MAX_EASE = EASE.regular[1];
/** Plausible body circumference (cm); anything outside is treated as invalid input. */
export const VALID_RANGE: [number, number] = [40, 200];

export function zoneStatus(ease: number, pref: FitPref = "regular"): FitStatus {
  const [lo, hi] = EASE[pref];
  if (ease < lo) return "tight";
  if (ease > hi) return "loose";
  return "perfect";
}

/** Body range (cm) that a garment measurement fits. */
export function bodyRange(garment: number, pref: FitPref = "regular"): [number, number] {
  const [lo, hi] = EASE[pref];
  return [garment - hi, garment - lo];
}

export type ZoneFit = {
  zone: Zone;
  range: [number, number];
  status: FitStatus;
  /** cm outside the range: 0 when within, positive = above (tight), negative = below (roomy). */
  offset: number;
};
export type SizeFit = { size: Size; fits: boolean; penalty: number; zones: ZoneFit[] };

export function zoneFit(zone: Zone, body: number, garment: number, pref: FitPref = "regular"): ZoneFit {
  const range = bodyRange(garment, pref);
  const offset = body > range[1] ? body - range[1] : body < range[0] ? body - range[0] : 0;
  return {
    zone,
    range,
    offset: Math.round(offset * 10) / 10,
    status: offset > 0 ? "tight" : offset < 0 ? "loose" : "perfect",
  };
}

export function evaluateSize(
  chart: SizeChart,
  size: Size,
  body: Body,
  pref: FitPref = "regular",
): SizeFit {
  const zones = ZONES.filter((z) => chart[size]?.[z] !== undefined).map((z) =>
    zoneFit(z, body[z], chart[size][z] as number, pref),
  );
  return {
    size,
    zones,
    fits: zones.length > 0 && zones.every((z) => z.status === "perfect"),
    // tight is worse than roomy
    penalty: zones.reduce((s, z) => s + (z.offset > 0 ? z.offset * 1.5 : -z.offset), 0),
  };
}

export type Recommendation = {
  /** ok: a size fits every zone · outside: no size fits, best = closest · noChart: product has no bust/waist/hips data · invalid: body values unusable */
  status: "ok" | "outside" | "noChart" | "invalid";
  best: SizeFit;
  all: SizeFit[];
  /** Zones the chart covers. */
  zones: Zone[];
  /** Body zones that are missing or implausible. */
  invalid: Zone[];
};

/** Single source of truth: smallest size where every measurement fits, else the closest size. */
export function recommend(
  chart: SizeChart | undefined,
  body: Partial<Body>,
  pref: FitPref = "regular",
): Recommendation {
  const zones = ZONES.filter((z) => SIZES.some((s) => chart?.[s]?.[z] !== undefined));
  const empty = (size: Size): SizeFit => ({ size, fits: false, penalty: 0, zones: [] });
  if (!chart || !zones.length)
    return { status: "noChart", best: empty("M"), all: [], zones, invalid: [] };
  const invalid = zones.filter((z) => {
    const v = body[z];
    return typeof v !== "number" || !Number.isFinite(v) || v < VALID_RANGE[0] || v > VALID_RANGE[1];
  });
  if (invalid.length) return { status: "invalid", best: empty("M"), all: [], zones, invalid };
  const all = SIZES.filter((s) => chart[s]).map((s) => evaluateSize(chart, s, body as Body, pref));
  const fit = all.find((f) => f.fits);
  const best = fit ?? all.reduce((a, b) => (b.penalty < a.penalty ? b : a));
  return { status: fit ? "ok" : "outside", best, all, zones, invalid };
}
