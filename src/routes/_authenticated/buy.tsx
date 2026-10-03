import { useAreaUnit } from "@/lib/units";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAreaUnit } from "@/lib/units";
import { useQuery } from "@tanstack/react-query";
import { useAreaUnit } from "@/lib/units";
import { useEffect, useMemo, useState } from "react";
import { useAreaUnit } from "@/lib/units";
import { homeContext, homeIsComplete, useHomes } from "@/lib/my-home";
import { useAreaUnit } from "@/lib/units";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAreaUnit } from "@/lib/units";
import { PageHeader } from "@/components/energy/AppShell";
import { useAreaUnit } from "@/lib/units";
import { ProductComparisonTable } from "@/components/energy/ProductComparisonTable";
import { useAreaUnit } from "@/lib/units";
import { EnergyCostCard, LifetimeCostCard, PaybackCard, SavingsCard } from "@/components/energy/MetricCards";
import { useAreaUnit } from "@/lib/units";
import { AssumptionPanel } from "@/components/energy/AssumptionPanel";
import { useAreaUnit } from "@/lib/units";
import { AIAnalysisPanel } from "@/components/energy/AIFindingCard";
import { useAreaUnit } from "@/lib/units";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAreaUnit } from "@/lib/units";
import { Skeleton } from "@/components/ui/skeleton";
import { useAreaUnit } from "@/lib/units";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAreaUnit } from "@/lib/units";
import { Input } from "@/components/ui/input";
import { useAreaUnit } from "@/lib/units";
import { Label } from "@/components/ui/label";
import { useAreaUnit } from "@/lib/units";
import { Button } from "@/components/ui/button";
import { useAreaUnit } from "@/lib/units";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAreaUnit } from "@/lib/units";
import { productsQuery, tariffsQuery } from "@/lib/queries";
import { useAreaUnit } from "@/lib/units";
import {
  AC_REF_HOURS, DEFAULT_ASSUMPTIONS, breakEvenYear, contextEconomics, effectiveRate, hkd, num, payback,
  type HouseholdContext, type Product,
} from "@/lib/energy";

