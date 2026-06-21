// ── Types ─────────────────────────────────────────────────────────────

export type ClassificationTeam = {
  id: string;
  name: string;
  code: string;
  flag_emoji: string | null;
};

export type TeamStanding = {
  team: ClassificationTeam;
  group_code: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
};

export type GroupStanding = {
  group_code: string;
  teams: TeamStanding[];  // sorted: index 0 = leader
};

export type ClassificationMatch = {
  group_code: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  home_team: ClassificationTeam | null;
  away_team: ClassificationTeam | null;
};

export type KnockoutPreviewMatch = {
  id: string;
  match_number: number | null;
  starts_at: string;
  venue: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_team: ClassificationTeam | null;
  away_team: ClassificationTeam | null;
};

// ── Sorting comparator ─────────────────────────────────────────────────
// Criteria (in order):
//   1. Points DESC
//   2. Goal difference DESC
//   3. Goals scored DESC
//   4. Alphabetical ASC — deterministic technical fallback ONLY.
//
// This comparator has NO head-to-head step. It's correct to use as-is
// wherever match data between the compared teams either doesn't exist or
// doesn't apply (e.g. comparing third-placed teams across DIFFERENT
// groups in computeBestThirds — those teams never played each other, so
// head-to-head is meaningless there). For same-group comparisons, use
// sortGroupStandings() below instead, which layers head-to-head on top
// of this comparator rather than duplicating its logic.
//
// FIFA remaining criteria not implemented yet:
// fair play points and latest FIFA ranking.
// Alphabetical is only a deterministic technical fallback.

export function compareStandings(a: TeamStanding, b: TeamStanding): number {
  if (b.points     !== a.points)     return b.points     - a.points;
  if (b.goal_diff  !== a.goal_diff)  return b.goal_diff  - a.goal_diff;
  if (b.goals_for  !== a.goals_for)  return b.goals_for  - a.goals_for;
  return a.team.name.localeCompare(b.team.name);
}

// ── aggregateHeadToHead ─────────────────────────────────────────────────
// Builds a mini-table restricted to finished matches played BETWEEN the
// given team ids only (a true mini round-robin among the tied cluster,
// not a single pairwise lookup — this is what keeps sortGroupStandings()
// correct even for cyclic 3+ way results, e.g. A beat B, B beat C, C beat A).

function aggregateHeadToHead(
  teamIds: Set<string>,
  groupMatches: ClassificationMatch[]
): Map<string, { points: number; goal_diff: number; goals_for: number }> {
  const stats = new Map<string, { points: number; goal_diff: number; goals_for: number }>();
  for (const id of teamIds) stats.set(id, { points: 0, goal_diff: 0, goals_for: 0 });

  for (const m of groupMatches) {
    if (m.status !== "finished") continue;
    if (m.home_score === null || m.away_score === null) continue;
    if (!m.home_team || !m.away_team) continue;
    if (!teamIds.has(m.home_team.id) || !teamIds.has(m.away_team.id)) continue;

    const home = stats.get(m.home_team.id)!;
    const away = stats.get(m.away_team.id)!;
    const hg = m.home_score;
    const ag = m.away_score;

    home.goal_diff += hg - ag;  home.goals_for += hg;
    away.goal_diff += ag - hg;  away.goals_for += ag;

    if (hg > ag)      home.points += 3;
    else if (hg < ag) away.points += 3;
    else              { home.points++; away.points++; }
  }

  return stats;
}

// ── sortGroupStandings ───────────────────────────────────────────────────
// Same-group ranking, FIFA order:
//   1. Points (total)
//   2. Points  — head-to-head among teams tied on (1)
//   3. Goal diff — head-to-head among teams tied on (1)
//   4. Goals for — head-to-head among teams tied on (1)
//   5. Goal diff (total)
//   6. Goals for (total)
//   7. Alphabetical — deterministic technical fallback ONLY (see compareStandings)
//
// Head-to-head is computed once per points-cluster (not per pair), so the
// result is a valid total order even when results are cyclic — a cyclic
// cluster simply ties again in the mini-table and falls through to (5)-(7).

