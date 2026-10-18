import type { Body } from "@/lib/fit";

export type View = "front" | "back" | "side";
export type Outfit = Partial<Record<"top" | "bottom" | "outer" | "shoes", string>>;

/**
 * Placeholder mannequin. Swap the SVG for a <model-viewer>/three.js GLB renderer later —
 * keep the same props (body, outfit colors, view) so the rest of the app is unaffected.
 */
export function Mannequin({ body, outfit, view }: { body: Body; outfit: Outfit; view: View }) {
  const k = view === "side" ? 0.55 : 1;
  const sh = (body.bust / 90) * 46 * k;
  const w = (body.waist / 72) * 30 * k;
  const h = (body.hips / 96) * 44 * k;
  const scaleY = body.height / 170;
  const cx = 100;
  const torso = `M${cx - sh},70 Q${cx - sh - 4},110 ${cx - w},150 Q${cx - h - 4},180 ${cx - h},200 L${cx + h},200 Q${cx + h + 4},180 ${cx + w},150 Q${cx + sh + 4},110 ${cx + sh},70 Z`;
  const base = "var(--mannequin)";
  return (
    <svg viewBox="0 0 200 400" className="h-full w-auto drop-shadow-[0_0_30px_var(--gold-glow)] transition-all duration-500" style={{ transform: `scaleY(${scaleY})` }}>
      <defs>
        <linearGradient id="mq" x1="0" x2="1"><stop offset="0" stopColor={base} stopOpacity="0.7" /><stop offset="0.5" stopColor={base} /><stop offset="1" stopColor={base} stopOpacity="0.6" /></linearGradient>
      </defs>
      <ellipse cx={cx} cy="38" rx={14 * (view === "side" ? 0.9 : 1)} ry="18" fill="url(#mq)" />
      <rect x={cx - 5} y="54" width="10" height="16" fill="url(#mq)" />
      <path d={torso} fill="url(#mq)" />
      <path d={`M${cx - h + 2},200 L${cx - 22 * k},380 L${cx - 8},380 L${cx - 2},210 Z M${cx + h - 2},200 L${cx + 22 * k},380 L${cx + 8},380 L${cx + 2},210 Z`} fill="url(#mq)" />
      {view !== "side" && <path d={`M${cx - sh},72 L${cx - sh - 12},180 L${cx - sh - 4},182 L${cx - sh + 6},90 Z M${cx + sh},72 L${cx + sh + 12},180 L${cx + sh + 4},182 L${cx + sh - 6},90 Z`} fill="url(#mq)" />}
      {outfit.bottom && <path d={`M${cx - w - 1},148 Q${cx - h - 5},180 ${cx - h - 1},200 L${cx - 20 * k},330 L${cx - 4},330 L${cx},215 L${cx + 4},330 L${cx + 20 * k},330 L${cx + h + 1},200 Q${cx + h + 5},180 ${cx + w + 1},148 Z`} fill={outfit.bottom} className="transition-colors duration-500" />}
      {outfit.top && <path d={`M${cx - sh - 1},68 Q${cx - sh - 5},110 ${cx - w - 1},152 L${cx + w + 1},152 Q${cx + sh + 5},110 ${cx + sh + 1},68 Q${cx},78 ${cx - sh - 1},68 Z`} fill={outfit.top} className="transition-colors duration-500" />}
      {outfit.outer && <path d={`M${cx - sh - 4},66 L${cx - sh - 14},182 L${cx - h - 6},250 L${cx - 6},250 L${cx - 3},80 Z M${cx + sh + 4},66 L${cx + sh + 14},182 L${cx + h + 6},250 L${cx + 6},250 L${cx + 3},80 Z`} fill={outfit.outer} opacity="0.95" className="transition-colors duration-500" />}
      {outfit.shoes && <path d={`M${cx - 24 * k},376 h18 v8 h-22 Z M${cx + 6},376 h18 l4 8 h-22 Z`} fill={outfit.shoes} />}
      {view === "back" && <line x1={cx} y1="72" x2={cx} y2="150" stroke="var(--background)" strokeOpacity="0.25" />}
    </svg>
  );
}
