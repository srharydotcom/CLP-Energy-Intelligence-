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

// ---------- Household-context purchase economics ----------
export interface HouseholdContext {
  areaM2: number; // whole-home floor area
  roomM2: number; // area a room AC must cool
  occupants: number;
  acHoursPerDay: number;
  evKmPerYear: number;
  coolingFactor?: number; // sun exposure / floor / building age multiplier on AC use
}
export const AC_REF_HOURS = 8;

export type SizeFit = "fits" | "undersized" | "oversized" | "n/a";

/** Capacity the household needs, in the product's capacity unit. */
export function requiredCapacity(p: Product, ctx: HouseholdContext): number | null {
  if (p.category === "Air conditioner") return ctx.roomM2 * 0.18; // ~180 W cooling per m² (HK climate)
  if (p.category === "Refrigerator") return 120 + 80 * ctx.occupants; // litres
  if (p.category === "Water heater" && p.capacity != null) return 30 * ctx.occupants; // storage litres
  return null;
}

export function sizeFit(p: Product, ctx: HouseholdContext): SizeFit {
  const need = requiredCapacity(p, ctx);
  if (need == null || p.capacity == null) return "n/a";
  const r = Number(p.capacity) / need;
  return r < 0.85 ? "undersized" : r > 1.6 ? "oversized" : "fits";
}

/** Multiplier on rated annual kWh for this household. */
export function usageFactor(p: Product, ctx: HouseholdContext): number {
  const ref = Number(p.reference_value) || 1;
  const e = Number(p.usage_elasticity);
  let ratio = 1;
  if (p.usage_basis === "area") ratio = p.category === "Air conditioner" ? (ctx.roomM2 / ref) * (ctx.acHoursPerDay / AC_REF_HOURS) : ctx.areaM2 / ref;
  else if (p.usage_basis === "occupants") ratio = ctx.occupants / ref;
  else if (p.usage_basis === "km") ratio = ctx.evKmPerYear / ref;
  let f = Math.max(0.1, 1 + e * (ratio - 1));
  // An undersized AC runs flat-out and loses efficiency; oversized short-cycles.
  const fit = sizeFit(p, ctx);
  if (p.category === "Air conditioner") f *= ctx.coolingFactor ?? 1;
  if (p.category === "Air conditioner") f *= fit === "undersized" ? 1.25 : fit === "oversized" ? 1.08 : 1;
  return f;
}

export interface ContextEconomics extends ProductEconomics {
  annualKwh: number;
  usageFactor: number;
  fit: SizeFit;
  required: number | null;
  annualShiftSaving: number;
  horizonTco: number; // PV cost of ownership over the horizon incl. replacements
  cumulative: number[]; // nominal cumulative cost by year 0..horizon
}

export function contextEconomics(p: Product, t: Tariff, a: Assumptions, ctx: HouseholdContext): ContextEconomics {
  const uf = usageFactor(p, ctx);
  const annualKwh = Number(p.annual_kwh) * uf * (1 + a.usageChangePct / 100);
  const spread = t.peak_rate != null && t.offpeak_rate != null ? Number(t.peak_rate) - Number(t.offpeak_rate) : 0;
  const annualShiftSaving = Number(p.shift_kwh) * spread;
  const annualCost = annualEnergyCost(Number(p.annual_kwh) * uf, t, a) - annualShiftSaving;
  const years = p.lifetime_years;
  const maint = Number(p.maintenance_per_year);
  const lifetimeEnergyCost = pvStream(annualCost, years, a);
  const lifetimeMaintenance = pvStream(maint, years, { ...a, tariffEscalationPct: 0 });
  const lifetimeCost = Number(p.price) + lifetimeEnergyCost + lifetimeMaintenance;
  const H = a.horizonYears;
  const d = 1 + a.discountRatePct / 100;
  const g = 1 + a.tariffEscalationPct / 100;
  let horizonTco = 0;
  const cumulative: number[] = [];
  let cum = 0;
  for (let y = 0; y <= H; y++) {
    let nominal = 0;
    if (y < H && y % years === 0) {
      nominal += Number(p.price);
      horizonTco += Number(p.price) / Math.pow(d, y);
    }
    if (y >= 1) {
      const op = annualCost * Math.pow(g, y - 1) + maint;
      nominal += op;
      horizonTco += op / Math.pow(d, y);
    }
    cum += nominal;
    cumulative.push(cum);
  }
  return {
    product: p, annualCost, lifetimeEnergyCost, lifetimeMaintenance, lifetimeCost,
    costPerYear: lifetimeCost / years,
    lifetimeCo2Kg: annualKwh * Number(t.carbon_kg_per_kwh) * years,
    annualKwh, usageFactor: uf, fit: sizeFit(p, ctx), required: requiredCapacity(p, ctx),
    annualShiftSaving, horizonTco, cumulative,
  };
}

/** First year in which candidate's cumulative cost drops to or below baseline's; null if never in horizon. */
export function breakEvenYear(c: ContextEconomics, b: ContextEconomics): number | null {
  const gapAt = (y: number) => (c.cumulative[y] ?? 0) - (b.cumulative[y] ?? 0);
  if (gapAt(0) <= 0) return 0;
  for (let y = 1; y < c.cumulative.length; y++) {
    if (gapAt(y) <= 0) {
      const prevGap = gapAt(y - 1);
      const gap = gapAt(y);
      return y - 1 + prevGap / (prevGap - gap);
    }
  }
  return null;
}

