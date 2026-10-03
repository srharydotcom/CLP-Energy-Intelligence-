import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { hkd } from "@/lib/energy";
import { cn } from "@/lib/utils";

export interface ScenarioRow {
  name: string;
  value: number;
  baseline: number;
}

export function ScenarioPanel({ title, rows, unit = "HK$/yr" }: { title: string; rows: ScenarioRow[]; unit?: string }) {
  const data = rows.map((r) => ({ ...r, delta: r.value - r.baseline }));
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{title}</div>
        <div className="font-mono text-[11px] text-muted-foreground">Δ vs baseline · {unit}</div>
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" tickFormatter={(v) => hkd(v)} stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis type="category" dataKey="name" width={130} stroke="var(--muted-foreground)" fontSize={11} />
            <ReferenceLine x={0} stroke="var(--foreground)" />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
              formatter={(v: number) => hkd(v)}
            />
            <Bar dataKey="delta" fill="var(--primary)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 divide-y text-sm">
        {data.map((r) => (
          <div key={r.name} className="flex justify-between py-1.5">
            <span>{r.name}</span>
            <span className="tabular-nums">
              {hkd(r.value)}{" "}
              <span className={cn("font-mono text-xs", r.delta > 0 ? "text-warning" : r.delta < 0 ? "text-positive" : "text-muted-foreground")}>
                {r.delta >= 0 ? "+" : "−"}
                {hkd(Math.abs(r.delta))}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
