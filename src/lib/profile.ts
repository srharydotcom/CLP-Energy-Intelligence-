import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Profile { id: string; display_name: string | null; user_type: "household" | "business"; tour_done: boolean; email: string | null }

export const profileKey = ["profile"] as const;

export function useProfile() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: profileKey,
    queryFn: async (): Promise<Profile | null> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("id,display_name,user_type,tour_done").eq("id", u.user.id).maybeSingle();
      if (data) return { ...(data as Omit<Profile, "email">), email: u.user.email ?? null };
      // Profile row missing (e.g. account created before profiles existed) — create it.
      const fresh = { id: u.user.id, display_name: (u.user.user_metadata?.['full_name'] as string) ?? u.user.email?.split("@")[0] ?? null, user_type: "household" as const, tour_done: false };
      await supabase.from("profiles").insert(fresh);
      return { ...fresh, email: u.user.email ?? null };
    },
  });
  const update = useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, "display_name" | "user_type" | "tour_done">>) => {
      if (!q.data) return;
      qc.setQueryData<Profile | null>(profileKey, (p) => (p ? { ...p, ...patch } : p));
      const { error } = await supabase.from("profiles").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", q.data.id);
      if (error) throw error;
    },
  });
  return { profile: q.data ?? null, isLoading: q.isLoading, update };
}
