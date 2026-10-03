import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/energy/AppShell";
import { ScenarioPanel } from "@/components/energy/ScenarioPanel";
import { AssumptionPanel } from "@/components/energy/AssumptionPanel";
import { AIAnalysisPanel } from "@/components/energy/AIFindingCard";
import { EnergyCostCard } from "@/components/energy/MetricCards";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { optionsQuery, tariffsQuery } from "@/lib/queries";
import { useHomes } from "@/lib/my-home";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_ASSUMPTIONS, inventoryPassport, procurementResult, pvStream, type Assumptions, type Site } from "@/lib/energy";

export const Route = createFileRoute("/_authenticated/scenarios")({
  head: () => ({
    meta: [
      { title: "Scenario Analysis — CLP Energy Intelligence" },
      { name: "description", content: "Stress-test energy costs against fuel, tariff, usage and carbon scenarios." },
      { property: "og:title", content: "Scenario Analysis — CLP Energy Intelligence" },
      { property: "og:description", content: "Stress-test energy costs against fuel, tariff, usage and carbon scenarios." },
    ],
  }),
  component: ScenariosPage,
});

const PRESETS: { name: string; patch: Partial<Assumptions> }[] = [
  { name: "Fuel price spike", patch: { fuelAdjDelta: 0.35 } },
  { name: "Fuel price relief", patch: { fuelAdjDelta: -0.15 } },
  { name: "Hot summer (+15% use)", patch: { usageChangePct: 15 } },
  { name: "Efficiency retrofit", patch: { usageChangePct: -20 } },
  { name: "Carbon price HK$600/t", patch: { carbonPricePerTonne: 600 } },
  { name: "Peak load shift 30%", patch: { loadShiftPct: 30 } },
];

function ScenariosPage() {
  const myHomes = useHomes();
  const tariffs = useQuery(tariffsQuery);
  const options = useQuery(optionsQuery);
  const [subject, setSubject] = useState("");
  const [a, setA] = useState(DEFAULT_ASSUMPTIONS);
  const [sf, setSf] = useState<{ annualMwh: number | null; peakPct: number | null; currentId: string }>({ annualMwh: null, peakPct: null, currentId: "" });
  const [kind, id] = subject.split(":");
  const siteReady = (sf.annualMwh ?? 0) > 0 && sf.peakPct != null && sf.peakPct <= 100 && !!sf.currentId;
  const home = kind === "home" ? myHomes.homes.find((h) => h.id === id) : undefined;
  const site: Site | null = kind === "site" && siteReady
    ? { id: "my-site", name: "My site", sector: "", peak_kw: 0, peak_share: sf.peakPct! / 100, monthly_mwh: Array(12).fill(sf.annualMwh! / 12), current_option_id: sf.currentId }
    : null;

  const costFn = useMemo(() => {
    if (home) {
      const t = tariffs.data?.find((x) => x.id === (home.profile.tariffId ?? "res-std"));
      return t && home.appliances.length ? (x: Assumptions) => inventoryPassport(home.appliances, home.profile.occupants, home.profile.areaM2, t, x).summary.totalCost : null;
    }
    const o = options.data?.find((x) => x.id === site?.current_option_id);
    return site && o ? (x: Assumptions) => procurementResult(site, o, x).annualCost : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home, tariffs.data, options.data, kind, sf]);

  const header = (
    <PageHeader
      kicker="Module 04"
      title="Scenario Analysis"
      sub="Stress-test your own home or site against market and behaviour scenarios. The custom scenario uses your assumptions."
      right={
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Choose what to test" /></SelectTrigger>
          <SelectContent>
            {myHomes.homes.map((h) => <SelectItem key={h.id} value={`home:${h.id}`}>Home · {h.profile.name}</SelectItem>)}
            <SelectItem value="site:mine">A business site (enter details)</SelectItem>
          </SelectContent>
        </Select>
      }
    />
  );
  const n0 = (v: string) => (v === "" ? null : Math.max(0, Number(v)));
  const siteForm = kind === "site" && (
    <section className="mb-5 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3">
      <div><Label className="text-xs text-muted-foreground">Electricity used per year (MWh)</Label><Input type="number" min={0} className="mt-1" value={sf.annualMwh ?? ""} onChange={(e) => setSf({ ...sf, annualMwh: n0(e.target.value) })} /></div>
      <div><Label className="text-xs text-muted-foreground">Share used in peak hours (%)</Label><Input type="number" min={0} max={100} className="mt-1" value={sf.peakPct ?? ""} onChange={(e) => setSf({ ...sf, peakPct: n0(e.target.value) })} /></div>
      <div><Label className="text-xs text-muted-foreground">Current supply plan</Label>
        <Select value={sf.currentId} onValueChange={(v) => setSf({ ...sf, currentId: v })}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Choose" /></SelectTrigger>
          <SelectContent>{options.data?.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </section>
  );
  if (myHomes.isLoading || tariffs.isLoading || options.isLoading) return <>{header}<Skeleton className="h-96" /></>;
  if (!costFn) return (
    <>{header}{siteForm}
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        {!subject ? "Choose one of your homes, or enter a business site, to see how scenarios change your costs."
          : kind === "home" ? "This home has no appliances yet — add them on My Home first."
          : "Fill in the site details above to see the scenarios."}
      </div>
    </>
  );

  const baseline = costFn(DEFAULT_ASSUMPTIONS);
  const rows = [
    ...PRESETS.map((p) => ({ name: p.name, value: costFn({ ...DEFAULT_ASSUMPTIONS, ...p.patch }), baseline })),
    { name: "Custom (your inputs)", value: costFn(a), baseline },
  ];
  const custom = costFn(a);
  const horizonPv = pvStream(custom, a.horizonYears, a);
  const subjectLabel = home ? home.profile.name : "My site";
  const kwh = home
    ? (() => { const t = tariffs.data!.find((x) => x.id === (home.profile.tariffId ?? "res-std"))!; return inventoryPassport(home.appliances, home.profile.occupants, home.profile.areaM2, t, DEFAULT_ASSUMPTIONS).summary.totalKwh; })()
    : sf.annualMwh! * 1000;

  return (
    <>
      {header}
      {siteForm}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <EnergyCostCard annualCost={custom} annualKwh={kwh * (1 + a.usageChangePct / 100)} rate={custom / (kwh * (1 + a.usageChangePct / 100))} />
            <div className="relative overflow-hidden rounded-lg border bg-card p-4">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{a.horizonYears}-year exposure (PV)</div>
              <div className="mt-2 font-display text-3xl font-semibold tabular-nums">{new Intl.NumberFormat("en-HK", { style: "currency", currency: "HKD", maximumFractionDigits: 0 }).format(horizonPv)}</div>
              <div className="text-sm text-muted-foreground">at {a.tariffEscalationPct}% escalation, {a.discountRatePct}% discount</div>
            </div>
          </div>
          <ScenarioPanel title="Annual cost by scenario" rows={rows} />
          <AIAnalysisPanel
            module="scenario"
            subjectId={id ?? ""}
            metrics={{ subject: subjectLabel, kind, baseline_annual_cost: Math.round(baseline), scenarios: rows.map((r) => ({ name: r.name, annual_cost: Math.round(r.value), delta: Math.round(r.value - baseline) })), custom_assumptions: a, horizon_pv: Math.round(horizonPv) }}
          />
        </div>
        <AssumptionPanel value={a} onChange={setA} title="Custom scenario" />
      </div>
    </>
  );
}
