import { describe, it, expect } from "vitest";
import { zoneStatus, recommend, type SizeChart } from "@/lib/fit";

const chart: SizeChart = {
  XS: { bust: 84, waist: 68, hips: 90 },
  S: { bust: 89, waist: 73, hips: 95 },
  M: { bust: 94, waist: 78, hips: 100 },
  L: { bust: 100, waist: 84, hips: 106 },
  XL: { bust: 106, waist: 90, hips: 112 },
};

describe("fit engine", () => {
  it("ease under 2cm is tight", () => expect(zoneStatus(1.9)).toBe("tight"));
  it("ease 2 to 8cm is perfect", () => {
    expect(zoneStatus(2)).toBe("perfect");
    expect(zoneStatus(8)).toBe("perfect");
  });
  it("ease over 8cm is loose", () => expect(zoneStatus(8.1)).toBe("loose"));
  it("recommends the best scoring size", () => {
    const r = recommend(chart, { height: 168, weight: 60, bust: 89, waist: 72, hips: 95 });
    expect(r.best.size).toBe("M");
  });
});
