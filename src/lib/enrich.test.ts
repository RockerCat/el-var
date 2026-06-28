import { describe, it, expect } from "vitest";
import { enrichWithResolvedTeams } from "./enrich";
import type { ClassificationTeam } from "./classification";

function team(code: string): ClassificationTeam {
  return { id: code, name: code, code, flag_emoji: null };
}

function groupMatch(
  id: string,
  home: string,
  away: string,
  homeScore: number,
  awayScore: number,
  group: string,
) {
  return {
    id,
    stage: "group" as const,
    match_number: null,
    group_code: group,
    status: "finished",
    home_score: homeScore,
    away_score: awayScore,
    home_team: team(home),
    away_team: team(away),
    home_placeholder: null,
    away_placeholder: null,
  };
}

function knockoutMatch(
  id: string,
  matchNumber: number,
  homePlaceholder: string,
  awayPlaceholder: string,
  stage = "round_of_32",
) {
  return {
    id,
    stage,
    match_number: matchNumber,
    group_code: null,
    status: "scheduled",
    home_score: null,
    away_score: null,
    home_team: null,
    away_team: null,
    home_placeholder: homePlaceholder,
    away_placeholder: awayPlaceholder,
  };
}

// Group B from classification.test.ts: SUI 1st (7 pts), CAN 2nd (6 pts)
const groupBMatches = [
  groupMatch("b1", "CAN", "BIH", 2, 0, "B"),
  groupMatch("b2", "QAT", "SUI", 0, 3, "B"),
  groupMatch("b3", "SUI", "BIH", 2, 1, "B"),
  groupMatch("b4", "CAN", "QAT", 1, 0, "B"),
  groupMatch("b5", "SUI", "CAN", 1, 1, "B"),
  groupMatch("b6", "BIH", "QAT", 0, 0, "B"),
];

// Group C from classification.test.ts: BRA 1st (7 pts), MAR 2nd (6 pts)
const groupCMatches = [
  groupMatch("c1", "BRA", "HAI", 3, 0, "C"),
  groupMatch("c2", "MAR", "SCO", 2, 1, "C"),
  groupMatch("c3", "BRA", "MAR", 1, 1, "C"),
  groupMatch("c4", "HAI", "SCO", 0, 0, "C"),
  groupMatch("c5", "BRA", "SCO", 2, 0, "C"),
  groupMatch("c6", "MAR", "HAI", 1, 0, "C"),
];

// ── M73 scenario: both slots are Runner-up placeholders ──────────────────────

describe("enrichWithResolvedTeams — M73 scenario (Runner-up Group B vs Runner-up Group C)", () => {
  const m73 = knockoutMatch("m73", 73, "Runner-up Group B", "Runner-up Group C");
  const matches = [...groupBMatches, ...groupCMatches, m73];
  const enriched = enrichWithResolvedTeams(matches);
  const enrichedM73 = enriched.find((m) => m.id === "m73")!;

  it("Runner-up Group B resolves to CAN when group B is fully finished", () => {
    expect(enrichedM73.home_team?.code).toBe("CAN");
  });

  it("Runner-up Group C resolves to MAR when group C is fully finished", () => {
    expect(enrichedM73.away_team?.code).toBe("MAR");
  });

  it("raw placeholders are no longer visible (both teams set)", () => {
    expect(enrichedM73.home_team).not.toBeNull();
    expect(enrichedM73.away_team).not.toBeNull();
  });

  it("group matches are returned unchanged", () => {
    const b1 = enriched.find((m) => m.id === "b1")!;
    expect(b1.home_team?.code).toBe("CAN");
    expect(b1.away_team?.code).toBe("BIH");
  });
});

// ── En Vivo shows same teams as Inicio for same match_id ────────────────────

describe("enrichWithResolvedTeams — same result regardless of call site", () => {
  it("calling enrichWithResolvedTeams twice with same input gives identical teams", () => {
    const m73 = knockoutMatch("m73", 73, "Runner-up Group B", "Runner-up Group C");
    const matches = [...groupBMatches, ...groupCMatches, m73];

    const firstCall  = enrichWithResolvedTeams(matches);
    const secondCall = enrichWithResolvedTeams(matches);

    const first  = firstCall.find((m) => m.id === "m73")!;
    const second = secondCall.find((m) => m.id === "m73")!;

    expect(first.home_team?.code).toBe(second.home_team?.code);
    expect(first.away_team?.code).toBe(second.away_team?.code);
  });
});

// ── Placeholder preserved when group data is insufficient ───────────────────

