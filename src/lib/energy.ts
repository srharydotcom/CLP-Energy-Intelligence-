// Deterministic energy-economics engine. All money in HK$, energy in kWh.
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Tariff = T["tariffs"]["Row"];
export type Home = T["homes"]["Row"];
export type Product = T["products"]["Row"];
export type Site = T["business_sites"]["Row"];
export type ProcurementOption = T["procurement_options"]["Row"];

export interface Assumptions {
  tariffEscalationPct: number; // annual
  discountRatePct: number;
  fuelAdjDelta: number; // HK$/kWh change to fuel adjustment
  usageChangePct: number;
  loadShiftPct: number; // share of peak load moved off-peak
  carbonPricePerTonne: number; // HK$/tCO2e shadow price
  horizonYears: number;
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  tariffEscalationPct: 3,
  discountRatePct: 4,
  fuelAdjDelta: 0,
  usageChangePct: 0,
  loadShiftPct: 0,
  carbonPricePerTonne: 0,
  horizonYears: 10,
};

export const hkd = (n: number, digits = 0) =>
  new Intl.NumberFormat("en-HK", { style: "currency", currency: "HKD", maximumFractionDigits: digits }).format(n);
export const num = (n: number, digits = 0) =>
  new Intl.NumberFormat("en-HK", { maximumFractionDigits: digits }).format(n);

export const asArray = (v: unknown): number[] => (Array.isArray(v) ? v.map(Number) : []);
export const asRecord = (v: unknown): Record<string, number> =>
  v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, Number(x)])) : {};

export function effectiveRate(t: Tariff, a: Assumptions) {
  return Number(t.energy_rate) + Number(t.fuel_adj) + a.fuelAdjDelta;
}

export function annualEnergyCost(kwh: number, t: Tariff, a: Assumptions) {
  const adjusted = kwh * (1 + a.usageChangePct / 100);
  const carbon = (adjusted * Number(t.carbon_kg_per_kwh)) / 1000;
  return adjusted * effectiveRate(t, a) + carbon * a.carbonPricePerTonne;
}

/** Present value of a cost stream escalating yearly. */
export function pvStream(year1: number, years: number, a: Assumptions) {
  let pv = 0;
  for (let y = 1; y <= years; y++) {
    pv += (year1 * Math.pow(1 + a.tariffEscalationPct / 100, y - 1)) / Math.pow(1 + a.discountRatePct / 100, y);
  }
  return pv;
}

export interface ProductEconomics {
  product: Product;
  annualCost: number;
  lifetimeEnergyCost: number;
  lifetimeMaintenance: number;
  lifetimeCost: number;
  costPerYear: number;
  lifetimeCo2Kg: number;
}

export function productEconomics(p: Product, t: Tariff, a: Assumptions): ProductEconomics {
  const years = p.lifetime_years;
  const annualCost = annualEnergyCost(Number(p.annual_kwh), t, a);
  const lifetimeEnergyCost = pvStream(annualCost, years, a);
  const lifetimeMaintenance = pvStream(Number(p.maintenance_per_year), years, { ...a, tariffEscalationPct: 0 });
  const lifetimeCost = Number(p.price) + lifetimeEnergyCost + lifetimeMaintenance;
  return {
    product: p,
    annualCost,
    lifetimeEnergyCost,
    lifetimeMaintenance,
    lifetimeCost,
    costPerYear: lifetimeCost / years,
    lifetimeCo2Kg: Number(p.annual_kwh) * (1 + a.usageChangePct / 100) * Number(t.carbon_kg_per_kwh) * years,
  };
}

/** Simple payback in years of `candidate` vs `baseline`; null when never pays back. */
export function payback(candidate: ProductEconomics, baseline: ProductEconomics) {
  const extra = Number(candidate.product.price) - Number(baseline.product.price);
  const yearlySaving =
    baseline.annualCost + Number(baseline.product.maintenance_per_year) - (candidate.annualCost + Number(candidate.product.maintenance_per_year));
  if (extra <= 0) return { years: 0, extraCost: extra, yearlySaving };
  if (yearlySaving <= 0) return { years: null as number | null, extraCost: extra, yearlySaving };
  return { years: extra / yearlySaving, extraCost: extra, yearlySaving };
}

export interface PassportMetrics {
  annualKwh: number;
  annualCost: number;
  kwhPerM2: number;
  kwhPerPerson: number;
  vsPeerPct: number;
  grade: "A" | "B" | "C" | "D" | "E";
  score: number;
  co2Tonnes: number;
  peakMonth: number;
  seasonalityRatio: number;
}

export function passportMetrics(h: Home, t: Tariff, a: Assumptions): PassportMetrics {
  const months = asArray(h.monthly_kwh);
  const annualKwh = months.reduce((s, x) => s + x, 0) * (1 + a.usageChangePct / 100);
  const vsPeerPct = (annualKwh / Number(h.peer_median_kwh) - 1) * 100;
  const score = Math.max(0, Math.min(100, Math.round(70 - vsPeerPct * 1.2)));
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "E";
  const max = Math.max(...months);
  const min = Math.min(...months);
  return {
    annualKwh,
    annualCost: annualEnergyCost(months.reduce((s, x) => s + x, 0), t, a),
    kwhPerM2: annualKwh / Number(h.floor_area_m2),
    kwhPerPerson: annualKwh / h.occupants,
    vsPeerPct,
    grade,
    score,
    co2Tonnes: (annualKwh * Number(t.carbon_kg_per_kwh)) / 1000,
    peakMonth: months.indexOf(max),
    seasonalityRatio: min > 0 ? max / min : 0,
  };
}

export interface ProcurementResult {
  option: ProcurementOption;
  annualCost: number;
  lowCost: number;
  highCost: number;
  effectiveRate: number;
  co2Tonnes: number;
  termCostPv: number;
}

export function procurementResult(site: Site, o: ProcurementOption, a: Assumptions, carbonKgPerKwh = 0.39): ProcurementResult {
  const kwh = asArray(site.monthly_mwh).reduce((s, x) => s + x, 0) * 1000 * (1 + a.usageChangePct / 100);
  const peakShare = Number(site.peak_share) * (o.structure === "tou" ? 1 - a.loadShiftPct / 100 : 1);
  const fuelPass = o.structure === "indexed" ? a.fuelAdjDelta * 1.0 : o.structure === "fixed" ? 0 : a.fuelAdjDelta;
  const rate = Number(o.unit_price) + peakShare * Number(o.peak_premium) + fuelPass;
  const co2Tonnes = (kwh * carbonKgPerKwh * (1 - Number(o.renewable_share))) / 1000;
  const annualCost = kwh * rate + Number(o.fixed_fee_month) * 12 + co2Tonnes * a.carbonPricePerTonne;
  const v = Number(o.volatility);
  return {
    option: o,
    annualCost,
    lowCost: annualCost * (1 - v),
    highCost: annualCost * (1 + v),
    effectiveRate: annualCost / kwh,
    co2Tonnes,
    termCostPv: pvStream(annualCost, o.term_years, o.structure === "fixed" ? { ...a, tariffEscalationPct: 0 } : a),
  };
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
