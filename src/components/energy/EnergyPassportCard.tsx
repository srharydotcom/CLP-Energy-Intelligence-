import { cn } from "@/lib/utils";
import { useAreaUnit } from "@/lib/units";

import { hkd, num, MONTHS, type PassportMetrics } from "@/lib/energy";

const GRADES = ["A", "B", "C", "D", "E"] as const;
const gradeColor: Record<string, string> = {
  A: "bg-grade-a",
  B: "bg-grade-b",
  C: "bg-grade-c",
  D: "bg-grade-d",
  E: "bg-grade-e",
};

export function EnergyPassportCard({ code, name, sub, m }: { code: string; name: string; sub: string; m: PassportMetrics }) {
  const u = useAreaUnit();
  return (
    <article className="passport-cover relative overflow-hidden" aria-label={`Energy passport for ${name}`}>
      <div className="passport-spine" aria-hidden="true" />
      <div className="passport-cover-inner">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-primary/25 pb-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">CLP · Hong Kong</div>
            <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Residential energy record</div>
            <h2 className="mt-1 font-display text-3xl font-semibold leading-tight sm:text-4xl">Energy<br />Passport</h2>
          </div>
          <div className="passport-seal" aria-hidden="true"><span>CLP</span><span>ENERGY</span></div>
        </div>
        <div className="grid gap-6 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Registered home</div>
            <div className="mt-1 break-words font-display text-xl font-medium">{name}</div>
            <div className="mt-2 text-sm text-muted-foreground">{sub}</div>
            <div className="mt-5 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">Document no. · {code}</div>
          </div>
          <div className="flex items-center gap-5 sm:justify-end">
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Rating</div>
              <div className={cn("passport-grade mt-2", gradeColor[m.grade])}>{m.grade}</div>
            </div>
            <div className="border-l border-primary/25 pl-5 text-center">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Score</div>
              <div className="mt-2 font-display text-4xl font-semibold tabular-nums">{m.score}</div>
              <div className="font-mono text-[10px] text-muted-foreground">/ 100</div>
            </div>
          </div>
        </div>
        <div className="border-t border-primary/25 pt-5">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Efficiency classification · A–E</div>
          <div className="grid max-w-xl grid-cols-5 gap-1.5">
            {GRADES.map((g) => (
              <div key={g} className={cn("relative text-center", m.grade === g && "passport-active-grade")}>
                <div className={cn("h-2 w-full", gradeColor[g], m.grade !== g && "opacity-45")} />
                <div className={cn("mt-1 font-mono text-xs", m.grade === g ? "font-bold text-foreground" : "text-muted-foreground")}>{g}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 flex justify-between border-t border-primary/25 pt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <span>Energy intelligence · HK</span><span>01 / Record</span>
        </div>
      </div>
      <div className="passport-sheet">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-primary/20 pb-3">
          <h3 className="font-display text-lg font-semibold">Household energy record</h3>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">02 / Details</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-5 text-sm sm:grid-cols-4">
          {[
            ["Annual use", `${num(m.annualKwh)} kWh`],
            ["Annual cost", hkd(m.annualCost)],
            ["vs. similar homes", `${m.vsPeerPct >= 0 ? "+" : ""}${num(m.vsPeerPct, 1)}%`],
            ["Intensity", `${num(u.perArea(m.kwhPerM2), u.unit === "sqft" ? 2 : 1)} kWh/${u.label}`],
            ["Per person", `${num(m.kwhPerPerson)} kWh`],
            ["Emissions", `${num(m.co2Tonnes, 2)} tCO₂e`],
            ["Highest month", MONTHS[m.peakMonth]],
            ["Summer/winter", `${num(m.seasonalityRatio, 1)}×`],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0 border-l border-primary/25 pl-3">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="mt-1 break-words font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
