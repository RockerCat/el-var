"use client";

import { useState } from "react";
import type {
  GroupStanding,
  TeamStanding,
  KnockoutPreviewMatch,
  SlotResolution,
  BracketConnection,
  KnockoutResult,
} from "@/lib/classification";
import {
  resolveSlot,
  assignBestThirdSlots,
  orderSourceMatchesByDestination,
  orderDestinationBySourcePairs,
  computeBracketConnections,
  computeLeafRowPositions,
  computeParentRowPositions,
} from "@/lib/classification";
import { formatKickoff } from "@/lib/matches";

// ── Types ──────────────────────────────────────────────────────────────

type TabId   = "groups" | "r32" | "r16" | "qf" | "sf" | "final";
type ViewId  = "phase" | "bracket";

interface Props {
  groups:        GroupStanding[];
  bestThirds:    TeamStanding[];
  roundOf32:     KnockoutPreviewMatch[];
  roundOf16:     KnockoutPreviewMatch[];
  quarterFinals: KnockoutPreviewMatch[];
  semiFinals:    KnockoutPreviewMatch[];
  thirdPlace:    KnockoutPreviewMatch[];
  finals:        KnockoutPreviewMatch[];
  defaultTab:    string;
}

const TABS: { id: TabId; label: string; short: string }[] = [
  { id: "groups", label: "Fase de Grupos", short: "Grupos"  },
  { id: "r32",    label: "Dieciseisavos",  short: "16avos"  },
  { id: "r16",    label: "Octavos",        short: "Octavos" },
  { id: "qf",     label: "Cuartos",        short: "Cuartos" },
  { id: "sf",     label: "Semifinales",    short: "Semis"   },
  { id: "final",  label: "Final",          short: "Final"   },
];

// ── Shared helpers ─────────────────────────────────────────────────────

function positionBorder(idx: number): string {
  if (idx === 0) return "border-l-2 border-l-[#f59e0b]";
  if (idx === 1) return "border-l-2 border-l-[#00c85a]";
  if (idx === 2) return "border-l-2 border-l-[#f59e0b]/50";
  return "border-l-2 border-l-transparent";
}

function goalDiffColor(d: number): string {
  if (d > 0) return "text-[#00c85a]";
  if (d < 0) return "text-red-400";
  return "text-[#64748b]";
}

function fmtDiff(d: number): string {
  return d > 0 ? `+${d}` : String(d);
}

// Unresolved Best-3rd slots (not enough data / ambiguous combination yet)
// keep showing the original placeholder text, tagged as a pending
// projection rather than a plain "no info" placeholder.
function pendingLabel(slot: Extract<SlotResolution, { kind: "unresolved" }>): string {
  return slot.pending ? `⏳ ${slot.label}` : slot.label;
}

// ══════════════════════════════════════════════════════════════════════
// PHASE VIEW — components
// ══════════════════════════════════════════════════════════════════════

// ── GroupCard (phase view — full stats table) ──────────────────────────

