import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { hkd, num, type ContextEconomics } from "@/lib/energy";

const FIT_LABEL = { fits: "Right size", undersized: "Too small", oversized: "Oversized", "n/a": "—" } as const;

export function ProductComparisonTable({
  rows,
  selectedId,
  baselineId,
  bestId,
  horizon,
  onSelect,
}: {
  rows: ContextEconomics[];
  selectedId?: string;
  baselineId?: string;
  bestId?: string;
  horizon: number;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead>Fit for home</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">kWh/yr (yours)</TableHead>
            <TableHead className="text-right">Energy/yr</TableHead>
            <TableHead className="text-right">Life</TableHead>
            <TableHead className="text-right">{horizon}-yr cost to own</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.product.id}
              onClick={() => onSelect?.(r.product.id)}
              className={cn("cursor-pointer", selectedId === r.product.id && "bg-primary/10 hover:bg-primary/15")}
            >
              <TableCell>
                <div className="font-medium">{r.product.brand} {r.product.model}</div>
                <div className="mt-0.5 flex flex-wrap gap-1.5">
                  {bestId === r.product.id && <Badge className="bg-positive text-background hover:bg-positive">Best choice</Badge>}
                  {baselineId === r.product.id && <Badge variant="outline">Cheapest to buy</Badge>}
                  {r.product.id.startsWith("custom-") && <Badge variant="secondary">Your product</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <span className={cn("text-sm", r.fit === "fits" && "text-positive", r.fit === "undersized" && "text-warning")}>
                  {FIT_LABEL[r.fit]}
                </span>
                {r.product.capacity != null && (
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {num(Number(r.product.capacity), 1)} {r.product.capacity_unit}
                    {r.required != null && <> · need {num(r.required, 1)}</>}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{hkd(Number(r.product.price))}</TableCell>
              <TableCell className="text-right tabular-nums">{num(r.annualKwh)}</TableCell>
              <TableCell className="text-right tabular-nums">{hkd(r.annualCost)}</TableCell>
              <TableCell className="text-right tabular-nums">{r.product.lifetime_years} yrs</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{hkd(r.horizonTco)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
