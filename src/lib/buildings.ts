// Deterministic building-investment engine. All money HK$, energy kWh.
import type { Database } from "@/integrations/supabase/types";
import { type Assumptions, asRecord, pvStream } from "./energy";

type T = Database["public"]["Tables"];
export type Archetype = T["building_archetypes"]["Row"];
export type Measure = T["building_measures"]["Row"];

export type Weather = "cool" | "typical" | "hot";
export const WEATHER: Record<Weather, { label: string; cooling: number; solar: number }> = {
  cool: { label: "Mild year", cooling: 0.9, solar: 0.95 },
  typical: { label: "Typical HK year", cooling: 1, solar: 1 },
  hot: { label: "Hot, sunny year", cooling: 1.12, solar: 1.05 },
};

export const END_USES = ["hvac", "lighting", "water_heating", "refrigeration", "other"] as const;

export interface CustomMeasure { uid: string; name: string; capex: number; kwhSaved: number; maintPerYear: number; lifetimeYears: number }

export interface BuildingInputs {
  areaM2: number;
  annualKwhOverride: number | null;
  hoursPerDay: number;
  daysPerWeek: number;
  occupancy: number;
  weather: Weather;
  rate: number; // HK$/kWh all-in
  peakOffpeakSpread: number; // HK$/kWh
  demandChargeKw: number; // HK$/kW/month
  budget: number;
  maxPaybackYears: number;
  maxInstallWeeks: number;
  roofAreaM2: number;
  solarKwp: number | null; // null = size from roof
  batteryKwh: number;
  evChargers: number;
  evResalePrice: number;
  enabled: Record<string, boolean>;
  custom: CustomMeasure[];
}

export function defaultInputs(a: Archetype): BuildingInputs {
  const area = Number(a.default_area_m2);
  return {
    areaM2: area,
    annualKwhOverride: null,
    hoursPerDay: Number(a.hours_per_day),
    daysPerWeek: Number(a.days_per_week),
    occupancy: Math.round((Number(a.occupancy_per_1000m2) * area) / 1000),
    weather: "typical",
    rate: 1.1,
    peakOffpeakSpread: 0.45,
    demandChargeKw: 70,
    budget: 20_000_000,
    maxPaybackYears: 8,
    maxInstallWeeks: 8,
    roofAreaM2: Math.round(area * Number(a.roof_ratio) * 0.25),
    solarKwp: null,
    batteryKwh: Math.round((area * Number(a.peak_w_per_m2)) / 1000 / 4),
    evChargers: Math.max(2, Math.round(area / 3000)),
    evResalePrice: 3.2,
    enabled: { hvac: true, lighting: true, battery: true, solar: true, water: true, refrig: true, ev: true },
    custom: [],
  };
}

export interface Sens { rate: number; capex: number; savings: number }
const BASE_SENS: Sens = { rate: 1, capex: 1, savings: 1 };

export function baseline(arch: Archetype, x: BuildingInputs, s: Sens = BASE_SENS) {
  const share = asRecord(arch.end_use_share);
  const hoursF = (x.hoursPerDay * x.daysPerWeek) / (Number(arch.hours_per_day) * Number(arch.days_per_week));
  const refOcc = (Number(arch.occupancy_per_1000m2) * x.areaM2) / 1000 || 1;
  const occF = x.occupancy / refOcc;
  const base = x.areaM2 * Number(arch.kwh_per_m2);
  const w = WEATHER[x.weather];
  const raw: Record<string, number> = {
    hvac: base * (share["hvac"] ?? 0) * hoursF * w.cooling,
    lighting: base * (share["lighting"] ?? 0) * hoursF,
    water_heating: base * (share["water_heating"] ?? 0) * occF,
    refrigeration: base * (share["refrigeration"] ?? 0),
    other: base * (share["other"] ?? 0) * (0.5 + 0.5 * hoursF) * (0.7 + 0.3 * occF),
  };
  const modelled = Object.values(raw).reduce((p, q) => p + q, 0);
  const k = x.annualKwhOverride && modelled > 0 ? x.annualKwhOverride / modelled : 1;
  const endUse = Object.fromEntries(Object.entries(raw).map(([e, v]) => [e, v * k]));
  const kwh = modelled * k;
  const peakKw = (x.areaM2 * Number(arch.peak_w_per_m2)) / 1000 * (0.85 + 0.15 * w.cooling);
  const rate = x.rate * s.rate;
  const annualCost = kwh * rate + peakKw * x.demandChargeKw * 12;
  return { endUse, kwh, peakKw, annualCost, rate, intensity: kwh / x.areaM2 };
}

