import { cn } from "@/lib/utils";
import { useAreaUnit } from "@/lib/units";
import { hkd, num, MONTHS, type PassportMetrics } from "@/lib/energy";
import { PassportPage, PassportSpread } from "@/components/energy/PassportBook";

const GRADES = ["A", "B", "C", "D", "E"] as const;
const gradeColor: Record<string, string> = {
  A: "bg-grade-a",
  B: "bg-grade-b",
  C: "bg-grade-c",
  D: "bg-grade-d",
  E: "bg-grade-e",
};

/** Decorative machine-readable line, padded with "<" like a real passport. */
function mrzLine(text: string, len = 44) {
  const clean = text.toUpperCase().replace(/[^A-Z0-9]+/g, "<");
  return (clean + "<".repeat(len)).slice(0, len);
}

/** The opening spread of the passport: cover page (01) and household record page (02). */
export function EnergyPassportCard({ code, name, sub, m }: { code: string; name: string; sub: string; m: PassportMetrics }) {
  const u = useAreaUnit();
  return (
    <PassportSpread>
      <PassportPage n="01" footer="Energy intelligence · HK" cover bodyClassName="flex flex-col">
        <div className="flex items-start justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.2em]">
          <span className="text-primary">CLP · Hong Kong</span>
          <span className="text-muted-foreground">Residential</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="pp-seal" aria-hidden="true"><span>CLP</span><span>ENERGY</span></div>
          <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Residential energy record</div>
          <h2 className="mt-2 font-display text-4xl font-semibold leading-none sm:text-5xl">Energy<br />Passport</h2>
          <div className="mt-6 min-w-0 max-w-full">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Registered home</div>
            <div className="mt-1 break-words font-display text-lg font-medium">{name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-primary/25 pt-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary">Document no.</div>
            <div className="mt-1 truncate font-mono text-sm">{code}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Score</div>
            <div className="font-display text-3xl font-semibold tabular-nums">{m.score}<span className="font-mono text-xs text-muted-foreground"> / 100</span></div>
          </div>
        </div>
      </PassportPage>

      <PassportPage n="02" title="Record" footer="Residential energy record">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-semibold">Household energy record</h3>
            <div className="mt-1 break-words text-xs text-muted-foreground">{name}</div>
          </div>
          <div className="text-center">
            <div className={cn("pp-grade", gradeColor[m.grade])}>{m.grade}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Rating</div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Efficiency classification · A–E</div>
          <div className="grid grid-cols-5 gap-1.5">
            {GRADES.map((g) => (
              <div key={g} className="text-center">
                <div className={cn("h-2 w-full", gradeColor[g], m.grade !== g && "opacity-40")} />
                <div className={cn("mt-1 font-mono text-xs", m.grade === g ? "font-bold" : "text-muted-foreground")}>{g}</div>
              </div>
            ))}
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
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
            <div key={k} className="min-w-0 border-l pl-3">
              <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 break-words font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="pp-mrz" aria-hidden="true">
          <div>{mrzLine(`E<HKG<${name}`)}</div>
          <div>{mrzLine(`${code}<${m.grade}<${m.score}<${Math.round(m.annualKwh)}KWH`)}</div>
        </div>
      </PassportPage>
    </PassportSpread>
  );
}
