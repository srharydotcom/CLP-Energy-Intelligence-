import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/energy/AppShell";
import { ProductComparisonTable } from "@/components/energy/ProductComparisonTable";
import { EnergyCostCard, LifetimeCostCard, PaybackCard, SavingsCard } from "@/components/energy/MetricCards";
import { AssumptionPanel } from "@/components/energy/AssumptionPanel";
import { AIAnalysisPanel } from "@/components/energy/AIFindingCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { productsQuery, tariffsQuery } from "@/lib/queries";
import { DEFAULT_ASSUMPTIONS, effectiveRate, payback, productEconomics } from "@/lib/energy";

export const Route = createFileRoute("/buy")({
  head: () => ({
    meta: [
      { title: "Should I Buy This? — CLP Energy Intelligence" },
      { name: "description", content: "Compare appliances on true cost of ownership, savings and payback." },
      { property: "og:title", content: "Should I Buy This? — CLP Energy Intelligence" },
      { property: "og:description", content: "Compare appliances on true cost of ownership, savings and payback." },
    ],
  }),
  component: BuyPage,
});

function BuyPage() {
  const products = useQuery(productsQuery);
  const tariffs = useQuery(tariffsQuery);
  const [category, setCategory] = useState("Air conditioner");
  const [selected, setSelected] = useState<string>();
  const [a, setA] = useState(DEFAULT_ASSUMPTIONS);
  const tariff = tariffs.data?.find((t) => t.id === "res-std");
  const categories = [...new Set(products.data?.map((p) => p.category) ?? [])];

  const rows = useMemo(
    () => (tariff ? (products.data ?? []).filter((p) => p.category === category).map((p) => productEconomics(p, tariff, a)) : []),
    [products.data, tariff, category, a],
  );
  // Baseline = cheapest sticker price in category
  const baseline = rows.reduce((b, r) => (b && Number(b.product.price) <= Number(r.product.price) ? b : r), rows[0]);
  const cand = rows.find((r) => r.product.id === selected) ?? rows.reduce((b, r) => (r.costPerYear < b.costPerYear ? r : b), rows[0]);

  const header = <PageHeader kicker="Module 02" title="Should I Buy This?" sub="Compare products on total cost of ownership, not sticker price. Select a model to see its case against the cheapest option." />;
  if (!tariff || !cand || !baseline) return <>{header}<Skeleton className="h-96" /></>;

  const pb = payback(cand, baseline);
  const years = cand.product.lifetime_years;

  return (
    <>
      {header}
      <Tabs value={category} onValueChange={(c) => { setCategory(c); setSelected(undefined); }} className="mb-5">
        <TabsList>{categories.map((c) => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}</TabsList>
      </Tabs>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <ProductComparisonTable rows={rows} selectedId={cand.product.id} baselineId={baseline.product.id} onSelect={setSelected} />
          <div className="font-display text-lg font-semibold">{cand.product.brand} {cand.product.model} <span className="text-muted-foreground">vs {baseline.product.brand} {baseline.product.model}</span></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <EnergyCostCard annualCost={cand.annualCost} annualKwh={Number(cand.product.annual_kwh) * (1 + a.usageChangePct / 100)} rate={effectiveRate(tariff, a)} />
            <LifetimeCostCard total={cand.lifetimeCost} purchase={Number(cand.product.price)} energy={cand.lifetimeEnergyCost} maintenance={cand.lifetimeMaintenance} years={years} />
            <SavingsCard annual={pb.yearlySaving} lifetime={baseline.costPerYear * years - cand.lifetimeCost} />
            <PaybackCard years={pb.years} lifetime={years} extraCost={pb.extraCost} />
          </div>
          <AIAnalysisPanel
            module="purchase"
            subjectId={cand.product.id}
            metrics={{
              category,
              tariff: tariff.name,
              candidate: { ...cand.product, annual_cost: cand.annualCost, lifetime_cost_pv: cand.lifetimeCost, cost_per_year_owned: cand.costPerYear, lifetime_co2_kg: cand.lifetimeCo2Kg },
              baseline: { ...baseline.product, annual_cost: baseline.annualCost, lifetime_cost_pv: baseline.lifetimeCost, cost_per_year_owned: baseline.costPerYear },
              payback: pb,
              alternatives: rows.map((r) => ({ id: r.product.id, model: `${r.product.brand} ${r.product.model}`, cost_per_year_owned: Math.round(r.costPerYear) })),
              assumptions: a,
            }}
          />
        </div>
        <AssumptionPanel value={a} onChange={setA} fields={["tariffEscalationPct", "discountRatePct", "fuelAdjDelta", "usageChangePct", "carbonPricePerTonne"]} />
      </div>
    </>
  );
}
