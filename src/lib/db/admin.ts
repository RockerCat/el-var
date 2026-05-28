import { createClient } from "@/lib/supabase/server";
import type { Match } from "@/lib/matches";

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function getMatchesForAdmin(): Promise<Match[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(`*, home_team:home_team_id(*), away_team:away_team_id(*)`)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("[admin] getMatchesForAdmin:", error.message);
    return [];
  }

  return (data ?? []) as Match[];
}
