import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, Check, PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/energy/AppShell";
import { EnergyCostCard } from "@/components/energy/MetricCards";
import { AssumptionPanel } from "@/components/energy/AssumptionPanel";
import { AIAnalysisPanel } from "@/components/energy/AIFindingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { applianceCatalogQuery, tariffsQuery } from "@/lib/queries";
import { DEFAULT_ASSUMPTIONS, effectiveRate, hkd, inventorySummary, num, type OwnedAppliance } from "@/lib/energy";
import { useMyHome, type MyHomeProfile } from "@/lib/my-home";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "My Home & Appliances — CLP Energy Intelligence" },
      { name: "description", content: "Save your home details and the appliances you own to see what each one costs to run." },
      { property: "og:title", content: "My Home & Appliances — CLP Energy Intelligence" },
      { property: "og:description", content: "Save your home details and the appliances you own to see what each one costs to run." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyHomePage,
});

const END_USE_LABEL: Record<string, string> = {
  cooling: "Cooling & air", refrigeration: "Refrigeration", water_heating: "Water heating", laundry: "Laundry",
  cooking: "Cooking", electronics: "TV & electronics", lighting: "Lighting", ev: "EV charging", other: "Other",
};

function NumField({ label, value, onChange, step = 1, suffix }: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}{suffix && <span className="ml-1 font-mono">({suffix})</span>}</Label>
      <Input type="number" step={step} min={0} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Math.max(0, Number(e.target.value)))} />
    </div>
  );
}