export interface MeasureResult {
  id: string;
  name: string;
  category: string;
  detail: string;
  capex: number;
  annualKwhSaved: number;
  annualCostSaved: number;
  annualMaint: number;
  lifetimeYears: number;
  installWeeks: number;
  payback: number | null;
  npv: number;
  annualCostAfter: number;
  lifetimeEnergyCostAfter: number;
  tco: number;
  issues: string[];
  feasible: boolean;
}

export function evaluateMeasures(arch: Archetype, measures: Measure[], x: BuildingInputs, a: Assumptions, s: Sens = BASE_SENS) {
  const b = baseline(arch, x, s);
  const H = a.horizonYears;
  const out: MeasureResult[] = [];

  const push = (m: { id: string; name: string; category: string; detail: string; capex: number; kwh: number; cost: number; maintPct?: number; maint?: number; life: number; weeks: number }) => {
    const capex = m.capex * s.capex;
    const annualMaint = m.maint ?? capex * (m.maintPct ?? 0);
    const cost = m.cost * s.savings;
    const kwh = m.kwh * s.savings;
    const net = cost - annualMaint;
    const payback = net > 0 && capex > 0 ? capex / net : capex === 0 && net > 0 ? 0 : null;
    const lifeA = { ...a, tariffEscalationPct: a.tariffEscalationPct };
    const npv = -capex + pvStream(cost, m.life, lifeA) - pvStream(annualMaint, m.life, { ...a, tariffEscalationPct: 0 });
    const annualCostAfter = b.annualCost - cost;
    const lifetimeEnergyCostAfter = pvStream(annualCostAfter, H, a);
    const tco = capex + lifetimeEnergyCostAfter + pvStream(annualMaint, H, { ...a, tariffEscalationPct: 0 });
    const issues: string[] = [];
    if (net <= 0) issues.push("Does not save money each year");
    else if (payback !== null && payback > x.maxPaybackYears) issues.push(`Payback above ${x.maxPaybackYears} yr limit`);
    if (m.weeks > x.maxInstallWeeks) issues.push(`Install ${m.weeks} wk exceeds ${x.maxInstallWeeks} wk limit`);
    if (capex > x.budget) issues.push("Exceeds capital budget on its own");
    out.push({ id: m.id, name: m.name, category: m.category, detail: m.detail, capex, annualKwhSaved: kwh, annualCostSaved: cost, annualMaint, lifetimeYears: m.life, installWeeks: m.weeks, payback, npv, annualCostAfter, lifetimeEnergyCostAfter, tco, issues, feasible: issues.length === 0 });
  };

  for (const m of measures) {
    if (!x.enabled[m.id]) continue;
    const base = { id: m.id, name: m.category, category: m.category, life: m.lifetime_years, weeks: m.install_weeks, maintPct: Number(m.maint_pct_capex) };
    if (m.end_use) {
      const eu = b.endUse[m.end_use] ?? 0;
      if (eu <= 0) continue;
      const kwh = eu * Number(m.savings_pct);
      const demandKw = b.peakKw * (eu / b.kwh) * Number(m.savings_pct) * 0.8;
      push({ ...base, detail: `${m.name}: ${Math.round(Number(m.savings_pct) * 100)}% of ${m.end_use.replace("_", " ")} use`, capex: Number(m.capex_rate) * x.areaM2, kwh, cost: kwh * b.rate + demandKw * x.demandChargeKw * 12 });
    } else if (m.id === "solar") {
      const kwp = x.solarKwp ?? Math.round(x.roofAreaM2 * 0.15);
      if (kwp <= 0) continue;
      const gen = Math.min(kwp * 1050 * WEATHER[x.weather].solar, b.kwh * 0.9);
      push({ ...base, detail: `${kwp} kWp on ${x.roofAreaM2} m² roof, ~${Math.round(gen / 1000)} MWh/yr self-used`, capex: Number(m.capex_rate) * kwp, kwh: gen, cost: gen * b.rate });
    } else if (m.id === "battery") {
      if (x.batteryKwh <= 0) continue;
      const shavedKw = Math.min(x.batteryKwh / 2, b.peakKw * 0.3);
      const cycles = 250;
      const loss = x.batteryKwh * cycles * 0.1;
      push({ ...base, detail: `${x.batteryKwh} kWh, shaves ~${Math.round(shavedKw)} kW of peak demand`, capex: Number(m.capex_rate) * x.batteryKwh, kwh: -loss, cost: shavedKw * x.demandChargeKw * 12 + x.batteryKwh * 0.9 * cycles * x.peakOffpeakSpread - loss * b.rate });
    } else if (m.id === "ev") {
      if (x.evChargers <= 0) continue;
      const delivered = x.evChargers * 6500;
      push({ ...base, detail: `${x.evChargers} chargers, ~${Math.round(delivered / 1000)} MWh/yr resold at HK$${x.evResalePrice}/kWh`, capex: Number(m.capex_rate) * x.evChargers, kwh: -delivered, cost: delivered * (x.evResalePrice - b.rate) });
    }
  }
  for (const c of x.custom) {
    push({ id: c.uid, name: c.name || "Other equipment", category: "Other building equipment", detail: `${Math.round(c.kwhSaved).toLocaleString()} kWh/yr saved`, capex: c.capex, kwh: c.kwhSaved, cost: c.kwhSaved * b.rate, maint: c.maintPerYear, life: c.lifetimeYears, weeks: 0 });
  }

  // Portfolio: best value-for-money first, within budget, only measures meeting constraints.
  const ranked = [...out].filter((r) => r.feasible).sort((p, q) => q.npv / Math.max(q.capex, 1) - p.npv / Math.max(p.capex, 1));
  const chosen: MeasureResult[] = [];
  let spent = 0;
  for (const r of ranked) {
    if (spent + r.capex <= x.budget) { chosen.push(r); spent += r.capex; }
  }
  const pf = {
    ids: chosen.map((r) => r.id),
    capex: spent,
    annualCostSaved: chosen.reduce((p, r) => p + r.annualCostSaved, 0),
    annualMaint: chosen.reduce((p, r) => p + r.annualMaint, 0),
    annualKwhSaved: chosen.reduce((p, r) => p + r.annualKwhSaved, 0),
    npv: chosen.reduce((p, r) => p + r.npv, 0),
  };
  const pfNet = pf.annualCostSaved - pf.annualMaint;
  const annualCostAfter = b.annualCost - pf.annualCostSaved;
  const portfolio = {
    ...pf,
    payback: pfNet > 0 ? pf.capex / pfNet : null,
    annualCostAfter,
    lifetimeEnergyCostBefore: pvStream(b.annualCost, H, a),
    lifetimeEnergyCostAfter: pvStream(annualCostAfter, H, a),
    tcoBefore: pvStream(b.annualCost, H, a),
    tcoAfter: pf.capex + pvStream(annualCostAfter, H, a) + pvStream(pf.annualMaint, H, { ...a, tariffEscalationPct: 0 }),
  };
  return { baseline: b, measures: out, portfolio };
}

