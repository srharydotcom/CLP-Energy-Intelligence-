import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { hkd, num } from "@/lib/energy";

function Shell({ label, children, tone = "default", footer }: { label: string; children: ReactNode; tone?: "default" | "good" | "warn"; footer?: ReactNode }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card p-4",
        tone === "good" && "border-positive/40",
        tone === "warn" && "border-warning/40",
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-0.5", tone === "good" ? "bg-positive" : tone === "warn" ? "bg-warning" : "bg-primary")} />
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2">{children}</div>
      {footer && <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">{footer}</div>}
    </div>
  );
}

const Big = ({ children }: { children: ReactNode }) => <div className="font-display text-2xl font-semibold tabular-nums tracking-tight truncate">{children}</div>;

export function EnergyCostCard({ annualCost, annualKwh, rate }: { annualCost: number; annualKwh: number; rate: number }) {
  return (
    <Shell label="Annual energy cost" footer={<>{num(annualKwh)} kWh × {hkd(rate, 2)}/kWh effective</>}>
      <Big>{hkd(annualCost)}</Big>
      <div className="text-sm text-muted-foreground">{hkd(annualCost / 12)} per month</div>
    </Shell>
  );
}

export function LifetimeCostCard({ total, purchase, energy, maintenance, years }: { total: number; purchase: number; energy: number; maintenance: number; years: number }) {
  const parts = [
    { k: "Purchase", v: purchase, c: "bg-chart-3" },
    { k: "Energy", v: energy, c: "bg-primary" },
    { k: "Upkeep", v: maintenance, c: "bg-chart-2" },
  ];
  return (
    <Shell label={`Lifetime cost · ${years} yrs (PV)`}>
      <Big>{hkd(total)}</Big>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
        {parts.map((p) => (
          <div key={p.k} className={p.c} style={{ width: `${(p.v / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {parts.map((p) => (
          <span key={p.k} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", p.c)} />
            {p.k} {hkd(p.v)}
          </span>
        ))}
      </div>
    </Shell>
  );
}

export function SavingsCard({ annual, lifetime, label = "Savings vs baseline" }: { annual: number; lifetime: number; label?: string }) {
  const good = annual >= 0;
  return (
    <Shell label={label} tone={good ? "good" : "warn"} footer={<>Over lifetime (PV): {hkd(lifetime)}</>}>
      <Big>
        <span className={good ? "text-positive" : "text-warning"}>
          {good ? "+" : "−"}
          {hkd(Math.abs(annual))}
        </span>
      </Big>
      <div className="text-sm text-muted-foreground">per year</div>
    </Shell>
  );
}

export function PaybackCard({ years, lifetime, extraCost }: { years: number | null; lifetime: number; extraCost: number }) {
  const pct = years == null ? 100 : Math.min(100, (years / lifetime) * 100);
  const ok = years != null && years < lifetime;
  return (
    <Shell label="Payback period" tone={ok ? "good" : "warn"} footer={extraCost > 0 ? <>Extra upfront: {hkd(extraCost)}</> : <>No price premium</>}>
      <Big>{years == null ? "Never" : years === 0 ? "Immediate" : `${num(years, 1)} yrs`}</Big>
      <div className="relative mt-3 h-2 rounded-full bg-muted">
        <div className={cn("h-2 rounded-full", ok ? "bg-positive" : "bg-warning")} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>0</span>
        <span>life {lifetime} yrs</span>
      </div>
    </Shell>
  );
}
