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
    <article className="passport-spread" aria-label={`Energy passport for ${name}`}>
      <div className="passport-cover relative overflow-hidden">
        <div className="passport-spine" aria-hidden="true" />
        <div className="passport-cover-inner">
          <div className="passport-cover-top font-mono text-[10px] uppercase text-primary"><span>CLP · Hong Kong</span><span>Residential / HK</span></div>
          <div className="passport-cover-center">
            <div className="passport-seal" aria-hidden="true"><span>CLP</span><span>ENERGY</span></div>
            <div className="mt-6 font-mono text-[10px] uppercase text-primary">Official household energy record</div>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-none sm:text-5xl">Energy<br />Passport</h2>
            <div className="passport-cover-mark" aria-hidden="true">HK</div>
          </div>
          <div className="passport-cover-bottom font-mono text-[10px] uppercase text-primary"><span>Energy intelligence</span><span>01 / 06</span></div>
        </div>
      </div>
      <div className="passport-sheet">
        <div className="passport-sheet-masthead font-mono text-[10px] uppercase"><span>CLP / Energy Intelligence</span><span>HK · 02</span></div>
        <div className="passport-sheet-heading">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Registered residence · {code}</div>
            <h3 className="mt-2 break-words font-display text-2xl font-semibold">{name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
          </div>
          <div className="passport-stamp" aria-label={`Energy grade ${m.grade}, score ${m.score} out of 100`}>
            <div className="font-mono text-[9px] uppercase">Energy grade</div>
            <div className={cn("passport-grade", gradeColor[m.grade])}>{m.grade}</div>
            <div className="font-mono text-[10px]">{m.score} / 100</div>
          </div>
        </div>
        <div className="passport-classification">
          <div className="mb-3 font-mono text-[10px] uppercase text-muted-foreground">Efficiency classification · A–E</div>
          <div className="grid grid-cols-5 gap-1.5">
            {GRADES.map((g) => (
              <div key={g} className={cn("relative text-center", m.grade === g && "passport-active-grade")}>
                <div className={cn("h-2 w-full", gradeColor[g], m.grade !== g && "opacity-45")} />
                <div className={cn("mt-1 font-mono text-xs", m.grade === g ? "font-bold" : "text-muted-foreground")}>{g}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-3 font-mono text-[10px] uppercase text-muted-foreground">Annual energy particulars</div>
        <dl className="passport-data-grid grid grid-cols-2 gap-x-4 text-sm">
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
            <div key={k} className="min-w-0 py-2">
              <dt className="font-mono text-[10px] uppercase text-muted-foreground">{k}</dt>
              <dd className="mt-1 break-words font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="passport-sheet-footer font-mono text-[10px] uppercase"><span>Residential energy record</span><span>02 / 06</span></div>
      </div>
    </article>
  );
}
