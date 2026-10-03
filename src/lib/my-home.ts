import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HouseholdContext, OwnedAppliance } from "./energy";

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
  // richer context
  floorLevel: "low" | "mid" | "high";
  windowFacing: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "unknown";
  buildingAge: "new" | "10-30" | "30+";
  waterHeating: "electric" | "gas" | "unknown";
  cooking: "electric" | "gas";
  homeDuringDay: boolean;
}

export interface SavedHome { id: string; profile: MyHomeProfile; appliances: OwnedAppliance[]; updatedAt: string }

export const DEFAULT_PROFILE: MyHomeProfile = {
  name: "My home", district: "", propertyType: "flat", areaM2: 0, occupants: 0, bedrooms: 0, tariffId: "res-std",
  acHoursPerDay: 8, evKmPerYear: 0, floorLevel: "mid", windowFacing: "unknown", buildingAge: "10-30",
  waterHeating: "electric", cooking: "gas", homeDuringDay: false,
};

const ACTIVE_KEY = "clp.activeHome";
export const homesKey = ["user_homes"] as const;

function toSaved(r: { id: string; profile: unknown; appliances: unknown; updated_at: string }): SavedHome {
  return {
    id: r.id,
    profile: { ...DEFAULT_PROFILE, ...(r.profile as Partial<MyHomeProfile>) },
    appliances: Array.isArray(r.appliances) ? (r.appliances as OwnedAppliance[]) : [],
    updatedAt: r.updated_at,
  };
}

/** All homes saved to the signed-in account, plus the one currently selected. */
export function useHomes() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: homesKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_homes").select("id,profile,appliances,updated_at").order("created_at");
      if (error) throw error;
      return data.map(toSaved);
    },
  });
  const [activeId, setActiveIdState] = useState<string | null>(null);
  useEffect(() => { setActiveIdState(localStorage.getItem(ACTIVE_KEY)); }, []);
  const setActiveId = useCallback((id: string) => { localStorage.setItem(ACTIVE_KEY, id); setActiveIdState(id); }, []);

  const homes = q.data ?? [];
  const active = useMemo(() => homes.find((h) => h.id === activeId) ?? homes[0] ?? null, [homes, activeId]);

  const create = useMutation({
    mutationFn: async (profile: Partial<MyHomeProfile> = {}) => {
      const { data, error } = await supabase.from("user_homes")
        .insert({ profile: { ...DEFAULT_PROFILE, ...profile } as never, appliances: [] as never })
        .select("id,profile,appliances,updated_at").single();
      if (error) throw error;
      return toSaved(data);
    },
    onSuccess: (h) => { qc.setQueryData<SavedHome[]>(homesKey, (old) => [...(old ?? []), h]); setActiveId(h.id); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_homes").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => qc.setQueryData<SavedHome[]>(homesKey, (old) => (old ?? []).filter((h) => h.id !== id)),
  });

  // Optimistic local update, debounced write to the database.
  const timers = useMemo(() => new Map<string, ReturnType<typeof setTimeout>>(), []);
  const update = useCallback((id: string, fn: (h: SavedHome) => SavedHome) => {
    let next: SavedHome | undefined;
    qc.setQueryData<SavedHome[]>(homesKey, (old) => (old ?? []).map((h) => (h.id === id ? (next = fn(h)) : h)));
    clearTimeout(timers.get(id));
    timers.set(id, setTimeout(async () => {
      if (!next) return;
      await supabase.from("user_homes").update({ profile: next.profile as never, appliances: next.appliances as never, updated_at: new Date().toISOString() }).eq("id", id);
    }, 500));
  }, [qc, timers]);

  return { homes, active, activeId: active?.id ?? null, setActiveId, isLoading: q.isLoading, create, remove, update };
}

export const END_USE_LABEL: Record<string, string> = {
  cooling: "Cooling & air", refrigeration: "Fridge & freezer", water_heating: "Hot water", laundry: "Laundry",
  cooking: "Cooking", electronics: "TV & electronics", lighting: "Lighting", ev: "Car charging", other: "Other",
};


/** Afternoon sun on west/south-west glass, top floors and old buildings all add cooling load (HK rule-of-thumb, demo figures). */
export const WINDOW_SUN_FACTOR: Record<MyHomeProfile["windowFacing"], number> = {
  N: 0.92, NE: 0.97, E: 1.03, SE: 1.05, S: 1.04, SW: 1.12, W: 1.15, NW: 1.06, unknown: 1,
};
export function coolingFactor(p: MyHomeProfile): number {
  return (WINDOW_SUN_FACTOR[p.windowFacing] ?? 1) * (p.floorLevel === "high" ? 1.06 : 1) * (p.buildingAge === "30+" ? 1.05 : 1);
}
/** A home is ready for advice once its size, household and current appliances are known. */
export function homeIsComplete(h: SavedHome | null | undefined): boolean {
  return !!h && h.profile.areaM2 > 0 && h.profile.occupants > 0 && h.appliances.length > 0;
}

export function homeContext(p: MyHomeProfile): HouseholdContext {
  return { coolingFactor: coolingFactor(p), areaM2: p.areaM2, roomM2: Math.max(10, Math.round(p.areaM2 / (p.bedrooms + 1))), occupants: p.occupants, acHoursPerDay: p.acHoursPerDay, evKmPerYear: p.evKmPerYear };
}

