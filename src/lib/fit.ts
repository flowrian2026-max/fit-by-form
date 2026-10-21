export type Zone = "bust" | "waist" | "hips";
export type Size = "XS" | "S" | "M" | "L" | "XL";
/** tight = body above the size's range, perfect = within, loose = below. */
export type FitStatus = "tight" | "perfect" | "loose";
export type Body = { height: number; weight: number; bust: number; waist: number; hips: number };
/** Garment circumferences (cm) per size. The body range a size fits is derived from these. */
export type SizeChart = Record<Size, Partial<Record<Zone, number>>>;

export const SIZES: Size[] = ["XS", "S", "M", "L", "XL"];
export const ZONES: Zone[] = ["bust", "waist", "hips"];

/** Ease window: a body fits a garment when garment − body is between MIN_EASE and MAX_EASE. */
export const MIN_EASE = 2;
export const MAX_EASE = 8;
/** Plausible body circumference (cm); anything outside is treated as invalid input. */
export const VALID_RANGE: [number, number] = [40, 200];

export function zoneStatus(ease: number): FitStatus {
  if (ease < MIN_EASE) return "tight";
  if (ease > MAX_EASE) return "loose";
  return "perfect";
}

/** Body range (cm) that a garment measurement fits. */
export function bodyRange(garment: number): [number, number] {
  return [garment - MAX_EASE, garment - MIN_EASE];
}

export type ZoneFit = {
  zone: Zone;
  range: [number, number];
  status: FitStatus;
  /** cm outside the range: 0 when within, positive = above (tight), negative = below (roomy). */
  offset: number;
};
export type SizeFit = { size: Size; fits: boolean; penalty: number; zones: ZoneFit[] };

export function zoneFit(zone: Zone, body: number, garment: number): ZoneFit {
  const range = bodyRange(garment);
  const offset = body > range[1] ? body - range[1] : body < range[0] ? body - range[0] : 0;
  return {
    zone,
    range,
    offset: Math.round(offset * 10) / 10,
    status: offset > 0 ? "tight" : offset < 0 ? "loose" : "perfect",
  };
}

export function evaluateSize(chart: SizeChart, size: Size, body: Body): SizeFit {
  const zones = ZONES.filter((z) => chart[size]?.[z] !== undefined).map((z) =>
    zoneFit(z, body[z], chart[size][z] as number),
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
export function recommend(chart: SizeChart | undefined, body: Partial<Body>): Recommendation {
  const zones = ZONES.filter((z) => SIZES.some((s) => chart?.[s]?.[z] !== undefined));
  const empty = (size: Size): SizeFit => ({ size, fits: false, penalty: 0, zones: [] });
  if (!chart || !zones.length)
    return { status: "noChart", best: empty("M"), all: [], zones, invalid: [] };
  const invalid = zones.filter((z) => {
    const v = body[z];
    return typeof v !== "number" || !Number.isFinite(v) || v < VALID_RANGE[0] || v > VALID_RANGE[1];
  });
  if (invalid.length) return { status: "invalid", best: empty("M"), all: [], zones, invalid };
  const all = SIZES.filter((s) => chart[s]).map((s) => evaluateSize(chart, s, body as Body));
  const fit = all.find((f) => f.fits);
  const best = fit ?? all.reduce((a, b) => (b.penalty < a.penalty ? b : a));
  return { status: fit ? "ok" : "outside", best, all, zones, invalid };
}
