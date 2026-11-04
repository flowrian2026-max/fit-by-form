import type { Placement } from "@/lib/warp";

/**
 * One drawable layer of the model figure in the 400×900 stage space.
 * The figure is flattened into a single raster before band warping: Chrome leaves hairline seams
 * when several stacked <image>s are clipped into bands, a single image does not.
 */
export type FlatLayer =
  | { t: "img"; href: string; m?: Placement | undefined }
  | { t: "path"; d: string[]; fill: string; opacity?: number; shade?: boolean; m?: Placement | undefined }
  | { t: "ellipse"; cx: number; cy: number; rx: number; ry: number; fill: string; opacity: number };

const W = 400;
const H = 900;
const SCALE = 2;
const cache = new Map<string, Promise<HTMLImageElement>>();
const loadImg = (src: string) => {
  let p = cache.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error(`image ${src}`));
      i.src = src;
    });
    cache.set(src, p);
  }
  return p;
};

/** Canvas can't read CSS variables: swap var(--x) for its computed value. */
const resolve = (c: string) =>
  c.replace(/var\((--[\w-]+)\)/g, (_, v: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#999",
  );

export async function flatten(layers: FlatLayer[]): Promise<string> {
  const imgs = await Promise.all(layers.map((l) => (l.t === "img" ? loadImg(l.href) : null)));
  const c = document.createElement("canvas");
  c.width = W * SCALE;
  c.height = H * SCALE;
  const ctx = c.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  layers.forEach((l, i) => {
    ctx.save();
    if (l.t !== "ellipse" && l.m) {
      const { tx, ty, sx, sy, ox, oy } = l.m;
      ctx.translate(tx, ty);
      ctx.scale(sx, sy);
      ctx.translate(-ox, -oy);
    }
    if (l.t === "img") ctx.drawImage(imgs[i]!, 0, 0, W, H);
    else if (l.t === "ellipse") {
      ctx.globalAlpha = l.opacity;
      ctx.fillStyle = resolve(l.fill);
      ctx.beginPath();
      ctx.ellipse(l.cx, l.cy, l.rx, l.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalAlpha = l.opacity ?? 1;
      const shade = ctx.createLinearGradient(0, 0, W, 0);
      shade.addColorStop(0, "rgba(0,0,0,0.28)");
      shade.addColorStop(0.45, "rgba(255,255,255,0.08)");
      shade.addColorStop(1, "rgba(0,0,0,0.32)");
      for (const d of l.d) {
        const p = new Path2D(d);
        ctx.fillStyle = resolve(l.fill);
        ctx.fill(p);
        if (l.shade) {
          ctx.fillStyle = shade;
          ctx.fill(p);
        }
      }
    }
    ctx.restore();
  });
  return c.toDataURL("image/png");
}
