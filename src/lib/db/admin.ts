import { createClient } from "@/lib/supabase/server";
import type { Match } from "@/lib/matches";
import { syncStartedMatches } from "@/lib/db/matches";
import { enrichWithResolvedTeams } from "@/lib/enrich";

// ── Auth ──────────────────────────────────────────────────────────────

export async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function isUserDisabled(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("is_disabled")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.is_disabled === true;
}

// ── Match queries ─────────────────────────────────────────────────────

export async function getMatchesForAdmin(opts?: {
  group?: string;
  status?: string;
}): Promise<Match[]> {
  await syncStartedMatches();

  const supabase = await createClient();

  // Fetch all matches so enrichWithResolvedTeams has full group-standings context.
  // Filtering happens in memory after enrichment.
  const { data, error } = await supabase
    .from("matches")
    .select(`*, home_team:home_team_id(*), away_team:away_team_id(*)`)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("[admin] getMatchesForAdmin:", error.message);
    return [];
  }

  const enriched = enrichWithResolvedTeams((data ?? []) as Match[]);

  return enriched.filter((m) => {
    if (opts?.group  && m.group_code !== opts.group)  return false;
    if (opts?.status && m.status     !== opts.status) return false;
    return true;
  });
}

// Fetches a single match for the admin detail page, enriched with resolved teams.
// Must fetch ALL matches first so enrichWithResolvedTeams has full group-standings
// context — fetching by id alone would leave group placeholders unresolved.
export async function getMatchForAdmin(matchId: string): Promise<Match | null> {
  await syncStartedMatches();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(`*, home_team:home_team_id(*), away_team:away_team_id(*)`)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("[admin] getMatchForAdmin:", error.message);
    return null;
  }

  const enriched = enrichWithResolvedTeams((data ?? []) as Match[]);
  return enriched.find((m) => m.id === matchId) ?? null;
}

// ── Dashboard stats ───────────────────────────────────────────────────

export type AdminStats = {
  total_users:       number;
  active_users:      number;
  disabled_users:    number;
  total_predictions: number;
  matches_scheduled: number;
  matches_live:      number;
  matches_finished:  number;
};

export async function getAdminDashboardStats(): Promise<AdminStats | null> {
  await syncStartedMatches();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_dashboard_stats");
  if (error) {
    console.error("[admin] getAdminDashboardStats:", error.message);
    return null;
  }
  return data as AdminStats;
}

// ── User list ─────────────────────────────────────────────────────────

export type AdminUser = {
  user_id:      string;
  display_name: string;
  email:        string;
  joined_at:    string;
  is_disabled:  boolean;
  total_points: number;
  pred_count:   number;
  exact_count:  number;
  result_count: number;
};

export async function getAdminUsers(): Promise<AdminUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_user_list");
  if (error) {
    console.error("[admin] getAdminUsers:", error.message);
    return [];
  }
  return (data ?? []) as AdminUser[];
}

// ── Activity log ─────────────────────────────────────────────────────

export type ActivityEntry = {
  id:           string;
  admin_name:   string;
  action:       string;
  entity_type:  string;
  entity_label: string;
  old_values:   Record<string, unknown> | null;
  new_values:   Record<string, unknown> | null;
  created_at:   string;
};

export async function getAdminActivityLog(limit = 100): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_activity_log", { p_limit: limit });
  if (error) {
    console.error("[admin] getAdminActivityLog:", error.message);
    return [];
  }
  return (data ?? []) as ActivityEntry[];
}

// ── Community group (invite link) ─────────────────────────────────────

export async function getAdminCommunityGroup() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("id, name, invite_code, entry_fee, first_place_pct, second_place_pct")
    .limit(1)
    .maybeSingle();
  return data as {
    id: string;
    name: string;
    invite_code: string;
    entry_fee:        number | null;
    first_place_pct:  number | null;
    second_place_pct: number | null;
  } | null;
}
