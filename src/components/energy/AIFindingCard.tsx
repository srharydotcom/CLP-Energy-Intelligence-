import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Lightbulb, Info, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { runAnalysis } from "@/lib/ai/analyze.functions";
import type { AIAnalysis, AIFinding, AnalysisModule } from "@/lib/ai/schema";

const sev = {
  opportunity: { icon: Lightbulb, cls: "text-positive border-positive/30 bg-positive/5", label: "Opportunity" },
  risk: { icon: AlertTriangle, cls: "text-warning border-warning/30 bg-warning/5", label: "Risk" },
  info: { icon: Info, cls: "text-primary border-primary/30 bg-primary/5", label: "Insight" },
} as const;

export function AIFindingCard({ finding }: { finding: AIFinding }) {
  const s = sev[finding.severity];
  const Icon = s.icon;
  return (
    <div className={cn("rounded-md border p-3", s.cls)}>
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-medium text-foreground">{finding.title}</div>
            {finding.metric_value && (
              <div className="font-mono text-xs text-foreground">
                {finding.metric_label && <span className="text-muted-foreground">{finding.metric_label}: </span>}
                {finding.metric_value}
              </div>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{finding.detail}</p>
          {finding.action && <p className="mt-2 text-sm font-medium text-foreground">→ {finding.action}</p>}
        </div>
      </div>
    </div>
  );
}

const verdictCls = { favourable: "bg-positive", neutral: "bg-muted-foreground", unfavourable: "bg-warning" };

/** Requests structured analysis from the backend for a set of computed metrics and renders it. */
export function AIAnalysisPanel({ module, subjectId, metrics }: { module: AnalysisModule; subjectId: string; metrics: Record<string, unknown> }) {
  const fn = useServerFn(runAnalysis);
  const m = useMutation({ mutationFn: () => fn({ data: { module, subjectId, metrics } }) });
  const res = m.data;
  const analysis: AIAnalysis | undefined = res?.ok ? res.analysis : undefined;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> AI findings
        </div>
        <Button size="sm" variant={analysis ? "outline" : "default"} onClick={() => m.mutate()} disabled={m.isPending}>
          {m.isPending ? <RefreshCw className="size-3.5 animate-spin" /> : analysis ? <RefreshCw className="size-3.5" /> : <Sparkles className="size-3.5" />}
          {analysis ? "Re-run on current numbers" : "Analyse"}
        </Button>
      </div>

      {m.isPending && (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {!m.isPending && res && !res.ok && <p className="mt-4 text-sm text-destructive">{res.error}</p>}
      {!m.isPending && m.isError && <p className="mt-4 text-sm text-destructive">Could not reach the analysis service.</p>}
      {!m.isPending && !res && (
        <p className="mt-3 text-sm text-muted-foreground">Run an analysis on the figures above. Results are generated from the live numbers and your assumptions.</p>
      )}

      {!m.isPending && analysis && (
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", verdictCls[analysis.verdict])} />
            <div className="flex-1">
              <div className="font-display text-lg font-semibold leading-snug">{analysis.headline}</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {analysis.verdict} · confidence {Math.round(analysis.confidence * 100)}%
              </div>
            </div>
          </div>
          {analysis.findings.map((f, i) => (
            <AIFindingCard key={i} finding={f} />
          ))}
          {analysis.assumptions_to_check.length > 0 && (
            <div className="rounded-md border border-dashed p-3">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Assumptions to check</div>
              <ul className="space-y-1.5 text-sm">
                {analysis.assumptions_to_check.map((a, i) => (
                  <li key={i}>
                    <span className="font-medium">{a.assumption}</span> <span className="text-muted-foreground">— {a.why_it_matters}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
