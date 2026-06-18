import { createClient } from "@/lib/supabase/server";
import { pickTemplate, fillTemplate } from "@/lib/news/pick";
import { primaryTag, hasTag } from "@/lib/news/teamMeta";
import {
  classifyResultCategory,
  RESULT_TEMPLATES,
  RESULT_SORPRESA_TEMPLATES,
  TEAM_TAG_TEMPLATES,
  COMMUNITY_TEAM_TEMPLATES,
  COMMUNITY_TEAM_DEBUT_WIN_TEMPLATES,
  LEADER_TEMPLATES,
  classifyExactosCategory,
  EXACTOS_TEMPLATES,
  classifyParticipantsCategory,
  PARTICIPANTS_TEMPLATES,
  MOVEMENT_TEMPLATES,
  PRIZE_TEMPLATES,
} from "@/lib/news/templates";

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
  pred_home:     number;
  pred_away:     number;
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

// ── Rank computation ────────────────────────────────────────────────
// Posición oficial: depende únicamente de total_points (no hay regla
// publicada que desempate por exact_count/result_count). exact_count y
// result_count ya no participan del cálculo de puesto.

function assignRanks(players: Rankable[]): Ranked[] {
  const sorted = [...players].sort((a, b) => b.total_points - a.total_points);

  let currentRank = 1;
  return sorted.map((p, i) => {
    if (i > 0) {
      const prev = sorted[i - 1];
      if (p.total_points !== prev.total_points) currentRank = i + 1;
    }
    return { ...p, rank: currentRank };
  });
}

// ── Narrative block functions ─────────────────────────────────────────
// Each returns a string or null. null = omit block.
// To add a new block: write a new function and insert it into the
// blocks array inside buildRichNews().

function blockResult(
  matchId:   string,
  homeFlag: string, homeName: string, homeScore: number, homeCode: string | null,
  awayFlag: string, awayName: string, awayScore: number, awayCode: string | null,
  preds:    PredRow[],
  isCommunityDebut: boolean,
): string {
  const h = homeFlag ? `${homeFlag} ` : "";
  const a = awayFlag ? `${awayFlag} ` : "";

  // Equipo de la comunidad (Colombia): narrativa propia con prioridad
  // sobre cualquier tag del rival, en victoria, empate y derrota.
  const homeIsCommunity = hasTag(homeCode, "community_team");
  const awayIsCommunity = hasTag(awayCode, "community_team");
  if (homeIsCommunity || awayIsCommunity) {
    const team     = homeIsCommunity ? `${h}${homeName}` : `${a}${awayName}`;
    const opponent = homeIsCommunity ? `${a}${awayName}` : `${h}${homeName}`;
    const own      = homeIsCommunity ? homeScore : awayScore;
    const rival     = homeIsCommunity ? awayScore : homeScore;
    const vars      = { team, opponent, score: `${own}-${rival}` };
    const outcome   = own > rival ? "win" : own < rival ? "loss" : "draw";

    if (isCommunityDebut && outcome === "win") {
      const template = pickTemplate(COMMUNITY_TEAM_DEBUT_WIN_TEMPLATES, `${matchId}:result`);
      return fillTemplate(template, vars);
    }
    const template = pickTemplate(COMMUNITY_TEAM_TEMPLATES[outcome], `${matchId}:result`);
    return fillTemplate(template, vars);
  }

  if (homeScore === awayScore) {
    const template = pickTemplate(RESULT_TEMPLATES.empate, `${matchId}:result`);
    return fillTemplate(template, {
      team: `${h}${homeName}`,
      opponent: `${a}${awayName}`,
      score: `${homeScore}-${awayScore}`,
    });
  }

  const homeWins = homeScore > awayScore;
  const winner   = { name: homeWins ? `${h}${homeName}` : `${a}${awayName}`, code: homeWins ? homeCode : awayCode };
  const loser    = { name: homeWins ? `${a}${awayName}` : `${h}${homeName}` };
  const score    = homeWins ? `${homeScore}-${awayScore}` : `${awayScore}-${homeScore}`;
  const vars     = { team: winner.name, opponent: loser.name, score };

  // Equipo especial: a curated, factual tag takes priority over generic
  // margin/sorpresa narratives (rarer, more notable than either).
  const tag = primaryTag(winner.code);
  if (tag) {
    return fillTemplate(TEAM_TAG_TEMPLATES[tag], vars);
  }

  // Sorpresa: majority of community predictions favored the loser.
  const homeVotes = preds.filter((p) => p.pred_home > p.pred_away).length;
  const awayVotes = preds.filter((p) => p.pred_away > p.pred_home).length;
  const favoredHome = homeVotes > awayVotes && homeVotes > preds.length / 2;
  const favoredAway = awayVotes > homeVotes && awayVotes > preds.length / 2;
  const wasUpset = (favoredHome && !homeWins) || (favoredAway && homeWins);
  if (preds.length > 0 && wasUpset) {
    const template = pickTemplate(RESULT_SORPRESA_TEMPLATES, `${matchId}:result`);
    return fillTemplate(template, vars);
  }

  const category = classifyResultCategory(homeScore, awayScore);
  const template = pickTemplate(RESULT_TEMPLATES[category], `${matchId}:result`);
  return fillTemplate(template, vars);
}

