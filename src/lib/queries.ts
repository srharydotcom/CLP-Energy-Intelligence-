import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function all<T>(table: "tariffs" | "homes" | "products" | "business_sites" | "procurement_options" | "appliance_catalog" | "building_archetypes" | "building_measures"): Promise<T[]> {
  const { data, error } = await supabase.from(table).select("*").order("id");
  if (error) throw error;
  return data as T[];
}

import type { Tariff, Home, Product, Site, ProcurementOption, CatalogAppliance } from "./energy";
import type { Archetype, Measure } from "./buildings";

export const tariffsQuery = queryOptions({ queryKey: ["tariffs"], queryFn: () => all<Tariff>("tariffs") });
export const homesQuery = queryOptions({ queryKey: ["homes"], queryFn: () => all<Home>("homes") });
export const productsQuery = queryOptions({ queryKey: ["products"], queryFn: () => all<Product>("products") });
export const sitesQuery = queryOptions({ queryKey: ["sites"], queryFn: () => all<Site>("business_sites") });
export const optionsQuery = queryOptions({ queryKey: ["procurement_options"], queryFn: () => all<ProcurementOption>("procurement_options") });
export const applianceCatalogQuery = queryOptions({ queryKey: ["appliance_catalog"], queryFn: () => all<CatalogAppliance>("appliance_catalog") });
export const archetypesQuery = queryOptions({ queryKey: ["building_archetypes"], queryFn: () => all<Archetype>("building_archetypes") });
export const measuresQuery = queryOptions({ queryKey: ["building_measures"], queryFn: () => all<Measure>("building_measures") });