export const Route = createFileRoute("/_authenticated/buy")({
  head: () => ({
    meta: [
      { title: "Should I Buy This? — CLP Energy Intelligence" },
      { name: "description", content: "Cost an AC, fridge, EV, battery or water heater in your own home: total cost of ownership, break-even and best fit." },
      { property: "og:title", content: "Should I Buy This? — CLP Energy Intelligence" },
      { property: "og:description", content: "Cost an AC, fridge, EV, battery or water heater in your own home: total cost of ownership, break-even and best fit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BuyPage,
});

const USAGE_BASIS: Record<string, { basis: string; ref: number; elasticity: number; unit: string | null }> = {
  "Air conditioner": { basis: "area", ref: 20, elasticity: 1, unit: "kW" },
  Refrigerator: { basis: "occupants", ref: 3, elasticity: 0.3, unit: "L" },
  "Water heater": { basis: "occupants", ref: 3, elasticity: 1, unit: "L" },
  EV: { basis: "km", ref: 12000, elasticity: 1, unit: "kWh" },
  "Home battery": { basis: "fixed", ref: 1, elasticity: 1, unit: "kWh" },
  TV: { basis: "fixed", ref: 1, elasticity: 1, unit: "in" },
  "Washing machine": { basis: "occupants", ref: 3, elasticity: 0.8, unit: "kg" },
  Dryer: { basis: "occupants", ref: 3, elasticity: 0.8, unit: "kg" },
  Dishwasher: { basis: "occupants", ref: 3, elasticity: 0.7, unit: null },
  Dehumidifier: { basis: "area", ref: 50, elasticity: 0.6, unit: "L/day" },
  Cooktop: { basis: "occupants", ref: 3, elasticity: 0.8, unit: null },
  Lighting: { basis: "area", ref: 55, elasticity: 1, unit: null },
  Other: { basis: "fixed", ref: 1, elasticity: 1, unit: null },
};

function NumField({ label, value, onChange, step = 1, hint }: { label: string; value: number; onChange: (n: number) => void; step?: number; hint?: string }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 h-9 tabular-nums" />
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function AddProductDialog({ category, onAdd }: { category: string; onAdd: (p: Product) => void }) {
  const u = useAreaUnit();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ brand: "", model: "", price: 8000, annual_kwh: 800, lifetime_years: 10, maintenance_per_year: 200, capacity: 3.5, shift_kwh: 0 });
  const meta = USAGE_BASIS[category] ?? USAGE_BASIS["Other"]!;
  const set = (k: keyof typeof f) => (v: number | string) => setF({ ...f, [k]: v });
  const submit = () => {
    onAdd({
      id: `custom-${Date.now()}`, category, brand: f.brand || "My", model: f.model || "product",
      price: f.price, annual_kwh: f.annual_kwh, lifetime_years: f.lifetime_years, maintenance_per_year: f.maintenance_per_year,
      energy_label: 0, usage_basis: meta.basis, reference_value: meta.ref, usage_elasticity: meta.elasticity,
      capacity: meta.unit ? f.capacity : null, capacity_unit: meta.unit, shift_kwh: category === "Home battery" ? f.shift_kwh : 0,
    });
    setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm">+ Add your own {category.toLowerCase()}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add a {category.toLowerCase()} to compare</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs text-muted-foreground">Brand</Label><Input className="mt-1 h-9" value={f.brand} onChange={(e) => set("brand")(e.target.value)} /></div>
          <div><Label className="text-xs text-muted-foreground">Model</Label><Input className="mt-1 h-9" value={f.model} onChange={(e) => set("model")(e.target.value)} /></div>
          <NumField label="Purchase price (HK$)" value={f.price} onChange={set("price")} />
          <NumField label="Rated kWh per year" value={f.annual_kwh} onChange={set("annual_kwh")} hint={`At ${meta.basis === "area" ? `${u.show(meta.ref)} ${u.label}, ${AC_REF_HOURS} h/day` : meta.basis === "occupants" ? `${meta.ref} people` : meta.basis === "km" ? `${num(meta.ref)} km/yr` : "standard use"}`} />
          <NumField label="Expected lifespan (yrs)" value={f.lifetime_years} onChange={set("lifetime_years")} />
          <NumField label="Maintenance per year (HK$)" value={f.maintenance_per_year} onChange={set("maintenance_per_year")} />
          {meta.unit && <NumField label={`Capacity (${meta.unit})`} value={f.capacity} step={0.1} onChange={set("capacity")} />}
          {category === "Home battery" && <NumField label="kWh shifted to off-peak / yr" value={f.shift_kwh} onChange={set("shift_kwh")} />}
        </div>
        <DialogFooter><Button onClick={submit}>Add to comparison</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ReqKey = "roomM2" | "acHoursPerDay" | "occupants" | "evKmPerYear" | "areaM2" | "screenIn" | "tvHours" | "loadsPerWeek" | "minKg" | "mealsPerDay" | "hoursPerDay" | "budget";
type ReqField = { key: ReqKey; label: string; hint: string; optional?: boolean; step?: number };
const BUDGET: ReqField = { key: "budget", label: "Most you'd spend (HK$)", hint: "Leave empty for no limit", optional: true, step: 500 };
/** What we need to know before recommending, per type. Each answer changes the result. */
const REQUIREMENTS: Record<string, ReqField[]> = {
  "Air conditioner": [
    { key: "roomM2", label: "Size of the room to cool", hint: "Sets the cooling power you need" },
    { key: "acHoursPerDay", label: "Hours it runs a day in summer", hint: "Drives the yearly running cost" }, BUDGET],
  Refrigerator: [{ key: "occupants", label: "People it feeds", hint: "Sets the fridge size you need" }, BUDGET],
  "Water heater": [{ key: "occupants", label: "People showering daily", hint: "Sets tank size and hot-water use" }, BUDGET],
  EV: [{ key: "evKmPerYear", label: "Kilometres you drive a year", hint: "Drives charging cost", step: 500 }, BUDGET],
  "Home battery": [{ ...BUDGET, optional: false, hint: "Batteries vary hugely in price" }],
  TV: [
    { key: "screenIn", label: "Smallest screen you'd accept (inches)", hint: "Hides smaller TVs" },
    { key: "tvHours", label: "Hours of TV a day", hint: "Drives running cost" }, BUDGET],
  "Washing machine": [
    { key: "loadsPerWeek", label: "Loads per week", hint: "Drives running cost" },
    { key: "minKg", label: "Smallest drum you'd accept (kg)", hint: "Hides smaller machines", optional: true }, BUDGET],
  Dryer: [{ key: "loadsPerWeek", label: "Loads dried per week", hint: "Drives running cost" }, BUDGET],
  Dishwasher: [{ key: "loadsPerWeek", label: "Cycles per week", hint: "Drives running cost" }, BUDGET],
  Dehumidifier: [{ key: "areaM2", label: "Area to keep dry", hint: "Drives how hard it works" }, BUDGET],
  Cooktop: [{ key: "mealsPerDay", label: "Cooked meals a day", hint: "Drives running cost" }, BUDGET],
  Lighting: [{ key: "areaM2", label: "Area to light", hint: "Sets how many bulbs you need" }, BUDGET],
  Other: [{ key: "hoursPerDay", label: "Hours it's on a day", hint: "Drives running cost" }, BUDGET],
};
const REF_USE: Partial<Record<string, { key: ReqKey; ref: number }>> = {
  TV: { key: "tvHours", ref: 5 }, "Washing machine": { key: "loadsPerWeek", ref: 4 }, Dryer: { key: "loadsPerWeek", ref: 3 },
  Dishwasher: { key: "loadsPerWeek", ref: 5 }, Cooktop: { key: "mealsPerDay", ref: 2 }, Other: { key: "hoursPerDay", ref: 4 },
};
const MIN_SIZE: Partial<Record<string, ReqKey>> = { TV: "screenIn", "Washing machine": "minKg" };

function BuyPage() {
  const u = useAreaUnit();
  const isArea = (k: ReqKey) => k === "roomM2" || k === "areaM2";
  const products = useQuery(productsQuery);
  const tariffs = useQuery(tariffsQuery);
  const [category, setCategory] = useState<string>();
  const [selected, setSelected] = useState<string>();
  const [custom, setCustom] = useState<Product[]>([]);
  const [a, setA] = useState(DEFAULT_ASSUMPTIONS);
  const [homeId, setHomeId] = useState("");
  const [tariffId, setTariffId] = useState<string>();
  const [req, setReq] = useState<Partial<Record<ReqKey, number>>>({});
  const [submitted, setSubmitted] = useState(false);

  const myHomes = useHomes();
  useEffect(() => {
    if (myHomes.active && !homeId) setHomeId(`mine:${myHomes.active.id}`);
  }, [myHomes.active, homeId]);
  const mine = homeId.startsWith("mine:") ? myHomes.homes.find((h) => `mine:${h.id}` === homeId) : undefined;
  useEffect(() => { if (mine) setTariffId(mine.profile.tariffId); }, [mine]);

  const fields = REQUIREMENTS[category ?? ""] ?? REQUIREMENTS["Other"]!;
  const ready = fields.every((f) => f.optional || (req[f.key] ?? 0) > 0);
  const ctx: HouseholdContext = useMemo(() => {
    const ref = category ? REF_USE[category] : undefined;
    return {
      coolingFactor: mine ? homeContext(mine.profile).coolingFactor : 1,
      areaM2: req.areaM2 ?? 0, roomM2: req.roomM2 ?? 0, occupants: req.occupants ?? 0,
      acHoursPerDay: req.acHoursPerDay ?? 0, evKmPerYear: req.evKmPerYear ?? 0,
      ratioOverride: ref ? (req[ref.key] ?? 0) / ref.ref : undefined,
    };
  }, [req, category, mine]);

  const tariff = tariffs.data?.find((t) => t.id === (tariffId ?? "res-std"));
  const all = [...(products.data ?? []), ...custom];
  const categories = [...new Set(all.map((p) => p.category))];
  const inCat = all.filter((p) => p.category === category);

  const rows = useMemo(() => {
    if (!tariff || !submitted) return [];
    const minKey = category ? MIN_SIZE[category] : undefined;
    return inCat
      .filter((p) => !req.budget || Number(p.price) <= req.budget)
      .filter((p) => !minKey || !req[minKey] || p.capacity == null || Number(p.capacity) >= req[minKey]!)
      .map((p) => contextEconomics(p, tariff, a, ctx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.data, custom, tariff, category, a, ctx, submitted]);
  const usable = rows.filter((r) => r.fit !== "undersized");
  const pool = usable.length ? usable : rows;
  const best = pool.reduce<(typeof rows)[number] | undefined>((b, r) => (!b || r.horizonTco < b.horizonTco ? r : b), undefined);
  const baseline = rows.reduce<(typeof rows)[number] | undefined>((b, r) => (b && Number(b.product.price) <= Number(r.product.price) ? b : r), undefined);
  const cand = rows.find((r) => r.product.id === selected) ?? best;

  const pick = (c: string) => { setCategory(c); setSelected(undefined); setReq({}); setSubmitted(false); };
  const catList = [...categories, ...(categories.includes("Other") ? [] : ["Other"])];
  const tabs = (
    <Tabs value={category ?? ""} onValueChange={pick}>
      <TabsList className="h-auto flex-wrap">{catList.map((c) => <TabsTrigger key={c} value={c}>{c === "Other" ? "Something else" : c}</TabsTrigger>)}</TabsList>
    </Tabs>
  );
  const header = <PageHeader kicker="Module 02" title="Should I Buy This?" sub="Tell us what you need and we'll work out which option costs you least to own." />;
  if (!tariff || products.isLoading || myHomes.isLoading) return <>{header}<Skeleton className="h-96" /></>;
  if (!homeIsComplete(mine)) return (
    <>{header}
      <div className="rounded-lg border border-dashed p-10 text-center">
        <div className="font-display text-lg font-semibold">First, tell us about your home</div>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">We only give advice once we know how big your home is, how many people live there and which appliances you already have — otherwise any recommendation would be a guess.</p>
        <Button asChild className="mt-5"><Link to="/home">Set up my home</Link></Button>
      </div>
    </>
  );
  if (!category) return (
    <>{header}
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-1 font-display text-lg font-semibold">What are you thinking of buying?</div>
        <p className="mb-4 text-sm text-muted-foreground">Pick a type to see what&apos;s new and popular.</p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {catList.map((c) => (
            <Button key={c} variant="outline" className="h-12 justify-start" onClick={() => pick(c)}>{c === "Other" ? "Something else" : c}</Button>
          ))}
        </div>
      </div>
    </>
  );
  const addDialog = <AddProductDialog category={category} onAdd={(p) => { setCustom((c) => [...c, p]); setSelected(p.id); }} />;
  const reqForm = (
    <div className="mb-5 rounded-lg border bg-card p-4">
      <div className="mb-3 font-display font-semibold">Your requirements</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => (
          <div key={f.key}>
            <Label className="text-xs text-muted-foreground">{f.label}{isArea(f.key) ? ` (${u.label})` : ""}{f.optional ? " (optional)" : ""}</Label>
            <Input type="number" min={0} step={f.step ?? 1} className="mt-1 h-9 font-mono" value={req[f.key] == null ? "" : isArea(f.key) ? u.show(req[f.key]!) : req[f.key]} placeholder="—"
              onChange={(e) => setReq({ ...req, [f.key]: e.target.value === "" ? undefined : isArea(f.key) ? u.toM2(Number(e.target.value)) : Number(e.target.value) })} />
            <div className="mt-1 text-[11px] text-muted-foreground">{f.hint}</div>
          </div>
        ))}
      </div>
      <Button className="mt-4" disabled={!ready} onClick={() => { setSubmitted(true); setSelected(undefined); }}>
        {submitted ? "Update recommendation" : "Show my recommendation"}
      </Button>
      {!ready && <span className="ml-3 text-xs text-muted-foreground">Fill in the required fields first.</span>}
    </div>
  );
  if (!submitted || !cand || !baseline || !best) return (
    <>{header}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">{tabs}{addDialog}</div>
      {reqForm}
      {submitted && <div className="mb-5 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing matches those requirements — try a higher budget or smaller minimum size, or add a model yourself.</div>}
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">New &amp; popular · {category === "Other" ? "something else" : category.toLowerCase()}</div>
      {inCat.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No models listed yet — add the ones you&apos;re choosing between.</p>
      ) : (
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {inCat.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card p-4">
              <div className="font-display font-semibold">{p.brand} {p.model}</div>
              <div className="mt-1 font-mono text-sm">{hkd(Number(p.price))}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {p.capacity != null && p.capacity_unit ? `${num(Number(p.capacity))} ${p.capacity_unit} · ` : ""}lasts ~{p.lifetime_years} yrs
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const pb = payback(cand, baseline);
  const be = breakEvenYear(cand, baseline);
  const years = cand.product.lifetime_years;
  const H = a.horizonYears;

  return (
    <>
      {header}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {tabs}
        <div className="flex items-center gap-2">
          <Select value={homeId} onValueChange={setHomeId}>
            <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{myHomes.homes.map((h) => <SelectItem key={h.id} value={`mine:${h.id}`}>{h.profile.name}</SelectItem>)}</SelectContent>
          </Select>
          {addDialog}
        </div>
      </div>
      {reqForm}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <div className="rounded-lg border border-positive/40 bg-positive/5 p-4">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Best choice for this home · {H}-year cost to own</div>
            <div className="mt-1 font-display text-xl font-semibold">{best.product.brand} {best.product.model} — {hkd(best.horizonTco)}</div>
            <div className="text-sm text-muted-foreground">
              {best.product.id === baseline.product.id
                ? "It is also the cheapest suitable model to buy."
                : <>Costs {hkd(Number(best.product.price) - Number(baseline.product.price))} more upfront than the {baseline.product.brand} {baseline.product.model}, but {hkd(baseline.horizonTco - best.horizonTco)} less over {H} years.</>}
              {usable.length > 0 && usable.length < rows.length && " Models too small for your space are excluded."}
              {usable.length === 0 && " Every model here is too small for your space — consider a larger unit or two units."}
            </div>
          </div>

          <ProductComparisonTable rows={rows} selectedId={cand.product.id} baselineId={baseline.product.id} bestId={best.product.id} horizon={H} onSelect={setSelected} />

          <div className="font-display text-lg font-semibold">{cand.product.brand} {cand.product.model} <span className="text-muted-foreground">vs {baseline.product.brand} {baseline.product.model}</span></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <EnergyCostCard annualCost={cand.annualCost} annualKwh={cand.annualKwh} rate={effectiveRate(tariff, a)} />
            <LifetimeCostCard total={cand.lifetimeCost} purchase={Number(cand.product.price)} energy={cand.lifetimeEnergyCost} maintenance={cand.lifetimeMaintenance} years={years} />
            <SavingsCard annual={pb.yearlySaving} lifetime={baseline.horizonTco - cand.horizonTco} label={`Savings vs cheapest`} />
            <PaybackCard years={be ?? pb.years} lifetime={Math.max(years, H)} extraCost={pb.extraCost} />
          </div>
          {cand.annualShiftSaving > 0 && (
            <div className="text-sm text-muted-foreground">Includes {hkd(cand.annualShiftSaving)}/yr from moving {num(Number(cand.product.shift_kwh))} kWh from peak to off-peak on your tariff.</div>
          )}
          {cand.product.category === "Home battery" && cand.annualShiftSaving === 0 && (
            <div className="text-sm text-warning">Your electricity plan charges the same price all day, so a battery can&apos;t save you money. It only pays off on a plan with cheaper night-time electricity (see Advanced).</div>
          )}

          <AIAnalysisPanel
            module="purchase"
            subjectId={cand.product.id}
            metrics={{
              category,
              tariff: tariff.name,
              household: { home: mine?.profile.name, requirements: req, owned_appliances: mine?.appliances.length },
              horizon_years: H,
              best_choice: best.product.id,
              candidate: { ...cand.product, size_fit: cand.fit, required_capacity: cand.required, usage_factor: cand.usageFactor, annual_kwh_in_home: cand.annualKwh, annual_cost: cand.annualCost, lifetime_cost_pv: cand.lifetimeCost, horizon_tco_pv: cand.horizonTco, lifetime_co2_kg: cand.lifetimeCo2Kg, shift_saving: cand.annualShiftSaving },
              baseline: { ...baseline.product, annual_cost: baseline.annualCost, horizon_tco_pv: baseline.horizonTco },
              payback: pb,
              break_even_year: be,
              alternatives: rows.map((r) => ({ id: r.product.id, model: `${r.product.brand} ${r.product.model}`, fit: r.fit, price: Number(r.product.price), annual_cost: Math.round(r.annualCost), horizon_tco_pv: Math.round(r.horizonTco) })),
              assumptions: a,
            }}
          />
        </div>
        <Collapsible className="space-y-4">
          <CollapsibleTrigger asChild><Button variant="outline" className="w-full">Advanced: electricity plan & assumptions</Button></CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <Label className="text-xs text-muted-foreground">Electricity plan</Label>
            <Select value={tariff.id} onValueChange={setTariffId}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{tariffs.data?.filter((t) => t.segment === "residential").map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <AssumptionPanel value={a} onChange={setA} fields={["horizonYears", "tariffEscalationPct", "discountRatePct", "fuelAdjDelta", "usageChangePct", "carbonPricePerTonne"]} />
          <div className="rounded-lg border bg-card p-4 text-xs text-muted-foreground space-y-1.5">
            <div className="font-mono text-[11px] uppercase tracking-widest">How we estimate</div>
            <p>Rated kWh is scaled to your home: AC by area cooled and hours of use, fridges and water heaters by people, EVs by distance.</p>
            <p>Sizing: AC ≈ {u.unit === "sqft" ? "0.017 kW per sq ft" : "0.18 kW per m²"} of room; fridge ≈ 120 L + 80 L per person; storage heater ≈ 30 L per person. Undersized ACs use 25% more energy.</p>
            <p>Cost to own = purchase (with replacements inside the horizon) + energy + upkeep, discounted to today. Break-even uses cumulative spend.</p>
            <p>Electricity: {hkd(effectiveRate(tariff, a), 2)}/kWh on {tariff.name}.</p>
          </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  );
}
