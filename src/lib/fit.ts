export type Zone = "bust" | "waist" | "hips";
export type Size = "XS" | "S" | "M" | "L" | "XL";
export type FitStatus = "tight" | "perfect" | "loose";
export type Body = { height: number; weight: number; bust: number; waist: number; hips: number };
/** Garment circumferences (cm) per size. */
export type SizeChart = Record<Size, Partial<Record<Zone, number>>>;

export const SIZES: Size[] = ["XS", "S", "M", "L", "XL"];
export const ZONES: Zone[] = ["bust", "waist", "hips"];

/** Ease window: a body fits a garment when garment − body is between MIN_EASE and MAX_EASE. */
export const MIN_EASE = 2;
export const MAX_EASE = 8;

export function zoneStatus(ease: number): FitStatus {
  if (ease < MIN_EASE) return "tight";
  if (ease > MAX_EASE) return "loose";
  return "perfect";
}

/** Body range (cm) that a garment measurement fits. */
export function bodyRange(garment: number): [number, number] {
  return [garment - MAX_EASE, garment - MIN_EASE];
}

/** 100% when the body is at the centre of the range, 50% at its edge, 0% one half-width outside. */
export function zoneConfidence(body: number, garment: number) {
  const [lo, hi] = bodyRange(garment);
  const half = (hi - lo) / 2;
  const d = Math.abs(body - (lo + half));
  return Math.max(0, 1 - (0.5 * d) / half);
}

export type ZoneFit = {
  zone: Zone;
  ease: number;
  status: FitStatus;
  range: [number, number];
  /** Body vs range centre: positive = roomy, negative = snug. */
  diff: number;
};
export type SizeFit = { size: Size; fits: boolean; penalty: number; confidence: number; zones: ZoneFit[] };

function penalty(ease: number) {
  if (ease < MIN_EASE) return (MIN_EASE - ease) * 1.5;
  if (ease > MAX_EASE) return ease - MAX_EASE;
  return 0;
}

export function evaluateSize(chart: SizeChart, size: Size, body: Body): SizeFit {
  const zones = ZONES.filter((z) => chart[size][z] !== undefined).map((zone) => {
    const g = chart[size][zone] as number;
    const range = bodyRange(g);
    const ease = g - body[zone];
    return { zone, ease, status: zoneStatus(ease), range, diff: Math.round((range[0] + range[1]) / 2 - body[zone]) };
  });
  const confidence = zones.length
    ? Math.round((zones.reduce((s, z) => s + zoneConfidence(body[z.zone], chart[size][z.zone] as number), 0) / zones.length) * 100)
    : 0;
  return {
    size,
    zones,
    fits: zones.every((z) => z.status === "perfect"),
    penalty: zones.reduce((s, z) => s + penalty(z.ease), 0),
    confidence,
  };
}

/** Single source of truth: smallest size where every measurement fits, else the least-bad size. */
export function recommend(chart: SizeChart, body: Body) {
  const all = SIZES.map((s) => evaluateSize(chart, s, body));
  const best = all.find((f) => f.fits) ?? all.reduce((a, b) => (b.penalty < a.penalty ? b : a));
  const confidence = best.zones.length ? best.confidence : null;
  return { best, all, confidence };
}
