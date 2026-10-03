import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/energy/AppShell";
import { EnergyPassportCard } from "@/components/energy/EnergyPassportCard";
import { EnergyCostCard } from "@/components/energy/MetricCards";
import { AssumptionPanel } from "@/components/energy/AssumptionPanel";
import { AIAnalysisPanel } from "@/components/energy/AIFindingCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { homesQuery, tariffsQuery } from "@/lib/queries";
import { DEFAULT_ASSUMPTIONS, MONTHS, asArray, asRecord, effectiveRate, num, passportMetrics } from "@/lib/energy";

export const Route = createFileRoute("/_authenticated/passport")({
  head: () => ({
    meta: [
      { title: "Energy Passport — CLP Energy Intelligence" },
      { name: "description", content: "A standardised energy rating, cost and emissions profile for each home." },
      { property: "og:title", content: "Energy Passport — CLP Energy Intelligence" },
      { property: "og:description", content: "A standardised energy rating, cost and emissions profile for each home." },
    ],
  }),
  component: PassportPage,
});

function PassportPage() {
  const homes = useQuery(homesQuery);
  const tariffs = useQuery(tariffsQuery);
  const [homeId, setHomeId] = useState("home-1");
  const [a, setA] = useState(DEFAULT_ASSUMPTIONS);

  const home = homes.data?.find((h) => h.id === homeId);
  const tariff = tariffs.data?.find((t) => t.id === home?.tariff_id);
  const m = useMemo(() => (home && tariff ? passportMetrics(home, tariff, a) : null), [home, tariff, a]);

  const header = (
    <PageHeader
      kicker="Module 01"
      title="Energy Passport"
      sub="A standardised rating of how a home uses energy, what it costs and how it compares to similar homes."
      right={
        <Select value={homeId} onValueChange={setHomeId}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {homes.data?.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>
      }
    />
  );
  if (!home || !tariff || !m) return <>{header}<Skeleton className="h-96" /></>;

  const months = asArray(home.monthly_kwh).map((v, i) => ({ month: MONTHS[i], kwh: Math.round(v * (1 + a.usageChangePct / 100)) }));
  const endUse = Object.entries(asRecord(home.end_use_share)).sort((x, y) => y[1] - x[1]);

  return (
    <>
      {header}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <EnergyPassportCard home={home} m={m} />
          <div className="grid gap-5 md:grid-cols-[1fr_280px]">
            <div className="rounded-lg border bg-card p-4">
              <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Monthly consumption · kWh</div>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={months}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} />
                    <Bar dataKey="kwh" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-5">
              <EnergyCostCard annualCost={m.annualCost} annualKwh={m.annualKwh} rate={effectiveRate(tariff, a)} />
              <div className="rounded-lg border bg-card p-4">
                <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">End-use split</div>
                <div className="space-y-2">
                  {endUse.map(([k, v]) => (
                    <div key={k} className="text-sm">
                      <div className="flex justify-between"><span className="capitalize">{k.replace("_", " ")}</span><span className="tabular-nums text-muted-foreground">{num(v * 100)}%</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-chart-2" style={{ width: `${v * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <AIAnalysisPanel
            module="passport"
            subjectId={home.id}
            metrics={{ home: { name: home.name, district: home.district, floor_area_m2: home.floor_area_m2, occupants: home.occupants }, tariff: tariff.name, peer_median_kwh: home.peer_median_kwh, metrics: m, end_use_share: home.end_use_share, monthly_kwh: months, assumptions: a }}
          />
        </div>
        <AssumptionPanel value={a} onChange={setA} fields={["usageChangePct", "fuelAdjDelta", "carbonPricePerTonne"]} />
      </div>
    </>
  );
}
