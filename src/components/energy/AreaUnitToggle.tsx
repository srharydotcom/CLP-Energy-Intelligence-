import { useAreaUnit } from "@/lib/units";
import { cn } from "@/lib/utils";

/** Tiny inline m² / sq ft switch, shown only next to fields where an area is typed. */
export function AreaUnitToggle({ className }: { className?: string }) {
  const { unit, setUnit } = useAreaUnit();
  return (
    <span role="group" aria-label="Area unit" className={cn("ml-1.5 inline-flex rounded-full border border-border/60 p-px align-middle font-mono text-[10px] leading-none", className)}>
      {(["m2", "sqft"] as const).map((u) => (
        <button key={u} type="button" onClick={(e) => { e.preventDefault(); setUnit(u); }} aria-pressed={unit === u}
          className={cn("rounded-full px-1.5 py-0.5 transition-colors", unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
          {u === "m2" ? "m²" : "sq ft"}
        </button>
      ))}
    </span>
  );
}