export function sortGroupStandings(
  teams: TeamStanding[],
  groupMatches: ClassificationMatch[]
): TeamStanding[] {
  const byPoints = new Map<number, TeamStanding[]>();
  for (const t of teams) {
    const cluster = byPoints.get(t.points) ?? [];
    cluster.push(t);
    byPoints.set(t.points, cluster);
  }

  const h2h = new Map<string, { points: number; goal_diff: number; goals_for: number }>();
  for (const cluster of byPoints.values()) {
    if (cluster.length < 2) continue;
    const ids = new Set(cluster.map((t) => t.team.id));
    for (const [id, stat] of aggregateHeadToHead(ids, groupMatches)) {
      h2h.set(id, stat);
    }
  }

  return [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;       // (1)

    const ah = h2h.get(a.team.id);
    const bh = h2h.get(b.team.id);
    if (ah && bh) {
      if (bh.points    !== ah.points)    return bh.points    - ah.points;    // (2)
      if (bh.goal_diff !== ah.goal_diff) return bh.goal_diff - ah.goal_diff;  // (3)
      if (bh.goals_for !== ah.goals_for) return bh.goals_for - ah.goals_for;  // (4)
    }

    return compareStandings(a, b);  // (5) goal diff, (6) goals for, (7) alphabetical fallback
  });
}

function emptyStanding(
  team: ClassificationTeam,
  group_code: string
): TeamStanding {
  return {
    team,
    group_code,
    played: 0, won: 0, drawn: 0, lost: 0,
    goals_for: 0, goals_against: 0, goal_diff: 0, points: 0,
  };
}

// ── computeGroupStandings ──────────────────────────────────────────────
// Pass ALL group-stage matches (any status) so every team is initialised.
// Only finished matches contribute to stats.

export function computeGroupStandings(
  matches: ClassificationMatch[]
): GroupStanding[] {
  const standingsMap = new Map<string, TeamStanding>();
  const groupSets    = new Map<string, Set<string>>();

  // ── Pass 1: discover every team in every group ─────────────────────
  for (const m of matches) {
    if (!m.group_code) continue;
    for (const team of [m.home_team, m.away_team]) {
      if (!team) continue;
      if (!standingsMap.has(team.id)) {
        standingsMap.set(team.id, emptyStanding(team, m.group_code));
      }
      const s = groupSets.get(m.group_code) ?? new Set<string>();
      s.add(team.id);
      groupSets.set(m.group_code, s);
    }
  }

  // ── Pass 2: accumulate stats from finished matches ─────────────────
  for (const m of matches) {
    if (m.status !== "finished") continue;
    if (!m.group_code || m.home_score === null || m.away_score === null) continue;
    if (!m.home_team || !m.away_team) continue;

    const home = standingsMap.get(m.home_team.id);
    const away = standingsMap.get(m.away_team.id);
    if (!home || !away) continue;

    const hg = m.home_score;
    const ag = m.away_score;

    home.played++; away.played++;
    home.goals_for    += hg;  home.goals_against += ag;
    away.goals_for    += ag;  away.goals_against += hg;
    home.goal_diff = home.goals_for - home.goals_against;
    away.goal_diff = away.goals_for - away.goals_against;

    if (hg > ag) {
      home.won++; away.lost++; home.points += 3;
    } else if (hg < ag) {
      away.won++; home.lost++; away.points += 3;
    } else {
      home.drawn++; away.drawn++; home.points++; away.points++;
    }
  }

  // ── Build sorted groups A → L ──────────────────────────────────────
  const groupsMap = new Map<string, TeamStanding[]>();
  for (const standing of standingsMap.values()) {
    const arr = groupsMap.get(standing.group_code) ?? [];
    arr.push(standing);
    groupsMap.set(standing.group_code, arr);
  }

  return [...groupsMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group_code, teams]) => ({
      group_code,
      teams: sortGroupStandings(
        teams,
        matches.filter((m) => m.group_code === group_code)
      ),
    }));
}

// ── computeBestThirds ──────────────────────────────────────────────────
// Extracts the 3rd-ranked team from each group and ranks them.
// Returns ALL thirds sorted — caller marks top 8 as advancing.

export function computeBestThirds(groups: GroupStanding[]): TeamStanding[] {
  return groups
    .filter((g) => g.teams.length >= 3)
    .map((g) => g.teams[2])
    .sort(compareStandings);
}

