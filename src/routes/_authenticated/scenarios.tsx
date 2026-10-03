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
import { homesQuery, optionsQuery, sitesQuery, tariffsQuery } from "@/lib/queries";
import { DEFAULT_ASSUMPTIONS, asArray, passportMetrics, procurementResult, pvStream, type Assumptions } from "@/lib/energy";

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
  const homes = useQuery(homesQuery);
  const tariffs = useQuery(tariffsQuery);
  const sites = useQuery(sitesQuery);
  const options = useQuery(optionsQuery);
  const [subject, setSubject] = useState("home:home-1");
  const [a, setA] = useState(DEFAULT_ASSUMPTIONS);
  const [kind, id] = subject.split(":");

  const costFn = useMemo(() => {
    if (kind === "home") {
      const h = homes.data?.find((x) => x.id === id);
      const t = tariffs.data?.find((x) => x.id === h?.tariff_id);
      return h && t ? (x: Assumptions) => passportMetrics(h, t, x).annualCost : null;
    }
    const s = sites.data?.find((x) => x.id === id);
    const o = options.data?.find((x) => x.id === (kind === "site" ? s?.current_option_id : ""));
    return s && o ? (x: Assumptions) => procurementResult(s, o, x).annualCost : null;
  }, [kind, id, homes.data, tariffs.data, sites.data, options.data]);

  const header = (
    <PageHeader
      kicker="Module 04"
      title="Scenario Analysis"
      sub="Stress-test a home or site against market and behaviour scenarios. The custom scenario uses your assumptions."
      right={
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            {homes.data?.map((h) => <SelectItem key={h.id} value={`home:${h.id}`}>Home · {h.name}</SelectItem>)}
            {sites.data?.map((s) => <SelectItem key={s.id} value={`site:${s.id}`}>Site · {s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      }
    />
  );
  if (!costFn) return <>{header}<Skeleton className="h-96" /></>;

  const baseline = costFn(DEFAULT_ASSUMPTIONS);
  const rows = [
    ...PRESETS.map((p) => ({ name: p.name, value: costFn({ ...DEFAULT_ASSUMPTIONS, ...p.patch }), baseline })),
    { name: "Custom (your inputs)", value: costFn(a), baseline },
  ];
  const custom = costFn(a);
  const horizonPv = pvStream(custom, a.horizonYears, a);
  const subjectLabel = kind === "home" ? homes.data?.find((h) => h.id === id)?.name : sites.data?.find((s) => s.id === id)?.name;
  const kwh = kind === "home"
    ? asArray(homes.data?.find((h) => h.id === id)?.monthly_kwh).reduce((s, x) => s + x, 0)
    : asArray(sites.data?.find((s) => s.id === id)?.monthly_mwh).reduce((s, x) => s + x, 0) * 1000;

  return (
    <>
      {header}
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
