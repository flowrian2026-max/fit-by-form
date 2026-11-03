import { garmentPath } from "@/components/stage/standins";
import type { Product } from "@/lib/catalog";

/** A try-on backend takes a person photo + garment image and returns a result image URL. */
export type TryOnRequest = { person: Blob; garment: Blob; category: Product["layer"] };
export type TryOnResult = { url: string; demo: boolean };
export interface TryOnProvider {
  id: "mock" | "http";
  run(req: TryOnRequest, signal?: AbortSignal): Promise<TryOnResult>;
}

export type TryOnConfig = { mode: "mock" | "http"; url: string };
export const DEFAULT_CONFIG: TryOnConfig = { mode: "mock", url: "" };
const KEY = "tryon-config";
export function loadConfig(): TryOnConfig {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    if (c && (c.mode === "mock" || c.mode === "http") && typeof c.url === "string") return c;
  } catch {
    /* ignore */
  }
  return DEFAULT_CONFIG;
}
export const saveConfig = (c: TryOnConfig) => localStorage.setItem(KEY, JSON.stringify(c));

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("image"));
    i.src = src;
  });
const toBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/png"));

/** Rasterises a garment (photo if present, else stand-in shape) onto a 400×900 transparent PNG. */
export async function garmentImage(p: Product, colorIdx: number): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = 400;
  c.height = 900;
  const ctx = c.getContext("2d")!;
  const color = p.colors[colorIdx] ?? p.colors[0]!;
  const photo = color.image ?? p.photos.front;
  if (photo) ctx.drawImage(await loadImg(photo), 0, 0, 400, 900);
  else {
    ctx.fillStyle = color.hex;
    garmentPath(p.shape).forEach((d) => ctx.fill(new Path2D(d)));
  }
  return toBlob(c);
}

/** Demo: overlays the garment on the person photo in the browser. No server, no cost. */
export const mockProvider: TryOnProvider = {
  id: "mock",
  async run({ person, garment }) {
    const [pi, gi] = await Promise.all([
      loadImg(URL.createObjectURL(person)),
      loadImg(URL.createObjectURL(garment)),
    ]);
    const c = document.createElement("canvas");
    c.width = pi.naturalWidth;
    c.height = pi.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(pi, 0, 0);
    // assume a centred full-length person: map the 400×900 garment stage onto the photo height
    const h = c.height * 0.95;
    const w = (h * 400) / 900;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(gi, (c.width - w) / 2, c.height * 0.03, w, h);
    return { url: URL.createObjectURL(await toBlob(c)), demo: true };
  },
};

/**
 * Own server (CatVTON / ComfyUI wrapper): POST multipart `person`, `garment`, `category`.
 * Accepts an image response, or JSON `{ image: "<url or data URL>" }`.
 */
export function httpProvider(url: string, timeoutMs = 90_000): TryOnProvider {
  return {
    id: "http",
    async run({ person, garment, category }, signal) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), timeoutMs);
      signal?.addEventListener("abort", () => ctl.abort());
      try {
        const fd = new FormData();
        fd.append("person", person, "person.png");
        fd.append("garment", garment, "garment.png");
        fd.append("category", category);
        const res = await fetch(url, { method: "POST", body: fd, signal: ctl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const type = res.headers.get("content-type") ?? "";
        if (type.startsWith("image/")) return { url: URL.createObjectURL(await res.blob()), demo: false };
        const j = (await res.json()) as { image?: unknown };
        if (typeof j.image !== "string") throw new Error("bad response");
        return { url: j.image, demo: false };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export const providerFor = (c: TryOnConfig) =>
  c.mode === "http" && /^https?:\/\//.test(c.url) ? httpProvider(c.url) : mockProvider;