// ── resolveSlot ──────────────────────────────────────────────────────────
// Resolves a single bracket slot (one side of a KnockoutPreviewMatch) to
// one of three states:
//   • "official"   — team already confirmed (home_team/away_team set)
//   • "projected"   — no team confirmed yet, but the placeholder is a
//                     "Winner Group X" / "Runner-up Group X" / "Best 3rd (...)"
//                     slot and current standings can resolve it
//   • "unresolved" — placeholder can't be safely resolved yet (e.g. a
//                     "Winner M##" cross-reference, or a group/best-third
//                     pool with too few teams recorded)
//
// Only group-position placeholders are ever projected. "Best 3rd (...)"
// slots are resolved via assignBestThirdSlots() below using a simple,
// transparent rule ("best eligible third still available") — NOT the
// official FIFA combination table, which is not implemented anywhere in
// this codebase. bestThirdTeam must be precomputed by the caller and
// passed in; resolveSlot itself stays a pure, single-slot function.

export type SlotResolution =
  | { kind: "official";   team: ClassificationTeam }
  | { kind: "projected";  team: ClassificationTeam }
  | { kind: "unresolved"; label: string };

const WINNER_GROUP_RE    = /^Winner Group ([A-L])$/;
const RUNNER_UP_GROUP_RE = /^Runner-up Group ([A-L])$/;
const BEST_THIRD_RE      = /^Best 3rd \(([A-L](?:\/[A-L])*)\)$/;

export function resolveSlot(
  team: ClassificationTeam | null,
  placeholder: string | null,
  groups: GroupStanding[],
  bestThirdTeam: ClassificationTeam | null = null
): SlotResolution {
  if (team) return { kind: "official", team };
  if (!placeholder) return { kind: "unresolved", label: "Por definir" };

  const winnerMatch = placeholder.match(WINNER_GROUP_RE);
  if (winnerMatch) {
    const group = groups.find((g) => g.group_code === winnerMatch[1]);
    if (group && group.teams.length >= 1) {
      return { kind: "projected", team: group.teams[0].team };
    }
  }

  const runnerUpMatch = placeholder.match(RUNNER_UP_GROUP_RE);
  if (runnerUpMatch) {
    const group = groups.find((g) => g.group_code === runnerUpMatch[1]);
    if (group && group.teams.length >= 2) {
      return { kind: "projected", team: group.teams[1].team };
    }
  }

  if (BEST_THIRD_RE.test(placeholder) && bestThirdTeam) {
    return { kind: "projected", team: bestThirdTeam };
  }

  return { kind: "unresolved", label: placeholder };
}

// ── assignBestThirdSlots ───────────────────────────────────────────────
// Projects which team fills each "Best 3rd (A/B/C/D/F)" slot, using a
// simple, transparent rule (NOT the official FIFA combination table):
//   "best eligible third still available, in match_number order"
//
//   1. Take the top 8 current thirds (computeBestThirds, already sorted
//      best-first by compareStandings).
//   2. Walk the round-of-32 matches in match_number order. For each side
//      whose placeholder is "Best 3rd (...)", assign the best remaining
//      third whose group_code is in that slot's allowed-groups list.
//   3. Once a third is assigned to a slot it's removed from the pool —
//      no team can fill two slots.
//   4. If no eligible third remains for a slot, it is left unassigned
//      (resolveSlot then falls back to "unresolved", i.e. the original
//      placeholder text).
//
// Returns a Map keyed by `${matchId}:home` / `${matchId}:away`.

export type BestThirdSlotMatch = {
  id:               string;
  match_number:     number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
};

export function assignBestThirdSlots(
  groups: GroupStanding[],
  matches: BestThirdSlotMatch[]
): Map<string, ClassificationTeam> {
  const pool   = computeBestThirds(groups).slice(0, 8);
  const used   = new Set<string>();
  const result = new Map<string, ClassificationTeam>();

  const ordered = [...matches].sort(
    (a, b) => (a.match_number ?? Infinity) - (b.match_number ?? Infinity)
  );

  for (const match of ordered) {
    for (const side of ["home", "away"] as const) {
      const placeholder = side === "home" ? match.home_placeholder : match.away_placeholder;
      const allowedMatch = placeholder?.match(BEST_THIRD_RE);
      if (!allowedMatch) continue;

      const allowedGroups = new Set(allowedMatch[1].split("/"));
      const candidate = pool.find(
        (ts) => allowedGroups.has(ts.group_code) && !used.has(ts.team.id)
      );
      if (!candidate) continue;

      used.add(candidate.team.id);
      result.set(`${match.id}:${side}`, candidate.team);
    }
  }

  return result;
}
