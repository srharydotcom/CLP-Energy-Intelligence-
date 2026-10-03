import { useAreaUnit } from "@/lib/units";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/energy/AppShell";
import { EnergyPassportCard } from "@/components/energy/EnergyPassportCard";
import { AIAnalysisPanel } from "@/components/energy/AIFindingCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { tariffsQuery } from "@/lib/queries";
import { END_USE_LABEL, useHomes } from "@/lib/my-home";
import {
  DEFAULT_ASSUMPTIONS, MONTHS, PEER_BASE_KWH, PEER_PER_M2_KWH, PEER_PER_PERSON_KWH, effectiveRate, hkd, inventoryPassport, num,
  type PassportMetrics,
} from "@/lib/energy";

export const Route = createFileRoute("/_authenticated/passport")({
  head: () => ({
    meta: [
      { title: "Energy Passport — CLP Energy Intelligence" },
      { name: "description", content: "An energy rating for your home built from the appliances you own, with every step of the calculation shown." },
      { property: "og:title", content: "Energy Passport — CLP Energy Intelligence" },
      { property: "og:description", content: "An energy rating for your home built from the appliances you own, with every step of the calculation shown." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PassportPage,
});

// How Hong Kong cooling use spreads over the year (sums to 12).
const COOLING_WEIGHTS = [0.2, 0.2, 0.4, 0.8, 1.4, 1.8, 2, 2, 1.7, 1.1, 0.3, 0.1];

function PassportPage() {
  const u = useAreaUnit();
  const { homes, active, setActiveId, isLoading } = useHomes();
  const tariffs = useQuery(tariffsQuery);
  const a = DEFAULT_ASSUMPTIONS;
  const tariff = tariffs.data?.find((t) => t.id === active?.profile.tariffId) ?? tariffs.data?.find((t) => t.id === "res-std");
  const p = active?.profile;
  const r = useMemo(() => (active && tariff ? inventoryPassport(active.appliances, active.profile.occupants, active.profile.areaM2, tariff, a) : null), [active, tariff, a]);

  const header = (
    <PageHeader kicker="Your rating" title="Energy Passport" sub="A simple A–E rating of how much electricity your home uses compared with similar homes, built from the appliances you told us about."
      right={homes.length > 0 && (
        <Select value={active?.id ?? ""} onValueChange={setActiveId}>
          <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>{homes.map((h) => <SelectItem key={h.id} value={h.id}>{h.profile.name}</SelectItem>)}</SelectContent>
        </Select>
      )} />
  );
  if (isLoading || tariffs.isLoading) return <>{header}<Skeleton className="h-96" /></>;
  if (!active || !p || !tariff || !r) return <>{header}<Empty text="Add a home first to get its passport." /></>;
  if (active.appliances.length === 0) return <>{header}<Empty text={`Add the appliances in “${p.name}” to get its passport.`} /></>;

  const s = r.summary;
  const rate = effectiveRate(tariff, a);
  const cooling = s.byEndUse["cooling"] ?? 0;
  const months = COOLING_WEIGHTS.map((w, i) => ({ month: MONTHS[i], kwh: Math.round((s.totalKwh - cooling) / 12 + (cooling * w) / 12) }));
  const max = Math.max(...months.map((m) => m.kwh));
  const min = Math.min(...months.map((m) => m.kwh));
  const m: PassportMetrics = {
    annualKwh: s.totalKwh, annualCost: s.totalCost, kwhPerM2: r.kwhPerM2, kwhPerPerson: r.kwhPerPerson, vsPeerPct: r.vsPeerPct,
    grade: r.grade, score: r.score, co2Tonnes: s.co2Tonnes, peakMonth: months.findIndex((x) => x.kwh === max), seasonalityRatio: min ? max / min : 0,
  };

  return (
    <>
      {header}
      <div className="passport-pages space-y-5">
        <EnergyPassportCard code={p.name.slice(0, 12).toUpperCase()} name={p.name} sub={`${p.district || "Hong Kong"} · ${num(u.show(p.areaM2))} ${u.label} · ${p.occupants} people`} m={m} />

        <div className="passport-four-sections">
          <section className="passport-page p-5 sm:p-6">
            <div className="passport-page-heading"><span>03 / Method</span><span>Energy passport</span></div>
            <h2 className="mb-5 font-display text-xl font-semibold">How we worked this out</h2>
            <ol className="space-y-3 text-sm">
              <Step n={1} title="Add up your appliances">
                Each appliance: watts × hours on per day × days per year, plus its standby power the rest of the time. All {active.appliances.length} together use <b>{num(s.totalKwh)} kWh</b> a year.
              </Step>
              <Step n={2} title="Turn it into money">
                {num(s.totalKwh)} kWh × {hkd(rate, 2)} per kWh = <b>{hkd(s.totalCost)}</b> a year (about {hkd(s.totalCost / 12)} a month).
              </Step>
              <Step n={3} title="Compare with similar homes">
                A typical home with {p.occupants} people and {num(u.show(p.areaM2))} {u.label} uses about {num(PEER_BASE_KWH)} + {num(PEER_PER_PERSON_KWH)} × {p.occupants} people + {num(u.perArea(PEER_PER_M2_KWH), 2)} × {num(u.show(p.areaM2))} {u.label} = <b>{num(r.peer)} kWh</b>. Yours is <b>{num(Math.abs(r.vsPeerPct))}% {r.vsPeerPct >= 0 ? "more" : "less"}</b>.
              </Step>
              <Step n={4} title="Give it a score">
                Score = 70 − 1.2 × {num(r.vsPeerPct, 1)} = <b>{r.score}</b> (kept between 0 and 100). A is 80+, B 65+, C 50+, D 35+, E below. This home is <b>{r.grade}</b>.
              </Step>
              <Step n={5} title="Spread it over the year">
                Air-con use is weighted to the hot months (May–October); everything else is split evenly. That makes the monthly chart.
              </Step>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">The “similar homes” figures are demo numbers, not official statistics.</p>
          </section>

          <section className="passport-page p-5 sm:p-6">
            <div className="passport-page-heading"><span>04 / Usage</span><span>Energy passport</span></div>
            <div className="mb-5 font-display text-xl font-semibold">Estimated use by month <span className="font-mono text-xs font-normal text-muted-foreground">· kWh</span></div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={months}>
                  <CartesianGrid vertical={false} stroke="var(--passport-rule)" />
                  <XAxis dataKey="month" stroke="var(--passport-muted)" fontSize={11} />
                  <YAxis stroke="var(--passport-muted)" fontSize={11} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
                  <Bar dataKey="kwh" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        <section className="passport-page p-5 sm:p-6">
          <div className="passport-page-heading"><span>05 / Inventory</span><span>Energy passport</span></div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Appliances in this home</h2>
            <Button asChild size="sm" variant="outline"><Link to="/home">Edit appliances</Link></Button>
          </div>
          <div className="overflow-x-auto"><table className="min-w-[670px] w-full text-sm">
            <thead className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b text-left"><th className="py-2">Appliance</th><th>Used for</th><th className="text-right">Working out</th><th className="text-right">kWh/yr</th><th className="text-right">Cost/yr</th></tr>
            </thead>
            <tbody>
              {s.rows.map(({ item: x, kwh, cost }) => (
                <tr key={x.uid} className="border-b last:border-0">
                  <td className="py-2 font-medium">{x.quantity > 1 && `${x.quantity}× `}{x.name}</td>
                  <td className="text-muted-foreground">{END_USE_LABEL[x.endUse] ?? x.endUse}</td>
                  <td className="text-right font-mono text-xs text-muted-foreground">{x.watts} W × {x.hoursPerDay} h × {x.daysPerYear} d{x.standbyWatts > 0 && ` + ${x.standbyWatts} W standby`}</td>
                  <td className="text-right font-mono tabular-nums">{num(kwh)}</td>
                  <td className="text-right font-mono tabular-nums">{hkd(cost)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>

        <div className="passport-analysis">
          <div className="passport-page-heading"><span>06 / Findings</span><span>Energy passport</span></div>
          <AIAnalysisPanel
            module="passport"
            subjectId={active.id}
            metrics={{ home: p, grade: r.grade, score: r.score, annual_kwh: Math.round(s.totalKwh), annual_cost_hkd: Math.round(s.totalCost), similar_homes_kwh: Math.round(r.peer), vs_similar_pct: +r.vsPeerPct.toFixed(1), by_end_use_kwh: Object.fromEntries(Object.entries(s.byEndUse).map(([k, v]) => [k, Math.round(v)])), appliances: s.rows.map((x) => ({ name: x.item.name, annual_cost_hkd: Math.round(x.cost) })) }}
          />
        </div>
        </div>
      </div>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-xs text-primary">{n}</span>
      <div><div className="font-medium">{title}</div><div className="text-muted-foreground">{children}</div></div>
    </li>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="passport-spread passport-empty">
      <div className="passport-cover relative overflow-hidden">
        <div className="passport-spine" aria-hidden="true" />
        <div className="passport-cover-inner">
          <div className="passport-cover-top font-mono text-[10px] uppercase text-primary"><span>CLP · Hong Kong</span><span>Residential / HK</span></div>
          <div className="passport-cover-center">
            <div className="passport-seal" aria-hidden="true"><span>CLP</span><span>ENERGY</span></div>
            <div className="mt-6 font-mono text-[10px] uppercase text-primary">Household energy record</div>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-none sm:text-5xl">Energy<br />Passport</h2>
            <div className="passport-cover-mark" aria-hidden="true">HK</div>
          </div>
          <div className="passport-cover-bottom font-mono text-[10px] uppercase text-primary"><span>Energy intelligence</span><span>01 / 06</span></div>
        </div>
      </div>
      <div className="passport-sheet flex flex-col">
        <div className="passport-sheet-masthead font-mono text-[10px] uppercase"><span>CLP / Energy Intelligence</span><span>HK · 02</span></div>
        <div className="flex flex-1 flex-col items-start justify-center py-12">
          <div className="font-mono text-[10px] uppercase text-muted-foreground">Awaiting household details</div>
          <h3 className="mt-3 font-display text-2xl font-semibold">Your record starts here.</h3>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">{text}</p>
          <Button asChild className="mt-6"><Link to="/home">Go to My Home</Link></Button>
        </div>
        <div className="passport-sheet-footer font-mono text-[10px] uppercase"><span>Residential energy record</span><span>02 / 06</span></div>
      </div>
    </div>
  );
}
