import { useAreaUnit } from "@/lib/units";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, IdCard, ShoppingCart, Building2, GitBranch, Plus, Trash2, House } from "lucide-react";
import { PageHeader } from "@/components/energy/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { homesQuery, optionsQuery, sitesQuery, tariffsQuery, productsQuery } from "@/lib/queries";
import { DEFAULT_ASSUMPTIONS, asArray, hkd, inventoryPassport, num, passportMetrics, procurementResult } from "@/lib/energy";
import { useHomes, type SavedHome } from "@/lib/my-home";
import { useProfile } from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CLP Energy Intelligence" },
      { name: "description", content: "Your saved homes, their energy ratings and yearly electricity costs at a glance." },
      { property: "og:title", content: "Dashboard — CLP Energy Intelligence" },
      { property: "og:description", content: "Your saved homes, their energy ratings and yearly electricity costs at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { profile, isLoading } = useProfile();
  if (isLoading) return <Skeleton className="h-96" />;
  return profile?.user_type === "business" ? <BusinessOverview /> : <HouseholdDashboard name={profile?.display_name ?? null} />;
}

function HouseholdDashboard({ name }: { name: string | null }) {
  const u = useAreaUnit();
  const { homes, isLoading, create, remove, setActiveId } = useHomes();
  const tariffs = useQuery(tariffsQuery);
  const [toDelete, setToDelete] = useState<SavedHome | null>(null);
  const rows = homes.map((h) => {
    const t = tariffs.data?.find((x) => x.id === h.profile.tariffId) ?? tariffs.data?.find((x) => x.id === "res-std");
    return { h, r: t && h.appliances.length ? inventoryPassport(h.appliances, h.profile.occupants, h.profile.areaM2, t, DEFAULT_ASSUMPTIONS) : null };
  });
  const total = rows.reduce((s, x) => s + (x.r?.summary.totalCost ?? 0), 0);

  return (
    <>
      <PageHeader kicker="Dashboard" title={name ? `Hi ${name.split(" ")[0]}` : "Your homes"} sub="Everything you've saved, in one place. Open a home to add appliances, see its rating, or check if a new purchase is worth it."
        right={<Button onClick={() => create.mutate({ name: `Home ${homes.length + 1}` })} disabled={create.isPending}><Plus className="size-4" /> Add a home</Button>} />

      {homes.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:col-span-2 md:row-span-2">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-positive" /> Electricity, all homes
            </div>
            <div className="mt-6 font-mono text-5xl font-semibold tracking-tighter tabular-nums">{hkd(total)}</div>
            <div className="mt-1 text-sm text-muted-foreground">estimated per year</div>
            <div className="mt-8 grid grid-cols-3 gap-2">
              {rows.slice(0, 3).map(({ h, r }) => (
                <div key={h.id} className="rounded-xl border border-border/60 p-3">
                  <div className="truncate text-xs text-muted-foreground">{h.profile.name}</div>
                  <div className="mt-1 font-mono text-sm tabular-nums">{r ? hkd(r.summary.totalCost) : "—"}</div>
                </div>
              ))}
            </div>
          </div>
          <div aria-hidden className="relative hidden min-h-40 overflow-hidden rounded-2xl border bg-card md:col-span-1 md:row-span-2 md:block lg:col-span-2">
            <div className="ambient pointer-events-none absolute inset-0 z-0 opacity-90" />
            <div className="pointer-events-none absolute -right-10 -top-10 z-0 size-56 animate-pulse rounded-full bg-primary/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 left-6 z-0 size-48 rounded-full bg-chart-2/20 blur-3xl" />
            <div className="absolute bottom-4 left-5 z-[1] font-mono text-[10px] uppercase tracking-widest text-muted-foreground">CLP · Energy Intelligence</div>
          </div>
          <Tile label="Homes saved" value={String(homes.length)} />
          <Tile label="Appliances tracked" value={String(homes.reduce((s, h) => s + h.appliances.length, 0))} />
        </div>
      )}

      <div data-tour="dashboard-homes" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading && <Skeleton className="h-40" />}
        {rows.map(({ h, r }) => (
          <div key={h.id} className="tactile group relative rounded-2xl border bg-card p-4 hover:border-primary/50">
            <Link to="/home" onClick={() => setActiveId(h.id)} className="block">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-display text-lg font-semibold">{h.profile.name}</div>
                  <div className="text-xs text-muted-foreground">{h.profile.district || "Hong Kong"} · {u.show(h.profile.areaM2)} {u.label} · {h.profile.occupants} people</div>
                </div>
                {r ? <span className={`grid size-9 shrink-0 place-items-center rounded font-mono font-bold text-background ${GRADE_BG[r.grade]}`}>{r.grade}</span>
                  : <span className="grid size-9 shrink-0 place-items-center rounded border border-dashed text-muted-foreground"><House className="size-4" /></span>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div><div className="text-xs text-muted-foreground">Per year</div><div className="font-mono tabular-nums">{r ? hkd(r.summary.totalCost) : "—"}</div></div>
                <div><div className="text-xs text-muted-foreground">Appliances</div><div className="font-mono tabular-nums">{h.appliances.length}</div></div>
              </div>
              {!r && <div className="mt-3 text-xs text-primary">Add appliances to get a rating →</div>}
            </Link>
            <div className="mt-3 flex gap-2 border-t pt-3">
              <Button asChild size="sm" variant="ghost"><Link to="/passport" onClick={() => setActiveId(h.id)}><IdCard className="size-4" /> Passport</Link></Button>
              <Button asChild size="sm" variant="ghost"><Link to="/buy" onClick={() => setActiveId(h.id)}><ShoppingCart className="size-4" /> Buy</Link></Button>
              <Button size="icon" variant="ghost" className="ml-auto" aria-label={`Delete ${h.profile.name}`} onClick={() => setToDelete(h)}><Trash2 className="size-4" /></Button>
            </div>
          </div>
        ))}
        {!isLoading && (
          <button onClick={() => create.mutate({ name: `Home ${homes.length + 1}` })} className="tactile grid min-h-40 place-items-center rounded-2xl border border-dashed p-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground">
            <span className="flex items-center gap-2"><Plus className="size-4" /> {homes.length ? "Add another home" : "Add your first home"}</span>
          </button>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.profile.name}”?</AlertDialogTitle>
            <AlertDialogDescription>This removes the home and its {toDelete?.appliances.length ?? 0} appliances from your account. It can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

const GRADE_BG: Record<string, string> = { A: "bg-grade-a", B: "bg-grade-b", C: "bg-grade-c", D: "bg-grade-d", E: "bg-grade-e" };

function BusinessOverview() {
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
    { to: "/buildings", icon: Building2, title: "Building Investments", stat: "7 measure types", sub: "Upfront, savings, payback" },
    { to: "/procurement", icon: Building2, title: "Business Procurement", stat: `${hkd(totalOpportunity)}/yr opportunity`, sub: "Cost, risk band and emissions" },
    { to: "/scenarios", icon: GitBranch, title: "Scenario Analysis", stat: "7 scenarios", sub: "Fuel, usage, carbon, load shift" },
  ] as const;

  return (
    <>
      <PageHeader kicker="Business" title="Portfolio overview" sub="Every figure is computed from site data and explicit assumptions. AI findings are generated on demand from those figures." />
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
                  <span className={`grid size-7 place-items-center rounded font-mono text-sm font-bold text-background ${GRADE_BG[m.grade]}`}>{m.grade}</span>
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
