import { describe, it, expect } from "vitest";
import { wear } from "@/lib/catalog";
import { addItem, setQty, cartKey, cartTotal } from "@/lib/cart";
import { bandFactors, heightScale, mapY, placeGarment, REF_Y } from "@/lib/warp";
import { bodyTypes, productById } from "@/lib/catalog";

const base = { height: 165, weight: 62, bust: 89, waist: 72, hips: 95 };

describe("outfit slots", () => {
  it("a dress replaces top and bottom", () => {
    const o = wear({ top: { id: "a", colorIdx: 0 }, bottom: { id: "b", colorIdx: 0 } }, "dress", {
      id: "d",
      colorIdx: 0,
    });
    expect(o.top).toBeUndefined();
    expect(o.bottom).toBeUndefined();
    expect(o.dress?.id).toBe("d");
  });
  it("a top replaces a dress; a new item replaces the same slot", () => {
    let o = wear({ dress: { id: "d", colorIdx: 0 } }, "top", { id: "a", colorIdx: 0 });
    expect(o.dress).toBeUndefined();
    o = wear(o, "top", { id: "a2", colorIdx: 1 });
    expect(o.top?.id).toBe("a2");
  });
});

describe("band warp", () => {
  it("caps every band and the height at ±15%", () => {
    const f = bandFactors({ ...base, bust: 200, waist: 20, hips: 95 }, base);
    expect(f.bust).toBe(1.15);
    expect(f.waist).toBe(0.85);
    expect(heightScale(250)).toBe(1.15);
    expect(heightScale(100)).toBe(0.85);
  });
  it("is neutral at the body type defaults", () => {
    expect(bandFactors(base, base).waist).toBe(1);
  });
});

describe("garment placement on different bodies", () => {
  const lm = bodyTypes[1]!.landmarks;
  it("maps each reference landmark line onto the body's own line", () => {
    expect(mapY(REF_Y.waist, lm)).toBe(lm.waist.y);
    expect(mapY(REF_Y.ankles, lm)).toBe(lm.ankles.y);
  });
  it("keeps the order of lines so garments never fold over", () => {
    let prev = -Infinity;
    for (let y = 100; y <= 880; y += 20) {
      const m = mapY(y, lm);
      expect(m).toBeGreaterThan(prev);
      prev = m;
    }
  });
  it("lands the hem where the same cut lands on this body", () => {
    const trouser = productById("wool-trouser")!;
    const pl = placeGarment("bottom", trouser.anchors, lm)!;
    const hem = pl.ty + (trouser.anchors.hem![1] - pl.oy) * pl.sy;
    expect(Math.abs(hem - mapY(trouser.anchors.hem![1], lm))).toBeLessThan(1e-6);
  });
});

describe("cart", () => {
  const item = { id: "x", colorIdx: 0, size: "M" as const };
  it("merges same item and caps quantity at 10", () => {
    const c = addItem(addItem([], item, 7), item, 7);
    expect(c).toHaveLength(1);
    expect(c[0]!.qty).toBe(10);
  });
  it("ignores invalid quantities and removes at 0", () => {
    const c = addItem([], item);
    expect(setQty(c, cartKey(item), NaN)).toEqual(c);
    expect(setQty(c, cartKey(item), 1.5)).toEqual(c);
    expect(setQty(c, cartKey(item), 0)).toHaveLength(0);
  });
  it("totals from product prices", () => {
    expect(cartTotal(addItem([], item, 3), () => 420)).toBe(1260);
  });
});
