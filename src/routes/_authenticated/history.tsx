import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/energy/AppShell";
import { AIFindingCard } from "@/components/energy/AIFindingCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { analysisSchema } from "@/lib/ai/schema";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "History — CLP Energy Intelligence" },
      { name: "description", content: "Every AI analysis you've run, saved to your account." },
      { property: "og:title", content: "History — CLP Energy Intelligence" },
      { property: "og:description", content: "Every AI analysis you've run, saved to your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

const MODULE_LABEL: Record<string, string> = { home: "My Home", passport: "Energy Passport", purchase: "Should I Buy This?", building: "Building Investments", procurement: "Procurement", scenario: "Scenarios" };

function HistoryPage() {
  const q = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_analyses").select("id,module,subject_id,output,created_at").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  return (
    <>
      <PageHeader kicker="Your account" title="History" sub="Every AI explanation you've asked for, newest first." />
      {q.isLoading ? <Skeleton className="h-64" /> : !q.data?.length ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">Nothing yet. Press “Analyse” on any page and it will appear here.</div>
      ) : (
        <Accordion type="multiple" className="rounded-lg border bg-card px-4">
          {q.data.map((r) => {
            const parsed = analysisSchema.safeParse(r.output);
            return (
              <AccordionItem key={r.id} value={r.id}>
                <AccordionTrigger>
                  <div className="flex flex-1 flex-wrap items-baseline gap-x-3 text-left">
                    <span className="font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                    <span className="text-xs text-primary">{MODULE_LABEL[r.module] ?? r.module}</span>
                    <span className="font-medium">{parsed.success ? parsed.data.headline : "Analysis"}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  {parsed.success ? parsed.data.findings.map((f, i) => <AIFindingCard key={i} finding={f} />) : <p className="text-sm text-muted-foreground">This analysis can't be displayed.</p>}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </>
  );
}
