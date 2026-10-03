import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/energy/AppShell";
import { AssumptionPanel } from "@/components/energy/AssumptionPanel";
import { AIAnalysisPanel } from "@/components/energy/AIFindingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { archetypesQuery, measuresQuery } from "@/lib/queries";
import { DEFAULT_ASSUMPTIONS, hkd, num } from "@/lib/energy";
import { WEATHER, defaultInputs, evaluateMeasures, sensitivity, type BuildingInputs, type Weather } from "@/lib/buildings";

export const Route = createFileRoute("/_authenticated/buildings")({
  head: () => ({
    meta: [
      { title: "Building Energy Investments — CLP Energy Intelligence" },
      { name: "description", content: "Evaluate HVAC, lighting, solar, battery, water heating, refrigeration and EV charging investments for malls, hotels, offices, gyms, schools and apartments." },
      { property: "og:title", content: "Building Energy Investments — CLP Energy Intelligence" },
      { property: "og:description", content: "Upfront cost, savings, payback, total cost of ownership and sensitivity for major building energy investments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BuildingsPage,
});

function F({ label, value, onChange, step = 1, suffix, placeholder }: { label: string; value: number | null; onChange: (n: number | null) => void; step?: number; suffix?: string; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}{suffix && <span className="ml-1 font-mono">({suffix})</span>}</Label>
      <Input type="number" step={step} min={0} placeholder={placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))} />
    </div>
  );
}
const req = (fn: (n: number) => void) => (n: number | null) => fn(n ?? 0);

function BuildingsPage() {
  const archetypes = useQuery(archetypesQuery);
  const measures = useQuery(measuresQuery);
  const [archId, setArchId] = useState("mall");
  const [x, setX] = useState<BuildingInputs | null>(null);
  const [a, setA] = useState({ ...DEFAULT_ASSUMPTIONS, horizonYears: 15 });
  const arch = archetypes.data?.find((r) => r.id === archId);

  useEffect(() => { if (arch) setX(defaultInputs(arch)); }, [arch]);
  const set = (patch: Partial<BuildingInputs>) => setX((v) => (v ? { ...v, ...patch } : v));

  const res = useMemo(() => (arch && x && measures.data ? evaluateMeasures(arch, measures.data, x, a) : null), [arch, x, measures.data, a]);
  const sens = useMemo(() => (arch && x && measures.data ? sensitivity(arch, measures.data, x, a) : null), [arch, x, measures.data, a]);

  if (!archetypes.data || !measures.data || !x || !res || !sens || !arch) return <Skeleton className="h-96" />;
  const b = res.baseline;
  const pf = res.portfolio;
  const sMin = Math.min(...sens.rows.map((r) => r.low), sens.baseNpv);
  const sMax = Math.max(...sens.rows.map((r) => r.high), sens.baseNpv);
  const pos = (v: number) => (sMax === sMin ? 50 : ((v - sMin) / (sMax - sMin)) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Module 05"
        title="Building Energy Investments"
        sub="Compare major energy upgrades for a building, see what fits your budget and limits, and how sure you can be of the return."
        right={
          <Select value={archId} onValueChange={setArchId}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>{archetypes.data.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 font-display text-base font-semibold">Building</h2>
          <div className="grid grid-cols-2 gap-3">
            <F label="Floor area" suffix="m²" step={500} value={x.areaM2} onChange={req((n) => set({ areaM2: n }))} />
            <F label="Annual use" suffix="kWh" step={10000} placeholder={`est. ${num(b.kwh)}`} value={x.annualKwhOverride} onChange={(n) => set({ annualKwhOverride: n || null })} />
            <F label="Operating hours/day" step={0.5} value={x.hoursPerDay} onChange={req((n) => set({ hoursPerDay: Math.min(24, n) }))} />
            <F label="Days/week" value={x.daysPerWeek} onChange={req((n) => set({ daysPerWeek: Math.min(7, n) }))} />
            <F label="Typical occupancy" suffix="people" step={10} value={x.occupancy} onChange={req((n) => set({ occupancy: Math.round(n) }))} />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Weather</Label>
              <Select value={x.weather} onValueChange={(v) => set({ weather: v as Weather })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(WEATHER).map(([k, w]) => <SelectItem key={k} value={k}>{w.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </section>
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 font-display text-base font-semibold">Electricity cost</h2>
          <div className="grid grid-cols-2 gap-3">
            <F label="All-in rate" suffix="HK$/kWh" step={0.01} value={x.rate} onChange={req((n) => set({ rate: n }))} />
            <F label="Demand charge" suffix="HK$/kW/mo" value={x.demandChargeKw} onChange={req((n) => set({ demandChargeKw: n }))} />
            <F label="Peak − off-peak gap" suffix="HK$/kWh" step={0.01} value={x.peakOffpeakSpread} onChange={req((n) => set({ peakOffpeakSpread: n }))} />
            <F label="EV resale price" suffix="HK$/kWh" step={0.1} value={x.evResalePrice} onChange={req((n) => set({ evResalePrice: n }))} />
          </div>
        </section>
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 font-display text-base font-semibold">Budget & constraints</h2>
          <div className="grid grid-cols-2 gap-3">
            <F label="Capital budget" suffix="HK$" step={500000} value={x.budget} onChange={req((n) => set({ budget: n }))} />
            <F label="Max payback" suffix="years" step={0.5} value={x.maxPaybackYears} onChange={req((n) => set({ maxPaybackYears: n }))} />
            <F label="Max install disruption" suffix="weeks" value={x.maxInstallWeeks} onChange={req((n) => set({ maxInstallWeeks: n }))} />
            <F label="Usable roof" suffix="m²" step={100} value={x.roofAreaM2} onChange={req((n) => set({ roofAreaM2: n }))} />
          </div>
        </section>
      </div>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-1 font-display text-base font-semibold">Baseline</h2>
        <div className="grid gap-4 font-mono text-sm sm:grid-cols-4">
          <div><div className="text-[11px] uppercase text-muted-foreground">Annual use</div>{num(b.kwh)} kWh</div>
          <div><div className="text-[11px] uppercase text-muted-foreground">Intensity</div>{num(b.intensity)} kWh/m²</div>
          <div><div className="text-[11px] uppercase text-muted-foreground">Peak demand</div>{num(b.peakKw)} kW</div>
          <div><div className="text-[11px] uppercase text-muted-foreground">Annual energy cost</div>{hkd(b.annualCost)}</div>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded">
          {Object.entries(b.endUse).map(([k, v], i) => (
            <div key={k} title={`${k}: ${num(v)} kWh`} className={cn("h-2", ["bg-primary", "bg-positive", "bg-warning", "bg-grade-c", "bg-muted-foreground"][i % 5])} style={{ width: `${(v / b.kwh) * 100}%` }} />
          ))}
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {Object.entries(b.endUse).map(([k, v]) => <span key={k}>{k.replace("_", " ")} {num((v / b.kwh) * 100)}%</span>)}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-display text-base font-semibold">Investments to consider</h2>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {measures.data.map((m) => (
            <label key={m.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5 text-sm">
              <span><span className="font-medium">{m.category}</span><br /><span className="text-xs text-muted-foreground">{m.name}</span></span>
              <Switch checked={!!x.enabled[m.id]} onCheckedChange={(c) => set({ enabled: { ...x.enabled, [m.id]: c } })} />
            </label>
          ))}
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <F label="Solar size" suffix="kWp" placeholder={`auto ${Math.round(x.roofAreaM2 * 0.15)}`} value={x.solarKwp} onChange={(n) => set({ solarKwp: n })} />
          <F label="Battery size" suffix="kWh" step={50} value={x.batteryKwh} onChange={req((n) => set({ batteryKwh: n }))} />
          <F label="EV chargers" value={x.evChargers} onChange={req((n) => set({ evChargers: Math.round(n) }))} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Other building equipment</div>
            <Button size="sm" variant="outline" onClick={() => set({ custom: [...x.custom, { uid: `c-${Date.now()}`, name: "", capex: 500000, kwhSaved: 100000, maintPerYear: 5000, lifetimeYears: 15 }] })}>
              <Plus className="size-3.5" /> Add equipment
            </Button>
          </div>
          {x.custom.map((c) => {
            const up = (patch: Partial<typeof c>) => set({ custom: x.custom.map((y) => (y.uid === c.uid ? { ...y, ...patch } : y)) });
            return (
              <div key={c.uid} className="grid items-end gap-2 rounded-md border p-2 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                <div className="space-y-1"><Label className="text-xs text-muted-foreground">Name</Label><Input value={c.name} placeholder="e.g. Escalator VSD, lift regen" onChange={(e) => up({ name: e.target.value })} /></div>
                <F label="Cost" suffix="HK$" step={10000} value={c.capex} onChange={req((n) => up({ capex: n }))} />
                <F label="Saves" suffix="kWh/yr" step={1000} value={c.kwhSaved} onChange={req((n) => up({ kwhSaved: n }))} />
                <F label="Upkeep" suffix="HK$/yr" step={1000} value={c.maintPerYear} onChange={req((n) => up({ maintPerYear: n }))} />
                <F label="Life" suffix="yr" value={c.lifetimeYears} onChange={req((n) => up({ lifetimeYears: Math.max(1, Math.round(n)) }))} />
                <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => set({ custom: x.custom.filter((y) => y.uid !== c.uid) })}><Trash2 className="size-4" /></Button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card label="Upfront investment" value={hkd(pf.capex)} sub={`${pf.ids.length} measures · ${hkd(Math.max(0, x.budget - pf.capex))} of budget left`} />
        <Card label="Annual energy cost" value={hkd(pf.annualCostAfter)} sub={`down from ${hkd(b.annualCost)}`} />
        <Card label="Annual savings" value={hkd(pf.annualCostSaved - pf.annualMaint)} sub={`${hkd(pf.annualCostSaved)} energy − ${hkd(pf.annualMaint)} upkeep`} tone="good" />
        <Card label={`Lifetime energy cost (${a.horizonYears} yr)`} value={hkd(pf.lifetimeEnergyCostAfter)} sub={`vs ${hkd(pf.lifetimeEnergyCostBefore)} doing nothing`} />
        <Card label={`Total cost of ownership (${a.horizonYears} yr)`} value={hkd(pf.tcoAfter)} sub={`vs ${hkd(pf.tcoBefore)} doing nothing · ${pf.tcoAfter < pf.tcoBefore ? "cheaper" : "dearer"} by ${hkd(Math.abs(pf.tcoBefore - pf.tcoAfter))}`} tone={pf.tcoAfter < pf.tcoBefore ? "good" : "warn"} />
        <Card label="Payback" value={pf.payback === null ? "—" : `${num(pf.payback, 1)} years`} sub={`Net present value ${hkd(pf.npv)}`} />
      </div>

      <section className="overflow-x-auto rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-display text-base font-semibold">Each investment</h2>
        <table className="w-full text-sm">
          <thead className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b text-left">
              <th className="py-2 pr-2">Investment</th><th className="px-2 text-right">Upfront</th><th className="px-2 text-right">Saves/yr</th><th className="px-2 text-right">kWh/yr</th>
              <th className="px-2 text-right">Payback</th><th className="px-2 text-right">Life</th><th className="px-2 text-right">{a.horizonYears}-yr cost to own</th><th className="px-2 text-right">NPV</th><th className="px-2">In plan</th>
            </tr>
          </thead>
          <tbody>
            {[...res.measures].sort((p, q) => q.npv - p.npv).map((m) => {
              const inPlan = pf.ids.includes(m.id);
              return (
                <tr key={m.id} className="border-b align-top last:border-0">
                  <td className="py-2 pr-2"><div className="font-medium">{m.name}</div><div className="text-xs text-muted-foreground">{m.detail}</div></td>
                  <td className="px-2 text-right font-mono tabular-nums">{hkd(m.capex)}</td>
                  <td className="px-2 text-right font-mono tabular-nums">{hkd(m.annualCostSaved - m.annualMaint)}</td>
                  <td className="px-2 text-right font-mono tabular-nums">{num(m.annualKwhSaved)}</td>
                  <td className="px-2 text-right font-mono tabular-nums">{m.payback === null ? "never" : `${num(m.payback, 1)} yr`}</td>
                  <td className="px-2 text-right font-mono tabular-nums">{m.lifetimeYears} yr</td>
                  <td className="px-2 text-right font-mono tabular-nums">{hkd(m.tco)}</td>
                  <td className={cn("px-2 text-right font-mono tabular-nums", m.npv >= 0 ? "text-positive" : "text-warning")}>{hkd(m.npv)}</td>
                  <td className="px-2">
                    {inPlan ? <span className="flex items-center gap-1 text-positive"><CheckCircle2 className="size-4" /> Yes</span>
                      : <span className="flex items-start gap-1 text-xs text-muted-foreground"><XCircle className="mt-0.5 size-3.5 shrink-0" />{m.issues[0] ?? "Over remaining budget"}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-lg border bg-card p-4">
          <h2 className="font-display text-base font-semibold">Sensitivity of the plan</h2>
          <p className="mb-4 text-xs text-muted-foreground">How the plan's net present value moves if each input is wrong. Centre line = {hkd(sens.baseNpv)}.</p>
          <div className="space-y-3">
            {sens.rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[11rem_1fr] items-center gap-3 text-sm">
                <span>{r.label}</span>
                <div>
                  <div className="relative h-4 rounded bg-muted">
                    <div className="absolute inset-y-0 rounded bg-primary/60" style={{ left: `${pos(r.low)}%`, width: `${Math.max(0.5, pos(r.high) - pos(r.low))}%` }} />
                    <div className="absolute inset-y-[-3px] w-px bg-foreground" style={{ left: `${pos(sens.baseNpv)}%` }} />
                  </div>
                  <div className="mt-0.5 flex justify-between font-mono text-[11px] text-muted-foreground"><span>{hkd(r.low)}</span><span>{hkd(r.high)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <AssumptionPanel value={a} onChange={setA} fields={["tariffEscalationPct", "discountRatePct", "horizonYears"]} />
      </div>

      <AIAnalysisPanel
        module="building"
        subjectId={arch.id}
        metrics={{
          building: { type: arch.name, area_m2: x.areaM2, hours_per_day: x.hoursPerDay, days_per_week: x.daysPerWeek, occupancy: x.occupancy, weather: WEATHER[x.weather].label },
          baseline: { annual_kwh: Math.round(b.kwh), kwh_per_m2: Math.round(b.intensity), peak_kw: Math.round(b.peakKw), annual_cost_hkd: Math.round(b.annualCost) },
          electricity: { rate_hkd_kwh: x.rate, demand_charge_hkd_kw_month: x.demandChargeKw, peak_offpeak_gap: x.peakOffpeakSpread },
          constraints: { budget_hkd: x.budget, max_payback_years: x.maxPaybackYears, max_install_weeks: x.maxInstallWeeks, roof_m2: x.roofAreaM2 },
          measures: res.measures.map((m) => ({ name: m.name, detail: m.detail, capex_hkd: Math.round(m.capex), annual_net_saving_hkd: Math.round(m.annualCostSaved - m.annualMaint), payback_years: m.payback && +m.payback.toFixed(1), npv_hkd: Math.round(m.npv), in_plan: pf.ids.includes(m.id), issues: m.issues })),
          plan: { capex_hkd: Math.round(pf.capex), annual_saving_hkd: Math.round(pf.annualCostSaved - pf.annualMaint), payback_years: pf.payback && +pf.payback.toFixed(1), npv_hkd: Math.round(pf.npv), tco_before_hkd: Math.round(pf.tcoBefore), tco_after_hkd: Math.round(pf.tcoAfter), horizon_years: a.horizonYears },
          sensitivity_npv_hkd: sens.rows.map((r) => ({ input: r.label, low: Math.round(r.low), high: Math.round(r.high) })),
          assumptions: a,
        }}
      />

      <section className="rounded-lg border bg-card p-4 text-xs text-muted-foreground">
        <div className="mb-1 font-medium text-foreground">How we estimate</div>
        Baseline use comes from typical energy intensity for the building type, adjusted for your hours, occupancy and weather (or scaled to your actual annual use if entered).
        Efficiency upgrades save a share of the matching end use; solar produces ~1,050 kWh per kWp a year; batteries save on peak demand and peak/off-peak price gaps; EV chargers earn the resale margin.
        The plan picks investments with the best value per dollar that meet your payback and disruption limits, until the budget runs out. Upgrades are treated as independent. All figures are synthetic demo assumptions.
      </section>
    </div>
  );
}

function Card({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "good" | "warn" }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg border bg-card p-4", tone === "good" && "border-positive/40", tone === "warn" && "border-warning/40")}>
      <div className={cn("absolute inset-x-0 top-0 h-0.5", tone === "good" ? "bg-positive" : tone === "warn" ? "bg-warning" : "bg-primary")} />
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 truncate font-display text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}
