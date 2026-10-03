import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function all<T>(table: "tariffs" | "homes" | "products" | "business_sites" | "procurement_options"): Promise<T[]> {
  const { data, error } = await supabase.from(table).select("*").order("id");
  if (error) throw error;
  return data as T[];
}

import type { Tariff, Home, Product, Site, ProcurementOption } from "./energy";

export const tariffsQuery = queryOptions({ queryKey: ["tariffs"], queryFn: () => all<Tariff>("tariffs") });
export const homesQuery = queryOptions({ queryKey: ["homes"], queryFn: () => all<Home>("homes") });
export const productsQuery = queryOptions({ queryKey: ["products"], queryFn: () => all<Product>("products") });
export const sitesQuery = queryOptions({ queryKey: ["sites"], queryFn: () => all<Site>("business_sites") });
export const optionsQuery = queryOptions({ queryKey: ["procurement_options"], queryFn: () => all<ProcurementOption>("procurement_options") });