// "Líder" se define por el máximo de total_points (empate real de puntos),
// no por el campo `rank` de la tabla: ese rank usa total_points/exact_count/
// result_count como desempate visual, lo que puede separar en filas distintas
// a dos jugadores con los mismos puntos y ocultar un empate editorial real.
function topScorers<T extends { total_points: number }>(players: T[]): T[] {
  if (players.length === 0) return [];
  const topPoints = Math.max(...players.map((p) => p.total_points));
  return players.filter((p) => p.total_points === topPoints);
}

function blockLeader(
  matchId:      string,
  after:        LbRow[],
  before:       Ranked[],
  allZeroBefore: boolean,
): string {
  const leaders = topScorers(after);
  if (leaders.length === 0) return "🏆 La tabla se mueve";

  const pts             = leaders[0].total_points;
  const prevLeaders     = topScorers(before);
  const prevIds         = new Set(prevLeaders.map((p) => p.user_id));
  const prevLeaderCount = prevLeaders.length;
  const seed             = `${matchId}:leader`;

  const joined = (arr: { display_name: string }[]) =>
    arr.length === 1 ? arr[0].display_name
    : arr.length === 2 ? `${arr[0].display_name} y ${arr[1].display_name}`
    : `${arr.slice(0, -1).map((l) => l.display_name).join(", ")} y ${arr[arr.length - 1].display_name}`;

  const isNewSoleLeader =
    leaders.length === 1 && (allZeroBefore || !prevIds.has(leaders[0].user_id));

  if (isNewSoleLeader) {
    const template = pickTemplate(LEADER_TEMPLATES.nuevo, seed);
    return fillTemplate(template, { leader: leaders[0].display_name, points: pts });
  }

  if (leaders.length === 1) {
    // Was tied for 1st before, now leads alone: a tie broken, not a new arrival.
    const brokeTie = prevLeaderCount > 1 && prevIds.has(leaders[0].user_id);
    if (brokeTie) {
      const template = pickTemplate(LEADER_TEMPLATES.rompe_empate, seed);
      return fillTemplate(template, { leader: leaders[0].display_name, points: pts });
    }

    // Apretado: the runner-up trails by 2 points or less.
    const runnerUpPts = after.find((p) => p.rank === 2)?.total_points;
    const isApretado  = runnerUpPts != null && pts - runnerUpPts <= 2;
    const category    = isApretado ? "apretado" : "mantiene";
    const template    = pickTemplate(LEADER_TEMPLATES[category], seed);
    return fillTemplate(template, { leader: leaders[0].display_name, points: pts });
  }

  // Tie at the top now (leaders.length > 1).
  const sameTieAsBefore =
    !allZeroBefore &&
    prevLeaderCount > 1 &&
    prevLeaderCount === leaders.length &&
    leaders.every((l) => prevIds.has(l.user_id));

  if (sameTieAsBefore) {
    const template = pickTemplate(LEADER_TEMPLATES.empate_sostenido, seed);
    return fillTemplate(template, { names: joined(leaders), points: pts });
  }

  // A single previous sole leader got caught by one or more chasers and
  // is still part of the new tie: the headline event is "X alcanza a Y".
  if (!allZeroBefore && prevLeaderCount === 1 && leaders.some((l) => l.user_id === prevLeaders[0].user_id)) {
    const previousLeader = prevLeaders[0];
    const chasers         = leaders.filter((l) => l.user_id !== previousLeader.user_id);
    const verb            = chasers.length === 1 ? "alcanza" : "alcanzan";
    const groupWord        = leaders.length === 2 ? "ambos" : "todos";
    const template         = pickTemplate(LEADER_TEMPLATES.alcanza_empate, seed);
    return fillTemplate(template, {
      chasers:        joined(chasers),
      verb,
      groupWord,
      previousLeader: previousLeader.display_name,
      points:         pts,
    });
  }

  // Any other new tie at the top (first scored match, or a tie that
  // doesn't involve the previous sole leader).
  const template = pickTemplate(LEADER_TEMPLATES.empate_nuevo, seed);
  return fillTemplate(template, { names: joined(leaders), points: pts });
}

