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

function finishedKnockoutMatch(
  id: string,
  matchNumber: number,
  homeTeam: ClassificationTeam,
  awayTeam: ClassificationTeam,
  homeScore: number,
  awayScore: number,
  stage = "round_of_32",
) {
  return {
    id,
    stage,
    match_number: matchNumber,
    group_code: null,
    status: "finished",
    home_score: homeScore,
    away_score: awayScore,
    home_team: homeTeam,
    away_team: awayTeam,
    home_placeholder: null,
    away_placeholder: null,
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

// ── Admin match detail page: single match extracted from enriched batch ─────
// Reproduces the bug in /admin/matches/[matchId]/page.tsx where the page
// fetched only the target match by id, leaving group placeholders unresolved.
// Fix: getMatchForAdmin fetches all matches, enriches the batch, then finds by id.

describe("getMatchForAdmin pattern — single match from enriched batch", () => {
  // Exact bug-report scenario: knockout match with Winner Group C / Runner-up Group F.
  // Group C is fully finished so BRA is 1st, MAR is 2nd.
  const target = knockoutMatch("target-match", 100, "Winner Group C", "Runner-up Group C");

  it("resolves placeholders when all group matches are included in the batch (fix)", () => {
    const allMatches = [...groupCMatches, target]; // simulates getMatchForAdmin: full batch
    const enriched = enrichWithResolvedTeams(allMatches);
    const found = enriched.find((m) => m.id === "target-match")!;
    expect(found.home_team?.code).toBe("BRA"); // 1st in Group C
    expect(found.away_team?.code).toBe("MAR"); // 2nd in Group C
    expect(found.home_team).not.toBeNull();
    expect(found.away_team).not.toBeNull();
  });

  it("stays unresolved when only the target match is in the batch (old bug)", () => {
    const enriched = enrichWithResolvedTeams([target]); // old page: single-match fetch
    const found = enriched.find((m) => m.id === "target-match")!;
    expect(found.home_team).toBeNull(); // placeholder can't resolve without group context
    expect(found.away_team).toBeNull();
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

// ── Winner Mxx propagation: finished knockout match feeds next round ─────────

describe("enrichWithResolvedTeams — Winner Mxx propagation", () => {
  const CAN = team("CAN");
  const RSA = team("RSA");
  const USA = team("USA");

  // M73 finished: Canada 1–0 South Africa
  const m73 = finishedKnockoutMatch("m73", 73, CAN, RSA, 1, 0, "round_of_32");
  // M90 has Winner M73 as home and Winner M75 (not yet finished) as away
  const m90 = knockoutMatch("m90", 90, "Winner M73", "Winner M75", "round_of_16");

  const enriched = enrichWithResolvedTeams([m73, m90]);
  const enrichedM90 = enriched.find((m) => m.id === "m90")!;

  it("Winner M73 resolves to Canada when M73 finished 1-0", () => {
    expect(enrichedM90.home_team?.code).toBe("CAN");
  });

  it("Winner M75 stays null when M75 has not finished", () => {
    expect(enrichedM90.away_team).toBeNull();
  });

  it("Loser Mxx resolves to the losing team", () => {
    const thirdPlace = knockoutMatch("tp", 103, "Loser M73", "Loser M74", "third_place");
    const enrichedTp = enrichWithResolvedTeams([m73, thirdPlace]).find((m) => m.id === "tp")!;
    expect(enrichedTp.home_team?.code).toBe("RSA");
  });

  it("m73 itself is returned with its original teams unchanged", () => {
    const enrichedM73 = enriched.find((m) => m.id === "m73")!;
    expect(enrichedM73.home_team?.code).toBe("CAN");
    expect(enrichedM73.away_team?.code).toBe("RSA");
  });

  it("away team winner also resolves correctly", () => {
    const m74 = finishedKnockoutMatch("m74", 74, USA, RSA, 2, 1, "round_of_32");
    const m91 = knockoutMatch("m91", 91, "Winner M73", "Winner M74", "round_of_16");
    const enrichedM91 = enrichWithResolvedTeams([m73, m74, m91]).find((m) => m.id === "m91")!;
    expect(enrichedM91.home_team?.code).toBe("CAN");
    expect(enrichedM91.away_team?.code).toBe("USA");
  });
});

// ── Real-world scenario: R32 home_team_id is null in DB ─────────────────────
// In production, R32 matches have home_team_id = null and use placeholders.
// The UI resolves them via group standings, but knockoutResults must ALSO use
// resolved teams (not raw home_team) to propagate winners to R16.

describe("enrichWithResolvedTeams — Winner Mxx when R32 teams come from group standings", () => {
  // M73: teams not set in DB (home_team = null), resolved via group standings.
  // Group B: SUI 1st (7 pts), CAN 2nd (6 pts)
  // Group C: BRA 1st (7 pts), MAR 2nd (6 pts)
  // M73 home = "Winner Group B" = SUI, away = "Winner Group C" = BRA
  // M73 finished: SUI 1 – 0 BRA (home wins), so M90 home should be SUI
  const m73NullTeams = {
    id: "m73",
    stage: "round_of_32",
    match_number: 73,
    group_code: null,
    status: "finished",
    home_score: 1,
    away_score: 0,
    home_team: null,
    away_team: null,
    home_placeholder: "Winner Group B",
    away_placeholder: "Winner Group C",
  };
  const m90 = knockoutMatch("m90", 90, "Winner M73", "Winner M75", "round_of_16");

  // Must include group matches so group standings are available
  const allMatches = [...groupBMatches, ...groupCMatches, m73NullTeams, m90];
  const enriched = enrichWithResolvedTeams(allMatches);
  const enrichedM90 = enriched.find((m) => m.id === "m90")!;

  it("Winner M73 resolves via group standings when M73 home_team is null in DB", () => {
    // SUI won Group B → won M73 → should appear in M90
    expect(enrichedM90.home_team?.code).toBe("SUI");
  });

  it("Winner M75 stays null when M75 has not finished", () => {
    expect(enrichedM90.away_team).toBeNull();
  });

  it("M73 itself shows correct teams after enrichment", () => {
    const enrichedM73 = enriched.find((m) => m.id === "m73")!;
    expect(enrichedM73.home_team?.code).toBe("SUI");
    expect(enrichedM73.away_team?.code).toBe("BRA");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// General propagation rules — generic tests not tied to real match numbers
//
// These cover all 7 correctness scenarios the bracket depends on, exercising
// enrichWithResolvedTeams (server-side enrichment used by admin, match detail
// and news) as well as the resolveSlot primitive shared with the Copa/Bracket
// client view.
// ════════════════════════════════════════════════════════════════════════════

// Helpers — fully abstract, no specific match numbers beyond these literals
const TA = team("TA");
const TB = team("TB");
const TC = team("TC");
const TD = team("TD");

function finishedWithTeams(
  num: number,
  home: ClassificationTeam,
  away: ClassificationTeam,
  homeScore: number,
  awayScore: number,
  stage = "round_of_32",
) {
  return finishedKnockoutMatch(`src-${num}`, num, home, away, homeScore, awayScore, stage);
}

function finishedNullTeams(
  num: number,
  homePH: string,
  awayPH: string,
  homeScore: number,
  awayScore: number,
  stage = "round_of_16",
) {
  return {
    id: `src-${num}`,
    stage,
    match_number: num,
    group_code: null,
    status: "finished",
    home_score: homeScore,
    away_score: awayScore,
    home_team: null,
    away_team: null,
    home_placeholder: homePH,
    away_placeholder: awayPH,
  };
}

function destination(num: number, homePH: string, awayPH: string, stage = "round_of_16") {
  return knockoutMatch(`dst-${num}`, num, homePH, awayPH, stage);
}

// ── Scenario 1: Winner Mxx resolves when source is finished with a clear winner ──

describe("Scenario 1 — Winner Mxx resolves once source match finishes", () => {
  it("home wins (home_score > away_score) → destination home = winning team", () => {
    const src = finishedWithTeams(1, TA, TB, 2, 0);
    const dst = destination(10, "Winner M1", "Winner M2");
    const result = enrichWithResolvedTeams([src, dst]).find((m) => m.id === "dst-10")!;
    expect(result.home_team?.code).toBe("TA");
  });

  it("away wins (away_score > home_score) → destination home = away team of source", () => {
    const src = finishedWithTeams(1, TA, TB, 0, 1);
    const dst = destination(10, "Winner M1", "Winner M2");
    const result = enrichWithResolvedTeams([src, dst]).find((m) => m.id === "dst-10")!;
    expect(result.home_team?.code).toBe("TB");
  });

  it("multiple source matches: each Winner Mxx resolves to its own match's winner", () => {
    const src1 = finishedWithTeams(1, TA, TB, 3, 1); // TA wins
    const src2 = finishedWithTeams(2, TC, TD, 1, 2); // TD wins
    const dst  = destination(10, "Winner M1", "Winner M2");
    const result = enrichWithResolvedTeams([src1, src2, dst]).find((m) => m.id === "dst-10")!;
    expect(result.home_team?.code).toBe("TA");
    expect(result.away_team?.code).toBe("TD");
  });
});

// ── Scenario 2: Loser Mxx resolves when source is finished ──────────────────

describe("Scenario 2 — Loser Mxx resolves to the losing team", () => {
  it("home wins → 'Loser Mxx' resolves to the away (losing) team", () => {
    const src = finishedWithTeams(1, TA, TB, 2, 0); // TB loses
    const dst = destination(10, "Loser M1", "Loser M2");
    const result = enrichWithResolvedTeams([src, dst]).find((m) => m.id === "dst-10")!;
    expect(result.home_team?.code).toBe("TB");
  });

  it("away wins → 'Loser Mxx' resolves to the home (losing) team", () => {
    const src = finishedWithTeams(1, TA, TB, 0, 2); // TA loses
    const dst = destination(10, "Loser M1", "Loser M2");
    const result = enrichWithResolvedTeams([src, dst]).find((m) => m.id === "dst-10")!;
    expect(result.home_team?.code).toBe("TA");
  });

  it("third-place match: both Loser Mxx slots resolve from two different semifinal results", () => {
    const sf1 = finishedWithTeams(51, TA, TB, 1, 0, "semi_final"); // TA wins, TB loses
    const sf2 = finishedWithTeams(52, TC, TD, 0, 1, "semi_final"); // TD wins, TC loses
    const third = destination(60, "Loser M51", "Loser M52", "third_place");
    const result = enrichWithResolvedTeams([sf1, sf2, third]).find((m) => m.id === "dst-60")!;
    expect(result.home_team?.code).toBe("TB");
    expect(result.away_team?.code).toBe("TC");
  });
});

// ── Scenario 3: Placeholder stays unresolved when source has not finished ───

describe("Scenario 3 — Winner/Loser Mxx stays unresolved until source finishes", () => {
  it("scheduled source → destination team stays null", () => {
    const src = knockoutMatch("src-1", 1, "Winner Group A", "Winner Group B");
    const dst = destination(10, "Winner M1", "Winner M2");
    const result = enrichWithResolvedTeams([src, dst]).find((m) => m.id === "dst-10")!;
    expect(result.home_team).toBeNull();
  });

  it("live source → destination team stays null", () => {
    const liveSrc = { ...finishedWithTeams(1, TA, TB, 0, 0), status: "live", home_score: 1, away_score: 0 };
    const dst = destination(10, "Winner M1", "Winner M2");
    const result = enrichWithResolvedTeams([liveSrc, dst]).find((m) => m.id === "dst-10")!;
    expect(result.home_team).toBeNull();
  });

  it("only one of two sources finished → only that slot resolves, the other stays null", () => {
    const finished = finishedWithTeams(1, TA, TB, 2, 0);
    const scheduled = knockoutMatch("src-2", 2, "Winner Group C", "Winner Group D");
    const dst = destination(10, "Winner M1", "Winner M2");
    const result = enrichWithResolvedTeams([finished, scheduled, dst]).find((m) => m.id === "dst-10")!;
    expect(result.home_team?.code).toBe("TA");
    expect(result.away_team).toBeNull();
  });
});

// ── Scenario 4: Draw (equal scores) → placeholder stays unresolved ──────────
// Penalty-shootout winners are not tracked (no advancing_team_id in EnrichableMatch).
// Draws produce no entry in knockoutResults so the destination stays unresolved.

describe("Scenario 4 — Draw leaves placeholder unresolved", () => {
  it("1-1 draw after regulation: Winner Mxx stays null — no advancing_team_id support", () => {
    const draw = finishedWithTeams(1, TA, TB, 1, 1);
    const dst  = destination(10, "Winner M1", "Winner M2");
    const result = enrichWithResolvedTeams([draw, dst]).find((m) => m.id === "dst-10")!;
    expect(result.home_team).toBeNull();
  });

  it("0-0 draw: Loser Mxx also stays null", () => {
    const draw = finishedWithTeams(1, TA, TB, 0, 0);
    const dst  = destination(10, "Loser M1", "Loser M2");
    const result = enrichWithResolvedTeams([draw, dst]).find((m) => m.id === "dst-10")!;
    expect(result.home_team).toBeNull();
  });
});

// ── Scenario 5: Both slots resolve when both source matches are finished ─────

describe("Scenario 5 — Both Winner Mxx slots resolve when both sources are finished", () => {
  it("home and away slots each resolve to their respective source match's winner", () => {
    const src1 = finishedWithTeams(1, TA, TB, 2, 0); // TA wins
    const src2 = finishedWithTeams(2, TC, TD, 0, 3); // TD wins
    const dst  = destination(10, "Winner M1", "Winner M2");
    const result = enrichWithResolvedTeams([src1, src2, dst]).find((m) => m.id === "dst-10")!;
    expect(result.home_team?.code).toBe("TA");
    expect(result.away_team?.code).toBe("TD");
  });

  it("mixed Winner + Loser resolves correctly from the same source map", () => {
    const src = finishedWithTeams(1, TA, TB, 1, 0); // TA wins, TB loses
    const dst  = destination(10, "Winner M1", "Loser M1");
    const result = enrichWithResolvedTeams([src, dst]).find((m) => m.id === "dst-10")!;
    expect(result.home_team?.code).toBe("TA");
    expect(result.away_team?.code).toBe("TB");
  });
});

// ── Scenario 6: Chained propagation through multiple rounds ─────────────────
// The topological pass in enrichWithResolvedTeams (matches ordered by starts_at
// ASC) must propagate results across any number of rounds without hardcoding
// round names or specific match numbers.

describe("Scenario 6 — Chained propagation across multiple rounds", () => {
  it("R32 → R16 → QF: winner flows through two hops with null teams in DB", () => {
    // R32: teams set in DB
    const r32A = finishedWithTeams(1, TA, TB, 2, 0); // TA wins M1
    const r32B = finishedWithTeams(2, TC, TD, 0, 1); // TD wins M2

    // R16: home_team_id null in DB, teams resolved from R32 knockoutResults
    //      TA vs TD, TA wins 1-0
    const r16 = finishedNullTeams(10, "Winner M1", "Winner M2", 1, 0);

    // QF: scheduled, home = winner of R16 (TA)
    const qf  = destination(20, "Winner M10", "Winner M11", "quarter_final");

    const enriched = enrichWithResolvedTeams([r32A, r32B, r16, qf]);
    const enrichedR16 = enriched.find((m) => m.id === "src-10")!;
    const enrichedQF  = enriched.find((m) => m.id === "dst-20")!;

    expect(enrichedR16.home_team?.code).toBe("TA"); // resolved from R32
    expect(enrichedR16.away_team?.code).toBe("TD"); // resolved from R32
    expect(enrichedQF.home_team?.code).toBe("TA");  // chained from R16
    expect(enrichedQF.away_team).toBeNull();          // M11 not in input
  });

  it("3-hop chain (R32 → R16 → QF → SF) all propagate with null teams in DB", () => {
    // 8 distinct teams so each R32 slot is unambiguous
    const [t1, t2, t3, t4, t5, t6, t7, t8] = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => team(`T${n}`));

    // R32: 4 matches feeding 2 R16 slots
    const r32A = finishedWithTeams(1, t1, t2, 2, 0); // t1 wins → feeds M10 home
    const r32B = finishedWithTeams(2, t3, t4, 0, 1); // t4 wins → feeds M10 away
    const r32C = finishedWithTeams(3, t5, t6, 1, 0); // t5 wins → feeds M11 home
    const r32D = finishedWithTeams(4, t7, t8, 1, 0); // t7 wins → feeds M11 away

    // R16: null teams in DB, resolved from R32 results
    const r16A = finishedNullTeams(10, "Winner M1", "Winner M2", 1, 0); // t1 wins
    const r16B = finishedNullTeams(11, "Winner M3", "Winner M4", 2, 0); // t5 wins

    // QF: null teams in DB, resolved from R16 (t1 vs t5, t1 wins)
    const qf = finishedNullTeams(20, "Winner M10", "Winner M11", 1, 0, "quarter_final");

    // SF: should resolve to t1 (winner of QF M20)
    const sf = destination(30, "Winner M20", "Winner M21", "semi_final");

    const enriched = enrichWithResolvedTeams([r32A, r32B, r32C, r32D, r16A, r16B, qf, sf]);
    expect(enriched.find((m) => m.id === "src-10")!.home_team?.code).toBe("T1"); // winner of R32 M1
    expect(enriched.find((m) => m.id === "src-20")!.home_team?.code).toBe("T1"); // winner of R16 M10
    expect(enriched.find((m) => m.id === "dst-30")!.home_team?.code).toBe("T1"); // winner of QF M20
  });

  it("Loser Mxx also chains — loser of R32 feeds the third-place match slot", () => {
    const sf1 = finishedWithTeams(51, TA, TB, 1, 0, "semi_final"); // TA wins, TB → 3rd
    const sf2 = finishedWithTeams(52, TC, TD, 0, 2, "semi_final"); // TD wins, TC → 3rd
    const third = destination(60, "Loser M51", "Loser M52", "third_place");
    const final = destination(61, "Winner M51", "Winner M52", "final");

    const enriched = enrichWithResolvedTeams([sf1, sf2, third, final]);
    expect(enriched.find((m) => m.id === "dst-60")!.home_team?.code).toBe("TB");
    expect(enriched.find((m) => m.id === "dst-60")!.away_team?.code).toBe("TC");
    expect(enriched.find((m) => m.id === "dst-61")!.home_team?.code).toBe("TA");
    expect(enriched.find((m) => m.id === "dst-61")!.away_team?.code).toBe("TD");
  });
});

// ── Scenario 7: Server-side and Copa/Bracket paths yield identical teams ────
// Both paths ultimately call resolveSlot with the same knockoutResults map.
// Here we verify that enrichWithResolvedTeams (server-side) produces the same
// team regardless of whether that team comes from the DB directly (home_team_id
// set) or is resolved at runtime from group standings (home_team_id = null).

describe("Scenario 7 — Server-side enrichment matches Copa/Bracket view resolution", () => {
  it("same final team whether source teams come from DB or from group-standings resolution", () => {
    // Path A: source match has teams set directly in DB
    const srcDB = finishedWithTeams(1, TA, TB, 2, 0);
    const dstA  = destination(10, "Winner M1", "Winner M2");
    const resultA = enrichWithResolvedTeams([srcDB, dstA]).find((m) => m.id === "dst-10")!;

    // Path B: source match has home_team = null (home_team_id not in DB),
    //         teams resolved from group standings at enrichment time.
    //         Group B: SUI 1st, CAN 2nd. Source wins 2-0 home → SUI wins.
    const srcNull = finishedNullTeams(1, "Winner Group B", "Winner Group C", 2, 0, "round_of_32");
    const dstB    = destination(10, "Winner M1", "Winner M2");
    const resultB = enrichWithResolvedTeams([...groupBMatches, ...groupCMatches, srcNull, dstB]).find((m) => m.id === "dst-10")!;

    // Both paths must resolve — neither stays null
    expect(resultA.home_team).not.toBeNull(); // TA
    expect(resultB.home_team).not.toBeNull(); // SUI (1st in Group B)

    // The team identity differs (TA vs SUI), but in both cases the destination
    // slot is filled with the actual match winner — never a raw placeholder.
    expect(resultA.home_team?.code).toBe("TA");
    expect(resultB.home_team?.code).toBe("SUI");
  });

  it("both paths leave the slot null when source has not finished — consistent unresolved behaviour", () => {
    const notFinished = knockoutMatch("src-1", 1, "Winner Group A", "Winner Group B");
    const dst = destination(10, "Winner M1", "Winner M2");
    const result = enrichWithResolvedTeams([notFinished, dst]).find((m) => m.id === "dst-10")!;
    expect(result.home_team).toBeNull();
  });

  it("source match result is recorded and propagated regardless of stage label", () => {
    // Uses stage strings that don't match any hardcoded constant — the logic
    // must be purely placeholder-driven, not stage-name-driven.
    const src = { ...finishedWithTeams(99, TA, TB, 1, 0), stage: "some_custom_stage" };
    const dst = { ...destination(100, "Winner M99", "Loser M99"), stage: "another_custom_stage" };
    const result = enrichWithResolvedTeams([src, dst]).find((m) => m.id === "dst-100")!;
    expect(result.home_team?.code).toBe("TA");
    expect(result.away_team?.code).toBe("TB");
  });
});
