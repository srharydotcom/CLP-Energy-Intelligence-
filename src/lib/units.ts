import { useCallback, useSyncExternalStore } from "react";

/** All areas are stored in m²; this only changes what people see and type. */
export type AreaUnit = "m2" | "sqft";
export const SQFT_PER_M2 = 10.7639;
const KEY = "clp:area-unit";
const EVT = "clp:area-unit-change";

function read(): AreaUnit {
  try { return localStorage.getItem(KEY) === "sqft" ? "sqft" : "m2"; } catch { return "m2"; }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVT, cb); window.removeEventListener("storage", cb); };
}

export function useAreaUnit() {
  const unit = useSyncExternalStore(subscribe, read, () => "m2" as AreaUnit);
  const setUnit = useCallback((u: AreaUnit) => { localStorage.setItem(KEY, u); window.dispatchEvent(new Event(EVT)); }, []);
  const f = unit === "sqft" ? SQFT_PER_M2 : 1;
  return {
    unit,
    setUnit,
    label: unit === "sqft" ? "sq ft" : "m²",
    /** m² → value in the chosen unit (rounded for display/inputs) */
    show: (m2: number) => (unit === "sqft" ? Math.round(m2 * f) : Math.round(m2 * 10) / 10),
    /** value typed in the chosen unit → m² */
    toM2: (v: number) => v / f,
    /** per-m² figure (e.g. kWh/m²) → per chosen unit */
    perArea: (perM2: number) => perM2 / f,
  };
}
