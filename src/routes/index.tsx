import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { House, IdCard, ShoppingCart, Factory, Building2, GitBranch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CLP Energy Intelligence — Smarter energy decisions for homes and businesses" },
      { name: "description", content: "Rate your home, see what appliances really cost to run, and plan business energy investments with clear numbers." },
      { property: "og:title", content: "CLP Energy Intelligence" },
      { property: "og:description", content: "Rate your home, see what appliances really cost to run, and plan business energy investments with clear numbers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/dashboard", replace: true }); });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="mx-auto flex max-w-6xl items-center justify-between p-5">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded bg-primary font-mono text-xs font-bold text-primary-foreground">CLP</span>
          <span className="font-display font-semibold">Energy Intelligence</span>
        </div>
        <Button asChild variant="outline"><Link to="/auth">Sign in</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-12">
        <div className="max-w-2xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Energy decisions, structured</div>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">Know what your electricity really costs — before you spend.</h1>
          <p className="mt-4 text-lg text-muted-foreground">Save your home and appliances, get an A–E rating, and see whether a new air-con, fridge or car pays for itself. Businesses get full investment and contract analysis.</p>
          <div className="mt-8 flex gap-3"><Button asChild size="lg"><Link to="/auth">Get started — it's free</Link></Button></div>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          <Column title="For your home" items={[
            [House, "My Home", "Your house and every appliance, saved to your account."],
            [IdCard, "Energy Passport", "An A–E rating with the working shown."],
            [ShoppingCart, "Should I Buy This?", "Real cost over the years, not just the price tag."],
          ]} />
          <Column title="For business" items={[
            [Factory, "Building Investments", "HVAC, lighting, solar, batteries and more — within budget."],
            [Building2, "Procurement", "Contract options by cost, risk and emissions."],
            [GitBranch, "Scenarios", "Stress-test prices, usage and carbon."],
          ]} />
        </div>
      </main>
    </div>
  );
}

function Column({ title, items }: { title: string; items: [typeof House, string, string][] }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>
      <ul className="space-y-4">
        {items.map(([Icon, t, d]) => (
          <li key={t} className="flex gap-3"><Icon className="mt-0.5 size-5 shrink-0 text-primary" /><div><div className="font-medium">{t}</div><div className="text-sm text-muted-foreground">{d}</div></div></li>
        ))}
      </ul>
    </section>
  );
}
