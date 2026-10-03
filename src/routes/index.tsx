import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, IdCard, ShoppingCart, Building2, GitBranch } from "lucide-react";
import { PageHeader } from "@/components/energy/AppShell";
import { homesQuery, optionsQuery, sitesQuery, tariffsQuery, productsQuery } from "@/lib/queries";
import { DEFAULT_ASSUMPTIONS, asArray, hkd, num, passportMetrics, procurementResult } from "@/lib/energy";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CLP Energy Intelligence — Energy decision platform" },
      { name: "description", content: "Energy passports, purchase decisions, business procurement and scenario analysis in one structured platform." },
      { property: "og:title", content: "CLP Energy Intelligence" },
      { property: "og:description", content: "Energy passports, purchase decisions, business procurement and scenario analysis in one structured platform." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const homes = useQuery(homesQuery);
  const tariffs = useQuery(tariffsQuery);
  const sites = useQuery(sitesQuery);
  const options = useQuery(optionsQuery);
  const products = useQuery(productsQuery);

  const homeStats = (homes.data ?? []).flatMap((h) => {
    const t = tariffs.data?.find((x) => x.id === h.tariff_id);
    return t ? [{ h, m: passportMetrics(h, t, DEFAULT_ASSUMPTIONS) }] : [];
  });
  const siteStats = (sites.data ?? []).flatMap((s) => {
    const rs = (options.data ?? []).map((o) => procurementResult(s, o, DEFAULT_ASSUMPTIONS));
    const cur = rs.find((r) => r.option.id === s.current_option_id);
    const best = rs.reduce((b, r) => (!b || r.annualCost < b.annualCost ? r : b), rs[0]);
    return cur && best ? [{ s, cur, best, mwh: asArray(s.monthly_mwh).reduce((a, b) => a + b, 0) }] : [];
  });
  const totalOpportunity = siteStats.reduce((a, x) => a + (x.cur.annualCost - x.best.annualCost), 0);

  const modules = [
    { to: "/passport", icon: IdCard, title: "Energy Passport", stat: `${homeStats.length} homes rated`, sub: "Grade, intensity and peer benchmark" },
    { to: "/buy", icon: ShoppingCart, title: "Should I Buy This?", stat: `${products.data?.length ?? 0} products`, sub: "Lifetime cost and payback" },
    { to: "/procurement", icon: Building2, title: "Business Procurement", stat: `${hkd(totalOpportunity)}/yr opportunity`, sub: "Cost, risk band and emissions" },
    { to: "/scenarios", icon: GitBranch, title: "Scenario Analysis", stat: "7 scenarios", sub: "Fuel, usage, carbon, load shift" },
  ] as const;

  return (
    <>
      <PageHeader kicker="Overview" title="Energy decisions, structured." sub="Every figure here is computed from portfolio data and explicit assumptions. AI findings are generated on demand from those figures." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map(({ to, icon: Icon, title, stat, sub }) => (
          <Link key={to} to={to} className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50">
            <div className="flex items-center justify-between">
              <Icon className="size-5 text-primary" />
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <div className="mt-4 font-display font-semibold">{title}</div>
            <div className="mt-1 font-mono text-sm tabular-nums text-primary">{stat}</div>
            <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Residential portfolio</div>
          <div className="divide-y">
            {homeStats.map(({ h, m }) => (
              <div key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="font-medium">{h.name}</div>
                  <div className="text-xs text-muted-foreground">{num(m.annualKwh)} kWh · {m.vsPeerPct >= 0 ? "+" : ""}{num(m.vsPeerPct, 0)}% vs peers</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">{hkd(m.annualCost)}</span>
                  <span className={`grid size-7 place-items-center rounded font-mono text-sm font-bold text-background bg-grade-${m.grade.toLowerCase()}`}>{m.grade}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border bg-card p-4">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Business sites</div>
          <div className="divide-y">
            {siteStats.map(({ s, cur, best, mwh }) => (
              <div key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{num(mwh)} MWh · on {cur.option.name}</div>
                </div>
                <div className="text-right">
                  <div className="tabular-nums">{hkd(cur.annualCost)}</div>
                  <div className="font-mono text-xs text-positive">{cur === best ? "already optimal" : `save ${hkd(cur.annualCost - best.annualCost)}`}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
