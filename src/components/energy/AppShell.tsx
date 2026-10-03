import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Gauge, IdCard, ShoppingCart, Building2, GitBranch, House, Factory, History, LifeBuoy, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { Tour } from "./Tour";
import { useAreaUnit } from "@/lib/units";


const HOUSEHOLD_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/home", label: "My Home", icon: House },
  { to: "/passport", label: "Energy Passport", icon: IdCard },
  { to: "/buy", label: "Should I Buy This?", icon: ShoppingCart },
] as const;
const BUSINESS_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/buildings", label: "Building Investments", icon: Factory },
  { to: "/procurement", label: "Business Procurement", icon: Building2 },
  { to: "/scenarios", label: "Scenario Analysis", icon: GitBranch },
] as const;
const COMMON_NAV = [
  { to: "/history", label: "History", icon: History },
  { to: "/help", label: "Help & guide", icon: LifeBuoy },
] as const;

const BARE = ["/", "/auth"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (BARE.includes(pathname)) return <>{children}</>;
  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  const { profile, update } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const mode = profile?.user_type ?? "household";
  const nav = [...(mode === "business" ? BUSINESS_NAV : HOUSEHOLD_NAV), ...COMMON_NAV];

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const area = useAreaUnit();
  const unitSwitch = (
    <div className="grid grid-cols-2 gap-1 rounded-md bg-sidebar-accent/50 p-1 text-xs" aria-label="Area unit">
      {(["m2", "sqft"] as const).map((u) => (
        <button key={u} onClick={() => area.setUnit(u)}
          className={cn("rounded px-2 py-1 transition-colors", area.unit === u ? "bg-background font-medium text-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground")}>
          {u === "m2" ? "m²" : "sq ft"}
        </button>
      ))}
    </div>
  );
  const modeSwitch = (
    <div data-tour="mode-switch" className="grid grid-cols-2 gap-1 rounded-md bg-sidebar-accent/50 p-1 text-xs">
      {(["household", "business"] as const).map((m) => (
        <button key={m} onClick={() => { update.mutate({ user_type: m }); navigate({ to: "/dashboard" }); }}
          className={cn("rounded px-2 py-1.5 transition-colors", mode === m ? "bg-background font-medium text-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground")}>
          {m === "household" ? "Home" : "Business"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <div className="mb-6 px-2">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded bg-primary font-mono text-xs font-bold text-primary-foreground">CLP</span>
            <span className="font-display text-sm font-semibold leading-tight text-sidebar-foreground">Energy<br />Intelligence</span>
          </div>
        </div>
        <div className="mb-4 space-y-2">{modeSwitch}{unitSwitch}</div>
        <nav className="space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} data-tour={`nav-${to}`}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeProps={{ className: "!bg-sidebar-accent !text-sidebar-foreground font-medium" }}>
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 border-t pt-3 px-2">
          <div className="truncate text-sm text-sidebar-foreground">{profile?.display_name ?? "…"}</div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">{profile?.email}</div>
          <button onClick={signOut} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><LogOut className="size-3.5" /> Sign out</button>
          <div className="font-mono text-[10px] leading-relaxed text-muted-foreground">Demo data · HK$</div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 border-b p-2 md:hidden">
          <div className="w-40 shrink-0">{modeSwitch}</div>
          <div className="w-28 shrink-0">{unitSwitch}</div>
          <nav className="flex gap-1 overflow-x-auto">
            {nav.map(({ to, label }) => (
              <Link key={to} to={to} className="whitespace-nowrap rounded px-2.5 py-1.5 text-xs text-muted-foreground" activeProps={{ className: "!bg-accent !text-foreground" }}>{label}</Link>
            ))}
          </nav>
          <button onClick={signOut} aria-label="Sign out" className="ml-auto p-1.5 text-muted-foreground"><LogOut className="size-4" /></button>
        </div>
        <main className="mx-auto max-w-7xl p-5 md:p-8">{children}</main>
      </div>
      <Tour mode={mode} />
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
