import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// ── Public types ──────────────────────────────────────────────────────

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  content: string;
  related_match_id: string | null;
  created_at: string;
};

// ── Public queries ────────────────────────────────────────────────────

export async function getNewsList(): Promise<NewsItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news")
    .select("id, title, summary, related_match_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[news] getNewsList:", error.message);
    return [];
  }
  return (data ?? []) as NewsItem[];
}

export async function getNewsDetail(newsId: string): Promise<NewsItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("id", newsId)
    .maybeSingle();

  if (error) {
    console.error("[news] getNewsDetail:", error.message);
    return null;
  }
  return data as NewsItem | null;
}

// ── Internal types ────────────────────────────────────────────────────

type LbRow = {
  user_id:      string;
  display_name: string;
  total_points: number;
  exact_count:  number;
  result_count: number;
  rank:         number;
};

type PredRow = {
  user_id:       string;
  display_name:  string;
  points:        number;
  points_reason: string | null;
};

type Rankable = {
  user_id:      string;
  display_name: string;
  total_points: number;
  exact_count:  number;
  result_count: number;
};

type Ranked = Rankable & { rank: number };

type Movement = {
  user_id:      string;
  display_name: string;
  rank_before:  number;
  rank_after:   number;
  /** positive = moved up (rank number decreased), negative = moved down */
  change:       number;
};

// ── Rank computation (mirrors SQL RANK() with same tie-breaker) ───────

function assignRanks(players: Rankable[]): Ranked[] {
  const sorted = [...players].sort(
    (a, b) =>
      b.total_points - a.total_points ||
      b.exact_count  - a.exact_count  ||
      b.result_count - a.result_count
  );

  let currentRank = 1;
  return sorted.map((p, i) => {
    if (i > 0) {
      const prev = sorted[i - 1];
      const sameTier =
        p.total_points === prev.total_points &&
        p.exact_count  === prev.exact_count  &&
        p.result_count === prev.result_count;
      if (!sameTier) currentRank = i + 1;
    }
    return { ...p, rank: currentRank };
  });
}

// ── Stage → exact-score points ────────────────────────────────────────

const STAGE_EXACT: Record<string, number> = {
  group:         3,
  round_of_32:   4,
  round_of_16:   5,
  quarter_final: 6,
  semi_final:    7,
  third_place:   7,
  final:         8,
};

// ── Narrative block functions ─────────────────────────────────────────
// Each returns a string or null. null = omit block.
// To add a new block: write a new function and insert it into the
// blocks array inside buildRichNews().

function blockResult(
  homeFlag: string, homeName: string, homeScore: number,
  awayFlag: string, awayName: string, awayScore: number,
): string {
  const h = homeFlag ? `${homeFlag} ` : "";
  const a = awayFlag ? `${awayFlag} ` : "";
  if (homeScore > awayScore) return `⚽ ${h}${homeName} venció a ${a}${awayName} ${homeScore}-${awayScore}.`;
  if (awayScore > homeScore) return `⚽ ${a}${awayName} venció a ${h}${homeName} ${awayScore}-${homeScore}.`;
  return `⚽ ${h}${homeName} y ${a}${awayName} empataron ${homeScore}-${awayScore}.`;
}

function blockLeader(
  after:        LbRow[],
  before:       Ranked[],
  allZeroBefore: boolean,
): string {
  const leaders = after.filter((p) => p.rank === 1);
  if (leaders.length === 0) return "";

  const pts     = leaders[0].total_points;
  const prevIds = new Set(before.filter((p) => p.rank === 1).map((p) => p.user_id));

  const joined = (arr: LbRow[]) =>
    arr.length === 1 ? arr[0].display_name
    : arr.length === 2 ? `${arr[0].display_name} y ${arr[1].display_name}`
    : `${arr.slice(0, -1).map((l) => l.display_name).join(", ")} y ${arr[arr.length - 1].display_name}`;

  const isNewSoleLeader =
    leaders.length === 1 && (allZeroBefore || !prevIds.has(leaders[0].user_id));

  if (isNewSoleLeader) {
    return `🏆 Nuevo líder: ${leaders[0].display_name} sube al primer puesto con ${pts} pts.`;
  }

  if (leaders.length === 1) {
    return `🏆 ${leaders[0].display_name} mantiene el liderato con ${pts} pts.`;
  }

  // Tie at the top
  const prevLeaderCount = before.filter((p) => p.rank === 1).length;
  const wasAlreadyTied  = prevLeaderCount === leaders.length &&
    leaders.every((l) => prevIds.has(l.user_id));

  if (wasAlreadyTied) {
    return `🏆 ${joined(leaders)} siguen al frente con ${pts} pts.`;
  }
  return `🏆 ${joined(leaders)} comparten el liderato con ${pts} pts.`;
}