function MyHomePage() {
  const catalog = useQuery(applianceCatalogQuery);
  const tariffs = useQuery(tariffsQuery);
  const { home, save, reset, loaded, saved } = useMyHome();
  const [a, setA] = useState(DEFAULT_ASSUMPTIONS);
  const [pick, setPick] = useState<string>("");

  const p = home.profile;
  const setProfile = (patch: Partial<MyHomeProfile>) => save((h) => ({ ...h, profile: { ...h.profile, ...patch } }));
  const setItem = (uid: string, patch: Partial<OwnedAppliance>) => save((h) => ({ ...h, appliances: h.appliances.map((x) => (x.uid === uid ? { ...x, ...patch } : x)) }));
  const removeItem = (uid: string) => save((h) => ({ ...h, appliances: h.appliances.filter((x) => x.uid !== uid) }));
  const addItem = (x: Omit<OwnedAppliance, "uid">) => save((h) => ({ ...h, appliances: [...h.appliances, { ...x, uid: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }] }));

  const addFromCatalog = () => {
    const c = catalog.data?.find((x) => x.id === pick);
    if (!c) return;
    addItem({ catalogId: c.id, name: c.name, category: c.category, endUse: c.end_use, watts: Number(c.watts), standbyWatts: Number(c.standby_watts), hoursPerDay: Number(c.default_hours_per_day), daysPerYear: c.default_days_per_year, quantity: 1 });
    setPick("");
  };

  const groups = useMemo(() => {
    const g: Record<string, NonNullable<typeof catalog.data>> = {};
    for (const c of catalog.data ?? []) (g[c.category] ??= []).push(c);
    return g;
  }, [catalog.data]);

  const residential = tariffs.data?.filter((t) => t.segment === "residential") ?? [];
  const tariff = tariffs.data?.find((t) => t.id === p.tariffId) ?? residential[0];
  const s = useMemo(() => (tariff ? inventorySummary(home.appliances, tariff, a) : null), [home.appliances, tariff, a]);

  if (!loaded || catalog.isLoading || tariffs.isLoading) return <Skeleton className="h-96" />;

  const perPerson = s && p.occupants ? s.totalKwh / p.occupants : 0;
  const perM2 = s && p.areaM2 ? s.totalKwh / p.areaM2 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Your profile"
        title="My Home & Appliances"
        sub="Tell us about your home and what you own. It's saved on this device and used across the app for more accurate estimates."
        right={
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {saved && <span className="flex items-center gap-1 text-positive"><Check className="size-3.5" /> Saved on this device</span>}
            {saved && <Button size="sm" variant="ghost" onClick={reset}>Clear</Button>}
          </div>
        }
      />

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-display text-lg font-semibold">House details</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input value={p.name} onChange={(e) => setProfile({ name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">District</Label>
            <Input value={p.district} placeholder="e.g. Sha Tin" onChange={(e) => setProfile({ district: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Property type</Label>
            <Select value={p.propertyType} onValueChange={(v) => setProfile({ propertyType: v as MyHomeProfile["propertyType"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="village">Village house</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Electricity plan</Label>
            <Select value={tariff?.id} onValueChange={(v) => setProfile({ tariffId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{residential.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <NumField label="Floor area" suffix="m²" value={p.areaM2} onChange={(n) => setProfile({ areaM2: n })} />
          <NumField label="People living here" value={p.occupants} onChange={(n) => setProfile({ occupants: Math.round(n) })} />
          <NumField label="Bedrooms" value={p.bedrooms} onChange={(n) => setProfile({ bedrooms: Math.round(n) })} />
          <NumField label="AC use per day" suffix="hours" step={0.5} value={p.acHoursPerDay} onChange={(n) => setProfile({ acHoursPerDay: Math.min(24, n) })} />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Appliances I own <span className="font-mono text-sm text-muted-foreground">({home.appliances.length})</span></h2>
          <div className="flex flex-wrap gap-2">
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Choose an appliance…" /></SelectTrigger>
              <SelectContent>
                {Object.entries(groups).map(([cat, items]) => (
                  <SelectGroup key={cat}>
                    <SelectLabel>{cat}</SelectLabel>
                    {items.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addFromCatalog} disabled={!pick}><Plus className="size-4" /> Add</Button>
            <MiscDialog onAdd={addItem} />
          </div>
        </div>

        {home.appliances.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No appliances yet. Pick one above, or add your own equipment with "Other equipment".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b text-left">
                  <th className="py-2 pr-2">Appliance</th><th className="px-2">Qty</th><th className="px-2">Watts</th><th className="px-2">Hours/day</th><th className="px-2">Days/yr</th>
                  <th className="px-2 text-right">kWh/yr</th><th className="px-2 text-right">Cost/yr</th><th className="w-32 px-2">Share</th><th />
                </tr>
              </thead>
              <tbody>
                {s?.rows.map(({ item: x, kwh, cost }) => (
                  <tr key={x.uid} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <div className="font-medium">{x.name}</div>
                      <div className="text-xs text-muted-foreground">{x.catalogId ? x.category : "Your own equipment"}</div>
                    </td>
                    <td className="px-2"><Input className="h-8 w-16" type="number" min={1} value={x.quantity} onChange={(e) => setItem(x.uid, { quantity: Math.max(1, Math.round(Number(e.target.value))) })} /></td>
                    <td className="px-2"><Input className="h-8 w-20" type="number" min={0} value={x.watts} onChange={(e) => setItem(x.uid, { watts: Math.max(0, Number(e.target.value)) })} /></td>
                    <td className="px-2"><Input className="h-8 w-20" type="number" step={0.5} min={0} max={24} value={x.hoursPerDay} onChange={(e) => setItem(x.uid, { hoursPerDay: Math.min(24, Math.max(0, Number(e.target.value))) })} /></td>
                    <td className="px-2"><Input className="h-8 w-20" type="number" min={0} max={365} value={x.daysPerYear} onChange={(e) => setItem(x.uid, { daysPerYear: Math.min(365, Math.max(0, Math.round(Number(e.target.value)))) })} /></td>
                    <td className="px-2 text-right font-mono tabular-nums">{num(kwh)}</td>
                    <td className="px-2 text-right font-mono tabular-nums">{hkd(cost)}</td>
                    <td className="px-2">
                      <div className="h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${s.totalKwh ? (kwh / s.totalKwh) * 100 : 0}%` }} /></div>
                    </td>
                    <td><Button size="icon" variant="ghost" onClick={() => removeItem(x.uid)} aria-label={`Remove ${x.name}`}><Trash2 className="size-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {s && tariff && home.appliances.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <EnergyCostCard annualCost={s.totalCost} annualKwh={s.totalKwh} rate={effectiveRate(tariff, a)} />
            <Stat label="Per person" value={`${num(perPerson)} kWh/yr`} sub={`${num(perM2)} kWh per m² of floor area`} />
            <Stat label="Standby waste" value={hkd(s.standbyKwh * effectiveRate(tariff, a))} sub={`${num(s.standbyKwh)} kWh/yr while switched off`} />
            <Stat label="Carbon" value={`${num(s.co2Tonnes, 2)} t CO₂e`} sub="per year" />
          </div>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 font-display text-lg font-semibold">Where your electricity goes</h2>
            <div className="space-y-2">
              {Object.entries(s.byEndUse).sort((x, y) => y[1] - x[1]).map(([eu, kwh]) => (
                <div key={eu} className="grid grid-cols-[10rem_1fr_6rem] items-center gap-3 text-sm">
                  <span>{END_USE_LABEL[eu] ?? eu}</span>
                  <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(kwh / s.totalKwh) * 100}%` }} /></div>
                  <span className="text-right font-mono tabular-nums">{num((kwh / s.totalKwh) * 100)}%</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Thinking of replacing something? <Link to="/buy" className="text-primary underline">Should I Buy This?</Link> uses your saved home details.
            </p>
          </section>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <AIAnalysisPanel
              module="home"
              subjectId={p.name || "my-home"}
              metrics={{
                home: { ...p, tariff: tariff.name, effective_rate_hkd_per_kwh: effectiveRate(tariff, a) },
                totals: { annual_kwh: Math.round(s.totalKwh), annual_cost_hkd: Math.round(s.totalCost), standby_kwh: Math.round(s.standbyKwh), kwh_per_person: Math.round(perPerson), kwh_per_m2: Math.round(perM2), co2_tonnes: +s.co2Tonnes.toFixed(2) },
                by_end_use_kwh: Object.fromEntries(Object.entries(s.byEndUse).map(([k, v]) => [k, Math.round(v)])),
                appliances: s.rows.map((r) => ({ name: r.item.name, own_equipment: !r.item.catalogId, qty: r.item.quantity, watts: r.item.watts, hours_per_day: r.item.hoursPerDay, days_per_year: r.item.daysPerYear, annual_kwh: Math.round(r.kwh), annual_cost_hkd: Math.round(r.cost) })),
                assumptions: a,
              }}
            />
            <AssumptionPanel value={a} onChange={setA} fields={["usageChangePct", "fuelAdjDelta", "carbonPricePerTonne"]} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 truncate font-display text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}

function MiscDialog({ onAdd }: { onAdd: (x: Omit<OwnedAppliance, "uid">) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", watts: 100, standbyWatts: 0, hoursPerDay: 2, daysPerYear: 365, quantity: 1 });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><PackagePlus className="size-4" /> Other equipment</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add your own equipment</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">What is it?</Label>
            <Input value={f.name} placeholder="e.g. Aquarium pump, wine fridge, 3D printer" onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <NumField label="Power when on" suffix="W" value={f.watts} onChange={(n) => setF({ ...f, watts: n })} />
          <NumField label="Standby power" suffix="W" step={0.5} value={f.standbyWatts} onChange={(n) => setF({ ...f, standbyWatts: n })} />
          <NumField label="Hours on per day" step={0.5} value={f.hoursPerDay} onChange={(n) => setF({ ...f, hoursPerDay: Math.min(24, n) })} />
          <NumField label="Days used per year" value={f.daysPerYear} onChange={(n) => setF({ ...f, daysPerYear: Math.min(365, Math.round(n)) })} />
          <NumField label="How many" value={f.quantity} onChange={(n) => setF({ ...f, quantity: Math.max(1, Math.round(n)) })} />
        </div>
        <p className="text-xs text-muted-foreground">Tip: power is usually printed on a label on the back or underside, in watts (W).</p>
        <DialogFooter>
          <Button
            disabled={!f.name.trim()}
            onClick={() => {
              onAdd({ catalogId: null, name: f.name.trim(), category: "Other", endUse: "other", ...f });
              setF({ name: "", watts: 100, standbyWatts: 0, hoursPerDay: 2, daysPerYear: 365, quantity: 1 });
              setOpen(false);
            }}
          >Add to my home</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
