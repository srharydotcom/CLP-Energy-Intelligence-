import { useCallback, useEffect, useState } from "react";
import type { OwnedAppliance } from "./energy";

export interface MyHomeProfile {
  name: string;
  district: string;
  propertyType: "flat" | "house" | "village";
  areaM2: number;
  occupants: number;
  bedrooms: number;
  tariffId: string;
  acHoursPerDay: number;
  evKmPerYear: number;
}

export interface MyHome { profile: MyHomeProfile; appliances: OwnedAppliance[]; updatedAt: string | null }

const KEY = "clp.myhome.v1";
export const EMPTY_HOME: MyHome = {
  profile: { name: "My home", district: "", propertyType: "flat", areaM2: 55, occupants: 3, bedrooms: 2, tariffId: "res-std", acHoursPerDay: 8, evKmPerYear: 0 },
  appliances: [],
  updatedAt: null,
};

/** The user's saved home and appliance inventory, persisted in this browser. */
export function useMyHome() {
  const [home, setHome] = useState<MyHome>(EMPTY_HOME);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as MyHome;
        setHome({ ...EMPTY_HOME, ...p, profile: { ...EMPTY_HOME.profile, ...p.profile } });
      }
    } catch { /* ignore corrupt storage */ }
    setLoaded(true);
  }, []);
  const save = useCallback((next: MyHome | ((h: MyHome) => MyHome)) => {
    setHome((prev) => {
      const v = typeof next === "function" ? next(prev) : next;
      const stamped = { ...v, updatedAt: new Date().toISOString() };
      localStorage.setItem(KEY, JSON.stringify(stamped));
      return stamped;
    });
  }, []);
  const reset = useCallback(() => { localStorage.removeItem(KEY); setHome(EMPTY_HOME); }, []);
  return { home, save, reset, loaded, saved: home.updatedAt !== null };
}
