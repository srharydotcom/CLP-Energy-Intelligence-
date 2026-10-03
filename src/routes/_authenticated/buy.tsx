import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { homeContext, useHomes } from "@/lib/my-home";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeader } from "@/components/energy/AppShell";
import { ProductComparisonTable } from "@/components/energy/ProductComparisonTable";
import { EnergyCostCard, LifetimeCostCard, PaybackCard, SavingsCard } from "@/components/energy/MetricCards";
import { AssumptionPanel } from "@/components/energy/AssumptionPanel";
import { AIAnalysisPanel } from "@/components/energy/AIFindingCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { homesQuery, productsQuery, tariffsQuery } from "@/lib/queries";
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
          <NumField label="Rated kWh per year" value={f.annual_kwh} onChange={set("annual_kwh")} hint={`At ${meta.basis === "area" ? `${meta.ref} m², ${AC_REF_HOURS} h/day` : meta.basis === "occupants" ? `${meta.ref} people` : meta.basis === "km" ? `${num(meta.ref)} km/yr` : "standard use"}`} />
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

function BuyPage() {
  const products = useQuery(productsQuery);
  const tariffs = useQuery(tariffsQuery);
  const homes = useQuery(homesQuery);
  const [category, setCategory] = useState("Air conditioner");
  const [selected, setSelected] = useState<string>();
  const [custom, setCustom] = useState<Product[]>([]);
  const [a, setA] = useState(DEFAULT_ASSUMPTIONS);
  const [homeId, setHomeId] = useState("home-1");
  const [tariffId, setTariffId] = useState<string>();
  const [ctx, setCtx] = useState<HouseholdContext>({ areaM2: 68, roomM2: 18, occupants: 3, acHoursPerDay: 8, evKmPerYear: 12000 });

  const myHomes = useHomes();
  useEffect(() => {
    if (myHomes.active && homeId === "home-1") setHomeId(`mine:${myHomes.active.id}`);
  }, [myHomes.active, homeId]);
  const mine = homeId.startsWith("mine:") ? myHomes.homes.find((h) => `mine:${h.id}` === homeId) : undefined;
  useEffect(() => {
    if (mine) {
      setCtx((c) => ({ ...homeContext(mine.profile), evKmPerYear: mine.profile.evKmPerYear || c.evKmPerYear }));
      setTariffId(mine.profile.tariffId);
    }
  }, [mine]);
  const home = homes.data?.find((h) => h.id === homeId);
  useEffect(() => {
    if (home) {
      setCtx((c) => ({ ...c, areaM2: Number(home.floor_area_m2), occupants: home.occupants }));
      setTariffId(home.tariff_id ?? "res-std");
    }
  }, [home]);

  const tariff = tariffs.data?.find((t) => t.id === (tariffId ?? "res-std"));
  const all = [...(products.data ?? []), ...custom];
  const categories = [...new Set(all.map((p) => p.category))];

  const rows = useMemo(
    () => (tariff ? all.filter((p) => p.category === category).map((p) => contextEconomics(p, tariff, a, ctx)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products.data, custom, tariff, category, a, ctx],
  );
  const usable = rows.filter((r) => r.fit !== "undersized");
  const pool = usable.length ? usable : rows;
  const best = pool.reduce<(typeof rows)[number] | undefined>((b, r) => (!b || r.horizonTco < b.horizonTco ? r : b), undefined);
  const baseline = rows.reduce<(typeof rows)[number] | undefined>((b, r) => (b && Number(b.product.price) <= Number(r.product.price) ? b : r), undefined);
  const cand = rows.find((r) => r.product.id === selected) ?? best;

  const header = <PageHeader kicker="Module 02" title="Should I Buy This?" sub="Cost a product in your own home — its size, your household and your tariff — and compare its total cost of ownership with the alternatives." />;
  if (!tariff || !cand || !baseline || !best) return <>{header}<Skeleton className="h-96" /></>;

  const pb = payback(cand, baseline);
  const be = breakEvenYear(cand, baseline);
  const years = cand.product.lifetime_years;
  const H = a.horizonYears;

  return (
    <>
      {header}
      <div className="mb-5 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="sm:col-span-1 lg:col-span-2">
          <Label className="text-xs text-muted-foreground">Which home</Label>
          <Select value={homeId} onValueChange={setHomeId}>
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {myHomes.homes.map((h) => <SelectItem key={h.id} value={`mine:${h.id}`}>{h.profile.name}</SelectItem>)}
              {homes.data?.map((h) => <SelectItem key={h.id} value={h.id}>Example: {h.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Tariff</Label>
          <Select value={tariff.id} onValueChange={setTariffId}>
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{tariffs.data?.filter((t) => t.segment === "residential").map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {category === "Air conditioner" ? (
          <NumField label="Room to cool (m²)" value={ctx.roomM2} onChange={(n) => setCtx({ ...ctx, roomM2: n })} hint={`Home: ${num(ctx.areaM2)} m²`} />
        ) : (
          <NumField label="Home area (m²)" value={ctx.areaM2} onChange={(n) => setCtx({ ...ctx, areaM2: n })} />
        )}
        <NumField label="People at home" value={ctx.occupants} onChange={(n) => setCtx({ ...ctx, occupants: n })} />
        {category === "EV" ? (
          <NumField label="Driving (km/yr)" value={ctx.evKmPerYear} step={500} onChange={(n) => setCtx({ ...ctx, evKmPerYear: n })} />
        ) : (
          <NumField label="AC use (hours/day)" value={ctx.acHoursPerDay} onChange={(n) => setCtx({ ...ctx, acHoursPerDay: n })} />
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={category} onValueChange={(c) => { setCategory(c); setSelected(undefined); }}>
          <TabsList className="flex-wrap">{[...categories, ...(categories.includes("Other") ? [] : ["Other"])].map((c) => <TabsTrigger key={c} value={c}>{c === "Other" ? "Something else" : c}</TabsTrigger>)}</TabsList>
        </Tabs>
        {<AddProductDialog category={category} onAdd={(p) => { setCustom((c) => [...c, p]); setSelected(p.id); }} />}
      </div>

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
            <div className="text-sm text-warning">Your tariff has no peak/off-peak split, so a battery cannot save money by shifting usage. Try the Time-of-Use tariff.</div>
          )}

          <AIAnalysisPanel
            module="purchase"
            subjectId={cand.product.id}
            metrics={{
              category,
              tariff: tariff.name,
              household: { passport: mine ? mine.profile.name : home?.name, ...ctx, peer_median_kwh: home ? Number(home.peer_median_kwh) : null },
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
        <div className="space-y-4">
          <AssumptionPanel value={a} onChange={setA} fields={["horizonYears", "tariffEscalationPct", "discountRatePct", "fuelAdjDelta", "usageChangePct", "carbonPricePerTonne"]} />
          <div className="rounded-lg border bg-card p-4 text-xs text-muted-foreground space-y-1.5">
            <div className="font-mono text-[11px] uppercase tracking-widest">How we estimate</div>
            <p>Rated kWh is scaled to your home: AC by area cooled and hours of use, fridges and water heaters by people, EVs by distance.</p>
            <p>Sizing: AC ≈ 0.18 kW per m² of room; fridge ≈ 120 L + 80 L per person; storage heater ≈ 30 L per person. Undersized ACs use 25% more energy.</p>
            <p>Cost to own = purchase (with replacements inside the horizon) + energy + upkeep, discounted to today. Break-even uses cumulative spend.</p>
            <p>Electricity: {hkd(effectiveRate(tariff, a), 2)}/kWh on {tariff.name}.</p>
          </div>
        </div>
      </div>
    </>
  );
}
