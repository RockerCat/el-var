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

/** True if the prediction window is still open (>5 min before kickoff). */
export function isMatchOpen(match: Pick<Match, "starts_at" | "status">): boolean {
  if (match.status === "finished") return false;
  const cutoff = new Date(match.starts_at).getTime() - 5 * 60 * 1000;
  return Date.now() < cutoff;
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
  round_of_16:   "Octavos de final",
  quarter_final: "Cuartos de final",
  semi_final:    "Semifinal",
  third_place:   "Tercer puesto",
  final:         "Final",
};