describe("enrichWithResolvedTeams — placeholder preserved when groups not started", () => {
  const m73 = knockoutMatch("m73", 73, "Runner-up Group B", "Runner-up Group C");
  const enriched = enrichWithResolvedTeams([m73]);
  const enrichedM73 = enriched[0];

  it("home_team remains null when no group matches exist", () => {
    expect(enrichedM73.home_team).toBeNull();
  });

  it("away_team remains null when no group matches exist", () => {
    expect(enrichedM73.away_team).toBeNull();
  });
});

// ── Partial group data: projected (not yet official) ────────────────────────

describe("enrichWithResolvedTeams — projected teams when groups are incomplete", () => {
  // Only 5 of 6 Group B matches played — CAN is projected as Runner-up
  const partialGroupB = [
    groupMatch("b1", "CAN", "BIH", 2, 0, "B"),
    groupMatch("b2", "QAT", "SUI", 0, 3, "B"),
    groupMatch("b3", "SUI", "BIH", 2, 1, "B"),
    groupMatch("b4", "CAN", "QAT", 1, 0, "B"),
    groupMatch("b5", "SUI", "CAN", 1, 1, "B"),
    // b6 (BIH vs QAT) not played yet
  ];

  const m73 = knockoutMatch("m73", 73, "Runner-up Group B", "Runner-up Group C");
  const enriched = enrichWithResolvedTeams([...partialGroupB, ...groupCMatches, m73]);
  const enrichedM73 = enriched.find((m) => m.id === "m73")!;

  it("Runner-up Group B still resolves (projected) even with one match remaining", () => {
    // CAN leads runner-up spot, BIH and QAT can't overtake
    expect(enrichedM73.home_team?.code).toBe("CAN");
  });
});

// ── News name resolution: "Equipo por definir" pattern ──────────────────────
// Validates the exact fallback used in createMatchNews (lib/db/news.ts).
// When enrichment cannot resolve a team, news must use a friendly string —
// never the raw DB placeholder like "Runner-up Group A".

describe("enrichWithResolvedTeams — news name resolution pattern", () => {
  it("unresolvable team produces null so news can use 'Equipo por definir'", () => {
    const m73 = knockoutMatch("m73", 73, "Runner-up Group B", "Runner-up Group C");
    const enriched = enrichWithResolvedTeams([m73]);
    const result = enriched[0];
    // When passed as a standalone array, TypeScript infers home_team as `null`.
    // Cast to ClassificationTeam | null to mirror the runtime type at call sites.
    const homeTeam = result.home_team as ClassificationTeam | null;
    const awayTeam = result.away_team as ClassificationTeam | null;
    const homeName = homeTeam?.name ?? "Equipo por definir";
    const awayName = awayTeam?.name ?? "Equipo por definir";
    expect(homeName).toBe("Equipo por definir");
    expect(awayName).toBe("Equipo por definir");
    expect(homeName).not.toMatch(/Runner-up|Winner|Best 3rd/i);
    expect(awayName).not.toMatch(/Runner-up|Winner|Best 3rd/i);
  });

  it("resolved team provides real name so news skips the fallback", () => {
    const m73 = knockoutMatch("m73", 73, "Runner-up Group B", "Runner-up Group C");
    const enriched = enrichWithResolvedTeams([...groupBMatches, ...groupCMatches, m73]);
    const result = enriched.find((m) => m.id === "m73")!;
    const homeName = result.home_team?.name ?? "Equipo por definir";
    const awayName = result.away_team?.name ?? "Equipo por definir";
    expect(homeName).toBe("CAN");
    expect(awayName).toBe("MAR");
    expect(homeName).not.toMatch(/Runner-up|Winner|Best 3rd/i);
    expect(awayName).not.toMatch(/Runner-up|Winner|Best 3rd/i);
  });

  it("title built with resolved teams has no technical placeholder text", () => {
    const m73 = knockoutMatch("m73", 73, "Runner-up Group B", "Runner-up Group C");
    const enriched = enrichWithResolvedTeams([...groupBMatches, ...groupCMatches, m73]);
    const result = enriched.find((m) => m.id === "m73")!;
    const homeName = result.home_team?.name ?? "Equipo por definir";
    const awayName = result.away_team?.name ?? "Equipo por definir";
    const title = `${homeName} 1 - 0 ${awayName}`;
    expect(title).not.toMatch(/Runner-up|Winner|Best 3rd/i);
    expect(title).toContain("CAN");
    expect(title).toContain("MAR");
  });
});