function nUnidad(n: number): string {
  return `${n} puesto${n === 1 ? "" : "s"}`;
}

function blockMovements(
  matchId:       string,
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
        const enteredTop3 = m.rank_before > 3 && m.rank_after <= 3;
        const category    = enteredTop3 ? "top3" : "sube";
        const template     = pickTemplate(MOVEMENT_TEMPLATES[category], `${matchId}:movement:${m.user_id}`);
        return fillTemplate(template, { name: m.display_name, n_unidad: nUnidad(n), position: m.rank_after });
      }
      const n = Math.abs(m.change);
      const template = pickTemplate(MOVEMENT_TEMPLATES.cae, `${matchId}:movement:${m.user_id}`);
      return fillTemplate(template, { name: m.display_name, n_unidad: nUnidad(n), position: m.rank_after });
    })
    .join("\n");
}

function blockExactos(matchId: string, preds: PredRow[]): string {
  const exactos = preds.filter((p) => p.points_reason === "Marcador exacto");
  const names   = exactos.map((p) => p.display_name);
  const joined  =
    names.length <= 1 ? (names[0] ?? "")
    : names.slice(0, -1).join(", ") + " y " + names[names.length - 1];

  const category = classifyExactosCategory(names.length);
  const template = pickTemplate(EXACTOS_TEMPLATES[category], `${matchId}:exactos`);
  return fillTemplate(template, { names: joined, count: names.length });
}

function blockParticipants(matchId: string, preds: PredRow[]): string | null {
  if (preds.length === 0) return null;
  const scorers = preds.filter((p) => p.points > 0).length;

  const category = classifyParticipantsCategory(scorers, preds.length);
  const template = pickTemplate(PARTICIPANTS_TEMPLATES[category], `${matchId}:participants`);
  return fillTemplate(template, { count: scorers, total: preds.length });
}

