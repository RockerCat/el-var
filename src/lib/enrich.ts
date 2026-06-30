import {
  computeGroupStandings,
  assignBestThirdSlots,
  resolveSlot,
  type ClassificationMatch,
  type ClassificationTeam,
  type KnockoutResult,
} from "./classification";

type EnrichableMatch = {
  id: string;
  stage: string;
  match_number: number | null;
  group_code: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team: ClassificationTeam | null;
  away_team: ClassificationTeam | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  winner_side: 'home' | 'away' | null;
};

function recordResult(
  m: { match_number: number | null; home_score: number | null; away_score: number | null; home_team: ClassificationTeam | null; away_team: ClassificationTeam | null; winner_side?: 'home' | 'away' | null },
  knockoutResults: Map<number, KnockoutResult>
) {
  if (m.match_number === null || m.home_score === null || m.away_score === null) return;
  if (!m.home_team || !m.away_team) return;
  if (m.home_score > m.away_score) {
    knockoutResults.set(m.match_number, { winner: m.home_team, loser: m.away_team });
  } else if (m.away_score > m.home_score) {
    knockoutResults.set(m.match_number, { winner: m.away_team, loser: m.home_team });
  } else if (m.winner_side === 'home') {
    knockoutResults.set(m.match_number, { winner: m.home_team, loser: m.away_team });
  } else if (m.winner_side === 'away') {
    knockoutResults.set(m.match_number, { winner: m.away_team, loser: m.home_team });
  }
  // Draw with no winner_side: unresolvable — slot stays null downstream.
}

/**
 * Resolves knockout match slots from group standings and finished knockout results.
 * Replaces raw placeholders ("Runner-up Group A", "Winner M73") with projected /
 * official teams when enough data is available.
 *
 * Matches must be ordered chronologically (starts_at ASC) so that earlier rounds
 * are processed before later rounds — this allows "Winner M73" in M90 to resolve
 * once M73's winner has been established from group standings in the same pass.
 *
 * Penalty draws resolve when winner_side ('home' | 'away') is set on the match.
 * Without winner_side, penalty-draw slots remain unresolved.
 */
export function enrichWithResolvedTeams<T extends EnrichableMatch>(matches: T[]): T[] {
  const groupStandings = computeGroupStandings(
    matches
      .filter((m) => m.stage === "group")
      .map((m) => ({
        group_code: m.group_code,
        home_score: m.home_score,
        away_score: m.away_score,
        status:     m.status,
        home_team:  m.home_team,
        away_team:  m.away_team,
      })) as ClassificationMatch[]
  );
  const bestThirdSlots = assignBestThirdSlots(
    groupStandings,
    matches.filter((m) => m.stage === "round_of_32"),
  );

  // Topological pass: process matches in chronological order (guaranteed by callers ordering
  // by starts_at ASC). As each finished knockout match is enriched, its winner/loser is added
  // to knockoutResults so the next round can resolve "Winner Mxx"/"Loser Mxx" placeholders.
  // This handles the common case where home_team_id is null in DB for a recently-finished
  // R32 match — teams are resolved via group standings, then propagated to R16+.
  const knockoutResults: Map<number, KnockoutResult> = new Map();
  const result: T[] = [];

  for (const m of matches) {
    // Group matches and matches where both teams are already set in DB: pass through.
    // Still record their result so downstream rounds can reference them.
    if (m.stage === "group" || (m.home_team && m.away_team)) {
      if (m.stage !== "group" && m.status === "finished") recordResult(m, knockoutResults);
      result.push(m);
      continue;
    }

    // Resolve this match using current group standings and knockout results accumulated so far.
    const homeRes = resolveSlot(
      m.home_team,
      m.home_placeholder,
      groupStandings,
      bestThirdSlots.get(`${m.id}:home`) ?? null,
      knockoutResults,
    );
    const awayRes = resolveSlot(
      m.away_team,
      m.away_placeholder,
      groupStandings,
      bestThirdSlots.get(`${m.id}:away`) ?? null,
      knockoutResults,
    );

    const enriched = {
      ...m,
      home_team: homeRes.kind !== "unresolved" ? homeRes.team : m.home_team,
      away_team: awayRes.kind !== "unresolved" ? awayRes.team : m.away_team,
    } as T;

    // Record for downstream "Winner Mxx"/"Loser Mxx" resolution only when both
    // teams are identified — either from DB (fast path above) or dynamically via
    // resolveSlot. winner_side handles penalty-draw winner when scores are equal.
    if (enriched.status === "finished" && enriched.home_team && enriched.away_team) {
      recordResult(enriched, knockoutResults);
    }

    result.push(enriched);
  }

  return result;
}
