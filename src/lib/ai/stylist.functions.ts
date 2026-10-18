import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BodySchema = z.object({
  height: z.number().min(120).max(230),
  weight: z.number().min(30).max(200),
  bust: z.number().min(50).max(160),
  waist: z.number().min(40).max(160),
  hips: z.number().min(50).max(170),
});

const InputSchema = z.object({
  occasion: z.string().trim().min(2).max(300),
  style: z.string().trim().max(300),
  budget: z.number().min(0).max(100000),
  lang: z.enum(["en", "fa"]),
  body: BodySchema,
});

export type StylistPiece = { id: string; layer: string; colorIndex: number; size: string; confidence: number | null; price: number };
export type StylistResult =
  | { ok: true; title: string; rationale: string; pieces: StylistPiece[]; total: number; overBudget: boolean }
  | { ok: false; error: string };

export const recommendOutfit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<StylistResult> => {
    const { runStylist } = await import("./stylist.server");
    return runStylist(data);
  });