function blockPrizeZone(
  matchId:       string,
  movements:     Movement[],
  after:         LbRow[],
  before:        Ranked[],
  allZeroBefore: boolean,
): string | null {
  if (allZeroBefore) return null;

  const seed        = `${matchId}:prize`;
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
    const template = pickTemplate(PRIZE_TEMPLATES.comparte, seed);
    return fillTemplate(template, { names: joined });
  }

  // Someone entered prize zone (top 2) from outside
  const entries = movements.filter((m) => m.rank_before > 2 && m.rank_after <= 2);
  if (entries.length > 0) {
    const joined =
      entries.length === 1
        ? entries[0].display_name
        : entries.map((e) => e.display_name).join(" y ");
    const template = pickTemplate(PRIZE_TEMPLATES.entra, seed);
    return fillTemplate(template, { name: joined, position: entries[0].rank_after });
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
  const leaders    = topScorers(after);
  const prevLeaders = topScorers(before);
  const prevIds    = new Set(prevLeaders.map((p) => p.user_id));
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
  const prevLeaderCount = prevLeaders.length;
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

// Cheap check, only ever run for Colombia's own matches: is this the
// earliest-scheduled match (by starts_at) for that team in the fixture
// list? Used to trigger the one-off debut narrative instead of the
// regular win/draw/loss templates.
async function isCommunityTeamDebut(
  supabase:        SupabaseClient,
  matchId:         string,
  communityTeamId: string,
): Promise<boolean> {
  const { data: firstMatch } = await supabase
    .from("matches")
    .select("id")
    .or(`home_team_id.eq.${communityTeamId},away_team_id.eq.${communityTeamId}`)
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return firstMatch?.id === matchId;
}

async function buildRichNews(
  supabase:    SupabaseClient,
  matchId:     string,
  homeScore:   number,
  awayScore:   number,
  homeName:    string,
  awayName:    string,
  homeFlag:    string,
  awayFlag:    string,
  homeCode:    string | null,
  awayCode:    string | null,
  homeTeamId:  string | null,
  awayTeamId:  string | null,
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

  const leaderboardRaw: LbRow[] = (lbRaw as Record<string, unknown>[]).map((r) => ({
    user_id:      String(r.user_id),
    display_name: String(r.display_name),
    total_points: Number(r.total_points),
    exact_count:  Number(r.exact_count),
    result_count: Number(r.result_count),
    rank:         Number(r.rank),
  }));
  // El rank de la RPC desempata por exact_count/result_count; lo
  // sobreescribimos para que "rank 2" (usado más abajo para el margen de
  // "apretado") siga reflejando solo total_points, igual que en el resto
  // del sistema (ver withOfficialRank en src/lib/db/leaderboard.ts).
  const leaderboard: LbRow[] = leaderboardRaw.map((e) => ({
    ...e,
    rank: leaderboardRaw.filter((o) => o.total_points > e.total_points).length + 1,
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
      pred_home:     Number(p.home_score ?? 0),
      pred_away:     Number(p.away_score ?? 0),
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

  // ── 6. Community-team (Colombia) debut check ────────────────────────
  const communityTeamId = hasTag(homeCode, "community_team") ? homeTeamId
    : hasTag(awayCode, "community_team") ? awayTeamId
    : null;
  const isCommunityDebut = communityTeamId
    ? await isCommunityTeamDebut(supabase, matchId, communityTeamId)
    : false;

  // ── 7. Build content blocks ─────────────────────────────────────────
  const blocks = [
    blockResult(matchId, homeFlag, homeName, homeScore, homeCode, awayFlag, awayName, awayScore, awayCode, preds, isCommunityDebut),
    blockLeader(matchId, leaderboard, before, allZeroBefore),
    blockMovements(matchId, movements, allZeroBefore),
    blockExactos(matchId, preds),
    blockParticipants(matchId, preds),
    blockPrizeZone(matchId, movements, leaderboard, before, allZeroBefore),
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
        "home_placeholder, away_placeholder, home_team:home_team_id(id, name, flag_emoji, code), away_team:away_team_id(id, name, flag_emoji, code)"
      )
      .eq("id", matchId)
      .maybeSingle();
    if (!match) return;

    type TeamRow = { id: string; name: string; flag_emoji: string | null; code: string | null };
    const homeTeam = match.home_team as unknown as TeamRow | null;
    const awayTeam = match.away_team as unknown as TeamRow | null;

    const homeName = homeTeam?.name ?? (match.home_placeholder as string | null) ?? "Local";
    const awayName = awayTeam?.name ?? (match.away_placeholder as string | null) ?? "Visitante";
    const homeFlag = homeTeam?.flag_emoji ?? "";
    const awayFlag = awayTeam?.flag_emoji ?? "";
    const homeCode = homeTeam?.code ?? null;
    const awayCode = awayTeam?.code ?? null;
    const homeTeamId = homeTeam?.id ?? null;
    const awayTeamId = awayTeam?.id ?? null;

    const title = `${homeName} ${homeScore} - ${awayScore} ${awayName}`;

    // Attempt rich news; fall back to basic on any failure.
    const { summary, content } = await buildRichNews(
      supabase, matchId, homeScore, awayScore,
      homeName, awayName, homeFlag, awayFlag, homeCode, awayCode,
      homeTeamId, awayTeamId,
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
