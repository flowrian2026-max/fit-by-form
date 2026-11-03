import type { FitStatus, Zone, ZoneFit } from "@/lib/fit";

const COLOR: Record<FitStatus, string> = {
  perfect: "var(--success)",
  tight: "var(--warning)",
  loose: "var(--info)",
};
const Y: Record<Zone, number> = { bust: 78, waist: 112, hips: 142 };

/** Holographic body outline with a marker per measured zone. */
export function HoloBody({ zones, label }: { zones: ZoneFit[]; label: (z: ZoneFit) => string }) {
  return (
    <svg viewBox="0 0 200 300" className="h-full w-full" role="img" aria-label="body fit map">
      <g fill="var(--holo)" fillOpacity="0.14" stroke="var(--holo)" strokeWidth="1.2" className="holo-glow">
        <ellipse cx="100" cy="30" rx="15" ry="19" />
        <path d="M78 56 Q100 50 122 56 L132 70 Q128 100 120 112 Q130 135 128 150 L120 210 L116 285 L104 285 L101 170 L99 170 L96 285 L84 285 L80 210 L72 150 Q70 135 80 112 Q72 100 68 70 Z" />
        <path d="M68 70 L56 130 L50 175 L57 176 L66 132 L76 92" />
        <path d="M132 70 L144 130 L150 175 L143 176 L134 132 L124 92" />
      </g>
      {[40, 60, 80, 100, 120, 140, 160].map((x) => (
        <line key={x} x1={x + 0} y1="10" x2={x} y2="290" stroke="var(--holo)" strokeOpacity="0.07" />
      ))}
      {zones.map((z) => (
        <g key={z.zone}>
          <line x1="100" y1={Y[z.zone]} x2="160" y2={Y[z.zone]} stroke={COLOR[z.status]} strokeDasharray="2 2" />
          <circle cx="100" cy={Y[z.zone]} r="5" fill={COLOR[z.status]} className="holo-glow" />
          <text x="162" y={Y[z.zone] + 3} fontSize="9" fill="var(--foreground)">
            {label(z)}
          </text>
        </g>
      ))}
    </svg>
  );
}
