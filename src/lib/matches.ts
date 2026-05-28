// ── Domain types ──────────────────────────────────────────────────────

export type Team = {
  id: string;
  name: string;
  code: string;
  flag_emoji: string | null;
};

export type MatchStatus = "scheduled" | "live" | "finished";
export type MatchStage =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export type Match = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  starts_at: string;
  stage: MatchStage;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
  home_team: Team;
  away_team: Team;
};

export type Prediction = {
  id: string;
  match_id: string;
  user_id: string;
  home_score: number;
  away_score: number;
  points: number;
  points_reason: string | null;
  scored_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchWithPrediction = Match & {
  prediction: Prediction | null;
};

// ── Action result ─────────────────────────────────────────────────────

export type PredictionActionResult =
  | { error: string; devMessage?: string }
  | { success: true; prediction: Prediction };

export type PredictionActionState = PredictionActionResult | null;

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Returns the reason predictions are closed, or null if the window is open.
 * Two possible reasons mirror the backend RPC exceptions:
 *   "match_not_scheduled" — status is not 'scheduled' (admin set live/finished)
 *   "match_started"       — kickoff time has already passed
 * Frontend uses this for UX labels; the real enforcement lives in the RPC.
 */
export function matchClosedReason(
  match: Pick<Match, "starts_at" | "status">
): "match_not_scheduled" | "match_started" | null {
  if (match.status !== "scheduled") return "match_not_scheduled";
  if (Date.now() >= new Date(match.starts_at).getTime()) return "match_started";
  return null;
}

/** True if the prediction window is still open. Mirrors backend cutoff exactly. */
export function isMatchOpen(match: Pick<Match, "starts_at" | "status">): boolean {
  return matchClosedReason(match) === null;
}

/** Human-readable date/time label for a match. */
export function formatKickoff(startsAt: string): string {
  const date = new Date(startsAt);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const matchMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (matchMidnight.getTime() - todayMidnight.getTime()) / 86_400_000
  );

  const time = date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });

  if (diffDays === -1) return `Ayer · ${time}`;
  if (diffDays === 0)  return `Hoy · ${time}`;
  if (diffDays === 1)  return `Mañana · ${time}`;

  return date.toLocaleDateString("es-CO", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
    timeZone: "America/Bogota",
  }) + ` · ${time}`;
}

/** Day bucket key used for grouping matches in the dashboard. */
export function matchDayKey(startsAt: string): string {
  const date = new Date(startsAt);
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    timeZone: "America/Bogota",
  });
}

export const STAGE_LABELS: Record<MatchStage, string> = {
  group:         "Fase de grupos",
  round_of_32:   "Ronda de 32",
  round_of_16:   "Octavos de final",
  quarter_final: "Cuartos de final",
  semi_final:    "Semifinal",
  third_place:   "Tercer puesto",
  final:         "Final",
};
