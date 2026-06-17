// Curated editorial metadata for the 2026 World Cup. Hand-maintained,
// factual (titles, host status), not derived from any external API.
// Purely flavor text for blockResult — never read by scoring/ranking code.

export type TeamTag =
  | "defending_champion"
  | "historic_power"
  | "host"
  | "debutant"
  | "community_team";

const TEAM_TAGS: Record<string, TeamTag[]> = {
  ARG: ["defending_champion"],
  BRA: ["historic_power"],
  GER: ["historic_power"],
  FRA: ["historic_power"],
  ESP: ["historic_power"],
  URU: ["historic_power"],
  ENG: ["historic_power"],
  NED: ["historic_power"],
  POR: ["historic_power"],
  USA: ["host"],
  MEX: ["host"],
  CAN: ["host"],
  CPV: ["debutant"],
  CUW: ["debutant"],
  COL: ["community_team"],
};

// First tag in this list that a team has wins — keeps blockResult from
// having to combine multiple narratives for one result.
//
// community_team is intentionally excluded: it isn't a "winner-only, one
// fixed phrase" narrative like the others — it has its own win/draw/loss
// (and debut) templates and is checked directly via hasTag() in
// blockResult, with priority over whatever tag the opponent carries.
const TAG_PRIORITY: Exclude<TeamTag, "community_team">[] = [
  "defending_champion",
  "historic_power",
  "host",
  "debutant",
];

export function primaryTag(
  teamCode: string | null | undefined,
): Exclude<TeamTag, "community_team"> | null {
  if (!teamCode) return null;
  const tags = TEAM_TAGS[teamCode] ?? [];
  for (const tag of TAG_PRIORITY) {
    if (tags.includes(tag)) return tag;
  }
  return null;
}

export function hasTag(teamCode: string | null | undefined, tag: TeamTag): boolean {
  if (!teamCode) return false;
  return (TEAM_TAGS[teamCode] ?? []).includes(tag);
}
