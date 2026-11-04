import { useEffect, useId, useMemo, useState } from "react";
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
import { flatten, type FlatLayer } from "./flatten";

export type StageItem = { category: Category; product: Product; worn: Worn };
const FIT_COLOR: Record<FitStatus, string> = {
  perfect: "var(--success)",
  tight: "var(--warning)",
  loose: "var(--info)",
};
const BANDS = 64;
const TOP = 30;
const ellipsePath = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0Z`;

/**
 * 2D layered model: body + garments are flattened into one image, then sliced into thin
 * horizontal bands, each scaled in width by the slider-driven factor (band warp, capped ±15%).
 * Real PNGs (body or garment photos) slot into the same layers.
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
  fit?: Partial<Record<Zone, FitStatus>> | undefined;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const lm = bodyType.landmarks;
  const f = bandFactors(body, bodyType.defaults);
  const hs = heightScale(body.height);
  const bandH = (FEET_Y + 2 - TOP) / BANDS;
  const bandS = Array.from({ length: BANDS }, (_, i) => factorAt(TOP + (i + 0.5) * bandH, lm, f));
  const avgS = bandS.reduce((a, b) => a + b, 0) / BANDS;

  const layers = useMemo<FlatLayer[]>(() => {
    const out: FlatLayer[] = [];
    const bodyImg = bodyType.image[view];
    if (bodyImg) out.push({ t: "img", href: bodyImg });
    else {
      const fig = figurePaths(lm);
      out.push({
        t: "path",
        d: [ellipsePath(CX, 110, 30, 38), fig.body, ...fig.arms],
        fill: "var(--mannequin)",
        shade: true,
      });
    }
    if (fit)
      for (const z of Object.keys(fit) as Zone[])
        out.push({ t: "ellipse", cx: CX, cy: lm[z].y, rx: lm[z].hw + 6, ry: 20, fill: FIT_COLOR[fit[z]!], opacity: 0.55 });
    for (const { category, product: p, worn } of items) {
      const chart = worn.size ? p.chart[worn.size] : undefined;
      const zone: Zone = category === "bottom" ? "waist" : "bust";
      const wf = category === "shoes" ? 1 : sizeFactor(chart?.[zone], body[zone]);
      const m = placeGarment(category, p.anchors, lm, wf);
      if (!m) continue;
      const color = p.colors[worn.colorIdx] ?? p.colors[0]!;
      const photo = view === "back" ? p.photos.back : (color.image ?? p.photos.front);
      out.push(
        photo
          ? { t: "img", href: photo, m }
          : { t: "path", d: garmentPath(p.shape), fill: color.hex, opacity: category === "outer" ? 0.96 : 1, shade: true, m },
      );
    }
    return out;
  }, [bodyType, view, lm, fit, items, body]);

  const key = JSON.stringify(layers);
  const [flat, setFlat] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => {
    let alive = true;
    flatten(layers)
      .then((url) => alive && setFlat({ key, url }))
      .catch(() => alive && setFlat(null));
    return () => {
      alive = false;
    };
    // layers is captured by key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // keep showing the previous flattened image while the new one renders, to avoid flicker
  const flatUrl = flat?.url;

  return (
    <svg
      viewBox={zoom ? "90 120 220 420" : "0 0 400 900"}
      className={`h-full w-full transition-all duration-500 ${className}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
    >
      <defs>
        <g id={`fig${uid}`}>
          {flatUrl ? (
            <image href={flatUrl} x="0" y="0" width="400" height="900" />
          ) : (
            layers.map((l, i) =>
              l.t === "img" ? (
                <image
                  key={i}
                  href={l.href}
                  x="0"
                  y="0"
                  width="400"
                  height="900"
                  transform={l.m ? `translate(${l.m.tx} ${l.m.ty}) scale(${l.m.sx} ${l.m.sy}) translate(${-l.m.ox} ${-l.m.oy})` : undefined}
                />
              ) : l.t === "ellipse" ? (
                <ellipse key={i} cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill={l.fill} opacity={l.opacity} />
              ) : (
                <g
                  key={i}
                  opacity={l.opacity ?? 1}
                  transform={l.m ? `translate(${l.m.tx} ${l.m.ty}) scale(${l.m.sx} ${l.m.sy}) translate(${-l.m.ox} ${-l.m.oy})` : undefined}
                >
                  {l.d.map((d) => (
                    <path key={d} d={d} fill={l.fill} />
                  ))}
                </g>
              ),
            )
          )}
        </g>
        {Array.from({ length: BANDS }, (_, i) => (
          <clipPath key={i} id={`b${uid}-${i}`}>
            <rect x="0" y={TOP + i * bandH} width="400" height={bandH} />
          </clipPath>
        ))}
      </defs>
      <ellipse cx={CX} cy={FEET_Y + 4} rx="110" ry="16" fill="none" stroke="var(--primary)" strokeOpacity="0.7" className="ring-pulse" />
      <ellipse cx={CX} cy={FEET_Y + 4} rx="140" ry="22" fill="var(--primary)" opacity="0.06" />
      <g transform={`translate(${CX} ${FEET_Y}) scale(${hs}) translate(${-CX} ${-FEET_Y})`}>
        {/* backing copy at the average band width: any anti-aliased band edge shows the same figure */}
        <use href={`#fig${uid}`} transform={`translate(${CX} 0) scale(${avgS} 1) translate(${-CX} 0)`} />
        {bandS.map((s, i) => (
          <g key={i} clipPath={`url(#b${uid}-${i})`}>
            <use href={`#fig${uid}`} transform={`translate(${CX} 0) scale(${s} 1) translate(${-CX} 0)`} />
          </g>
        ))}
      </g>
    </svg>
  );
}