function blockMovements(
  movements:     Movement[],
  allZeroBefore: boolean,
): string | null {
  // No meaningful ranking existed before the first match
  if (allZeroBefore) return null;

  // Notable upward moves: ≥2 positions, or entering Top 3 for the first time
  const ups = movements
    .filter((m) => m.change >= 2 || (m.change >= 1 && m.rank_after <= 3 && m.rank_before > 3))
    .sort((a, b) => b.change - a.change)
    .slice(0, 2);

  // Notable downward moves: fell ≥3 positions
  const downs = movements
    .filter((m) => m.change <= -3)
    .sort((a, b) => a.change - b.change)
    .slice(0, 1);

  const notable = [...ups, ...downs];
  if (notable.length === 0) return null;

  return notable
    .map((m) => {
      if (m.change > 0) {
        const n = m.change;
        return `📈 ${m.display_name} sube ${n} puesto${n > 1 ? "s" : ""} al ${m.rank_after}°.`;
      }
      const n = Math.abs(m.change);
      return `📉 ${m.display_name} cae ${n} puesto${n > 1 ? "s" : ""} al ${m.rank_after}°.`;
    })
    .join("\n");
}

function blockExactos(preds: PredRow[], exactPoints: number): string {
  const exactos = preds.filter((p) => p.points_reason === "Marcador exacto");

  if (exactos.length === 0) return "🎯 Nadie acertó el marcador exacto.";

  const names = exactos.map((p) => p.display_name);
  if (names.length === 1) return `🎯 ${names[0]} acertó el marcador exacto (+${exactPoints} pts).`;
  if (names.length <= 3) {
    const joined = names.slice(0, -1).join(", ") + " y " + names[names.length - 1];
    return `🎯 ${joined} acertaron el marcador exacto (+${exactPoints} pts).`;
  }
  return `🎯 ${names.length} participantes acertaron el marcador exacto (+${exactPoints} pts).`;
}

function blockParticipants(preds: PredRow[]): string | null {
  if (preds.length === 0) return null;
  const scorers = preds.filter((p) => p.points > 0).length;

  if (scorers === 0)          return "⚡ Nadie sumó puntos en este partido.";
  if (scorers === preds.length) return "⚡ Todos los participantes sumaron puntos.";
  return `⚡ ${scorers} de ${preds.length} participantes sumaron puntos.`;
}

function blockPrizeZone(
  movements:     Movement[],
  after:         LbRow[],
  before:        Ranked[],
  allZeroBefore: boolean,
): string | null {
  if (allZeroBefore) return null;

  const rank1After  = after.filter((p) => p.rank === 1);
  const rank1Before = before.filter((p) => p.rank === 1);

  // New tie at 1st → shared prize
  if (
    rank1After.length > 1 &&
    rank1Before.length !== rank1After.length
  ) {
    const joined =
      rank1After.length === 2
        ? `${rank1After[0].display_name} y ${rank1After[1].display_name}`
        : `${rank1After.length} participantes`;
    return `💰 ${joined} comparten el 1er lugar y dividen el primer premio.`;
  }

  // Someone entered prize zone (top 2) from outside
  const entries = movements.filter((m) => m.rank_before > 2 && m.rank_after <= 2);
  if (entries.length === 1) {
    return `💰 ${entries[0].display_name} entra a zona de premios (puesto ${entries[0].rank_after}°).`;
  }
  if (entries.length > 1) {
    const joined = entries.map((e) => e.display_name).join(" y ");
    return `💰 ${joined} entran a zona de premios.`;
  }

  return null;
}

// ── Summary (single sentence, push-notification–ready) ───────────────