function GroupCard({ group }: { group: GroupStanding }) {
  const matchesPlayed = group.teams.reduce((s, t) => s + t.played, 0) / 2;

  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e1e35] flex items-center justify-between">
        <h3 className="text-xs font-black text-[#f1f5f9] uppercase tracking-widest">
          Grupo {group.group_code}
        </h3>
        <span className="text-[10px] font-mono text-[#64748b]">{matchesPlayed}/6</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e1e35]">
              <th className="pl-3 pr-1 py-2 text-left text-[10px] font-semibold text-[#64748b] uppercase w-5">#</th>
              <th className="px-2 py-2 text-left text-[10px] font-semibold text-[#64748b] uppercase min-w-[88px]">Equipo</th>
              {["PJ","G","E","P","GF","GC","DG","PTS"].map((h) => (
                <th key={h} className="px-1 py-2 text-center text-[10px] font-semibold text-[#64748b] uppercase w-7">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e35]">
            {group.teams.map((s, idx) => (
              <tr key={s.team.id} className={positionBorder(idx)}>
                <td className="pl-3 pr-1 py-2.5 text-[10px] font-mono text-[#64748b] text-center">{idx + 1}</td>
                <td className="px-2 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm leading-none">{s.team.flag_emoji ?? "🏳️"}</span>
                    <span className={`text-[11px] font-bold ${idx <= 1 ? "text-[#f1f5f9]" : "text-[#94a3b8]"}`}>
                      {s.team.code}
                    </span>
                  </div>
                </td>
                <td className="px-1 py-2.5 text-center font-mono text-[#94a3b8]">{s.played}</td>
                <td className="px-1 py-2.5 text-center font-mono text-[#94a3b8]">{s.won}</td>
                <td className="px-1 py-2.5 text-center font-mono text-[#94a3b8]">{s.drawn}</td>
                <td className="px-1 py-2.5 text-center font-mono text-[#94a3b8]">{s.lost}</td>
                <td className="px-1 py-2.5 text-center font-mono text-[#94a3b8]">{s.goals_for}</td>
                <td className="px-1 py-2.5 text-center font-mono text-[#94a3b8]">{s.goals_against}</td>
                <td className={`px-1 py-2.5 text-center font-mono ${goalDiffColor(s.goal_diff)}`}>
                  {fmtDiff(s.goal_diff)}
                </td>
                <td className={`px-1 py-2.5 text-center font-black text-sm ${
                  idx === 0 ? "text-[#f59e0b]" : idx === 1 ? "text-[#00c85a]" : "text-[#94a3b8]"
                }`}>
                  {s.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── KnockoutMatchCard (phase view — full card with date + venue) ────────

function KnockoutMatchCard({ match, large = false, groups, homeBestThird, awayBestThird, knockoutResults }: {
  match: KnockoutPreviewMatch;
  large?: boolean;
  groups?: GroupStanding[];
  homeBestThird?: TeamStanding | null;
  awayBestThird?: TeamStanding | null;
  knockoutResults?: Map<number, KnockoutResult>;
}) {
  const homeSlot  = resolveSlot(match.home_team, match.home_placeholder, groups ?? [], homeBestThird ?? null, knockoutResults);
  const awaySlot  = resolveSlot(match.away_team, match.away_placeholder, groups ?? [], awayBestThird ?? null, knockoutResults);
  const homeTeam  = homeSlot.kind !== "unresolved" ? homeSlot.team : null;
  const awayTeam  = awaySlot.kind !== "unresolved" ? awaySlot.team : null;
  const isHomeProjected = homeSlot.kind === "projected";
  const isAwayProjected = awaySlot.kind === "projected";
  const homeFlag  = homeTeam?.flag_emoji;
  const awayFlag  = awayTeam?.flag_emoji;
  const homeCode  = homeSlot.kind === "unresolved" ? pendingLabel(homeSlot) : homeTeam!.code;
  const awayCode  = awaySlot.kind === "unresolved" ? pendingLabel(awaySlot) : awayTeam!.code;
  const hasScore  = match.home_score !== null && match.away_score !== null;
  const isLive    = match.status === "live";
  const isFinished = match.status === "finished";
  const flagSize  = large ? "text-3xl" : "text-2xl";
  const nameSize  = large ? "text-sm"  : "text-xs";
  const scoreSize = large ? "text-2xl" : "text-base";

  return (
    <div className={`bg-[#11111c] border border-[#1e1e35] rounded-2xl overflow-hidden${large ? " ring-1 ring-[#f59e0b]/15" : ""}`}>
      <div className="px-4 py-2.5 border-b border-[#1e1e35] flex items-center gap-2 min-w-0">
        {match.match_number !== null && (
          <span className="text-[10px] font-mono text-[#64748b] shrink-0">M{match.match_number}</span>
        )}
        <span className="text-[10px] text-[#64748b] flex-1 truncate">{formatKickoff(match.starts_at)}</span>
        {isLive && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ef4444]/15 border border-[#ef4444]/20 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
            <span className="text-[9px] font-black text-[#ef4444] uppercase tracking-wide">En vivo</span>
          </div>
        )}
        {isFinished && (
          <span className="text-[9px] font-mono text-[#64748b] uppercase tracking-widest shrink-0">Fin.</span>
        )}
      </div>
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className={`${flagSize} leading-none shrink-0 ${!homeTeam ? "opacity-30" : isHomeProjected ? "opacity-80" : ""}`}>{homeFlag ?? "🏳️"}</span>
          <div className="min-w-0">
            {homeTeam ? (
              <>
                <p className={`${nameSize} font-bold truncate ${isHomeProjected ? "italic text-[#3b82f6] opacity-80" : "text-[#f1f5f9]"}`}>
                  {isHomeProjected && "🔮 "}{homeTeam.name}
                </p>
                <p className={`text-[10px] font-mono ${isHomeProjected ? "text-[#3b82f6]/70 italic" : "text-[#64748b]"}`}>{homeTeam.code}</p>
              </>
            ) : (
              <p className={`${nameSize} font-mono text-[#64748b] italic truncate`}>{homeCode}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-center min-w-[52px]">
          {hasScore ? (
            <p className={`${scoreSize} font-black tabular-nums text-[#f1f5f9]`}>
              {match.home_score}<span className="mx-1 text-[#2a2a45]">-</span>{match.away_score}
            </p>
          ) : (
            <p className="text-[11px] text-[#2a2a45] font-mono">vs</p>
          )}
        </div>
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <div className="min-w-0 text-right">
            {awayTeam ? (
              <>
                <p className={`${nameSize} font-bold truncate ${isAwayProjected ? "italic text-[#3b82f6] opacity-80" : "text-[#f1f5f9]"}`}>
                  {awayTeam.name}{isAwayProjected && " 🔮"}
                </p>
                <p className={`text-[10px] font-mono ${isAwayProjected ? "text-[#3b82f6]/70 italic" : "text-[#64748b]"}`}>{awayTeam.code}</p>
              </>
            ) : (
              <p className={`${nameSize} font-mono text-[#64748b] italic truncate`}>{awayCode}</p>
            )}
          </div>
          <span className={`${flagSize} leading-none shrink-0 ${!awayTeam ? "opacity-30" : isAwayProjected ? "opacity-80" : ""}`}>{awayFlag ?? "🏳️"}</span>
        </div>
      </div>
      {match.venue && (
        <div className="px-4 pb-2.5 -mt-1">
          <p className="text-[10px] text-[#64748b] truncate">{match.venue}</p>
        </div>
      )}
    </div>
  );
}

// ── Phase tab components ───────────────────────────────────────────────

function GruposTab({ groups }: { groups: GroupStanding[] }) {
  if (groups.length === 0) {
    return (
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl px-6 py-10 text-center">
        <p className="text-sm text-[#64748b]">No hay equipos de grupos registrados.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#64748b]">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> 1° — clasifica directo</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00c85a]" /> 2° — clasifica directo</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f59e0b]/40" /> 3° — posible mejor tercero</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => <GroupCard key={g.group_code} group={g} />)}
      </div>
    </div>
  );
}

function KnockoutTab({ matches, emptyMessage, cols = 2, groups, bestThirdAssignment, knockoutResults }: {
  matches: KnockoutPreviewMatch[];
  emptyMessage: string;
  cols?: 1 | 2;
  groups?: GroupStanding[];
  bestThirdAssignment?: Map<string, TeamStanding>;
  knockoutResults?: Map<number, KnockoutResult>;
}) {
  if (matches.length === 0) {
    return (
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl px-6 py-10 text-center">
        <p className="text-sm text-[#64748b]">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {groups && <ProjectionLegend />}
      <div className={cols === 2 ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
        {matches.map((m) => (
          <KnockoutMatchCard
            key={m.id}
            match={m}
            groups={groups}
            homeBestThird={bestThirdAssignment?.get(`${m.id}:home`)}
            awayBestThird={bestThirdAssignment?.get(`${m.id}:away`)}
            knockoutResults={knockoutResults}
          />
        ))}
      </div>
    </div>
  );
}

function FinalTab({ finals, thirdPlace, knockoutResults }: { finals: KnockoutPreviewMatch[]; thirdPlace: KnockoutPreviewMatch[]; knockoutResults?: Map<number, KnockoutResult> }) {
  const finalMatch = finals[0]     ?? null;
  const thirdMatch = thirdPlace[0] ?? null;
  if (!finalMatch && !thirdMatch) {
    return (
      <div className="bg-[#11111c] border border-[#1e1e35] rounded-2xl px-6 py-10 text-center">
        <p className="text-sm text-[#64748b]">Los partidos de Final aún no están disponibles.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {finalMatch && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🏆</span>
            <h2 className="text-sm font-black text-[#f59e0b] uppercase tracking-widest">Final</h2>
          </div>
          <KnockoutMatchCard match={finalMatch} large knockoutResults={knockoutResults} />
        </section>
      )}
      {thirdMatch && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">🥉</span>
            <h2 className="text-sm font-black text-[#94a3b8] uppercase tracking-widest">Tercer puesto</h2>
          </div>
          <KnockoutMatchCard match={thirdMatch} knockoutResults={knockoutResults} />
        </section>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// BRACKET VIEW — components
// ══════════════════════════════════════════════════════════════════════

// ── BracketGroupMini — compact 4-team group for bracket column ─────────

function BracketGroupMini({ group }: { group: GroupStanding }) {
  return (
    <div className="bg-[#11111c] border border-[#1e1e35] rounded-xl px-2.5 py-2 space-y-1.5">
      <p className="text-[9px] font-black text-[#64748b] uppercase tracking-widest">G{group.group_code}</p>
      {group.teams.map((t, i) => (
        <div key={t.team.id} className="flex items-center gap-1 min-w-0">
          <span className={`text-[9px] font-mono w-3 shrink-0 ${
            i === 0 ? "text-[#f59e0b]" : i === 1 ? "text-[#00c85a]" : "text-[#64748b]"
          }`}>{i + 1}</span>
          <span className="text-xs leading-none shrink-0">{t.team.flag_emoji ?? "🏳️"}</span>
          <span className={`text-[10px] font-semibold truncate ${i <= 1 ? "text-[#f1f5f9]" : "text-[#64748b]"}`}>
            {t.team.code}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── BracketMatchRow — compact 2-line card for bracket column ───────────

function BracketMatchRow({ match, highlight = false, groups, homeBestThird, awayBestThird, knockoutResults }: {
  match: KnockoutPreviewMatch;
  highlight?: boolean;
  groups?: GroupStanding[];
  homeBestThird?: TeamStanding | null;
  awayBestThird?: TeamStanding | null;
  knockoutResults?: Map<number, KnockoutResult>;
}) {
  const home = match.home_team;
  const away = match.away_team;
  const homeSlot  = resolveSlot(home, match.home_placeholder, groups ?? [], homeBestThird ?? null, knockoutResults);
  const awaySlot  = resolveSlot(away, match.away_placeholder, groups ?? [], awayBestThird ?? null, knockoutResults);
  const homeTeam  = homeSlot.kind !== "unresolved" ? homeSlot.team : null;
  const awayTeam  = awaySlot.kind !== "unresolved" ? awaySlot.team : null;
  const homeLabel = homeSlot.kind === "unresolved" ? pendingLabel(homeSlot) : homeTeam!.code;
  const awayLabel = awaySlot.kind === "unresolved" ? pendingLabel(awaySlot) : awayTeam!.code;
  const isHomeProjected = homeSlot.kind === "projected";
  const isAwayProjected = awaySlot.kind === "projected";
  const hasScore  = match.home_score !== null && match.away_score !== null;
  const homeWins  = hasScore && (match.home_score ?? 0) > (match.away_score ?? 0);
  const awayWins  = hasScore && (match.away_score ?? 0) > (match.home_score ?? 0);
  const isLive    = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <div className={`bg-[#11111c] border rounded-xl overflow-hidden ${
      highlight    ? "border-[#f59e0b]/40 ring-1 ring-[#f59e0b]/10" :
      isLive       ? "border-[#ef4444]/40" :
      "border-[#1e1e35]"
    }`}>
      {/* Match header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-[#1e1e35]">
        <span className="text-[9px] font-mono text-[#64748b]">
          {match.match_number ? `M${match.match_number}` : "–"}
        </span>
        {isLive && (
          <span className="text-[8px] font-black text-[#ef4444] uppercase tracking-wide animate-pulse">Live</span>
        )}
        {isFinished && !isLive && (
          <span className="text-[8px] font-mono text-[#64748b] uppercase tracking-widest">Fin</span>
        )}
      </div>
      {/* Home row */}
      <div className={`flex items-center gap-1.5 px-2 py-1.5 border-b border-[#1e1e35]/50 ${homeWins ? "bg-[#00c85a]/[0.06]" : ""}`}>
        <span className={`text-sm leading-none shrink-0 ${!homeTeam ? "opacity-30" : isHomeProjected ? "opacity-80" : ""}`}>
          {homeTeam?.flag_emoji ?? "🏳️"}
        </span>
        <span className={`text-[11px] font-semibold flex-1 truncate ${
          isHomeProjected
            ? "italic text-[#3b82f6] opacity-80"
            : homeTeam ? (homeWins ? "text-[#00c85a]" : "text-[#f1f5f9]") : "text-[#64748b] italic"
        }`}>{isHomeProjected && "🔮 "}{homeLabel}</span>
        {hasScore && (
          <span className={`text-xs font-black tabular-nums shrink-0 ${homeWins ? "text-[#00c85a]" : "text-[#64748b]"}`}>
            {match.home_score}
          </span>
        )}
      </div>
      {/* Away row */}
      <div className={`flex items-center gap-1.5 px-2 py-1.5 ${awayWins ? "bg-[#00c85a]/[0.06]" : ""}`}>
        <span className={`text-sm leading-none shrink-0 ${!awayTeam ? "opacity-30" : isAwayProjected ? "opacity-80" : ""}`}>
          {awayTeam?.flag_emoji ?? "🏳️"}
        </span>
        <span className={`text-[11px] font-semibold flex-1 truncate ${
          isAwayProjected
            ? "italic text-[#3b82f6] opacity-80"
            : awayTeam ? (awayWins ? "text-[#00c85a]" : "text-[#f1f5f9]") : "text-[#64748b] italic"
        }`}>{isAwayProjected && "🔮 "}{awayLabel}</span>
        {hasScore && (
          <span className={`text-xs font-black tabular-nums shrink-0 ${awayWins ? "text-[#00c85a]" : "text-[#64748b]"}`}>
            {match.away_score}
          </span>
        )}
      </div>
    </div>
  );
}

// ── ProjectionLegend — shared by Bracket view and Por fase > Dieciseisavos ─

function ProjectionLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#64748b]">
      <span className="flex items-center gap-1.5">✅ <span className="text-[#f1f5f9] font-semibold">Oficial</span> — cupo ya definido</span>
      <span className="flex items-center gap-1.5">🔮 <span className="text-[#3b82f6] font-semibold italic">Proyección</span> — basado en posiciones actuales</span>
      <span className="flex items-center gap-1.5"><span className="text-[#64748b] italic">Placeholder</span> — cupo aún sin resolver</span>
      <span className="flex items-center gap-1.5">⏳ <span className="text-[#64748b] italic">Proyección pendiente</span> — mejores terceros aún sin definir con certeza</span>
    </div>
  );
}

// ── BracketEmptySlot — placeholder when phase has no data ──────────────

function BracketEmptySlot({ label }: { label: string }) {
  return (
    <div className="bg-[#11111c] border border-[#1e1e35]/50 rounded-xl px-3 py-4 text-center">
      <p className="text-[10px] text-[#64748b] italic">{label}</p>
    </div>
  );
}

// ── Bracket geometry ────────────────────────────────────────────────────
// Dieciseisavos (R32) is the only round with no children, so its rows are
// evenly spaced in plain flow. Every later round is absolutely positioned
// at computeParentRowPositions()'s real midpoint — never a round-based
// slot height — so the whole bracket's total height is just the leaf
// column's height (16 rows × R32_SH), shared by every column via TOTAL_H.

const CARD_H = 88;            // approximate BracketMatchRow rendered height (px)
const HEADER = 44;            // column header (title + subtitle + mb-3) height (px)
const R32_SH = CARD_H + 8;    // Dieciseisavos row height in flat layout = 96

// ── BracketConnectorSVG ─────────────────────────────────────────────────
// Draws simple, local SVG bracket connectors using REAL, already-computed
// row positions (computeLeafRowPositions / computeParentRowPositions in
// lib/classification.ts) — never a round/index-based offset formula. Each
// connection's vertical bar spans only between its own two children
// (never beyond), converging at one shared midpoint x for the whole
// connector — the standard bracket look. This is only correct because the
// column orders feeding this component (see BracketView) are chosen so
// every parent's two real children sit on ADJACENT rows; if a round ever
// needed non-adjacent children again, the right fix is reordering that
// round (as BracketView does for Octavos), not adding lanes/diagonals here.
//
//   ─ left arm   from each source row's real y   (x: 0 → midX)
//   │ vertical   from that source's y             down/up to the dest's real y
//   ─ right arm  from midpoint to dest's real y   (x: midX → W), drawn once
//
// srcY/dstY: real, pre-computed center-y per row index in each column.

function BracketConnectorSVG({
  connections,
  srcY,
  dstY,
  totalH,
}: {
  connections: BracketConnection[];
  srcY:        number[];
  dstY:        number[];
  totalH:      number;
}) {
  const W     = 40;
  const MID_X = W / 2;

  return (
    <div
      className="shrink-0 mx-1"
      style={{
        width:     W,
        marginTop: HEADER,
        filter:    "drop-shadow(0 0 4px rgba(0,200,90,0.22))",
      }}
    >
      <svg width={W} height={totalH} style={{ display: "block", overflow: "visible" }}>
        {connections.map(({ srcRows: [rowA, rowB], destRow }, i) => {
          const y1 = srcY[rowA];
          const y2 = srcY[rowB];
          const yd = dstY[destRow];
          return (
            <g key={i} stroke="rgba(0,200,90,0.6)" strokeWidth="1.5" fill="none" strokeLinecap="round">
              <line x1={0}     y1={y1} x2={MID_X} y2={y1} />
              <line x1={0}     y1={y2} x2={MID_X} y2={y2} />
              <line x1={MID_X} y1={y1} x2={MID_X} y2={yd} />
              <line x1={MID_X} y1={y2} x2={MID_X} y2={yd} />
              <line x1={MID_X} y1={yd} x2={W}     y2={yd} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── BracketView — full horizontal bracket (slot model) ────────────────
// Every knockout match sits at the exact vertical midpoint of its two real
// source matches, computed recursively (computeLeafRowPositions /
// computeParentRowPositions). All five knockout columns share the same
// total body height (TOTAL_H), which keeps the whole bracket the same
// height regardless of phase.

function BracketView({ groups, roundOf32, roundOf16, quarterFinals, semiFinals, thirdPlace, finals, bestThirdAssignment, knockoutResults }: Omit<Props, "bestThirds" | "defaultTab"> & {
  bestThirdAssignment: Map<string, TeamStanding>;
  knockoutResults: Map<number, KnockoutResult>;
}) {
  const playedGroupMatches = groups.reduce((sum, g) => sum + g.teams.reduce((s, t) => s + t.played, 0) / 2, 0);

  // Cuartos (quarter finals) is the visual anchor — shown in plain
  // match_number order (M97..M100), because that's the one round whose
  // real pairs (M97+M98, M99+M100) land on adjacent rows when BOTH its
  // neighbors are derived from it. Every other column's order is DERIVED
  // from that anchor using real "Winner M##" / "Loser M##" placeholders,
  // never from array position or match_number alone:
  //   - Octavos and Dieciseisavos are reordered backwards from Cuartos so
  //     each pair of rows that actually feeds the same next match sits
  //     adjacent to it (M89,M90,M93,M94,M91,M92,M95,M96 for Octavos).
  //   - Semis and Final are reordered forwards from Cuartos the other
  //     way: walking the already-fixed previous column two rows at a
  //     time and placing whichever next match those two rows really feed.
  // The result: every connection's two real children are ALWAYS adjacent
  // rows in their column, so BracketConnectorSVG can stay a simple local
  // connector — no lanes, no diagonals, no shared trunk line needed.
  const orderedQF     = [...quarterFinals].sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0));
  const orderedR16    = orderSourceMatchesByDestination(roundOf16, orderedQF);
  const orderedR32    = orderSourceMatchesByDestination(roundOf32, orderedR16);
  const orderedSF     = orderDestinationBySourcePairs(orderedQF, semiFinals);
  const orderedFinals = orderDestinationBySourcePairs(orderedSF, finals);

  const r32ToR16Connections  = computeBracketConnections(orderedR32, orderedR16);
  const r16ToQfConnections   = computeBracketConnections(orderedR16, orderedQF);
  const qfToSfConnections    = computeBracketConnections(orderedQF, orderedSF);
  const sfToFinalConnections = computeBracketConnections(orderedSF, orderedFinals);

  // Row positioning: every match's vertical center is the midpoint of its
  // two real children — computed recursively from Dieciseisavos (the only
  // round with no children, so it's evenly spaced) up through the Final.
  // No round/index-based offset is used here; a column's order can change
  // (e.g. Cuartos' non-adjacent M97/M98 pair) without this breaking, since
  // each position is derived purely from computeBracketConnections.
  const TOTAL_H = orderedR32.length * R32_SH;
  const r32Y = computeLeafRowPositions(orderedR32.length, R32_SH);
  const r16Y = computeParentRowPositions(r32ToR16Connections, orderedR16.length, r32Y, TOTAL_H);
  const qfY  = computeParentRowPositions(r16ToQfConnections, orderedQF.length, r16Y, TOTAL_H);
  const sfY  = computeParentRowPositions(qfToSfConnections, orderedSF.length, qfY, TOTAL_H);
  const finalY = computeParentRowPositions(sfToFinalConnections, orderedFinals.length, sfY, TOTAL_H);

  // Column header rendered as a fixed-height block so the connector
  // marginTop=HEADER aligns precisely with the first match slot.
  function ColHeader({ title, titleColor = "text-[#f1f5f9]", subtitle }: {
    title: string; titleColor?: string; subtitle?: string;
  }) {
    return (
      <div style={{ height: HEADER, display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 4 }}>
        <p className={`text-[11px] font-black uppercase tracking-widest ${titleColor}`}>{title}</p>
        {subtitle && <p className="text-[10px] text-[#64748b] mt-0.5">{subtitle}</p>}
      </div>
    );
  }

  // Single slot wrapper — vertically centers its child inside a fixed-height div.
  // Used only for Dieciseisavos, whose rows are naturally evenly spaced
  // (no children to average), so plain flow stacking already matches
  // computeLeafRowPositions exactly.
  function Slot({ h, children }: { h: number; children: React.ReactNode }) {
    return (
      <div style={{ height: h, display: "flex", alignItems: "center" }}>
        <div className="w-full">{children}</div>
      </div>
    );
  }

  // Positions a match at its REAL computed center-y (from
  // computeParentRowPositions) inside a relatively-positioned column of
  // height TOTAL_H. Replaces fixed-height slots for every round past
  // Dieciseisavos, since their rows are no longer evenly spaced.
  function AbsoluteSlot({ y, children }: { y: number; children: React.ReactNode }) {
    return (
      <div style={{ position: "absolute", left: 0, right: 0, top: y - CARD_H / 2 }}>
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ProjectionLegend />
      <div className="overflow-x-auto no-scrollbar -mx-4">
      <div className="flex items-start px-4 pb-6 min-w-max" style={{ gap: 0 }}>

        {/* ── Grupos ──────────────────────────────────────────── */}
        <div className="w-56 shrink-0 pr-3">
          <ColHeader title="Grupos" subtitle={`${playedGroupMatches} de ${groups.length * 6} partidos jugados`} />
          {groups.length === 0
            ? <BracketEmptySlot label="Sin grupos" />
            : <div className="grid grid-cols-2 gap-2">{groups.map((g) => <BracketGroupMini key={g.group_code} group={g} />)}</div>
          }
        </div>

        {/* Groups → R32: vertical divider (no clean 2:1 pairing) */}
        <div className="w-px bg-[#1e1e35] self-stretch mx-3 shrink-0" />

        {/* ── Dieciseisavos — 16 × R32_SH slots ──────────────── */}
        <div className="w-40 shrink-0">
          <ColHeader title="Dieciseisavos" subtitle={`${roundOf32.length}/16`} />
          {orderedR32.length === 0
            ? <BracketEmptySlot label="Pendiente" />
            : orderedR32.map((m) => (
                <Slot key={m.id} h={R32_SH}>
                  <BracketMatchRow
                    match={m}
                    groups={groups}
                    homeBestThird={bestThirdAssignment.get(`${m.id}:home`)}
                    awayBestThird={bestThirdAssignment.get(`${m.id}:away`)}
                    knockoutResults={knockoutResults}
                  />
                </Slot>
              ))
          }
        </div>

        {/* R32 → R16: 16 → 8, connector arms hit each match's real position */}
        <BracketConnectorSVG connections={r32ToR16Connections} srcY={r32Y} dstY={r16Y} totalH={TOTAL_H} />

        {/* ── Octavos — positioned at the midpoint of its 2 real R32 sources ── */}
        <div className="w-40 shrink-0">
          <ColHeader title="Octavos" subtitle={`${roundOf16.length}/8`} />
          {orderedR16.length === 0
            ? <BracketEmptySlot label="Pendiente" />
            : (
              <div style={{ position: "relative", height: TOTAL_H }}>
                {orderedR16.map((m, i) => (
                  <AbsoluteSlot key={m.id} y={r16Y[i]}><BracketMatchRow match={m} knockoutResults={knockoutResults} /></AbsoluteSlot>
                ))}
              </div>
            )
          }
        </div>

        {/* R16 → QF */}
        <BracketConnectorSVG connections={r16ToQfConnections} srcY={r16Y} dstY={qfY} totalH={TOTAL_H} />

        {/* ── Cuartos — positioned at the midpoint of its 2 real R16 sources ── */}
        <div className="w-40 shrink-0">
          <ColHeader title="Cuartos" subtitle={`${quarterFinals.length}/4`} />
          {orderedQF.length === 0
            ? <BracketEmptySlot label="Pendiente" />
            : (
              <div style={{ position: "relative", height: TOTAL_H }}>
                {orderedQF.map((m, i) => (
                  <AbsoluteSlot key={m.id} y={qfY[i]}><BracketMatchRow match={m} knockoutResults={knockoutResults} /></AbsoluteSlot>
                ))}
              </div>
            )
          }
        </div>

        {/* QF → SF */}
        <BracketConnectorSVG connections={qfToSfConnections} srcY={qfY} dstY={sfY} totalH={TOTAL_H} />

        {/* ── Semis — positioned at the midpoint of its 2 real QF sources ──── */}
        <div className="w-40 shrink-0">
          <ColHeader title="Semis" subtitle={`${semiFinals.length}/2`} />
          {orderedSF.length === 0
            ? <BracketEmptySlot label="Pendiente" />
            : (
              <div style={{ position: "relative", height: TOTAL_H }}>
                {orderedSF.map((m, i) => (
                  <AbsoluteSlot key={m.id} y={sfY[i]}><BracketMatchRow match={m} knockoutResults={knockoutResults} /></AbsoluteSlot>
                ))}
              </div>
            )
          }
        </div>

        {/* SF → Final */}
        <BracketConnectorSVG connections={sfToFinalConnections} srcY={sfY} dstY={finalY} totalH={TOTAL_H} />

        {/* ── Final — positioned at the midpoint of its 2 real SF sources ──── */}
        <div className="w-40 shrink-0">
          <ColHeader title="🏆 Final" titleColor="text-[#f59e0b]" />
          <div style={{ position: "relative", height: TOTAL_H }}>
            {orderedFinals.length > 0
              ? orderedFinals.map((m, i) => (
                  <AbsoluteSlot key={m.id} y={finalY[i]}><BracketMatchRow match={m} highlight knockoutResults={knockoutResults} /></AbsoluteSlot>
                ))
              : (
                <AbsoluteSlot y={TOTAL_H / 2}>
                  <div className="bg-[#11111c] border border-[#f59e0b]/20 rounded-xl px-3 py-5 text-center">
                    <p className="text-xl leading-none mb-1">🏆</p>
                    <p className="text-[10px] text-[#64748b]">Por definir</p>
                  </div>
                </AbsoluteSlot>
              )
            }
          </div>
          {/* 3er Puesto is fed by Loser M101/M102 but intentionally sits
              outside the champion tree's positioned column — it must not
              interfere with the recursive midpoint layout above. */}
          {thirdPlace.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-2">🥉 3er Puesto</p>
              {thirdPlace.map((m) => <BracketMatchRow key={m.id} match={m} knockoutResults={knockoutResults} />)}
            </div>
          )}
        </div>

      </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════

export default function CaminoTabs({
  groups,
  bestThirds: _bestThirds,
  roundOf32,
  roundOf16,
  quarterFinals,
  semiFinals,
  thirdPlace,
  finals,
  defaultTab,
}: Props) {
  const [view, setView] = useState<ViewId>(() => {
    if (typeof window === "undefined") return "bracket";
    return (localStorage.getItem("camino-view") as ViewId) ?? "bracket";
  });
  const [tab,  setTab]  = useState<TabId>((defaultTab as TabId) ?? "groups");

  // Computed once and reused by both Bracket and Por fase > Dieciseisavos —
  // same Map, same resolveSlot() calls, no second implementation.
  const bestThirdAssignment = assignBestThirdSlots(groups, roundOf32);

  // Build knockoutResults round-by-round in order so that R32 winners (resolved via group
  // standings when home_team_id is null in DB) feed into R16 resolution, and so on.
  // Using resolveSlot here mirrors what BracketMatchRow/KnockoutMatchCard will do for display,
  // ensuring the map reflects the same teams the UI will show.
  const knockoutResults: Map<number, KnockoutResult> = new Map();
  for (const round of [roundOf32, roundOf16, quarterFinals, semiFinals, thirdPlace, finals]) {
    for (const m of round) {
      if (m.status !== "finished") continue;
      if (m.home_score === null || m.away_score === null || m.match_number === null) continue;
      const homeSlot = resolveSlot(m.home_team, m.home_placeholder, groups, bestThirdAssignment.get(`${m.id}:home`) ?? null, knockoutResults);
      const awaySlot = resolveSlot(m.away_team, m.away_placeholder, groups, bestThirdAssignment.get(`${m.id}:away`) ?? null, knockoutResults);
      const resolvedHome = homeSlot.kind !== "unresolved" ? homeSlot.team : null;
      const resolvedAway = awaySlot.kind !== "unresolved" ? awaySlot.team : null;
      if (!resolvedHome || !resolvedAway) continue;
      if (m.home_score > m.away_score) {
        knockoutResults.set(m.match_number, { winner: resolvedHome, loser: resolvedAway });
      } else if (m.away_score > m.home_score) {
        knockoutResults.set(m.match_number, { winner: resolvedAway, loser: resolvedHome });
      } else if (m.winner_side === 'home') {
        knockoutResults.set(m.match_number, { winner: resolvedHome, loser: resolvedAway });
      } else if (m.winner_side === 'away') {
        knockoutResults.set(m.match_number, { winner: resolvedAway, loser: resolvedHome });
      }
    }
  }

  function handleViewChange(v: ViewId) {
    setView(v);
    localStorage.setItem("camino-view", v);
  }

  return (
    <div className="space-y-4">

      {/* ── View toggle ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5 bg-[#11111c] border border-[#1e1e35] rounded-xl p-1">
          {(["phase", "bracket"] as ViewId[]).map((v) => {
            const label = v === "phase" ? "Por fase" : "Bracket";
            const active = view === v;
            return (
              <button
                key={v}
                onClick={() => handleViewChange(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[#18182a] text-[#f1f5f9]"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Phase view ──────────────────────────────────────────── */}
      {view === "phase" && (
        <div className="space-y-4">
          {/* Tab bar (scrollable on mobile) */}
          <div className="-mx-4 px-4">
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      active
                        ? "bg-[#00c85a]/10 text-[#00c85a] border border-[#00c85a]/20"
                        : "text-[#64748b] hover:text-[#94a3b8] border border-transparent"
                    }`}
                  >
                    <span className="hidden sm:inline">{t.label}</span>
                    <span className="sm:hidden">{t.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          {tab === "groups" && <GruposTab groups={groups} />}
          {tab === "r32"    && (
            <KnockoutTab
              matches={roundOf32}
              emptyMessage="Los cruces de dieciseisavos aún no están disponibles."
              groups={groups}
              bestThirdAssignment={bestThirdAssignment}
            />
          )}
          {tab === "r16"    && (
            <KnockoutTab matches={roundOf16}     emptyMessage="Los cruces de octavos aún no están disponibles." knockoutResults={knockoutResults} />
          )}
          {tab === "qf"     && (
            <KnockoutTab matches={quarterFinals} emptyMessage="Los cuartos de final aún no están disponibles." knockoutResults={knockoutResults} />
          )}
          {tab === "sf"     && (
            <KnockoutTab matches={semiFinals}    emptyMessage="Las semifinales aún no están disponibles." knockoutResults={knockoutResults} />
          )}
          {tab === "final"  && (
            <FinalTab finals={finals} thirdPlace={thirdPlace} knockoutResults={knockoutResults} />
          )}
        </div>
      )}

      {/* ── Bracket view ────────────────────────────────────────── */}
      {view === "bracket" && (
        <BracketView
          groups={groups}
          roundOf32={roundOf32}
          roundOf16={roundOf16}
          quarterFinals={quarterFinals}
          semiFinals={semiFinals}
          thirdPlace={thirdPlace}
          finals={finals}
          bestThirdAssignment={bestThirdAssignment}
          knockoutResults={knockoutResults}
        />
      )}

    </div>
  );
}