export function sensitivity(arch: Archetype, measures: Measure[], x: BuildingInputs, a: Assumptions) {
  const run = (xx: BuildingInputs, s: Sens) => evaluateMeasures(arch, measures, xx, a, s).portfolio;
  const base = run(x, BASE_SENS);
  // Keep the same portfolio for a fair comparison: force constraint-free re-evaluation of the chosen set.
  const fixed = { ...x, budget: Infinity, maxPaybackYears: Infinity, maxInstallWeeks: Infinity, enabled: Object.fromEntries(Object.keys(x.enabled).map((k) => [k, base.ids.includes(k)])), custom: x.custom.filter((c) => base.ids.includes(c.uid)) };
  const rows = [
    { label: "Electricity price ±20%", lo: run(fixed, { ...BASE_SENS, rate: 0.8 }), hi: run(fixed, { ...BASE_SENS, rate: 1.2 }) },
    { label: "Capital cost ±20%", lo: run(fixed, { ...BASE_SENS, capex: 1.2 }), hi: run(fixed, { ...BASE_SENS, capex: 0.8 }) },
    { label: "Savings achieved ±20%", lo: run(fixed, { ...BASE_SENS, savings: 0.8 }), hi: run(fixed, { ...BASE_SENS, savings: 1.2 }) },
    { label: "Operating hours ±20%", lo: run({ ...fixed, hoursPerDay: x.hoursPerDay * 0.8 }, BASE_SENS), hi: run({ ...fixed, hoursPerDay: Math.min(24, x.hoursPerDay * 1.2) }, BASE_SENS) },
    { label: "Weather mild ↔ hot", lo: run({ ...fixed, weather: "cool" }, BASE_SENS), hi: run({ ...fixed, weather: "hot" }, BASE_SENS) },
  ];
  return {
    baseNpv: base.npv,
    rows: rows
      .map((r) => ({ label: r.label, low: Math.min(r.lo.npv, r.hi.npv), high: Math.max(r.lo.npv, r.hi.npv), paybackLow: r.lo.payback, paybackHigh: r.hi.payback }))
      .sort((p, q) => q.high - q.low - (p.high - p.low)),
  };
}
