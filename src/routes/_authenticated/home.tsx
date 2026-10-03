import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2, PackagePlus, Sparkles, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/energy/AppShell";
import { EnergyCostCard } from "@/components/energy/MetricCards";
import { AssumptionPanel } from "@/components/energy/AssumptionPanel";
import { AIAnalysisPanel } from "@/components/energy/AIFindingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { applianceCatalogQuery, productsQuery, tariffsQuery } from "@/lib/queries";
import { DEFAULT_ASSUMPTIONS, effectiveRate, hkd, inventorySummary, num, upgradeSuggestions, type OwnedAppliance } from "@/lib/energy";
import { END_USE_LABEL, homeContext, useHomes, type MyHomeProfile, type SavedHome } from "@/lib/my-home";

export const Route = createFileRoute("/_authenticated/home")({
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

const MISC_CATEGORIES = ["Kitchen", "Electronics", "Personal care", "Garden & outdoor", "Hobby & tools", "Health", "Pets & aquarium", "Other"];

function NumField({ label, value, onChange, step = 1, suffix }: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}{suffix && <span className="ml-1 font-mono">({suffix})</span>}</Label>
      <Input type="number" step={step} min={0} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Math.max(0, Number(e.target.value)))} />
    </div>
  );
}

function Choice<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function MyHomePage() {
  const { homes, active, setActiveId, create, isLoading, update } = useHomes();
  const header = <PageHeader kicker="Your home" title="My Home & Appliances" sub="Tell us about your home and what you own. It's saved to your account and used everywhere in the app." right={
    homes.length > 0 ? (
      <div className="flex items-center gap-2">
        <Select value={active?.id ?? ""} onValueChange={setActiveId}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>{homes.map((h) => <SelectItem key={h.id} value={h.id}>{h.profile.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => create.mutate({ name: `Home ${homes.length + 1}` })}><Plus className="size-4" /> New home</Button>
      </div>
    ) : undefined
  } />;
  if (isLoading) return <>{header}<Skeleton className="h-96" /></>;
  if (!active) return (
    <>{header}
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="mb-4 text-muted-foreground">You haven't added a home yet.</p>
        <Button onClick={() => create.mutate({})}><Plus className="size-4" /> Add my first home</Button>
      </div>
    </>
  );
  return <>{header}<HomeEditor key={active.id} home={active} update={(fn) => update(active.id, fn)} /></>;
}

function HomeEditor({ home, update }: { home: SavedHome; update: (fn: (h: SavedHome) => SavedHome) => void }) {
  const catalog = useQuery(applianceCatalogQuery);
  const tariffs = useQuery(tariffsQuery);
  const products = useQuery(productsQuery);
  const [a, setA] = useState(DEFAULT_ASSUMPTIONS);
  const [cat, setCat] = useState<string>("");
  const [pick, setPick] = useState<string>("");

  const p = home.profile;
  const setProfile = (patch: Partial<MyHomeProfile>) => update((h) => ({ ...h, profile: { ...h.profile, ...patch } }));
  const setItem = (uid: string, patch: Partial<OwnedAppliance>) => update((h) => ({ ...h, appliances: h.appliances.map((x) => (x.uid === uid ? { ...x, ...patch } : x)) }));
  const removeItem = (uid: string) => update((h) => ({ ...h, appliances: h.appliances.filter((x) => x.uid !== uid) }));
  const addItem = (x: Omit<OwnedAppliance, "uid">) => update((h) => ({ ...h, appliances: [...h.appliances, { ...x, uid: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }] }));

  const groups = useMemo(() => {
    const g: Record<string, NonNullable<typeof catalog.data>> = {};
    for (const c of catalog.data ?? []) (g[c.category] ??= []).push(c);
    return g;
  }, [catalog.data]);

  const addFromCatalog = () => {
    const c = catalog.data?.find((x) => x.id === pick);
    if (!c) return;
    addItem({ catalogId: c.id, name: c.name, category: c.category, endUse: c.end_use, watts: Number(c.watts), standbyWatts: Number(c.standby_watts), hoursPerDay: c.end_use === "cooling" && c.category === "Air conditioner" ? p.acHoursPerDay : Number(c.default_hours_per_day), daysPerYear: c.default_days_per_year, quantity: 1 });
    setPick("");
  };

  const residential = tariffs.data?.filter((t) => t.segment === "residential") ?? [];
  const tariff = tariffs.data?.find((t) => t.id === p.tariffId) ?? residential[0];
  const s = useMemo(() => (tariff ? inventorySummary(home.appliances, tariff, a) : null), [home.appliances, tariff, a]);
  const ctx = homeContext(p);
  const tips = useMemo(
    () => (tariff && products.data ? upgradeSuggestions(home.appliances, products.data, tariff, a, ctx) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [home.appliances, products.data, tariff, a, p],
  );

  if (catalog.isLoading || tariffs.isLoading || !tariff) return <Skeleton className="h-96" />;
  const perPerson = s && p.occupants ? s.totalKwh / p.occupants : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-4" data-tour="house-details">
        <h2 className="mb-1 font-display text-lg font-semibold">About this home</h2>
        <p className="mb-4 text-sm text-muted-foreground">The more you fill in, the more accurate your estimates. Changes save automatically.</p>
        <div className="space-y-5">
          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">The basics</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">Name</Label><Input value={p.name} onChange={(e) => setProfile({ name: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs text-muted-foreground">District</Label><Input value={p.district} placeholder="e.g. Sha Tin" onChange={(e) => setProfile({ district: e.target.value })} /></div>
              <Choice label="Type of home" value={p.propertyType} onChange={(v) => setProfile({ propertyType: v })} options={[["flat", "Flat / apartment"], ["house", "House"], ["village", "Village house"]]} />
              <NumField label="Size" suffix="m²" value={p.areaM2} onChange={(n) => setProfile({ areaM2: n })} />
              <NumField label="People living here" value={p.occupants} onChange={(n) => setProfile({ occupants: Math.round(n) })} />
              <NumField label="Bedrooms" value={p.bedrooms} onChange={(n) => setProfile({ bedrooms: Math.round(n) })} />
            </div>
          </div>
          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">How you live</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <NumField label="Air-con on per day" suffix="hours, in summer" step={0.5} value={p.acHoursPerDay} onChange={(n) => setProfile({ acHoursPerDay: Math.min(24, n) })} />
              <NumField label="Driving (if you have an electric car)" suffix="km/yr" step={500} value={p.evKmPerYear} onChange={(n) => setProfile({ evKmPerYear: n })} />
              <Choice label="Hot water comes from" value={p.waterHeating} onChange={(v) => setProfile({ waterHeating: v })} options={[["electric", "Electric heater"], ["gas", "Gas (Towngas)"], ["unknown", "Not sure"]]} />
              <Choice label="You cook with" value={p.cooking} onChange={(v) => setProfile({ cooking: v })} options={[["gas", "Gas"], ["electric", "Electric / induction"]]} />
              <div className="flex items-center justify-between rounded-md border px-3 py-2"><Label className="text-sm">Someone home during the day</Label><Switch checked={p.homeDuringDay} onCheckedChange={(v) => setProfile({ homeDuringDay: v })} /></div>
            </div>
          </div>
          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">The building</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Choice label="Floor" value={p.floorLevel} onChange={(v) => setProfile({ floorLevel: v })} options={[["low", "Low (1–5)"], ["mid", "Middle"], ["high", "High / top floor"]]} />
              <Choice label="Building age" value={p.buildingAge} onChange={(v) => setProfile({ buildingAge: v })} options={[["new", "Under 10 years"], ["10-30", "10–30 years"], ["30+", "Over 30 years"]]} />
              <Choice label="Main windows face (affects how hard your AC works)" value={p.windowFacing ?? "unknown"} onChange={(v) => setProfile({ windowFacing: v })} options={[["N", "North"], ["NE", "North-east"], ["E", "East"], ["SE", "South-east"], ["S", "South"], ["SW", "South-west"], ["W", "West"], ["NW", "North-west"], ["unknown", "Not sure"]]} />
              <Choice label="Electricity plan" value={tariff.id} onChange={(v) => setProfile({ tariffId: v })} options={residential.map((t) => [t.id, t.name] as [string, string])} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4" data-tour="appliances">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Appliances I own <span className="font-mono text-sm text-muted-foreground">({home.appliances.length})</span></h2>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">1. Type</Label>
              <Select value={cat} onValueChange={(v) => { setCat(v); setPick(""); }}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Choose a type…" /></SelectTrigger>
                <SelectContent>{Object.keys(groups).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">2. Appliance</Label>
              <Select value={pick} onValueChange={setPick} disabled={!cat}>
                <SelectTrigger className="w-60"><SelectValue placeholder={cat ? "Choose one…" : "Pick a type first"} /></SelectTrigger>
                <SelectContent>{(groups[cat] ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={addFromCatalog} disabled={!pick}><Plus className="size-4" /> Add</Button>
            <MiscDialog onAdd={addItem} defaultCategory={cat} />
          </div>
        </div>

        {home.appliances.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No appliances yet. Pick a type, then an appliance — or add anything else with "Something else".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b text-left">
                  <th className="py-2 pr-2">Appliance</th><th className="px-2">How many</th><th className="px-2">Watts</th><th className="px-2">Hours/day</th><th className="px-2">Days/yr</th>
                  <th className="px-2 text-right">Cost/yr</th><th className="w-28 px-2">Share</th><th />
                </tr>
              </thead>
              <tbody>
                {s?.rows.map(({ item: x, kwh, cost }) => (
                  <tr key={x.uid} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <div className="font-medium">{x.name}</div>
                      <div className="text-xs text-muted-foreground">{x.category}{!x.catalogId && " · your own"}</div>
                    </td>
                    <td className="px-2"><Input className="h-8 w-16" type="number" min={1} value={x.quantity} onChange={(e) => setItem(x.uid, { quantity: Math.max(1, Math.round(Number(e.target.value))) })} /></td>
                    <td className="px-2"><Input className="h-8 w-20" type="number" min={0} value={x.watts} onChange={(e) => setItem(x.uid, { watts: Math.max(0, Number(e.target.value)) })} /></td>
                    <td className="px-2"><Input className="h-8 w-20" type="number" step={0.5} min={0} max={24} value={x.hoursPerDay} onChange={(e) => setItem(x.uid, { hoursPerDay: Math.min(24, Math.max(0, Number(e.target.value))) })} /></td>
                    <td className="px-2"><Input className="h-8 w-20" type="number" min={0} max={365} value={x.daysPerYear} onChange={(e) => setItem(x.uid, { daysPerYear: Math.min(365, Math.max(0, Math.round(Number(e.target.value)))) })} /></td>
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

      {s && home.appliances.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <EnergyCostCard annualCost={s.totalCost} annualKwh={s.totalKwh} rate={effectiveRate(tariff, a)} />
            <Stat label="Per month" value={hkd(s.totalCost / 12)} sub="average electricity bill" />
            <Stat label="Wasted on standby" value={`${hkd(s.standbyKwh * effectiveRate(tariff, a))}/yr`} sub="from things left plugged in" />
            <Stat label="Per person" value={`${hkd(perPerson * effectiveRate(tariff, a))}/yr`} sub={`${p.occupants} people at home`} />
          </div>

          <section className="rounded-lg border bg-card p-4" data-tour="recommendations">
            <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold"><Sparkles className="size-4 text-primary" /> Better choices for your home</h2>
            <p className="mb-3 text-sm text-muted-foreground">For each appliance you own, the model that costs least to own over {a.horizonYears} years in a home like yours.</p>
            {tips.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add an air-con, fridge, water heater, TV, washer, dryer, dehumidifier, dishwasher, cooktop or lighting to see suggestions.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {tips.map((t) => (
                  <div key={t.item.uid} className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Instead of your {t.item.name}</div>
                    <div className="font-medium">{t.best.product.brand} {t.best.product.model} <span className="text-muted-foreground">· {hkd(Number(t.best.product.price))}</span></div>
                    {t.yearlySaving > 20 ? (
                      <div className="mt-1 text-sm"><span className="text-positive">Saves about {hkd(t.yearlySaving)} a year</span>{t.paybackYears != null && <> — pays for itself in {t.paybackYears < 1 ? "under a year" : `${num(t.paybackYears, 1)} years`}{t.paybackYears > Number(t.best.product.lifetime_years) && " (longer than it lasts — only worth it when yours breaks)"}</>}</div>
                    ) : (
                      <div className="mt-1 text-sm text-muted-foreground">Yours is already about as cheap to run. Keep it until it breaks; then this is the best pick.</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">Want to compare more models? Go to <Link to="/buy" className="text-primary underline">Should I Buy This?</Link></p>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 font-display text-lg font-semibold">Where your money goes</h2>
            <div className="space-y-2">
              {Object.entries(s.byEndUse).sort((x, y) => y[1] - x[1]).map(([eu, kwh]) => (
                <div key={eu} className="grid grid-cols-[10rem_1fr_6rem] items-center gap-3 text-sm">
                  <span>{END_USE_LABEL[eu] ?? eu}</span>
                  <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(kwh / s.totalKwh) * 100}%` }} /></div>
                  <span className="text-right font-mono tabular-nums">{hkd((kwh / s.totalKwh) * s.totalCost)}</span>
                </div>
              ))}
            </div>
          </section>

          <AIAnalysisPanel
            module="home"
            subjectId={home.id}
            metrics={{
              home: { ...p, effective_rate_hkd_per_kwh: effectiveRate(tariff, a) },
              totals: { annual_kwh: Math.round(s.totalKwh), annual_cost_hkd: Math.round(s.totalCost), standby_kwh: Math.round(s.standbyKwh), co2_tonnes: +s.co2Tonnes.toFixed(2) },
              by_end_use_kwh: Object.fromEntries(Object.entries(s.byEndUse).map(([k, v]) => [k, Math.round(v)])),
              appliances: s.rows.map((r) => ({ name: r.item.name, qty: r.item.quantity, watts: r.item.watts, hours_per_day: r.item.hoursPerDay, annual_cost_hkd: Math.round(r.cost) })),
              upgrade_suggestions: tips.map((t) => ({ instead_of: t.item.name, model: `${t.best.product.brand} ${t.best.product.model}`, price_hkd: Number(t.best.product.price), yearly_saving_hkd: Math.round(t.yearlySaving), payback_years: t.paybackYears && +t.paybackYears.toFixed(1) })),
            }}
          />
          <Collapsible>
            <CollapsibleTrigger asChild><Button variant="ghost" size="sm"><ChevronDown className="size-4" /> Change the assumptions</Button></CollapsibleTrigger>
            <CollapsibleContent className="mt-2 max-w-md"><AssumptionPanel value={a} onChange={setA} fields={["usageChangePct", "horizonYears"]} /></CollapsibleContent>
          </Collapsible>
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

function MiscDialog({ onAdd, defaultCategory }: { onAdd: (x: Omit<OwnedAppliance, "uid">) => void; defaultCategory: string }) {
  const [open, setOpen] = useState(false);
  const blank = { name: "", category: "Other", watts: 100, standbyWatts: 0, hoursPerDay: 2, daysPerYear: 365, quantity: 1 };
  const [f, setF] = useState(blank);
  const cats = [...new Set([defaultCategory, ...MISC_CATEGORIES].filter(Boolean))];
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setF({ ...blank, category: defaultCategory || "Other" }); }}>
      <DialogTrigger asChild><Button variant="outline"><PackagePlus className="size-4" /> Something else</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add your own equipment</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">What is it?</Label>
            <Input value={f.name} placeholder="e.g. Aquarium pump, hair dryer" onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <Choice label="Type" value={f.category} onChange={(v) => setF({ ...f, category: v })} options={cats.map((c) => [c, c] as [string, string])} />
          <NumField label="Power when on" suffix="W" value={f.watts} onChange={(n) => setF({ ...f, watts: n })} />
          <NumField label="Power when off but plugged in" suffix="W" step={0.5} value={f.standbyWatts} onChange={(n) => setF({ ...f, standbyWatts: n })} />
          <NumField label="Hours on per day" step={0.5} value={f.hoursPerDay} onChange={(n) => setF({ ...f, hoursPerDay: Math.min(24, n) })} />
          <NumField label="Days used per year" value={f.daysPerYear} onChange={(n) => setF({ ...f, daysPerYear: Math.min(365, Math.round(n)) })} />
          <NumField label="How many" value={f.quantity} onChange={(n) => setF({ ...f, quantity: Math.max(1, Math.round(n)) })} />
        </div>
        <p className="text-xs text-muted-foreground">Tip: the power is usually on a label on the back or underneath, in watts (W).</p>
        <DialogFooter>
          <Button disabled={!f.name.trim()} onClick={() => { onAdd({ catalogId: null, endUse: "other", ...f, name: f.name.trim() }); setOpen(false); }}>Add to my home</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
