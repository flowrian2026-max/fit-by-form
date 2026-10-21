import { describe, it, expect } from "vitest";
import { zoneStatus, recommend, zoneFit, type SizeChart } from "@/lib/fit";

const chart: SizeChart = {
  XS: { bust: 84, waist: 68, hips: 90 },
  S: { bust: 89, waist: 73, hips: 95 },
  M: { bust: 94, waist: 78, hips: 100 },
  L: { bust: 100, waist: 84, hips: 106 },
  XL: { bust: 106, waist: 90, hips: 112 },
};
const body = { height: 165, weight: 62, bust: 89, waist: 72, hips: 95 };

describe("fit engine", () => {
  it("ease under 2cm is tight", () => expect(zoneStatus(1.9)).toBe("tight"));
  it("ease 2 to 8cm is perfect", () => {
    expect(zoneStatus(2)).toBe("perfect");
    expect(zoneStatus(8)).toBe("perfect");
  });
  it("ease over 8cm is loose", () => expect(zoneStatus(8.1)).toBe("loose"));
  it("recommends the smallest size where every measurement fits", () => {
    const r = recommend(chart, { height: 168, weight: 60, bust: 87, waist: 71, hips: 92 });
    expect(r.status).toBe("ok");
    expect(r.best.size).toBe("S");
  });
  it("bust 89 in 86–92 and waist 72 in 70–76 are both within range", () => {
    expect(zoneFit("bust", 89, 94)).toMatchObject({
      range: [86, 92],
      offset: 0,
      status: "perfect",
    });
    expect(zoneFit("waist", 72, 78)).toMatchObject({
      range: [70, 76],
      offset: 0,
      status: "perfect",
    });
  });
  it("above the range is tight by the cm over the top edge", () =>
    expect(zoneFit("bust", 95, 94)).toMatchObject({ offset: 3, status: "tight" }));
  it("below the range is roomy by the cm under the bottom edge", () =>
    expect(zoneFit("bust", 83, 94)).toMatchObject({ offset: -3, status: "loose" }));
  it("headline and details come from the same size", () => {
    const r = recommend(chart, body);
    expect(r.all.find((s) => s.size === r.best.size)).toEqual(r.best);
  });
  it("reports outside when no size fits", () =>
    expect(recommend(chart, { ...body, bust: 150 }).status).toBe("outside"));
  it("reports noChart for a product without bust/waist/hips data", () =>
    expect(recommend({ XS: {}, S: {}, M: {}, L: {}, XL: {} }, body).status).toBe("noChart"));
  it("reports invalid measurements", () => {
    const r = recommend(chart, { ...body, waist: NaN });
    expect(r.status).toBe("invalid");
    expect(r.invalid).toEqual(["waist"]);
  });
});
