import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Gauge, IdCard, ShoppingCart, Building2, GitBranch } from "lucide-react";

const NAV = [
  { to: "/", label: "Overview", icon: Gauge },
  { to: "/passport", label: "Energy Passport", icon: IdCard },
  { to: "/buy", label: "Should I Buy This?", icon: ShoppingCart },
  { to: "/procurement", label: "Business Procurement", icon: Building2 },
  { to: "/scenarios", label: "Scenario Analysis", icon: GitBranch },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background font-sans">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <div className="mb-8 px-2">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded bg-primary font-mono text-xs font-bold text-primary-foreground">CLP</span>
            <span className="font-display text-sm font-semibold leading-tight text-sidebar-foreground">Energy<br />Intelligence</span>
          </div>
        </div>
        <nav className="space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeProps={{ className: "!bg-sidebar-accent !text-sidebar-foreground font-medium" }}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Synthetic demo data.
          <br />Figures in HK$.
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <nav className="flex gap-1 overflow-x-auto border-b p-2 md:hidden">
          {NAV.map(({ to, label }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="whitespace-nowrap rounded px-2.5 py-1.5 text-xs text-muted-foreground" activeProps={{ className: "!bg-accent !text-foreground" }}>
              {label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto max-w-7xl p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ kicker, title, sub, right }: { kicker: string; title: string; sub: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{kicker}</div>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{sub}</p>
      </div>
      {right}
    </div>
  );
}
