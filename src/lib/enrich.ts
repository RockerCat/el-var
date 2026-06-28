import {
  computeGroupStandings,
  assignBestThirdSlots,
  resolveSlot,
  type ClassificationMatch,
  type ClassificationTeam,
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
};

/**
 * Resolves knockout match slots from group standings.
 * Replaces raw placeholders ("Runner-up Group A") with projected / official
 * teams when enough group data is available. Group matches and matches with
 * both teams already set are returned unchanged.
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
  return matches.map((m): T => {
    if (m.stage === "group" || (m.home_team && m.away_team)) return m;
    const homeRes = resolveSlot(
      m.home_team,
      m.home_placeholder,
      groupStandings,
      bestThirdSlots.get(`${m.id}:home`) ?? null,
    );
    const awayRes = resolveSlot(
      m.away_team,
      m.away_placeholder,
      groupStandings,
      bestThirdSlots.get(`${m.id}:away`) ?? null,
    );
    return {
      ...m,
      home_team: homeRes.kind !== "unresolved" ? homeRes.team : m.home_team,
      away_team: awayRes.kind !== "unresolved" ? awayRes.team : m.away_team,
    } as T;
  });
}
