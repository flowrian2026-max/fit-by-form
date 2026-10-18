export type Zone = "bust" | "waist" | "hips";
export type Size = "XS" | "S" | "M" | "L" | "XL";
export type FitStatus = "tight" | "perfect" | "loose";
export type Body = { height: number; weight: number; bust: number; waist: number; hips: number };
export type SizeChart = Record<Size, Partial<Record<Zone, number>>>;

export const SIZES: Size[] = ["XS", "S", "M", "L", "XL"];
export const ZONES: Zone[] = ["bust", "waist", "hips"];

export function zoneStatus(ease: number): FitStatus {
  if (ease < 2) return "tight";
  if (ease > 8) return "loose";
  return "perfect";
}

/** Penalty: 0 inside the 2–8cm ease window, distance outside (tight weighted heavier). */
export function zonePenalty(ease: number): number {
  if (ease < 2) return (2 - ease) * 1.5;
  if (ease > 8) return ease - 8;
  return 0;
}

export type SizeFit = {
  size: Size;
  penalty: number;
  zones: { zone: Zone; ease: number; status: FitStatus }[];
};

export function evaluateSize(chart: SizeChart, size: Size, body: Body): SizeFit {
  const zones = ZONES.filter((z) => chart[size][z] !== undefined).map((zone) => {
    const ease = (chart[size][zone] as number) - body[zone];
    return { zone, ease, status: zoneStatus(ease) };
  });
  return { size, zones, penalty: zones.reduce((s, z) => s + zonePenalty(z.ease), 0) };
}

export function recommend(chart: SizeChart, body: Body) {
  const all = SIZES.map((s) => evaluateSize(chart, s, body));
  const best = all.reduce((a, b) => (b.penalty < a.penalty ? b : a));
  const hasZones = best.zones.length > 0;
  const confidence = hasZones ? Math.max(35, Math.min(99, Math.round(98 - best.penalty * 6))) : null;
  return { best, all, confidence };
}
