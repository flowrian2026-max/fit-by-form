import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import { z } from "zod";
import garmentsData from "@/data/garments.json";
import { recommend, type Body, type SizeChart } from "@/lib/fit";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";
import type { StylistPiece, StylistResult } from "./stylist.functions";

type Garment = { id: string; layer: string; name: { en: string; fa: string }; price: number; colors: { name: string; hex: string }[]; chart: SizeChart };
const garments = garmentsData as unknown as Garment[];

const Pick = z.object({ id: z.string(), colorIndex: z.number().int() }).nullable();
const OutfitSchema = z.object({
  title: z.string(),
  rationale: z.string(),
  top: Pick,
  bottom: Pick,
  outer: Pick,
  shoes: Pick,
});

export async function runStylist(input: { occasion: string; style: string; budget: number; lang: "en" | "fa"; body: Body }): Promise<StylistResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { ok: false, error: "AI stylist is not configured." };

  // Fit is computed here, not by the model, so sizes always respect the fit engine.
  const catalog = garments.map((g) => {
    const r = recommend(g.chart, input.body);
    return {
      id: g.id, layer: g.layer, name: g.name.en, price: g.price,
      colors: g.colors.map((c, i) => `${i}:${c.name}`),
      recommendedSize: r.best.size, fitConfidence: r.confidence,
      zones: r.best.zones.map((z) => `${z.zone}:${z.status}`).join(","),
    };
  });

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      maxRetries: 0,
      system:
        "You are a luxury fashion stylist. Build ONE complete outfit using only garment ids from the catalog. " +
        "Use at most one garment per layer and only put a garment in its own layer slot. Use null for a layer you skip. " +
        "Stay within the budget (sum of prices). Prefer garments with higher fitConfidence and 'perfect' zones. " +
        "Pick colorIndex from each garment's colors. " +
        `Write title and rationale (2-3 sentences, mention fit) in ${input.lang === "fa" ? "Persian" : "English"}.`,
      messages: [{
        role: "user",
        content: `Occasion: ${input.occasion}\nStyle: ${input.style || "any"}\nBudget (EUR): ${input.budget}\nCatalog: ${JSON.stringify(catalog)}`,
      }],
      output: Output.object({ schema: OutfitSchema }),
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
      },
    });
    const out = await result.output;

    const pieces: StylistPiece[] = [];
    for (const layer of ["top", "bottom", "outer", "shoes"] as const) {
      const p = out[layer];
      const g = p && garments.find((x) => x.id === p.id && x.layer === layer);
      if (!p || !g) continue;
      const r = recommend(g.chart, input.body);
      pieces.push({ id: g.id, layer, colorIndex: Math.min(Math.max(0, p.colorIndex), g.colors.length - 1), size: r.best.size, confidence: r.confidence, price: g.price });
    }
    if (!pieces.length) return { ok: false, error: input.lang === "fa" ? "ستی پیدا نشد. دوباره امتحان کنید." : "No outfit could be built. Please try again." };
    const total = pieces.reduce((s, p) => s + p.price, 0);
    return { ok: true, title: out.title, rationale: out.rationale, pieces, total, overBudget: total > input.budget };
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode;
    console.error("stylist error", status, e);
    if (status === 402) return { ok: false, error: "AI credits are used up. Please add credits to keep using the stylist." };
    if (status === 429) return { ok: false, error: "The stylist is busy right now. Please try again in a moment." };
    if (status === 403) return { ok: false, error: "AI access is currently blocked for this workspace." };
    return { ok: false, error: "The stylist couldn't respond. Please try again." };
  }
}
