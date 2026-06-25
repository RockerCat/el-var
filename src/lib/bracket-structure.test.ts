import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// ── Regression guard for the knockout bracket topology ────────────────────
//
// supabase/migrations/035_knockout_fixtures.sql is the single source of
// truth for which match feeds which (Winner M##/Loser M## placeholders)
// and which stage each match belongs to. This file does NOT duplicate that
// data as a second hand-maintained source — it parses the migration
// itself and checks it against the official FIFA World Cup 26 bracket
// (regulations Annex + the published match schedule), so any future edit
// to the migration that breaks the official topology fails a test instead
// of silently shipping.
//
// Official reference, cross-checked against:
//   https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf
//   https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage

type Row = { n: number; stage: string; home: string; away: string };

function parseMigration(): Row[] {
  const file = path.join(process.cwd(), "supabase/migrations/035_knockout_fixtures.sql");
  const content = readFileSync(file, "utf8");
  const re = /\(\s*(\d+),\s*NULL,\s*NULL,\s*'[^']+',\s*'(\w+)',\s*'scheduled',(?:\s*--[^\n]*)?\s*\n\s*'([^']+)',\s*'([^']+)',/g;
  const rows: Row[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    rows.push({ n: Number(m[1]), stage: m[2], home: m[3], away: m[4] });
  }
  return rows;
}

const OFFICIAL_R32: Record<number, [string, string]> = {
  73: ["Runner-up Group A", "Runner-up Group B"],
  74: ["Winner Group E", "Best 3rd (A/B/C/D/F)"],
  75: ["Winner Group F", "Runner-up Group C"],
  76: ["Winner Group C", "Runner-up Group F"],
  77: ["Winner Group I", "Best 3rd (C/D/F/G/H)"],
  78: ["Runner-up Group E", "Runner-up Group I"],
  79: ["Winner Group A", "Best 3rd (C/E/F/H/I)"],
  80: ["Winner Group L", "Best 3rd (E/H/I/J/K)"],
  81: ["Winner Group D", "Best 3rd (B/E/F/I/J)"],
  82: ["Winner Group G", "Best 3rd (A/E/H/I/J)"],
  83: ["Runner-up Group K", "Runner-up Group L"],
  84: ["Winner Group H", "Runner-up Group J"],
  85: ["Winner Group B", "Best 3rd (E/F/G/I/J)"],
  86: ["Winner Group J", "Runner-up Group H"],
  87: ["Winner Group K", "Best 3rd (D/E/I/J/L)"],
  88: ["Runner-up Group D", "Runner-up Group G"],
};

// Which round-of-32 match number(s) each side's "Winner M##" / "Loser M##"
// placeholder points back to, for every later round.
const OFFICIAL_FEEDS: Record<number, [string, string]> = {
  89:  ["Winner M74", "Winner M77"],
  90:  ["Winner M73", "Winner M75"],
  91:  ["Winner M76", "Winner M78"],
  92:  ["Winner M79", "Winner M80"],
  93:  ["Winner M83", "Winner M84"],
  94:  ["Winner M81", "Winner M82"],
  95:  ["Winner M86", "Winner M88"],
  96:  ["Winner M85", "Winner M87"],
  97:  ["Winner M89", "Winner M90"],
  98:  ["Winner M93", "Winner M94"],
  99:  ["Winner M91", "Winner M92"],
  100: ["Winner M95", "Winner M96"],
  101: ["Winner M97", "Winner M98"],
  102: ["Winner M99", "Winner M100"],
  103: ["Loser M101", "Loser M102"],
  104: ["Winner M101", "Winner M102"],
};

const OFFICIAL_STAGE_BY_MATCH: Record<number, string> = (() => {
  const map: Record<number, string> = {};
  for (let n = 73; n <= 88; n++) map[n] = "round_of_32";
  for (let n = 89; n <= 96; n++) map[n] = "round_of_16";
  for (let n = 97; n <= 100; n++) map[n] = "quarter_final";
  map[101] = "semi_final";
  map[102] = "semi_final";
  map[103] = "third_place";
  map[104] = "final";
  return map;
})();

describe("Knockout bracket topology vs official FIFA fixture", () => {
  const rows = parseMigration();
  const byNumber = new Map(rows.map((r) => [r.n, r]));

  it("parses exactly the 32 expected knockout matches (M73–M104)", () => {
    expect(rows.length).toBe(32);
    expect([...byNumber.keys()].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 32 }, (_, i) => 73 + i)
    );
  });

  it("every match is tagged with the correct stage (M73–88 R32, M89–96 R16, M97–100 QF, M101–102 SF, M103 3rd, M104 Final)", () => {
    for (const [n, stage] of Object.entries(OFFICIAL_STAGE_BY_MATCH)) {
      expect(byNumber.get(Number(n))?.stage).toBe(stage);
    }
  });

  it("M73–M88 (round of 32) match the official group/best-third assignment", () => {
    for (const [n, [home, away]] of Object.entries(OFFICIAL_R32)) {
      const row = byNumber.get(Number(n))!;
      expect([row.home, row.away]).toEqual([home, away]);
    }
  });

  it("M89–M104 each feed from the correct pair of earlier matches", () => {
    for (const [n, [home, away]] of Object.entries(OFFICIAL_FEEDS)) {
      const row = byNumber.get(Number(n))!;
      expect([row.home, row.away]).toEqual([home, away]);
    }
  });

  it("M73 and M75 both feed M90 specifically (named example)", () => {
    const m90 = byNumber.get(90)!;
    expect(m90.home).toBe("Winner M73");
    expect(m90.away).toBe("Winner M75");
  });
});

describe("Phase labels shown to users (ClassificationTabs TABS)", () => {
  function parseTabs(): Record<string, string> {
    const file = path.join(process.cwd(), "src/components/admin/ClassificationTabs.tsx");
    const content = readFileSync(file, "utf8");
    const re = /\{\s*id:\s*"(\w+)",\s*label:\s*"([^"]+)"/g;
    const tabs: Record<string, string> = {};
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) tabs[m[1]] = m[2];
    return tabs;
  }

  it("labels round_of_32/round_of_16/quarter_final/semi_final/final with the correct Spanish phase names", () => {
    const tabs = parseTabs();
    expect(tabs.r32).toBe("Dieciseisavos");
    expect(tabs.r16).toBe("Octavos");
    expect(tabs.qf).toBe("Cuartos");
    expect(tabs.sf).toBe("Semifinales");
    expect(tabs.final).toBe("Final");
  });

  it("M89–M96 (round_of_16) are labeled 'Octavos' in the UI", () => {
    const rows = parseMigration();
    const r16Numbers = rows.filter((r) => r.stage === "round_of_16").map((r) => r.n).sort((a, b) => a - b);
    expect(r16Numbers).toEqual([89, 90, 91, 92, 93, 94, 95, 96]);
    expect(parseTabs().r16).toBe("Octavos");
  });
});
