import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/energy/AppShell";
import { EnergyCostCard, SavingsCard } from "@/components/energy/MetricCards";
import { AssumptionPanel } from "@/components/energy/AssumptionPanel";
import { AIAnalysisPanel } from "@/components/energy/AIFindingCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { optionsQuery, sitesQuery } from "@/lib/queries";
import { DEFAULT_ASSUMPTIONS, asArray, hkd, num, procurementResult } from "@/lib/energy";

export const Route = createFileRoute("/_authenticated/procurement")({
  head: () => ({
    meta: [
      { title: "Business Energy Procurement — CLP Energy Intelligence" },
      { name: "description", content: "Compare supply structures on cost, price risk and emissions for each site." },
      { property: "og:title", content: "Business Energy Procurement — CLP Energy Intelligence" },
      { property: "og:description", content: "Compare supply structures on cost, price risk and emissions for each site." },
    ],
  }),
  component: ProcurementPage,
});

function ProcurementPage() {
  const sites = useQuery(sitesQuery);
  const options = useQuery(optionsQuery);
  const [siteId, setSiteId] = useState("site-1");
  const [a, setA] = useState({ ...DEFAULT_ASSUMPTIONS, loadShiftPct: 15 });
  const site = sites.data?.find((s) => s.id === siteId);

  const results = useMemo(() => (site ? (options.data ?? []).map((o) => procurementResult(site, o, a)) : []), [site, options.data, a]);
  const current = results.find((r) => r.option.id === site?.current_option_id);
  const best = results.reduce<(typeof results)[number] | undefined>((b, r) => (!b || r.annualCost < b.annualCost ? r : b), undefined);
  const maxHigh = Math.max(...results.map((r) => r.highCost), 1);

  const header = (
    <PageHeader
      kicker="Module 03"
      title="Business Energy Procurement"
      sub="Evaluate supply structures for a site on expected cost, price-risk band and emissions."
      right={
        <Select value={siteId} onValueChange={setSiteId}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>{sites.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      }
    />
  );
  if (!site || !current || !best) return <>{header}<Skeleton className="h-96" /></>;
  const annualMwh = asArray(site.monthly_mwh).reduce((s, x) => s + x, 0);

  return (
    <>
      {header}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Site profile</div>
              <div className="mt-2 font-display text-xl font-semibold">{site.sector}</div>
              <div className="mt-1 text-sm text-muted-foreground">{num(annualMwh)} MWh/yr · peak {num(Number(site.peak_kw))} kW · {num(Number(site.peak_share) * 100)}% on-peak</div>
            </div>
            <EnergyCostCard annualCost={current.annualCost} annualKwh={annualMwh * 1000 * (1 + a.usageChangePct / 100)} rate={current.effectiveRate} />
            <SavingsCard label={`Best option: ${best.option.name}`} annual={current.annualCost - best.annualCost} lifetime={current.termCostPv - pvAdjust(best, current)} />
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Structure</TableHead>
                  <TableHead className="text-right">HK$/kWh</TableHead>
                  <TableHead className="text-right">Expected/yr</TableHead>
                  <TableHead className="w-[30%]">Risk band (P10–P90)</TableHead>
                  <TableHead className="text-right">tCO₂e</TableHead>
                  <TableHead className="text-right">Term</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.option.id} className={cn(r === best && "bg-positive/5")}>
                    <TableCell>
                      <div className="font-medium">{r.option.name}</div>
                      <div className="mt-0.5 flex gap-1.5">
                        {r === current && <Badge variant="outline">Current</Badge>}
                        {r === best && <Badge className="bg-positive text-background hover:bg-positive">Lowest expected</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{num(r.effectiveRate, 3)}</TableCell>
                    <TableCell className="text-right tabular-nums">{hkd(r.annualCost)}</TableCell>
                    <TableCell>
                      <div className="relative h-2 rounded-full bg-muted">
                        <div className="absolute h-2 rounded-full bg-primary/40" style={{ left: `${(r.lowCost / maxHigh) * 100}%`, width: `${((r.highCost - r.lowCost) / maxHigh) * 100}%` }} />
                        <div className="absolute -top-0.5 h-3 w-0.5 bg-primary" style={{ left: `${(r.annualCost / maxHigh) * 100}%` }} />
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">{hkd(r.lowCost)} – {hkd(r.highCost)}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{num(r.co2Tonnes)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.option.term_years} yr</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <AIAnalysisPanel
            module="procurement"
            subjectId={site.id}
            metrics={{
              site: { name: site.name, sector: site.sector, annual_mwh: annualMwh, peak_kw: site.peak_kw, peak_share: site.peak_share },
              current_option: current.option.name,
              options: results.map((r) => ({ name: r.option.name, structure: r.option.structure, term_years: r.option.term_years, renewable_share: r.option.renewable_share, expected_annual_cost: Math.round(r.annualCost), p10: Math.round(r.lowCost), p90: Math.round(r.highCost), effective_rate: Number(r.effectiveRate.toFixed(3)), co2_tonnes: Math.round(r.co2Tonnes), term_cost_pv: Math.round(r.termCostPv) })),
              assumptions: a,
            }}
          />
        </div>
        <AssumptionPanel value={a} onChange={setA} fields={["fuelAdjDelta", "usageChangePct", "loadShiftPct", "carbonPricePerTonne", "tariffEscalationPct", "discountRatePct"]} />
      </div>
    </>
  );
}

// Normalise best option's term PV to the current option's term for a like-for-like comparison.
function pvAdjust(best: { termCostPv: number; option: { term_years: number } }, current: { option: { term_years: number } }) {
  return (best.termCostPv / best.option.term_years) * current.option.term_years;
}
