// Curated editorial metadata for the 2026 World Cup. Hand-maintained,
// factual (titles, host status), not derived from any external API.
// Purely flavor text for blockResult — never read by scoring/ranking code.

export type TeamTag = "defending_champion" | "historic_power" | "host" | "debutant";

const TEAM_TAGS: Record<string, TeamTag[]> = {
  ARG: ["defending_champion"],
  BRA: ["historic_power"],
  GER: ["historic_power"],
  FRA: ["historic_power"],
  ESP: ["historic_power"],
  URU: ["historic_power"],
  ENG: ["historic_power"],
  USA: ["host"],
  MEX: ["host"],
  CAN: ["host"],
  CPV: ["debutant"],
  CUW: ["debutant"],
};

// First tag in this list that a team has wins — keeps blockResult from
// having to combine multiple narratives for one result.
const TAG_PRIORITY: TeamTag[] = [
  "defending_champion",
  "historic_power",
  "host",
  "debutant",
];

export function primaryTag(teamCode: string | null | undefined): TeamTag | null {
  if (!teamCode) return null;
  const tags = TEAM_TAGS[teamCode] ?? [];
  for (const tag of TAG_PRIORITY) {
    if (tags.includes(tag)) return tag;
  }
  return null;
}
