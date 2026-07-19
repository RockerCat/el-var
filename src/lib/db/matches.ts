import { createClient } from "@/lib/supabase/server";
import type { Match, Prediction, MatchWithPrediction } from "@/lib/matches";
import { isTournamentFinished } from "@/lib/matches";

export type MatchPredictionEntry = {
  user_id:       string;
  display_name:  string;
  pred_home:     number;
  pred_away:     number;
  points:        number;
  points_reason: string | null;
  predicted_at:  string;
};

export type MissingPredictionEntry = {
  user_id:      string;
  display_name: string;
};

type RawMatch = Omit<Match, "home_team" | "away_team"> & {
  home_team: Match["home_team"];
  away_team: Match["away_team"];
};

/**
 * Transitions any scheduled match whose kickoff has passed to 'live'.
 * Uses database NOW() — never client time. Safe to call before any match
 * query; idempotent and non-fatal on error.
 */
export async function syncStartedMatches(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_due_matches_live");
  if (error) console.warn("[sync] mark_due_matches_live:", error.message);
}

/**
 * Fetches all matches (with joined teams) and the current user's predictions,
 * then merges them into a single list ordered by kickoff time.
 *
 * The matches/teams SELECT uses simple RLS (TO authenticated USING true).
 * The predictions SELECT uses auth.uid() = user_id — may return empty if the
 * JWT doesn't reach PostgREST (acceptable: user can still save predictions via
 * the save_prediction_for_user SECURITY DEFINER function).
 */
export async function getMatchesWithPredictions(
  userId: string
): Promise<MatchWithPrediction[]> {
  const supabase = await createClient();

  await syncStartedMatches();

  // Fetch matches with home/away team data in one query
  const { data: matchRows, error: matchError } = await supabase
    .from("matches")
    .select(
      `*,
       home_team:home_team_id(*),
       away_team:away_team_id(*)`
    )
    .order("starts_at", { ascending: true });

  if (matchError) {
    console.error("[getMatches] SELECT error:", matchError.message, matchError.code);
    return [];
  }

  console.log("[getMatches] fetched", matchRows?.length ?? 0, "matches");

  if (!matchRows || matchRows.length === 0) return [];

  // Fetch user's predictions (may be empty if JWT issue — non-fatal)
  const { data: predRows, error: predError } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", userId);

  if (predError) {
    console.warn("[getMatches] predictions SELECT error:", predError.message);
  }

  console.log("[getMatches] fetched", predRows?.length ?? 0, "predictions");

  const predMap = new Map<string, Prediction>(
    (predRows ?? []).map((p) => [p.match_id as string, p as Prediction])
  );

  return (matchRows as RawMatch[]).map((m) => ({
    ...m,
    prediction: predMap.get(m.id) ?? null,
  }));
}

/**
 * Fetches the status of every match in the tournament and applies the exact
 * same "finished" rule the rest of the app uses (see isTournamentFinished in
 * lib/matches.ts). Fails closed on any query error — a transient fetch
 * failure must never make the Podio page open early.
 */
export async function getTournamentFinished(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("matches").select("status");
  if (error) {
    console.error("[matches] getTournamentFinished:", error.message);
    return false;
  }
  return isTournamentFinished((data ?? []) as Pick<Match, "status">[]);
}

export async function getMatchDetailPredictions(
  matchId: string,
  groupId: string
): Promise<MatchPredictionEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_match_detail_predictions", {
    p_match_id: matchId,
    p_group_id: groupId,
  });
  if (error) {
    console.error("[matches] getMatchDetailPredictions:", error.message);
    return [];
  }
  return (data ?? []) as MatchPredictionEntry[];
}

export async function getMatchMissingPredictions(
  matchId: string,
  groupId: string
): Promise<MissingPredictionEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_match_missing_predictions_for_group", {
    p_match_id: matchId,
    p_group_id: groupId,
  });
  if (error) {
    console.error("[matches] getMatchMissingPredictions:", error.message);
    return [];
  }
  return (data ?? []) as MissingPredictionEntry[];
}
