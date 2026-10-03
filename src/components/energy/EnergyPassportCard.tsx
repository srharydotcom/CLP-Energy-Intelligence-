import { cn } from "@/lib/utils";
import { hkd, num, MONTHS, type Home, type PassportMetrics } from "@/lib/energy";

const GRADES = ["A", "B", "C", "D", "E"] as const;
const gradeColor: Record<string, string> = {
  A: "bg-grade-a",
  B: "bg-grade-b",
  C: "bg-grade-c",
  D: "bg-grade-d",
  E: "bg-grade-e",
};

export function EnergyPassportCard({ home, m }: { home: Home; m: PassportMetrics }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-start justify-between border-b p-5">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Energy Passport · {home.id.toUpperCase()}</div>
          <h2 className="mt-1 font-display text-xl font-semibold">{home.name}</h2>
          <div className="text-sm text-muted-foreground">
            {home.district} · {num(Number(home.floor_area_m2))} m² · {home.occupants} occupants
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Score</div>
          <div className="font-display text-4xl font-semibold tabular-nums">{m.score}</div>
        </div>
      </div>
      <div className="grid gap-6 p-5 md:grid-cols-[220px_1fr]">
        <div className="space-y-1.5">
          {GRADES.map((g, i) => (
            <div key={g} className="flex items-center gap-2">
              <div
                className={cn("flex h-7 items-center rounded-r-md pl-2 font-mono text-sm font-bold text-background", gradeColor[g], m.grade !== g && "opacity-30")}
                style={{ width: `${45 + i * 12}%` }}
              >
                {g}
              </div>
              {m.grade === g && <span className="font-mono text-xs">◀ this home</span>}
            </div>
          ))}
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          {[
            ["Annual use", `${num(m.annualKwh)} kWh`],
            ["Annual cost", hkd(m.annualCost)],
            ["vs. peer median", `${m.vsPeerPct >= 0 ? "+" : ""}${num(m.vsPeerPct, 1)}%`],
            ["Intensity", `${num(m.kwhPerM2, 1)} kWh/m²`],
            ["Per person", `${num(m.kwhPerPerson)} kWh`],
            ["Emissions", `${num(m.co2Tonnes, 2)} tCO₂e`],
            ["Peak month", MONTHS[m.peakMonth]],
            ["Summer/winter", `${num(m.seasonalityRatio, 1)}×`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 font-medium tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