function buildSummary(
  after:         LbRow[],
  before:        Ranked[],
  preds:         PredRow[],
  movements:     Movement[],
  allZeroBefore: boolean,
): string {
  const leaders    = after.filter((p) => p.rank === 1);
  const prevIds    = new Set(before.filter((p) => p.rank === 1).map((p) => p.user_id));
  const leaderName = leaders[0]?.display_name ?? "";
  const scorers    = preds.filter((p) => p.points > 0).length;
  const exactos    = preds.filter((p) => p.points_reason === "Marcador exacto");

  // 1. New sole leader
  const isNewSoleLeader =
    leaders.length === 1 && (allZeroBefore || !prevIds.has(leaders[0].user_id));
  if (isNewSoleLeader) {
    return `${leaderName} es el nuevo líder con ${leaders[0].total_points} pts.`;
  }

  // 2. New tie at the top
  const prevLeaderCount = before.filter((p) => p.rank === 1).length;
  const nowTied         = leaders.length > 1;
  const tieIsNew        = nowTied && prevLeaderCount !== leaders.length && !allZeroBefore;
  if (tieIsNew) {
    const names = leaders.slice(0, 2).map((l) => l.display_name).join(" y ");
    return `Empate en la cima: ${names} con ${leaders[0]?.total_points ?? 0} pts.`;
  }

  // 3. Nobody scored
  if (scorers === 0 && preds.length > 0) {
    return "Nadie sumó puntos en este partido.";
  }

  // 4. Sole exacto (most notable individual achievement)
  if (exactos.length === 1) {
    return `${exactos[0].display_name} acertó el marcador exacto y ${leaderName} mantiene el liderato.`;
  }

  // 5. Big position jump
  const bigUp = movements
    .filter((m) => m.change >= 3 && !allZeroBefore)
    .sort((a, b) => b.change - a.change)[0];
  if (bigUp) {
    return `${bigUp.display_name} sube ${bigUp.change} posiciones y ${leaderName} mantiene el liderato.`;
  }

  // 6. Stable situation
  const scorerText =
    scorers === preds.length && preds.length > 0
      ? "todos sumaron puntos"
      : `${scorers} de ${preds.length} sumaron puntos`;
  return `${leaderName} mantiene el liderato, ${scorerText}.`;
}

// ── Rich news builder (can throw — caller provides fallback) ──────────

async function buildRichNews(
  supabase:    SupabaseClient,
  matchId:     string,
  homeScore:   number,
  awayScore:   number,
  homeName:    string,
  awayName:    string,
  homeFlag:    string,
  awayFlag:    string,
  exactPoints: number,
): Promise<{ summary: string; content: string }> {
  // ── 1. Find community group ─────────────────────────────────────────
  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (!group) throw new Error("no_group");

  // ── 2. Current leaderboard (after scoring) ──────────────────────────
  const { data: lbRaw, error: lbErr } = await supabase.rpc("get_group_leaderboard", {
    p_group_id: group.id,
  });
  if (lbErr || !lbRaw) throw new Error("no_leaderboard");

  const leaderboard: LbRow[] = (lbRaw as Record<string, unknown>[]).map((r) => ({
    user_id:      String(r.user_id),
    display_name: String(r.display_name),
    total_points: Number(r.total_points),
    exact_count:  Number(r.exact_count),
    result_count: Number(r.result_count),
    rank:         Number(r.rank),
  }));

  // ── 3. This match's predictions (with display names, admin-only RPC) ─
  const { data: predsRaw } = await supabase.rpc("get_match_predictions", {
    p_match_id: matchId,
  });

  // Filter to group members only (exclude admin self-predictions if any)
  const memberIds = new Set(leaderboard.map((l) => l.user_id));
  const preds: PredRow[] = ((predsRaw ?? []) as Record<string, unknown>[])
    .filter((p) => memberIds.has(String(p.user_id)))
    .map((p) => ({
      user_id:       String(p.user_id),
      display_name:  String(p.display_name),
      points:        Number(p.points ?? 0),
      points_reason: (p.points_reason as string | null) ?? null,
    }));

  // ── 4. Reconstruct "before" state ───────────────────────────────────
  // Subtract this match's contribution from each player's current totals.
  const predMap = new Map(preds.map((p) => [p.user_id, p]));

  const beforePlayers: Rankable[] = leaderboard.map((l) => {
    const pred     = predMap.get(l.user_id);
    const matchPts = pred?.points ?? 0;
    const wasExact  = pred?.points_reason === "Marcador exacto";
    const wasResult = pred?.points_reason === "Resultado acertado";
    return {
      user_id:      l.user_id,
      display_name: l.display_name,
      total_points: l.total_points - matchPts,
      exact_count:  l.exact_count  - (wasExact  ? 1 : 0),
      result_count: l.result_count - (wasResult ? 1 : 0),
    };
  });

  const allZeroBefore = beforePlayers.every((p) => p.total_points <= 0);
  const before        = assignRanks(beforePlayers);
  const beforeMap     = new Map(before.map((b) => [b.user_id, b]));

  // ── 5. Compute position movements ───────────────────────────────────
  const movements: Movement[] = leaderboard.map((a) => {
    const b = beforeMap.get(a.user_id);
    return {
      user_id:      a.user_id,
      display_name: a.display_name,
      rank_before:  b?.rank ?? a.rank,
      rank_after:   a.rank,
      change:       (b?.rank ?? a.rank) - a.rank, // positive = moved up
    };
  });

  // ── 6. Build content blocks ─────────────────────────────────────────
  const blocks = [
    blockResult(homeFlag, homeName, homeScore, awayFlag, awayName, awayScore),
    blockLeader(leaderboard, before, allZeroBefore),
    blockMovements(movements, allZeroBefore),
    blockExactos(preds, exactPoints),
    blockParticipants(preds),
    blockPrizeZone(movements, leaderboard, before, allZeroBefore),
  ].filter(Boolean) as string[];

  return {
    summary: buildSummary(leaderboard, before, preds, movements, allZeroBefore),
    content: blocks.join("\n\n"),
  };
}

