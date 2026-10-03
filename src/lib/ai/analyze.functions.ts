import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MODULES, analysisSchema, type AIAnalysis } from "./schema";

const inputSchema = z.object({
  module: z.enum(MODULES),
  subjectId: z.string().max(100),
  metrics: z.record(z.unknown()),
});

const SYSTEM = `You are the analytical engine of CLP Energy Intelligence, a Hong Kong energy decision platform.
You receive pre-computed, deterministic metrics (HK$, kWh, tCO2e) and assumptions. Never recompute or invent numbers that are not derivable from the input.
Return 3-5 findings, each grounded in specific input figures, ordered by decision impact. Keep detail under 40 words and action under 20 words.
metric_value should quote a figure from the input (formatted, e.g. "HK$4,210/yr"). Confidence is 0-1 and should drop when results are sensitive to uncertain assumptions.
List 1-3 assumptions_to_check that would most change the decision.`;

const HOUSEHOLD = new Set(["passport", "purchase", "home"]);
const PLAIN = `AUDIENCE: a household, not an energy expert. Use everyday words (bill, money per year, pays for itself in X years).
Do not mention tariffs, discount rates, PV, kWh rates or technical specs unless essential; never use jargon like "TCO" or "NPV". Actions should be concrete things a person can do at home.`;
const EXPERT = `AUDIENCE: a business energy or finance manager. Be specific about cost drivers, risks, sensitivities and contract or investment trade-offs.`;

export const runAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; analysis: AIAnalysis } | { ok: false; error: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI analysis is not configured." };

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output, NoObjectGeneratedError } = await import("ai");
    const { createLovableAiGatewayRunIdFetch } = await import("./run-id.server");

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
        system: `${SYSTEM}\n${HOUSEHOLD.has(data.module) ? PLAIN : EXPERT}`,
        prompt: `Module: ${data.module}\nSubject: ${data.subjectId}\nInput metrics:\n${JSON.stringify(data.metrics, null, 2)}`,
        output: Output.object({ schema: analysisSchema }),
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      let analysis: AIAnalysis;
      try {
        // drain stream, then read typed output
        await result.text;
        analysis = analysisSchema.parse(await result.output);
      } catch (e) {
        if (NoObjectGeneratedError.isInstance(e)) return { ok: false, error: "The analysis came back incomplete. Try again." };
        throw e;
      }
      analysis.confidence = Math.max(0, Math.min(1, analysis.confidence));
      analysis.findings = analysis.findings.slice(0, 6);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("ai_analyses").insert({
        module: data.module,
        user_id: context.userId,
        subject_id: data.subjectId,
        input: data.metrics as never,
        output: analysis as never,
      });
      return { ok: true, analysis };
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("AI analysis failed", status, e);
      if (status === 429) return { ok: false, error: "Analysis is busy right now. Please wait a moment and try again." };
      if (status === 402) return { ok: false, error: "AI credits are exhausted for this workspace." };
      if (status === 403) return { ok: false, error: "AI access is blocked for this workspace." };
      return { ok: false, error: "Analysis failed. Please try again." };
    }
  });
