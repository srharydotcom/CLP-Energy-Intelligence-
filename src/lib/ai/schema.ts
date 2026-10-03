import { z } from "zod";

// Contract between the backend AI analyst and the UI. The UI renders only these fields.
export const findingSchema = z.object({
  title: z.string(),
  severity: z.enum(["opportunity", "risk", "info"]),
  detail: z.string(),
  metric_label: z.string().nullable(),
  metric_value: z.string().nullable(),
  action: z.string().nullable(),
});

export const analysisSchema = z.object({
  headline: z.string(),
  verdict: z.enum(["favourable", "neutral", "unfavourable"]),
  confidence: z.number(),
  findings: z.array(findingSchema),
  assumptions_to_check: z.array(z.object({ assumption: z.string(), why_it_matters: z.string() })),
});

export type AIFinding = z.infer<typeof findingSchema>;
export type AIAnalysis = z.infer<typeof analysisSchema>;

export const MODULES = ["passport", "purchase", "procurement", "scenario"] as const;
export type AnalysisModule = (typeof MODULES)[number];