// ---------- Appliance inventory ----------
export type CatalogAppliance = T["appliance_catalog"]["Row"];

export interface OwnedAppliance {
  uid: string;
  catalogId: string | null; // null = miscellaneous / user-defined
  name: string;
  category: string;
  endUse: string;
  watts: number;
  standbyWatts: number;
  hoursPerDay: number;
  daysPerYear: number;
  quantity: number;
}

export function applianceAnnualKwh(x: OwnedAppliance) {
  const activeH = x.hoursPerDay * x.daysPerYear;
  const standbyH = Math.max(0, 8760 - activeH);
  return (x.quantity * (x.watts * activeH + x.standbyWatts * standbyH)) / 1000;
}

export function inventorySummary(items: OwnedAppliance[], t: Tariff, a: Assumptions) {
  const rows = items.map((x) => {
    const kwh = applianceAnnualKwh(x) * (1 + a.usageChangePct / 100);
    return { item: x, kwh, cost: annualEnergyCost(applianceAnnualKwh(x), t, a), standbyKwh: (x.quantity * x.standbyWatts * Math.max(0, 8760 - x.hoursPerDay * x.daysPerYear)) / 1000 };
  });
  const totalKwh = rows.reduce((s, r) => s + r.kwh, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const byEndUse: Record<string, number> = {};
  for (const r of rows) byEndUse[r.item.endUse] = (byEndUse[r.item.endUse] ?? 0) + r.kwh;
  return {
    rows: rows.sort((p, q) => q.kwh - p.kwh),
    totalKwh,
    totalCost,
    standbyKwh: rows.reduce((s, r) => s + r.standbyKwh, 0),
    byEndUse,
    co2Tonnes: (totalKwh * Number(t.carbon_kg_per_kwh)) / 1000,
  };
}

// ---------- Passport for a user's saved home (built from its appliance list) ----------
/** Demo benchmark: typical yearly use for a similar HK home. Invented figures, replace with real data. */
export const PEER_BASE_KWH = 1500;
export const PEER_PER_PERSON_KWH = 900;
export const PEER_PER_M2_KWH = 25;
export function peerBenchmarkKwh(occupants: number, areaM2: number) {
  return PEER_BASE_KWH + PEER_PER_PERSON_KWH * occupants + PEER_PER_M2_KWH * areaM2;
}
export function gradeFromScore(score: number): PassportMetrics["grade"] {
  return score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "E";
}
export function inventoryPassport(items: OwnedAppliance[], occupants: number, areaM2: number, t: Tariff, a: Assumptions) {
  const s = inventorySummary(items, t, a);
  const peer = peerBenchmarkKwh(occupants, areaM2);
  const vsPeerPct = peer ? (s.totalKwh / peer - 1) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(70 - vsPeerPct * 1.2)));
  return {
    summary: s, peer, vsPeerPct, score, grade: gradeFromScore(score),
    kwhPerM2: areaM2 ? s.totalKwh / areaM2 : 0, kwhPerPerson: occupants ? s.totalKwh / occupants : 0,
  };
}

// ---------- Upgrade suggestions for owned appliances ----------
const CATALOG_TO_PRODUCT: Record<string, string> = {
  "ac-split": "Air conditioner", "ac-window": "Air conditioner", fridge: "Refrigerator", "wh-storage": "Water heater",
  washer: "Washing machine", dryer: "Dryer", dehumid: "Dehumidifier", induction: "Cooktop", dishwasher: "Dishwasher",
  "led-lights": "Lighting", "cfl-lights": "Lighting",
};
const CATEGORY_TO_PRODUCT: Record<string, string> = { "Air conditioner": "Air conditioner", Refrigerator: "Refrigerator", "Water heater": "Water heater", TV: "TV" };
export function productCategoryFor(x: OwnedAppliance): string | null {
  return (x.catalogId && CATALOG_TO_PRODUCT[x.catalogId]) || CATEGORY_TO_PRODUCT[x.category] || null;
}

export interface UpgradeSuggestion {
  item: OwnedAppliance;
  currentCost: number;
  best: ContextEconomics;
  yearlySaving: number;
  paybackYears: number | null;
}
/** For each owned appliance with a comparable product, the lowest cost-to-own model that suits the home. */
export function upgradeSuggestions(items: OwnedAppliance[], products: Product[], t: Tariff, a: Assumptions, ctx: HouseholdContext): UpgradeSuggestion[] {
  const out: UpgradeSuggestion[] = [];
  for (const x of items) {
    const cat = productCategoryFor(x);
    if (!cat) continue;
    const rows = products.filter((p) => p.category === cat).map((p) => contextEconomics(p, t, a, ctx));
    const pool = rows.filter((r) => r.fit !== "undersized");
    const best = (pool.length ? pool : rows).reduce<ContextEconomics | undefined>((b, r) => (!b || r.horizonTco < b.horizonTco ? r : b), undefined);
    if (!best) continue;
    const perUnit = (applianceAnnualKwh(x) / Math.max(1, x.quantity)) * effectiveRate(t, a);
    const currentCost = perUnit;
    const yearlySaving = currentCost - best.annualCost;
    out.push({ item: x, currentCost, best, yearlySaving, paybackYears: yearlySaving > 0 ? Number(best.product.price) / yearlySaving : null });
  }
  return out.sort((p, q) => q.yearlySaving - p.yearlySaving);
}
