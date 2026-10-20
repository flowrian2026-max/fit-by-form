import { describe, it, expect } from "vitest";
import { zoneStatus, recommend, zoneConfidence, type SizeChart } from "@/lib/fit";

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
  it("recommends the smallest size where every measurement fits", () => {
    // fits both S (ease 2–3) and M (ease 7–8): smallest wins
    const r = recommend(chart, { height: 168, weight: 60, bust: 87, waist: 71, hips: 92 });
    expect(r.best.size).toBe("S");
  });
  it("headline and details come from the same size", () => {
    const r = recommend(chart, { height: 165, weight: 62, bust: 89, waist: 72, hips: 95 });
    expect(r.best.zones.every((z) => z.status === "perfect")).toBe(true);
    expect(r.confidence).toBe(r.best.confidence);
  });
});

describe("confidence", () => {
  it("is 100% at the centre of the range", () => expect(zoneConfidence(89, 94)).toBe(1));
  it("is 50% at the edge of the range", () => expect(zoneConfidence(92, 94)).toBe(0.5));
  it("is 0% one half-width outside the range", () => expect(zoneConfidence(95, 94)).toBe(0));
});
