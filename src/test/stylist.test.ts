import { describe, it, expect } from "vitest";
import { styleOutfit, classifyOccasion } from "@/lib/stylist";

const body = { height: 165, weight: 62, bust: 89, waist: 72, hips: 95 };

describe("rule-based stylist", () => {
  it("detects a formal winter occasion", () =>
    expect(classifyOccasion("Winter gala")).toEqual({ occasion: "formal", cold: true }));
  it("formal winter with big budget includes a coat and the skirt", () => {
    const r = styleOutfit({ occasion: "winter gala", style: "", budget: 5000, body, lang: "en" });
    expect(r.pieces.map((p) => p.id)).toEqual(
      expect.arrayContaining(["cashmere-coat", "satin-skirt"]),
    );
  });
  it("respects the budget", () => {
    const r = styleOutfit({ occasion: "winter gala", style: "", budget: 800, body, lang: "en" });
    expect(r.total).toBeLessThanOrEqual(800);
  });
});
