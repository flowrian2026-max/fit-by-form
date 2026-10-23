import { useId } from "react";
import type { Body, FitStatus, Zone } from "@/lib/fit";
import type { BodyType, Category, Product, Worn } from "@/lib/catalog";
import {
  CX,
  FEET_Y,
  bandFactors,
  factorAt,
  heightScale,
  placeGarment,
  sizeFactor,
} from "@/lib/warp";
import { figurePaths, garmentPath } from "./standins";

export type StageItem = { category: Category; product: Product; worn: Worn };
const FIT_COLOR: Record<FitStatus, string> = {
  perfect: "var(--success)",
  tight: "var(--warning)",
  loose: "var(--info)",
};
const BANDS = 64;
const TOP = 30;

/**
 * 2D layered model: body + garments are drawn once, then sliced into thin horizontal
 * bands, each scaled in width by the slider-driven factor (band warp, capped ±15%).
 * Real PNGs (body or garment photos) slot into the same layers via <image>.
 */
export function PhotoStage({
  bodyType,
  body,
  items,
  view = "front",
  zoom = false,
  fit,
  className = "",
}: {
  bodyType: BodyType;
  body: Body;
  items: StageItem[];
  view?: "front" | "back";
  zoom?: boolean;
  fit?: Partial<Record<Zone, FitStatus>>;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const lm = bodyType.landmarks;
  const f = bandFactors(body, bodyType.defaults);
  const hs = heightScale(body.height);
  const fig = figurePaths(lm);
  const bodyImg = bodyType.image[view];
  const bandH = (FEET_Y + 2 - TOP) / BANDS;

  return (
    <svg
      viewBox={zoom ? "90 120 220 420" : "0 0 400 900"}
      className={`h-full w-full transition-all duration-500 ${className}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
    >
      <defs>
        <linearGradient id={`sk${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="var(--mannequin)" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="var(--mannequin)" />
          <stop offset="1" stopColor="var(--mannequin)" stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id={`sh${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0.32" />
        </linearGradient>
        <g id={`fig${uid}`}>
          {bodyImg ? (
            <image href={bodyImg} x="0" y="0" width="400" height="900" />
          ) : (
            <g fill={`url(#sk${uid})`}>
              <ellipse cx={CX} cy="110" rx="30" ry="38" />
              <path d={fig.body} />
              {fig.arms.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          )}
          {fit &&
            (Object.keys(fit) as Zone[]).map((z) => (
              <ellipse
                key={z}
                cx={CX}
                cy={lm[z].y}
                rx={lm[z].hw + 6}
                ry="20"
                fill={FIT_COLOR[fit[z]!]}
                opacity="0.55"
              />
            ))}
          {items.map(({ category, product: p, worn }) => {
            const chart = worn.size ? p.chart[worn.size] : undefined;
            const zone: Zone =
              category === "bottom" ? "waist" : "bust";
            const wf = category === "shoes" ? 1 : sizeFactor(chart?.[zone], body[zone]);
            const pl = placeGarment(category, p.anchors, lm, wf);
            if (!pl) return null;
            const color = p.colors[worn.colorIdx] ?? p.colors[0]!;
            const photo = view === "back" ? p.photos.back : (color.image ?? p.photos.front);
            const tf = `translate(${pl.tx} ${pl.ty}) scale(${pl.sx} ${pl.sy}) translate(${-pl.ox} ${-pl.oy})`;
            return (
              <g key={category} transform={tf} className="transition-all duration-500">
                {photo ? (
                  <image href={photo} x="0" y="0" width="400" height="900" />
                ) : (
                  garmentPath(p.shape).map((d) => (
                    <g key={d}>
                      <path d={d} fill={color.hex} opacity={category === "outer" ? 0.96 : 1} />
                      <path d={d} fill={`url(#sh${uid})`} />
                    </g>
                  ))
                )}
              </g>
            );
          })}
        </g>
        {Array.from({ length: BANDS }, (_, i) => (
          <clipPath key={i} id={`b${uid}-${i}`}>
            <rect x="0" y={TOP + i * bandH - 0.4} width="400" height={bandH + 0.8} />
          </clipPath>
        ))}
      </defs>
      <ellipse cx={CX} cy={FEET_Y + 4} rx="110" ry="16" fill="none" stroke="var(--primary)" strokeOpacity="0.7" className="ring-pulse" />
      <ellipse cx={CX} cy={FEET_Y + 4} rx="140" ry="22" fill="var(--primary)" opacity="0.06" />
      <g transform={`translate(${CX} ${FEET_Y}) scale(${hs}) translate(${-CX} ${-FEET_Y})`}>
        {Array.from({ length: BANDS }, (_, i) => {
          const s = factorAt(TOP + (i + 0.5) * bandH, lm, f);
          return (
            <g key={i} clipPath={`url(#b${uid}-${i})`}>
              <use
                href={`#fig${uid}`}
                transform={`translate(${CX} 0) scale(${s} 1) translate(${-CX} 0)`}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
