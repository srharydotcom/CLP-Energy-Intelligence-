import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { hkd, num, type ProductEconomics } from "@/lib/energy";

export function ProductComparisonTable({
  rows,
  selectedId,
  baselineId,
  onSelect,
}: {
  rows: ProductEconomics[];
  selectedId?: string;
  baselineId?: string;
  onSelect?: (id: string) => void;
}) {
  const best = rows.reduce((b, r) => (r.costPerYear < b.costPerYear ? r : b), rows[0]);
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead className="text-right">Label</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">kWh/yr</TableHead>
            <TableHead className="text-right">Energy/yr</TableHead>
            <TableHead className="text-right">Lifetime (PV)</TableHead>
            <TableHead className="text-right">Cost/yr owned</TableHead>
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
                <div className="mt-0.5 flex gap-1.5">
                  {r === best && <Badge className="bg-positive text-background hover:bg-positive">Lowest cost to own</Badge>}
                  {baselineId === r.product.id && <Badge variant="outline">Baseline</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">G{r.product.energy_label}</TableCell>
              <TableCell className="text-right tabular-nums">{hkd(Number(r.product.price))}</TableCell>
              <TableCell className="text-right tabular-nums">{num(Number(r.product.annual_kwh))}</TableCell>
              <TableCell className="text-right tabular-nums">{hkd(r.annualCost)}</TableCell>
              <TableCell className="text-right tabular-nums">{hkd(r.lifetimeCost)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{hkd(r.costPerYear)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
