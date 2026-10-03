import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { DEFAULT_ASSUMPTIONS, type Assumptions } from "@/lib/energy";

type Key = keyof Assumptions;
const FIELDS: { key: Key; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: "tariffEscalationPct", label: "Tariff escalation", min: -2, max: 10, step: 0.5, unit: "%/yr" },
  { key: "discountRatePct", label: "Discount rate", min: 0, max: 12, step: 0.5, unit: "%" },
  { key: "fuelAdjDelta", label: "Fuel cost adj. change", min: -0.3, max: 0.6, step: 0.02, unit: "HK$/kWh" },
  { key: "usageChangePct", label: "Usage change", min: -30, max: 40, step: 1, unit: "%" },
  { key: "loadShiftPct", label: "Peak load shifted", min: 0, max: 50, step: 1, unit: "%" },
  { key: "carbonPricePerTonne", label: "Carbon shadow price", min: 0, max: 1500, step: 50, unit: "HK$/t" },
  { key: "horizonYears", label: "Horizon", min: 1, max: 20, step: 1, unit: "yrs" },
];

export function AssumptionPanel({
  value,
  onChange,
  fields,
  title = "Assumptions",
}: {
  value: Assumptions;
  onChange: (a: Assumptions) => void;
  fields?: Key[];
  title?: string;
}) {
  const shown = fields ? FIELDS.filter((f) => fields.includes(f.key)) : FIELDS;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{title}</div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange(DEFAULT_ASSUMPTIONS)}>
          Reset
        </Button>
      </div>
      <div className="space-y-5">
        {shown.map((f) => (
          <div key={f.key}>
            <div className="mb-2 flex justify-between text-sm">
              <span>{f.label}</span>
              <span className="font-mono tabular-nums text-primary">
                {value[f.key] > 0 && f.min < 0 ? "+" : ""}
                {value[f.key]} {f.unit}
              </span>
            </div>
            <Slider
              min={f.min}
              max={f.max}
              step={f.step}
              value={[value[f.key]]}
              onValueChange={([v]) => onChange({ ...value, [f.key]: v })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