// ── Basic fallback (pure, never throws) ───────────────────────────────

function buildBasicContent(
  homeFlag: string, homeName: string, homeScore: number,
  awayFlag: string, awayName: string, awayScore: number,
): string {
  const h = homeFlag ? `${homeFlag} ` : "";
  const a = awayFlag ? `${awayFlag} ` : "";
  let result: string;
  if (homeScore > awayScore)
    result = `${h}${homeName} venció a ${a}${awayName} ${homeScore}-${awayScore}.`;
  else if (awayScore > homeScore)
    result = `${a}${awayName} venció a ${h}${homeName} ${awayScore}-${homeScore}.`;
  else
    result = `${h}${homeName} y ${a}${awayName} empataron ${homeScore}-${awayScore}.`;
  return `⚽ ${result}\n\nLos puntos de los participantes ya fueron calculados y la tabla general fue actualizada.`;
}

// ── createMatchNews ───────────────────────────────────────────────────
//
// Called (void) from updateMatchResultAction / advancedEditMatchAction.
//
// Guards:
//   1. Deduplication — skips if news already exists for this match.
//   2. Rich news path — uses leaderboard + predictions to build a
//      narrative; falls back to basic text if anything fails.
//   3. Never throws — all errors are swallowed so the caller is
//      never affected by news generation failures.

export async function createMatchNews(
  supabase:  SupabaseClient,
  matchId:   string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  try {
    // Deduplication: skip if a news item already exists for this match.
    const { data: existing } = await supabase
      .from("news")
      .select("id")
      .eq("related_match_id", matchId)
      .maybeSingle();
    if (existing) return;

    // Fetch match + teams
    const { data: match } = await supabase
      .from("matches")
      .select(
        "stage, home_placeholder, away_placeholder, home_team:home_team_id(name, flag_emoji), away_team:away_team_id(name, flag_emoji)"
      )
      .eq("id", matchId)
      .maybeSingle();
    if (!match) return;

    type TeamRow = { name: string; flag_emoji: string | null };
    const homeTeam = match.home_team as unknown as TeamRow | null;
    const awayTeam = match.away_team as unknown as TeamRow | null;

    const homeName = homeTeam?.name ?? (match.home_placeholder as string | null) ?? "Local";
    const awayName = awayTeam?.name ?? (match.away_placeholder as string | null) ?? "Visitante";
    const homeFlag = homeTeam?.flag_emoji ?? "";
    const awayFlag = awayTeam?.flag_emoji ?? "";
    const stage    = (match.stage as string | null) ?? "group";

    const title       = `${homeName} ${homeScore} - ${awayScore} ${awayName}`;
    const exactPoints = STAGE_EXACT[stage] ?? 3;

    // Attempt rich news; fall back to basic on any failure.
    const { summary, content } = await buildRichNews(
      supabase, matchId, homeScore, awayScore,
      homeName, awayName, homeFlag, awayFlag, exactPoints,
    ).catch(() => ({
      summary: "El partido finalizó y la clasificación fue actualizada.",
      content: buildBasicContent(homeFlag, homeName, homeScore, awayFlag, awayName, awayScore),
    }));

    await supabase.from("news").insert({
      title,
      summary,
      content,
      related_match_id: matchId,
    });
  } catch (err) {
    console.error("[news] createMatchNews failed (non-critical):", err);
  }
}
